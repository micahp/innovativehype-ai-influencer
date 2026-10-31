import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type BriefInput = {
  influencerId: string;
  title: string;
  concept: string;
  platform: string;
  format: string;
  contentPillar: string;
  referencePostId?: string;
  trendSignalId?: string;
  scheduledFor?: Date;
};

export function draftCaption(slug: string, concept: string, platform: string, format: string) {
  const normalized = concept.trim().replace(/[\r\n]+/g, " ");
  if (slug === "mira-byte") {
    return platform === "x" || format === "text_post"
      ? `${normalized} What's one detail you'd add to the loadout?`
      : `A little field note from the queue: ${normalized} Keeping the concept original and the setup practical. What would you change?`;
  }
  return platform === "x" || format === "text_post"
    ? `${normalized} Keep it adaptable to your own needs. What would make this easier to repeat?`
    : `A practical note: ${normalized} This is general editorial content, not individualized advice or a personal-use claim. Which part would you make simpler?`;
}

export async function createBrief(input: BriefInput) {
  const influencer = await prisma.influencer.findUnique({
    where: { id: input.influencerId },
    include: { personaVersions: { orderBy: { version: "desc" }, take: 1 } }
  });
  if (!influencer || influencer.personaVersions.length === 0) throw new Error("Influencer persona is not configured");

  let referencePostId: string | undefined;
  let trendSignalId: string | undefined;
  let sourceSummary: Record<string, unknown> | undefined;
  if (input.referencePostId) {
    const reference = await prisma.referencePost.findUnique({ where: { id: input.referencePostId } });
    if (!reference) throw new Error("Reference post not found");
    referencePostId = reference.id;
    sourceSummary = {
      sourceUrl: reference.url,
      platform: reference.platform,
      format: reference.format,
      creatorHandle: reference.creatorHandle ?? null,
      observedMetrics: {
        likes: reference.likes,
        comments: reference.comments,
        shares: reference.shares,
        saves: reference.saves,
        views: reference.views,
        impressions: reference.impressions
      },
      reusedMedia: false,
      copiedCaption: false
    };
  }
  if (input.trendSignalId) {
    const signal = await prisma.trendSignal.findUnique({ where: { id: input.trendSignalId } });
    if (!signal) throw new Error("Trend signal not found");
    if (signal.influencerId && signal.influencerId !== influencer.id) throw new Error("This trend signal is assigned to a different studio creator");
    trendSignalId = signal.id;
    sourceSummary = {
      ...(sourceSummary ?? {}),
      trend: {
        topic: signal.topic,
        sourceUrl: signal.sourceUrl,
        sourceName: signal.sourceName,
        observedAt: signal.observedAt.toISOString(),
        proposedConcept: signal.proposedConcept,
        confidence: signal.confidence
      }
    };
  }

  const spec = influencer.personaVersions[0].spec as Record<string, unknown>;
  const visual = spec.visualIdentity as { face?: string; hair?: string; body?: string; wardrobe?: string[]; palette?: string[] };
  const generation = spec.generation as { negativePrompt?: string };
  const identityLock = [visual.face, visual.hair, visual.body].filter(Boolean).join(" ");
  const direction = `Create an original ${input.format.replaceAll("_", " ")} concept for ${influencer.name}. ${input.concept.trim()} Character identity: ${identityLock} Wardrobe direction: ${(visual.wardrobe ?? []).slice(0, 4).join(", ")}. Palette: ${(visual.palette ?? []).join(", ")}. Use a new composition and setting; do not reproduce reference photography, captions, logos, or any creator's likeness.`;
  const brief = await prisma.contentBrief.create({
    data: {
      influencerId: influencer.id,
      personaVersionId: influencer.personaVersions[0].id,
      referencePostId,
      trendSignalId,
      title: input.title.trim(),
      concept: input.concept.trim(),
      platform: input.platform,
      format: input.format,
      contentPillar: input.contentPillar,
      captionDraft: draftCaption(influencer.slug, input.concept, input.platform, input.format),
      imagePrompt: direction,
      negativePrompt: generation.negativePrompt,
      scheduledFor: input.scheduledFor
    }
  });

  await prisma.agentRun.create({
    data: {
      influencerId: influencer.id,
      agent: "creative-director",
      version: "deterministic-1",
      status: "completed",
      inputs: { briefInput: input, reference: sourceSummary ?? null } as Prisma.InputJsonValue,
      outputs: { contentBriefId: brief.id, prompt: direction, caption: brief.captionDraft } as Prisma.InputJsonValue,
      completedAt: new Date()
    }
  });
  return brief;
}
