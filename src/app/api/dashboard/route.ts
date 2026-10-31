import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const [influencers, researchCount, briefCount, pendingApprovals, scheduledCount, livePosts, recentJobs, paused, mode] = await Promise.all([
    prisma.influencer.findMany({
      where: { active: true },
      include: { personaVersions: { orderBy: { version: "desc" }, take: 1 }, socialAccounts: true, strategies: { orderBy: [{ year: "desc" }, { version: "desc" }], take: 1 } },
      orderBy: { createdAt: "asc" }
    }),
    prisma.referencePost.count(),
    prisma.contentBrief.count(),
    prisma.contentBrief.count({ where: { status: { in: ["review", "pending_approval"] } } }),
    prisma.scheduledPost.count({ where: { status: "scheduled" } }),
    prisma.publishedPost.count({ where: { dryRun: false, publicationStatus: "published" } }),
    prisma.generationJob.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { contentBrief: { include: { influencer: true } } } }),
    prisma.systemSetting.findUnique({ where: { key: "publishing_paused" } }),
    prisma.systemSetting.findUnique({ where: { key: "publishing_mode" } })
  ]);
  const safeInfluencers = influencers.map((person) => ({
    ...person,
    socialAccounts: person.socialAccounts.map(({ tokenCiphertext, ...account }) => ({ ...account, tokenConfigured: Boolean(tokenCiphertext) }))
  }));
  return NextResponse.json({
    influencers: safeInfluencers,
    stats: { researchCount, briefCount, pendingApprovals, scheduledCount, livePosts },
    recentJobs,
    publishingPaused: paused?.value ?? true,
    publishingMode: mode?.value ?? "human_approval",
    livePublishingEnabled: process.env.LIVE_PUBLISHING_ENABLED === "true",
    activation: {
      finePhotoGenConfigured: Boolean(process.env.FINE_PHOTO_GEN_BASE_URL && process.env.FINE_PHOTO_GEN_SESSION_COOKIE),
      mediaProvider: process.env.MEDIA_PROVIDER || "fine-photo-gen",
      instagramConfigured: influencers.some((person) => person.socialAccounts.some((account) => account.platform === "instagram" && account.status === "connected" && Boolean(account.tokenCiphertext))),
      xConfigured: influencers.some((person) => person.socialAccounts.some((account) => account.platform === "x" && account.status === "connected" && Boolean(account.tokenCiphertext)))
    }
  });
}
