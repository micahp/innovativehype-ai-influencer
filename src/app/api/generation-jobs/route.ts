import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { enqueueGeneration } from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import { assignmentBlockReason, hasReviewedCanonicalFaceAndBody } from "@/lib/creative-assignments";

const schema = z.object({
  contentBriefId: z.string().min(1),
  idempotencyKey: z.string().min(8).max(128).optional(),
  candidateCount: z.number().int().min(1).max(4).default(1),
  seed: z.number().int().min(0).max(4_294_967_295).optional(),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "3:4", "4:3"]).default("3:4"),
  identityReferenceAssetId: z.string().min(1),
  spendAuthorized: z.literal(true)
});

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid generation request" }, { status: 400 });
  const brief = await prisma.contentBrief.findUnique({ where: { id: parsed.data.contentBriefId }, include: { influencer: true, creativeAssignment: true } });
  if (!brief) return NextResponse.json({ error: "Content brief not found" }, { status: 404 });
  if (!["draft", "changes_requested"].includes(brief.status)) return NextResponse.json({ error: "Generation is limited to a draft brief awaiting review." }, { status: 409 });
  if (brief.format === "text_post") return NextResponse.json({ error: "Text-only briefs do not create image generation jobs." }, { status: 400 });
  if (!brief.assignmentId || !brief.creativeAssignment) return NextResponse.json({ error: "This brief has no owner-approved creative assignment." }, { status: 409 });
  if (brief.creativeAssignment.influencerId !== brief.influencerId || brief.assignmentId !== brief.creativeAssignment.id) return NextResponse.json({ error: "This brief is attached to a different creator's assignment." }, { status: 409 });
  const assignmentProblem = assignmentBlockReason({
    id: brief.creativeAssignment.id,
    influencerSlug: brief.influencer.slug,
    status: brief.creativeAssignment.status,
    creatorIds: brief.creativeAssignment.creatorIds,
    postIds: brief.creativeAssignment.postIds,
    photoSourceIds: brief.creativeAssignment.photoSourceIds,
    evidenceSnapshot: brief.creativeAssignment.evidenceSnapshot
  });
  if (assignmentProblem) return NextResponse.json({ error: assignmentProblem }, { status: 409 });

  const [identityAsset, approvedFace, approvedBody] = await Promise.all([
    prisma.identityReferenceAsset.findFirst({ where: { id: parsed.data.identityReferenceAssetId, influencerId: brief.influencerId, personaVersionId: brief.personaVersionId ?? "", status: "approved" } }),
    prisma.identityReferenceAsset.findFirst({ where: { influencerId: brief.influencerId, personaVersionId: brief.personaVersionId ?? "", kind: "face", status: "approved" }, select: { id: true } }),
    prisma.identityReferenceAsset.findFirst({ where: { influencerId: brief.influencerId, personaVersionId: brief.personaVersionId ?? "", kind: "body", status: "approved" }, select: { id: true } })
  ]);
  if (!hasReviewedCanonicalFaceAndBody({ faceApproved: Boolean(approvedFace), bodyApproved: Boolean(approvedBody) })) {
    return NextResponse.json({ error: "Generation requires an owner-approved face and body reference for this exact persona version." }, { status: 409 });
  }
  if (!identityAsset) return NextResponse.json({ error: "Choose an approved character reference belonging to this brief's creator and persona version." }, { status: 409 });

  const idempotencyKey = parsed.data.idempotencyKey || randomUUID();
  let job = await prisma.generationJob.findUnique({ where: { idempotencyKey } });
  if (job && job.contentBriefId !== brief.id) return NextResponse.json({ error: "Idempotency key is already attached to another brief." }, { status: 409 });
  if (!job) {
    job = await prisma.generationJob.create({
      data: {
        contentBriefId: brief.id,
        provider: process.env.MEDIA_PROVIDER || "fine-photo-gen",
        idempotencyKey,
        request: {
          candidateCount: parsed.data.candidateCount,
          seed: parsed.data.seed,
          aspectRatio: parsed.data.aspectRatio,
          identityReferenceAssetId: identityAsset.id,
          spendAuthorized: true
        } as Prisma.InputJsonValue
      }
    });
  }
  try {
    await enqueueGeneration(job.id);
  } catch (error) {
    console.warn("Generation job persisted but Redis dispatch is pending", error instanceof Error ? error.message : error);
  }
  await audit("admin", "generation_job.queued", "GenerationJob", job.id, { contentBriefId: brief.id, provider: job.provider });
  return NextResponse.json({ job, queued: true }, { status: 202 });
}
