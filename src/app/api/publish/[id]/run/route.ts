import { NextRequest, NextResponse } from "next/server";
import { Prisma, type ScheduledPost } from "@prisma/client";
import { isAuthenticated, isWorkerAuthorized } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { isLivePublishFormatSupported, mayRunDryRun, mayRunLivePublish } from "@/lib/workflow";
import { decryptSocialToken } from "@/lib/social-token";
import { publishInstagramImage } from "@/lib/publishers/instagram";
import { publishXPost } from "@/lib/publishers/x";
import { PublisherError } from "@/lib/publishers/types";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request.headers.get("cookie")) && !isWorkerAuthorized(request.headers.get("authorization"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { dryRun?: boolean; live?: boolean };
  if (body.dryRun !== true && body.live !== true) return NextResponse.json({ error: "Choose explicit dry-run or live mode." }, { status: 400 });
  const { id } = await context.params;
  const scheduled = await prisma.scheduledPost.findUnique({
    where: { id },
    include: { contentBrief: { include: { influencer: true } }, mediaAsset: true, publishedPost: true }
  });
  if (!scheduled) return NextResponse.json({ error: "Scheduled post not found" }, { status: 404 });
  if (scheduled.publishedPost) {
    const unresolved = scheduled.publishedPost.publicationStatus !== "published";
    return NextResponse.json({ publishedPost: scheduled.publishedPost, duplicate: !unresolved, needsReconciliation: unresolved }, { status: unresolved ? 409 : 200 });
  }

  if (body.dryRun === true) return runDryRun(id, scheduled);

  const [pauseSetting, modeSetting, latestApproval] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "publishing_paused" } }),
    prisma.systemSetting.findUnique({ where: { key: "publishing_mode" } }),
    prisma.approvalRecord.findFirst({ where: { contentBriefId: scheduled.contentBriefId }, orderBy: { createdAt: "desc" } })
  ]);
  const paused = pauseSetting?.value !== false;
  const mode = typeof modeSetting?.value === "string" ? modeSetting.value : "human_approval";
  const approved = latestApproval?.decision === "approved" && (!scheduled.mediaAssetId || (scheduled.mediaAsset?.reviewStatus === "approved" && latestApproval.mediaAssetId === scheduled.mediaAssetId));
  if (!mayRunLivePublish({
    scheduledStatus: scheduled.status, hasPublishedPost: false, paused,
    liveEnabled: process.env.LIVE_PUBLISHING_ENABLED === "true", mode, approved,
    due: scheduled.scheduledFor <= new Date()
  })) {
    return NextResponse.json({ error: "Live publishing requires a due post, explicit human approval, an unpaused account, an enabled publishing mode, and LIVE_PUBLISHING_ENABLED=true." }, { status: 409 });
  }
  if (scheduled.mediaAsset?.isMock) return NextResponse.json({ error: "Mock media cannot be live published." }, { status: 409 });
  if (scheduled.mediaAssetId && scheduled.mediaAsset?.reviewStatus !== "approved") return NextResponse.json({ error: "Live publication requires an approved media asset." }, { status: 409 });
  if (!isLivePublishFormatSupported(scheduled.platform, scheduled.contentBrief.format, Boolean(scheduled.mediaAssetId))) return NextResponse.json({ error: "This adapter supports Instagram single-image feed posts and X text or single-image posts only. Export other formats manually." }, { status: 409 });

  const socialAccount = await prisma.socialAccount.findUnique({
    where: { influencerId_platform: { influencerId: scheduled.contentBrief.influencerId, platform: scheduled.platform } }
  });
  if (!socialAccount || socialAccount.status !== "connected" || !socialAccount.tokenCiphertext || !socialAccount.externalAccountId) return NextResponse.json({ error: "This influencer has no configured social account for the scheduled platform." }, { status: 409 });
  if (socialAccount.tokenExpiresAt && socialAccount.tokenExpiresAt <= new Date()) return NextResponse.json({ error: "The configured social access token has expired." }, { status: 409 });
  let accessToken: string;
  try { accessToken = decryptSocialToken(socialAccount.tokenCiphertext); }
  catch { return NextResponse.json({ error: "The social token could not be decrypted. Check SOCIAL_TOKEN_ENCRYPTION_KEY." }, { status: 503 }); }

  const claimed = await prisma.scheduledPost.updateMany({ where: { id, status: "scheduled" }, data: { status: "publishing" } });
  if (claimed.count !== 1) return NextResponse.json({ error: "The scheduled post is already being processed." }, { status: 409 });

  const pendingPost = await prisma.publishedPost.create({
    data: { scheduledPostId: id, publishedAt: new Date(), dryRun: false, publicationStatus: "publishing", result: { state: "provider_request_started" } }
  });
  try {
    const accountSettings = socialAccount.settings && typeof socialAccount.settings === "object" && !Array.isArray(socialAccount.settings)
      ? socialAccount.settings as Record<string, unknown>
      : {};
    const publish = scheduled.platform === "instagram" ? publishInstagramImage : publishXPost;
    const result = await publish({
      accessToken,
      accountId: socialAccount.externalAccountId,
      caption: scheduled.contentBrief.captionDraft,
      mediaUrl: scheduled.mediaAsset?.outputUrl ?? null,
      graphVersion: typeof accountSettings.graphVersion === "string" ? accountSettings.graphVersion : undefined
    });
    const publishedPost = await prisma.publishedPost.update({
      where: { id: pendingPost.id },
      data: { externalPostId: result.externalPostId, postUrl: result.postUrl, publishedAt: new Date(), publicationStatus: "published", result: result.result as Prisma.InputJsonValue }
    });
    await prisma.scheduledPost.update({ where: { id }, data: { status: "published", lastError: null } });
    await audit("admin", "post.live_published", "PublishedPost", publishedPost.id, { scheduledPostId: id, platform: scheduled.platform, externalPostId: result.externalPostId });
    return NextResponse.json({ publishedPost, duplicate: false });
  } catch (error) {
    const ambiguous = !(error instanceof PublisherError) || error.ambiguous;
    const errorText = error instanceof Error ? error.message : "Unknown platform error.";
    if (ambiguous) {
      await prisma.publishedPost.update({ where: { id: pendingPost.id }, data: { publicationStatus: "reconciliation_required", result: { state: "reconciliation_required", error: errorText } } }).catch(() => undefined);
      await prisma.scheduledPost.update({ where: { id }, data: { status: "publish_unknown", lastError: errorText } }).catch(() => undefined);
      await audit("admin", "post.reconciliation_required", "PublishedPost", pendingPost.id, { scheduledPostId: id, platform: scheduled.platform }).catch(() => undefined);
      return NextResponse.json({ error: "The platform response was uncertain. This post is locked to prevent a duplicate; check the social account before resolving it.", needsReconciliation: true }, { status: 502 });
    }
    await prisma.publishedPost.delete({ where: { id: pendingPost.id } }).catch(() => undefined);
    await prisma.scheduledPost.update({ where: { id }, data: { status: "scheduled", lastError: errorText } });
    return NextResponse.json({ error: errorText, retryableAfterCorrection: true }, { status: error instanceof PublisherError && error.status ? error.status : 502 });
  }
}

async function runDryRun(id: string, scheduled: ScheduledPost) {
  if (!mayRunDryRun(scheduled.status, false)) return NextResponse.json({ error: "Only scheduled posts can run." }, { status: 409 });
  const claimed = await prisma.scheduledPost.updateMany({ where: { id, status: "scheduled" }, data: { status: "publishing" } });
  if (claimed.count !== 1) return NextResponse.json({ error: "The scheduled post is already being processed." }, { status: 409 });
  const publishedPost = await prisma.publishedPost.create({
    data: {
      scheduledPostId: id, publishedAt: new Date(), dryRun: true, publicationStatus: "published",
      result: { mode: "dry_run", externalSideEffect: false, note: "This record proves the scheduler workflow only; no platform post was created." }
    }
  });
  await prisma.scheduledPost.update({ where: { id }, data: { status: "published_dry_run" } });
  await audit("admin", "post.dry_run", "PublishedPost", publishedPost.id, { scheduledPostId: id, platform: scheduled.platform }).catch(() => undefined);
  return NextResponse.json({ publishedPost, duplicate: false });
}
