import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { isAuthenticated } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { canonicalProfileUrl, profileUrlMatchesPlatform } from "@/lib/research-profile";

const profileSchema = z.object({
  influencerId: z.string().optional(),
  platform: z.enum(["instagram", "x", "youtube", "tiktok", "reddit", "twitch"]),
  profileUrl: z.string().url(),
  username: z.string().max(120).optional(),
  niche: z.string().min(2).max(120),
  audiencePositioning: z.string().min(5).max(1200),
  audienceDemographics: z.string().max(800).optional(),
  followerCount: z.number().int().nonnegative().optional(),
  followerCountObservedAt: z.string().datetime().optional(),
  contentTypes: z.array(z.string().min(1).max(80)).max(30).optional(),
  postingFrequency: z.string().max(160).optional(),
  hashtags: z.array(z.string().max(80)).max(50).optional(),
  publicEngagement: z.object({
    sampledPostUrl: z.string().url().optional(),
    likes: z.number().int().nonnegative().optional(),
    comments: z.number().int().nonnegative().optional(),
    views: z.number().int().nonnegative().optional(),
    observedAt: z.string().datetime().optional()
  }).optional(),
  relevanceReason: z.string().min(5).max(1200)
});

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const accounts = await prisma.referenceInfluencer.findMany({
    orderBy: { collectedAt: "desc" }, take: 500,
    include: { source: true, influencer: { select: { id: true, name: true, slug: true } } }
  });
  return NextResponse.json({ accounts });
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid reference profile" }, { status: 400 });
  const input = parsed.data;
  if (!profileUrlMatchesPlatform(input.profileUrl, input.platform)) return NextResponse.json({ error: "The profile URL host or path does not match the selected platform." }, { status: 400 });
  const profileUrl = canonicalProfileUrl(input.profileUrl);
  if (input.influencerId && !(await prisma.influencer.findUnique({ where: { id: input.influencerId } }))) return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
  const existing = await prisma.referenceInfluencer.findUnique({ where: { profileUrl } });
  if (existing) return NextResponse.json({ account: existing, duplicate: true });

  try {
    const account = await prisma.$transaction(async (tx) => {
      const source = await tx.researchSource.create({
        data: { kind: "reference_influencer", platform: input.platform, url: profileUrl, provenance: "manual_submission", submittedBy: "admin" }
      });
      return tx.referenceInfluencer.create({
        data: {
          influencerId: input.influencerId,
          sourceId: source.id,
          platform: input.platform,
          profileUrl,
          username: input.username,
          niche: input.niche,
          audiencePositioning: input.audiencePositioning,
          audienceDemographics: input.audienceDemographics,
          followerCount: input.followerCount,
          followerCountObservedAt: input.followerCount === undefined ? undefined : input.followerCountObservedAt ? new Date(input.followerCountObservedAt) : new Date(),
          contentTypes: input.contentTypes,
          postingFrequency: input.postingFrequency,
          hashtags: input.hashtags,
          publicEngagement: input.publicEngagement ? Object.fromEntries(Object.entries({
            sampledPostUrl: input.publicEngagement.sampledPostUrl,
            likes: input.publicEngagement.likes,
            comments: input.publicEngagement.comments,
            views: input.publicEngagement.views,
            observedAt: input.publicEngagement.observedAt ?? ((input.publicEngagement.likes !== undefined || input.publicEngagement.comments !== undefined || input.publicEngagement.views !== undefined) ? new Date().toISOString() : undefined)
          }).filter(([, value]) => value !== undefined)) as Prisma.InputJsonValue : undefined,
          relevanceReason: input.relevanceReason
        },
        include: { source: true }
      });
    });
    await audit("admin", "reference_influencer.submitted", "ReferenceInfluencer", account.id, { profileUrl: account.profileUrl, platform: account.platform, provenance: "manual_submission" });
    return NextResponse.json({ account, duplicate: false }, { status: 201 });
  } catch (error) {
    const duplicate = await prisma.referenceInfluencer.findUnique({ where: { profileUrl } }).catch(() => null);
    if (duplicate) return NextResponse.json({ account: duplicate, duplicate: true });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save reference profile" }, { status: 500 });
  }
}
