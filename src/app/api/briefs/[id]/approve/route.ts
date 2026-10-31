import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { assignmentBlockReason } from "@/lib/creative-assignments";

const schema = z.object({ decision: z.enum(["approved", "changes_requested"]), assetId: z.string().optional(), notes: z.string().max(1000).optional() });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid approval" }, { status: 400 });
  const brief = await prisma.contentBrief.findUnique({ where: { id }, include: { influencer: { select: { slug: true } }, creativeAssignment: true } });
  if (!brief) return NextResponse.json({ error: "Content brief not found" }, { status: 404 });
  if (!brief.assignmentId || !brief.creativeAssignment) return NextResponse.json({ error: "A legacy brief without an owner-approved assignment cannot be reviewed." }, { status: 409 });
  const assignmentProblem = assignmentBlockReason({ id: brief.creativeAssignment.id, influencerSlug: brief.influencer.slug, status: brief.creativeAssignment.status, creatorIds: brief.creativeAssignment.creatorIds, postIds: brief.creativeAssignment.postIds, photoSourceIds: brief.creativeAssignment.photoSourceIds, evidenceSnapshot: brief.creativeAssignment.evidenceSnapshot });
  if (assignmentProblem || brief.assignmentId !== brief.creativeAssignment.id || brief.creativeAssignment.influencerId !== brief.influencerId) return NextResponse.json({ error: assignmentProblem || "The brief's assignment does not match its creator." }, { status: 409 });
  if (parsed.data.decision === "approved" && brief.format !== "text_post" && !parsed.data.assetId) {
    return NextResponse.json({ error: "Select an image candidate before approving this image post." }, { status: 400 });
  }
  if (parsed.data.assetId) {
    const asset = await prisma.mediaAsset.findFirst({ where: { id: parsed.data.assetId, contentBriefId: brief.id } });
    if (!asset) return NextResponse.json({ error: "Selected candidate does not belong to this brief." }, { status: 400 });
    await prisma.mediaAsset.update({ where: { id: asset.id }, data: { reviewStatus: parsed.data.decision } });
  }
  const status = parsed.data.decision === "approved" ? "approved" : "changes_requested";
  const [, approval] = await prisma.$transaction([
    prisma.contentBrief.update({ where: { id }, data: { status } }),
    prisma.approvalRecord.create({ data: { contentBriefId: id, mediaAssetId: parsed.data.assetId, decision: parsed.data.decision, actor: "admin", notes: parsed.data.notes } })
  ]);
  await audit("admin", `content_brief.${parsed.data.decision}`, "ContentBrief", id, { assetId: parsed.data.assetId ?? null });
  return NextResponse.json({ approval, status });
}
