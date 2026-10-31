import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { createBrief } from "@/lib/brief-builder";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { jsonSafe } from "@/lib/serialize";

const schema = z.object({
  influencerId: z.string().min(1),
  assignmentId: z.string().min(1),
  title: z.string().min(3).max(180),
  concept: z.string().min(10).max(2000),
  platform: z.enum(["instagram", "x"]),
  format: z.string().min(1).max(80),
  contentPillar: z.string().min(1).max(100),
  scheduledFor: z.string().datetime().optional()
}).strict();

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const briefs = await prisma.contentBrief.findMany({
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
    include: { influencer: { select: { id: true, name: true, slug: true } }, assets: { orderBy: { createdAt: "desc" } }, approvals: true, creativeAssignment: { select: { id: true, direction: true, status: true } }, referencePost: { select: { id: true, url: true, creatorHandle: true } }, trendSignal: { select: { id: true, topic: true, sourceUrl: true, confidence: true } }, scheduledPosts: { include: { publishedPost: true } } }
  });
  return NextResponse.json(jsonSafe({ briefs }));
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid brief" }, { status: 400 });
  try {
    const brief = await createBrief({ ...parsed.data, scheduledFor: parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : undefined });
    await audit("admin", "content_brief.created", "ContentBrief", brief.id, { assignmentId: brief.assignmentId, intendedShot: brief.intendedShot });
    return NextResponse.json({ brief }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create brief" }, { status: 400 });
  }
}
