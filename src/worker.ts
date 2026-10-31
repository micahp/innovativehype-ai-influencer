import { Worker } from "bullmq";
import { Prisma } from "@prisma/client";
import { createHash, randomInt } from "node:crypto";
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getMediaProvider } from "@/lib/providers/fine-photo-gen";
import { getStudioQueue, redisConnection, STUDIO_QUEUE } from "@/lib/queue";
import { assignmentBlockReason, hasReviewedCanonicalFaceAndBody } from "@/lib/creative-assignments";
import { decryptIdentityAsset, identityStoragePath } from "@/lib/identity-storage";
import { isLivePublishFormatSupported } from "@/lib/workflow";

type WorkData = { generationJobId?: string; scheduledPostId?: string };
type GenerationRequest = { candidateCount?: number; seed?: number; identityReferenceAssetId?: string; spendAuthorized?: boolean; aspectRatio?: "1:1" | "16:9" | "9:16" | "3:4" | "4:3" };

const worker = new Worker<WorkData>(STUDIO_QUEUE, async (job) => {
  if (job.name === "publish") {
    const token = process.env.INTERNAL_WORKER_TOKEN;
    const appUrl = process.env.APP_BASE_URL;
    if (!token || token.length < 32 || !appUrl) throw new Error("Worker publishing requires INTERNAL_WORKER_TOKEN and APP_BASE_URL.");
    const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/publish/${encodeURIComponent(job.data.scheduledPostId || "")}/run`, {
      method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ live: true }), signal: AbortSignal.timeout(60_000)
    });
    if (!response.ok) throw new Error(`Publish workflow returned HTTP ${response.status}.`);
    return response.json();
  }
  if (!job.data.generationJobId) throw new Error("Generation job id is missing.");
  const record = await prisma.generationJob.findUnique({
    where: { id: job.data.generationJobId },
    include: { contentBrief: { include: { influencer: true, creativeAssignment: true } } }
  });
  if (!record) throw new Error(`Generation job ${job.data.generationJobId} was not found`);
  if (record.status === "completed") return { alreadyCompleted: true };

  await prisma.generationJob.update({ where: { id: record.id }, data: { status: "running", startedAt: new Date(), attempts: { increment: 1 }, error: null } });
  const request = record.request as unknown as GenerationRequest;
  try {
  if (!["draft", "changes_requested"].includes(record.contentBrief.status)) throw new Error("Generation stopped: the brief is no longer in draft review.");
  const assignment = record.contentBrief.creativeAssignment;
  if (!assignment || record.contentBrief.assignmentId !== assignment.id || assignment.influencerId !== record.contentBrief.influencerId) throw new Error("Generation stopped: the brief has no valid owner-approved assignment.");
  const assignmentProblem = assignmentBlockReason({
    id: assignment.id,
    influencerSlug: record.contentBrief.influencer.slug,
    status: assignment.status,
    creatorIds: assignment.creatorIds,
    postIds: assignment.postIds,
    photoSourceIds: assignment.photoSourceIds,
    evidenceSnapshot: assignment.evidenceSnapshot
  });
  if (assignmentProblem) throw new Error(`Generation stopped: ${assignmentProblem}`);
  if (request.spendAuthorized !== true) throw new Error("Generation stopped: no explicit provider-spend authorization was recorded.");
  if (!request.identityReferenceAssetId) throw new Error("Generation stopped: an approved character reference was not selected.");
  const [identityAsset, approvedFace, approvedBody] = await Promise.all([
    prisma.identityReferenceAsset.findFirst({ where: { id: request.identityReferenceAssetId, influencerId: record.contentBrief.influencerId, personaVersionId: record.contentBrief.personaVersionId ?? "", status: "approved" } }),
    prisma.identityReferenceAsset.findFirst({ where: { influencerId: record.contentBrief.influencerId, personaVersionId: record.contentBrief.personaVersionId ?? "", kind: "face", status: "approved" }, select: { id: true } }),
    prisma.identityReferenceAsset.findFirst({ where: { influencerId: record.contentBrief.influencerId, personaVersionId: record.contentBrief.personaVersionId ?? "", kind: "body", status: "approved" }, select: { id: true } })
  ]);
  if (!hasReviewedCanonicalFaceAndBody({ faceApproved: Boolean(approvedFace), bodyApproved: Boolean(approvedBody) }) || !identityAsset) throw new Error("Generation stopped: reviewed face and body canon is incomplete or the selected reference is no longer approved.");
  const referenceBytes = decryptIdentityAsset(await readFile(identityStoragePath(identityAsset.storageKey)));
  if (createHash("sha256").update(referenceBytes).digest("hex") !== identityAsset.sha256) throw new Error("Generation stopped: the selected character reference failed its integrity check.");
  const referenceImageUrl = `data:${identityAsset.contentType};base64,${referenceBytes.toString("base64")}`;
  const provider = getMediaProvider();
  const candidateCount = Math.max(1, Math.min(4, request.candidateCount ?? 1));
  const seedBase = request.seed ?? randomInt(0, 2 ** 32);
  const outputs = [];

    for (let index = 0; index < candidateCount; index += 1) {
      const seed = (seedBase + index) % (2 ** 32);
      const output = await provider.generate({
        influencerSlug: record.contentBrief.influencer.slug,
        prompt: record.contentBrief.imagePrompt,
        negativePrompt: record.contentBrief.negativePrompt,
        aspectRatio: request.aspectRatio ?? "3:4",
        seed,
        referenceImageUrl
      });
      const asset = await prisma.mediaAsset.create({
        data: {
          contentBriefId: record.contentBriefId,
          generationJobId: record.id,
          outputUrl: output.outputUrl,
          prompt: record.contentBrief.imagePrompt,
          negativePrompt: record.contentBrief.negativePrompt,
          seed: BigInt(output.seed),
          provider: output.provider,
          model: output.model,
          metadata: { ...output.metadata, identityReferenceAssetId: identityAsset.id, identityReferenceSha256: identityAsset.sha256 } as Prisma.InputJsonValue,
          isMock: output.isMock
        }
      });
      outputs.push({ assetId: asset.id, outputUrl: output.outputUrl, provider: output.provider, model: output.model, seed: output.seed, isMock: output.isMock });
    }

    await prisma.generationJob.update({ where: { id: record.id }, data: { status: "completed", completedAt: new Date(), result: { outputs } as Prisma.InputJsonValue } });
    return { outputs };
  } catch (error) {
    await prisma.generationJob.update({ where: { id: record.id }, data: { status: "failed", error: error instanceof Error ? error.message : "Unknown generation error", completedAt: new Date() } });
    throw error;
  }
}, { connection: redisConnection(), concurrency: Number(process.env.WORKER_CONCURRENCY || 2) });

worker.on("ready", () => console.log("Studio worker ready"));
worker.on("failed", (job, error) => console.error("Studio job failed", { jobId: job?.id, error: error.message }));
worker.on("error", (error) => console.error("Studio worker error", error));

async function dispatchQueuedJobs() {
  const queued = await prisma.generationJob.findMany({ where: { status: "queued" }, orderBy: { createdAt: "asc" }, take: 100, select: { id: true } });
  const queue = getStudioQueue();
  for (const item of queued) {
    await queue.add("generate", { generationJobId: item.id }, {
      jobId: item.id,
      attempts: 3,
      backoff: { type: "exponential", delay: 15_000 },
      removeOnComplete: 500,
      removeOnFail: 1000
    });
  }
}

async function dispatchDuePublications() {
  if (process.env.LIVE_PUBLISHING_ENABLED !== "true") return;
  const [pausedSetting, modeSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "publishing_paused" } }),
    prisma.systemSetting.findUnique({ where: { key: "publishing_mode" } })
  ]);
  const paused = pausedSetting?.value !== false;
  const mode = typeof modeSetting?.value === "string" ? modeSetting.value : "human_approval";
  if (paused || !["automatic_preapproved", "conditional_autopublish"].includes(mode)) return;
  const due = await prisma.scheduledPost.findMany({
    where: { status: "scheduled", lastError: null, scheduledFor: { lte: new Date() } },
    include: {
      mediaAsset: true,
      publishedPost: true,
      contentBrief: {
        include: {
          influencer: { include: { socialAccounts: true } },
          creativeAssignment: true,
          approvals: { orderBy: { createdAt: "desc" }, take: 1 }
        }
      }
    },
    orderBy: { scheduledFor: "asc" }, take: 50
  });
  const queue = getStudioQueue();
  for (const post of due) {
    if (post.publishedPost) continue;
    const assignment = post.contentBrief.creativeAssignment;
    if (!assignment || post.contentBrief.assignmentId !== assignment.id || assignment.influencerId !== post.contentBrief.influencerId) continue;
    if (assignmentBlockReason({ id: assignment.id, influencerSlug: post.contentBrief.influencer.slug, status: assignment.status, creatorIds: assignment.creatorIds, postIds: assignment.postIds, photoSourceIds: assignment.photoSourceIds, evidenceSnapshot: assignment.evidenceSnapshot })) continue;
    const approval = post.contentBrief.approvals[0];
    const account = post.contentBrief.influencer.socialAccounts.find((item) => item.platform === post.platform);
    const assetApproved = !post.mediaAssetId || (post.mediaAsset?.reviewStatus === "approved" && approval?.mediaAssetId === post.mediaAssetId && !post.mediaAsset.isMock);
    const formatAllowed = mode !== "conditional_autopublish" || (post.platform === "x" && post.contentBrief.format === "text_post" && !post.mediaAssetId);
    const adapterSupportsFormat = isLivePublishFormatSupported(post.platform, post.contentBrief.format, Boolean(post.mediaAssetId));
    const credentialsReady = account?.status === "connected" && Boolean(account.tokenCiphertext && account.externalAccountId) && (!account.tokenExpiresAt || account.tokenExpiresAt > new Date());
    if (approval?.decision !== "approved" || !assetApproved || !credentialsReady || !formatAllowed || !adapterSupportsFormat) continue;
    const jobId = `publish-${post.id}`;
    const existingJob = await queue.getJob(jobId);
    if (existingJob) {
      const state = await existingJob.getState();
      if (state !== "failed") continue;
      await existingJob.remove();
    }
    await queue.add("publish", { scheduledPostId: post.id }, { jobId, attempts: 1, removeOnComplete: 500, removeOnFail: 1000 });
  }
}

void dispatchQueuedJobs().catch((error) => console.error("Initial job dispatch failed", error));
const dispatcher = setInterval(() => void dispatchQueuedJobs().catch((error) => console.error("Job dispatch failed", error)), 10_000);
dispatcher.unref();
void dispatchDuePublications().catch((error) => console.error("Initial publish dispatch failed", error));
const publishDispatcher = setInterval(() => void dispatchDuePublications().catch((error) => console.error("Publish dispatch failed", error)), 30_000);
publishDispatcher.unref();

async function shutdown() {
  clearInterval(dispatcher);
  clearInterval(publishDispatcher);
  await worker.close();
  await prisma.$disconnect();
}

process.on("SIGINT", () => void shutdown().then(() => process.exit(0)));
process.on("SIGTERM", () => void shutdown().then(() => process.exit(0)));
