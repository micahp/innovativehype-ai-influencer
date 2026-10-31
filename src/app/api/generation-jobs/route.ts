import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { enqueueGeneration } from "@/lib/queue";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  contentBriefId: z.string().min(1),
  idempotencyKey: z.string().min(8).max(128).optional(),
  candidateCount: z.number().int().min(1).max(4).default(1),
  seed: z.number().int().min(0).max(4_294_967_295).optional(),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "3:4", "4:3"]).default("3:4"),
  referenceImageUrl: z.string().url().optional(),
  rightsConfirmed: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid generation request" }, { status: 400 });
  if (parsed.data.referenceImageUrl && !parsed.data.rightsConfirmed) {
    return NextResponse.json({ error: "Confirm that you have permission to use the reference image before generation." }, { status: 400 });
  }
  const brief = await prisma.contentBrief.findUnique({ where: { id: parsed.data.contentBriefId }, include: { influencer: true } });
  if (!brief) return NextResponse.json({ error: "Content brief not found" }, { status: 404 });

  const idempotencyKey = parsed.data.idempotencyKey || randomUUID();
  let job = await prisma.generationJob.findUnique({ where: { idempotencyKey } });
  if (job && job.contentBriefId !== brief.id) return NextResponse.json({ error: "Idempotency key is already attached to another brief." }, { status: 409 });
  if (!job) {
    job = await prisma.generationJob.create({
      data: {
        contentBriefId: brief.id,
        provider: process.env.MEDIA_PROVIDER || "fine-photo-gen",
        idempotencyKey,
        request: {
          candidateCount: parsed.data.candidateCount,
          seed: parsed.data.seed,
          aspectRatio: parsed.data.aspectRatio,
          referenceImageUrl: parsed.data.referenceImageUrl
        } as Prisma.InputJsonValue
      }
    });
  }
  try {
    await enqueueGeneration(job.id);
  } catch (error) {
    console.warn("Generation job persisted but Redis dispatch is pending", error instanceof Error ? error.message : error);
  }
  await audit("admin", "generation_job.queued", "GenerationJob", job.id, { contentBriefId: brief.id, provider: job.provider });
  return NextResponse.json({ job, queued: true }, { status: 202 });
}
