import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { maySchedule } from "@/lib/workflow";
import { assignmentBlockReason } from "@/lib/creative-assignments";

const schema = z.object({ contentBriefId: z.string().min(1), platform: z.enum(["instagram", "x"]), scheduledFor: z.string().datetime(), assetId: z.string().optional() });

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid schedule request" }, { status: 400 });
  const item = parsed.data;
  const scheduledFor = new Date(item.scheduledFor);
  if (scheduledFor.getTime() < Date.now() - 60_000) return NextResponse.json({ error: "Choose a future publishing time." }, { status: 400 });
  const brief = await prisma.contentBrief.findUnique({ where: { id: item.contentBriefId }, include: { influencer: { select: { slug: true } }, creativeAssignment: true } });
  if (!brief) return NextResponse.json({ error: "Content brief not found" }, { status: 404 });
  if (!brief.assignmentId || !brief.creativeAssignment) return NextResponse.json({ error: "A brief must have an owner-approved assignment before scheduling." }, { status: 409 });
  const assignmentProblem = assignmentBlockReason({ id: brief.creativeAssignment.id, influencerSlug: brief.influencer.slug, status: brief.creativeAssignment.status, creatorIds: brief.creativeAssignment.creatorIds, postIds: brief.creativeAssignment.postIds, photoSourceIds: brief.creativeAssignment.photoSourceIds, evidenceSnapshot: brief.creativeAssignment.evidenceSnapshot });
  if (assignmentProblem || brief.assignmentId !== brief.creativeAssignment.id || brief.creativeAssignment.influencerId !== brief.influencerId) return NextResponse.json({ error: assignmentProblem || "The brief's assignment does not match its creator." }, { status: 409 });
  if (!maySchedule(brief.status)) return NextResponse.json({ error: "Only approved content can be scheduled." }, { status: 409 });
  if (item.platform !== brief.platform) return NextResponse.json({ error: "Scheduled platform must match the approved brief." }, { status: 400 });
  if (brief.format !== "text_post" && !item.assetId) return NextResponse.json({ error: "Choose an approved image candidate for this post format." }, { status: 400 });
  if (brief.format === "text_post" && item.assetId) return NextResponse.json({ error: "Use the single-image format to attach media to a post." }, { status: 400 });
  if (item.assetId) {
    const asset = await prisma.mediaAsset.findFirst({ where: { id: item.assetId, contentBriefId: brief.id, reviewStatus: "approved" } });
    if (!asset) return NextResponse.json({ error: "The selected media candidate is not approved for this brief." }, { status: 400 });
  }
  const idempotencyKey = `${brief.id}:${item.platform}`;
  const existing = await prisma.scheduledPost.findUnique({ where: { idempotencyKey }, include: { publishedPost: true } });
  if (existing?.publishedPost) return NextResponse.json({ error: "This post already has a terminal publication record." }, { status: 409 });
  const scheduled = await prisma.scheduledPost.upsert({
    where: { idempotencyKey },
    update: { scheduledFor, mediaAssetId: item.assetId, status: "scheduled", lastError: null },
    create: { contentBriefId: brief.id, platform: item.platform, scheduledFor, mediaAssetId: item.assetId, idempotencyKey }
  });
  await prisma.contentBrief.update({ where: { id: brief.id }, data: { status: "scheduled", scheduledFor } });
  await audit("admin", "post.scheduled", "ScheduledPost", scheduled.id, { platform: item.platform, scheduledFor: scheduledFor.toISOString() });
  return NextResponse.json({ scheduled }, { status: 201 });
}
