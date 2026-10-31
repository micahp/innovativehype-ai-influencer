import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await context.params;
  const scheduled = await prisma.scheduledPost.findUnique({
    where: { id },
    include: { contentBrief: { include: { influencer: true, creativeAssignment: true } }, mediaAsset: true }
  });
  if (!scheduled) return NextResponse.json({ error: "Scheduled post not found" }, { status: 404 });
  if (!scheduled.contentBrief.assignmentId || !scheduled.contentBrief.creativeAssignment || scheduled.contentBrief.creativeAssignment.status !== "approved" || scheduled.contentBrief.creativeAssignment.influencerId !== scheduled.contentBrief.influencerId) return NextResponse.json({ error: "Only content tied to a current owner-approved assignment can be exported." }, { status: 409 });
  return NextResponse.json({
    platform: scheduled.platform,
    scheduledFor: scheduled.scheduledFor,
    influencer: { name: scheduled.contentBrief.influencer.name, handle: scheduled.contentBrief.influencer.suggestedHandle, bio: scheduled.contentBrief.influencer.bio },
    caption: scheduled.contentBrief.captionDraft,
    mediaUrl: scheduled.mediaAsset?.isMock ? null : scheduled.mediaAsset?.outputUrl ?? null,
    mediaStatus: scheduled.mediaAsset?.isMock ? "mock_fixture_only" : scheduled.mediaAsset ? "approved_asset" : "none",
    sourceReferenceUrl: scheduled.contentBrief.referencePostId
      ? (await prisma.referencePost.findUnique({ where: { id: scheduled.contentBrief.referencePostId }, select: { url: true } }))?.url ?? null
      : null
  }, { headers: { "content-disposition": `attachment; filename="${scheduled.platform}-post-${scheduled.id}.json"` } });
}
