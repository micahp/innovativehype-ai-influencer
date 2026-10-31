import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { assignmentIntegrityMatches, getLockedAssignment } from "@/lib/creative-assignments";

const schema = z.object({
  decision: z.enum(["approved", "rejected"]),
  ownerConfirmedId: z.string(),
  notes: z.string().max(1000).optional()
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await context.params;
  const locked = getLockedAssignment(id);
  if (!locked) return NextResponse.json({ error: "Unknown creative assignment ID." }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid assignment review" }, { status: 400 });
  if (parsed.data.ownerConfirmedId !== id) return NextResponse.json({ error: "Confirm the exact assignment ID shown in the review." }, { status: 400 });

  const row = await prisma.creativeAssignment.findUnique({ where: { id }, include: { influencer: { select: { slug: true } } } });
  if (!row) return NextResponse.json({ error: "Assignment pack has not been seeded." }, { status: 409 });
  if (!assignmentIntegrityMatches({ id: row.id, influencerSlug: row.influencer.slug, creatorIds: row.creatorIds, postIds: row.postIds, photoSourceIds: row.photoSourceIds, evidenceSnapshot: row.evidenceSnapshot })) {
    return NextResponse.json({ error: "Saved source IDs or evidence do not match this locked assignment. Review is disabled." }, { status: 409 });
  }

  const reviewedAt = new Date();
  const assignment = await prisma.creativeAssignment.update({
    where: { id },
    data: {
      status: parsed.data.decision,
      reviewedAt,
      reviewedBy: "admin",
      reviewNotes: parsed.data.notes || null
    }
  });
  await audit("admin", `creative_assignment.${parsed.data.decision}`, "CreativeAssignment", id, { status: assignment.status });
  return NextResponse.json({ assignment });
}
