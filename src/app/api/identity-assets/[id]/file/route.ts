import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptIdentityAsset, identityStoragePath } from "@/lib/identity-storage";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await context.params;
  const asset = await prisma.identityReferenceAsset.findUnique({ where: { id }, select: { storageKey: true, contentType: true, sha256: true } });
  if (!asset) return NextResponse.json({ error: "Identity reference not found." }, { status: 404 });
  try {
    const bytes = decryptIdentityAsset(await readFile(identityStoragePath(asset.storageKey)));
    if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256) return NextResponse.json({ error: "Stored identity image failed its integrity check." }, { status: 409 });
    return new NextResponse(bytes, { headers: { "content-type": asset.contentType, "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-disposition": "inline; filename=identity-reference" } });
  } catch {
    return NextResponse.json({ error: "Stored identity image is unavailable." }, { status: 404 });
  }
}
