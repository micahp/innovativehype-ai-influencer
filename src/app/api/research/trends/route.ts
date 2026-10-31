import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { isAuthenticated } from "@/lib/auth";
import { jsonSafe } from "@/lib/serialize";
import { prisma } from "@/lib/prisma";
import { isPublicHttpsSourceUrl } from "@/lib/research-trend";

const trendSchema = z.object({
  influencerId: z.string().optional(),
  topic: z.string().min(3).max(160),
  sourceUrl: z.string().url(),
  sourceName: z.string().min(2).max(160),
  observedAt: z.string().datetime(),
  targetAudience: z.string().max(500).optional(),
  relevance: z.string().min(5).max(1200),
  proposedConcept: z.string().min(5).max(1600),
  estimatedProductionEffort: z.enum(["low", "medium", "high"]),
  recommendedWindow: z.string().datetime().optional(),
  confidence: z.number().min(0).max(1),
  expiresAt: z.string().datetime().optional(),
  evidenceNote: z.string().min(5).max(1600)
}).superRefine((input, context) => {
  if (input.expiresAt && new Date(input.expiresAt) <= new Date(input.observedAt)) {
    context.addIssue({ code: "custom", path: ["expiresAt"], message: "Expiry must be later than the observation time." });
  }
});

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const trends = await prisma.trendSignal.findMany({
    orderBy: { observedAt: "desc" }, take: 500,
    include: { influencer: { select: { id: true, name: true, slug: true } } }
  });
  return NextResponse.json(jsonSafe({ trends }));
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = trendSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid trend signal" }, { status: 400 });
  const input = parsed.data;
  if (!isPublicHttpsSourceUrl(input.sourceUrl)) return NextResponse.json({ error: "Trend evidence must use a public HTTPS URL." }, { status: 400 });
  if (input.influencerId && !(await prisma.influencer.findUnique({ where: { id: input.influencerId } }))) return NextResponse.json({ error: "Influencer not found" }, { status: 404 });

  const signal = await prisma.trendSignal.create({
    data: {
      influencerId: input.influencerId,
      topic: input.topic.trim(),
      sourceUrl: input.sourceUrl,
      sourceName: input.sourceName.trim(),
      observedAt: new Date(input.observedAt),
      targetAudience: input.targetAudience?.trim(),
      relevance: input.relevance.trim(),
      proposedConcept: input.proposedConcept.trim(),
      estimatedProductionEffort: input.estimatedProductionEffort,
      recommendedWindow: input.recommendedWindow ? new Date(input.recommendedWindow) : undefined,
      confidence: input.confidence,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      evidence: { note: input.evidenceNote.trim(), provenance: "manual_submission" } as Prisma.InputJsonValue
    },
    include: { influencer: { select: { id: true, name: true, slug: true } } }
  });
  await audit("admin", "trend_signal.submitted", "TrendSignal", signal.id, { sourceUrl: signal.sourceUrl, sourceName: signal.sourceName, provenance: "manual_submission" });
  return NextResponse.json(jsonSafe({ signal }), { status: 201 });
}
