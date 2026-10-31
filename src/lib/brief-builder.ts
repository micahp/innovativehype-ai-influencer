import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assignmentBlockReason } from "@/lib/creative-assignments";

export type BriefInput = {
  influencerId: string;
  title: string;
  concept: string;
  platform: string;
  format: string;
  contentPillar: string;
  assignmentId: string;
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
  if (input.referencePostId || input.trendSignalId) throw new Error("Manual research and trend submissions remain proposals. Use only sources in the owner-approved creative assignment.");
  const influencer = await prisma.influencer.findUnique({
    where: { id: input.influencerId },
    include: { personaVersions: { orderBy: { version: "desc" }, take: 1 } }
  });
  if (!influencer || influencer.personaVersions.length === 0) throw new Error("Influencer persona is not configured");

  const assignment = await prisma.creativeAssignment.findUnique({ where: { id: input.assignmentId }, include: { influencer: { select: { slug: true } } } });
  if (!assignment) throw new Error("Choose one of the six locked creative assignment IDs.");
  const assignmentProblem = assignmentBlockReason({
    id: assignment.id,
    influencerSlug: assignment.influencer.slug,
    status: assignment.status,
    creatorIds: assignment.creatorIds,
    postIds: assignment.postIds,
    photoSourceIds: assignment.photoSourceIds,
    evidenceSnapshot: assignment.evidenceSnapshot
  });
  if (assignmentProblem) throw new Error(assignmentProblem);
  if (assignment.influencerId !== influencer.id) throw new Error("The selected creative assignment belongs to a different fictional creator.");

  const spec = influencer.personaVersions[0].spec as Record<string, unknown>;
  const visual = spec.visualIdentity as { face?: string; hair?: string; body?: string; wardrobe?: string[]; palette?: string[] };
  const generation = spec.generation as { negativePrompt?: string };
  const identityLock = [visual.face, visual.hair, visual.body].filter(Boolean).join(" ");
  const direction = `Create an original ${input.format.replaceAll("_", " ")} concept for ${influencer.name}. Owner-approved assignment ${assignment.id}; preserve this intended shot exactly: ${assignment.direction} Concept: ${input.concept.trim()} Character identity: ${identityLock} Wardrobe direction: ${(visual.wardrobe ?? []).slice(0, 4).join(", ")}. Palette: ${(visual.palette ?? []).join(", ")}. Use only the source IDs and evidence URLs recorded with assignment ${assignment.id}. Do not reproduce source photography, captions, logos, faces, bodies, or any creator's distinctive likeness.`;
  const sourceSnapshot = {
    assignmentId: assignment.id,
    creatorIds: assignment.creatorIds,
    postIds: assignment.postIds,
    photoSourceIds: assignment.photoSourceIds,
    evidence: assignment.evidenceSnapshot,
    sourceMediaReused: false,
    sourceCaptionCopied: false,
    sourceLikenessUsed: false
  } as Prisma.InputJsonValue;
  const brief = await prisma.contentBrief.create({
    data: {
      influencerId: influencer.id,
      personaVersionId: influencer.personaVersions[0].id,
      assignmentId: assignment.id,
      intendedShot: assignment.direction,
      sourceSnapshot,
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
      version: "assignment-locked-2",
      status: "completed",
      inputs: { briefInput: input, assignmentId: assignment.id, sourceSnapshot } as Prisma.InputJsonValue,
      outputs: { contentBriefId: brief.id, prompt: direction, caption: brief.captionDraft } as Prisma.InputJsonValue,
      completedAt: new Date()
    }
  });
  return brief;
}
