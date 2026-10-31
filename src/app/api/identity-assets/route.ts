import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { encryptIdentityAsset, identityStorageDirectory, identityStoragePath, supportedImageType } from "@/lib/identity-storage";

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const influencerId = request.nextUrl.searchParams.get("influencerId") || undefined;
  const assets = await prisma.identityReferenceAsset.findMany({
    where: influencerId ? { influencerId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { influencer: { select: { id: true, slug: true, name: true } }, personaVersion: { select: { version: true } } }
  });
  return NextResponse.json({ assets: assets.map(({ storageKey, ...asset }) => ({ ...asset, fileUrl: `/api/identity-assets/${asset.id}/file` })) });
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 16 * 1024 * 1024) return NextResponse.json({ error: "Identity reference files must be 15 MB or smaller." }, { status: 413 });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected a multipart image upload." }, { status: 400 });
  const influencerId = String(form.get("influencerId") || "");
  const kind = String(form.get("kind") || "");
  const rightsBasis = String(form.get("rightsBasis") || "");
  const rightsNotes = String(form.get("rightsNotes") || "").trim();
  const rightsConfirmed = form.get("rightsConfirmed") === "true";
  const file = form.get("file");
  if (rightsNotes.length > 2000) return NextResponse.json({ error: "Rights notes must be 2,000 characters or fewer." }, { status: 400 });
  if (!influencerId || !["face", "body"].includes(kind) || !["owner_created_fictional_character", "authorized_reference"].includes(rightsBasis)) {
    return NextResponse.json({ error: "Choose a creator, face/body reference type, and rights basis." }, { status: 400 });
  }
  if (!rightsConfirmed || rightsNotes.length < 10) return NextResponse.json({ error: "Confirm that this image depicts an original fictional character or an explicitly authorized reference and explain its rights." }, { status: 400 });
  if (!(file instanceof File) || file.size === 0 || file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "Choose an image file no larger than 15 MB." }, { status: 400 });

  const influencer = await prisma.influencer.findUnique({ where: { id: influencerId }, include: { personaVersions: { orderBy: { version: "desc" }, take: 1 } } });
  const personaVersion = influencer?.personaVersions[0];
  if (!influencer || !personaVersion) return NextResponse.json({ error: "Creator persona was not found." }, { status: 404 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const imageType = supportedImageType(bytes);
  if (!imageType || imageType.mime !== file.type) return NextResponse.json({ error: "Upload a valid PNG, JPEG, or WebP image." }, { status: 400 });

  const storageKey = `${randomUUID()}.enc`;
  const destination = identityStoragePath(storageKey);
  await mkdir(identityStorageDirectory(), { recursive: true });
  let encryptedBytes: Buffer;
  try { encryptedBytes = encryptIdentityAsset(bytes); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Identity encryption is not configured." }, { status: 503 }); }
  await writeFile(destination, encryptedBytes, { flag: "wx", mode: 0o600 });
  try {
    const asset = await prisma.identityReferenceAsset.create({
      data: {
        influencerId,
        personaVersionId: personaVersion.id,
        kind,
        storageKey,
        contentType: imageType.mime,
        byteSize: bytes.byteLength,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        rightsBasis,
        rightsNotes,
        status: "pending_review"
      },
      include: { influencer: { select: { id: true, slug: true, name: true } }, personaVersion: { select: { version: true } } }
    });
    await audit("admin", "identity_reference.uploaded", "IdentityReferenceAsset", asset.id, { influencerId, kind, personaVersion: personaVersion.version, sha256: asset.sha256 });
    const { storageKey: _storageKey, ...safeAsset } = asset;
    return NextResponse.json({ asset: { ...safeAsset, fileUrl: `/api/identity-assets/${asset.id}/file` } }, { status: 201 });
  } catch (error) {
    await unlink(destination).catch(() => undefined);
    throw error;
  }
}
