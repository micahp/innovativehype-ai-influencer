import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assignmentIntegrityMatches, lockedCreativeAssignments } from "@/lib/creative-assignments";

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const saved = await prisma.creativeAssignment.findMany({ include: { influencer: { select: { id: true, slug: true, name: true } } } });
  const byId = new Map(saved.map((row) => [row.id, row]));
  const assignments = lockedCreativeAssignments.map((locked) => {
    const row = byId.get(locked.id);
    const influencerSlug = row?.influencer.slug ?? locked.influencerSlug;
    const integrityOk = Boolean(row && assignmentIntegrityMatches({
      id: row.id,
      influencerSlug,
      creatorIds: row.creatorIds,
      postIds: row.postIds,
      photoSourceIds: row.photoSourceIds,
      evidenceSnapshot: row.evidenceSnapshot
    }));
    return {
      ...locked,
      status: integrityOk ? row?.status ?? "pending_owner_review" : "source_integrity_error",
      reviewedAt: row?.reviewedAt ?? null,
      reviewNotes: row?.reviewNotes ?? null,
      boardUrl: `/api/creative-assignments/${encodeURIComponent(locked.id)}/board`,
      influencer: row?.influencer ?? null,
      integrityOk
    };
  });
  return NextResponse.json({ assignments });
}
