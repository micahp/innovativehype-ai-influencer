import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  influencerId: z.string().optional(),
  url: z.string().url(),
  platform: z.enum(["instagram", "x", "youtube", "reddit", "other"]),
  creatorHandle: z.string().max(120).optional(),
  originalPostId: z.string().max(200).optional(),
  publishedAt: z.string().datetime().optional(),
  format: z.string().min(1).max(80),
  caption: z.string().max(5000).optional(),
  hashtags: z.array(z.string().max(80)).max(50).optional(),
  likes: z.number().int().nonnegative().optional(),
  comments: z.number().int().nonnegative().optional(),
  shares: z.number().int().nonnegative().optional(),
  saves: z.number().int().nonnegative().optional(),
  views: z.number().int().nonnegative().optional(),
  impressions: z.number().int().nonnegative().optional(),
  followerCount: z.number().int().nonnegative().optional(),
  description: z.string().max(5000).optional(),
  evidenceNotes: z.string().max(2000).optional(),
  metricsObservedAt: z.string().datetime().optional()
});

function urlMatchesPlatform(value: string, platform: string) {
  const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  if (platform === "instagram") return host === "instagram.com";
  if (platform === "x") return host === "x.com" || host === "twitter.com";
  if (platform === "youtube") return host === "youtube.com" || host === "youtu.be";
  if (platform === "reddit") return host === "reddit.com" || host.endsWith(".reddit.com");
  return true;
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const posts = await prisma.referencePost.findMany({
    orderBy: { createdAt: "desc" }, take: 200,
    include: { source: true, influencer: { select: { id: true, name: true, slug: true } } }
  });
  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid reference post" }, { status: 400 });
  const input = parsed.data;
  if (!urlMatchesPlatform(input.url, input.platform)) return NextResponse.json({ error: "The URL host does not match the selected platform." }, { status: 400 });
  if (input.influencerId && !(await prisma.influencer.findUnique({ where: { id: input.influencerId } }))) {
    return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
  }
  const existing = await prisma.referencePost.findUnique({ where: { url: input.url } });
  if (existing) return NextResponse.json({ post: existing, duplicate: true }, { status: 200 });

  const source = await prisma.researchSource.create({
    data: { kind: "reference_post", platform: input.platform, url: input.url, provenance: "manual_submission", submittedBy: "admin" }
  });
  const post = await prisma.referencePost.create({
    data: {
      influencerId: input.influencerId,
      sourceId: source.id,
      platform: input.platform,
      creatorHandle: input.creatorHandle,
      originalPostId: input.originalPostId,
      url: input.url,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : undefined,
      format: input.format,
      caption: input.caption,
      hashtags: input.hashtags,
      likes: input.likes,
      comments: input.comments,
      shares: input.shares,
      saves: input.saves,
      views: input.views,
      impressions: input.impressions,
      followerCount: input.followerCount,
      metricsObservedAt: input.metricsObservedAt ? new Date(input.metricsObservedAt) : undefined,
      description: input.description,
      evidenceNotes: input.evidenceNotes ?? "Manually submitted. Fields left blank were not supplied and remain unknown."
    },
    include: { source: true }
  });
  await audit("admin", "reference_post.submitted", "ReferencePost", post.id, { sourceUrl: post.url, platform: post.platform });
  return NextResponse.json({ post, duplicate: false }, { status: 201 });
}
