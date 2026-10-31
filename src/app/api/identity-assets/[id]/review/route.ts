import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const schema = z.object({ decision: z.enum(["approved", "rejected"]), notes: z.string().max(1000).optional() });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid identity review" }, { status: 400 });
  const existing = await prisma.identityReferenceAsset.findUnique({ where: { id }, include: { influencer: { select: { slug: true } }, personaVersion: { select: { version: true } } } });
  if (!existing) return NextResponse.json({ error: "Identity reference not found." }, { status: 404 });
  const asset = await prisma.identityReferenceAsset.update({
    where: { id },
    data: { status: parsed.data.decision, reviewedAt: new Date(), reviewedBy: "admin" },
    include: { influencer: { select: { id: true, slug: true, name: true } }, personaVersion: { select: { version: true } } }
  });
  await audit("admin", `identity_reference.${parsed.data.decision}`, "IdentityReferenceAsset", id, { influencerId: asset.influencerId, kind: asset.kind, personaVersion: asset.personaVersion.version, notes: parsed.data.notes ?? null });
  const { storageKey, ...safeAsset } = asset;
  return NextResponse.json({ asset: { ...safeAsset, fileUrl: `/api/identity-assets/${asset.id}/file` } });
}
