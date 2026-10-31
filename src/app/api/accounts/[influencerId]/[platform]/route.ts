import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { encryptSocialToken } from "@/lib/social-token";

const schema = z.object({
  accessToken: z.string().min(20).max(8000),
  accountId: z.string().min(1).max(128),
  graphVersion: z.string().regex(/^v\d+\.\d+$/).optional(),
  handle: z.string().max(64).optional(),
  tokenExpiresAt: z.string().datetime().optional()
});

export async function PUT(request: NextRequest, context: { params: Promise<{ influencerId: string; platform: string }> }) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { influencerId, platform } = await context.params;
  if (platform !== "instagram" && platform !== "x") return NextResponse.json({ error: "Platform must be instagram or x." }, { status: 400 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid account configuration" }, { status: 400 });
  const influencer = await prisma.influencer.findUnique({ where: { id: influencerId }, select: { id: true } });
  if (!influencer) return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
  let tokenCiphertext: string;
  try { tokenCiphertext = encryptSocialToken(parsed.data.accessToken); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Credential encryption is not configured" }, { status: 503 }); }
  const graphVersion = parsed.data.graphVersion || process.env.INSTAGRAM_GRAPH_VERSION || "";
  if (platform === "instagram" && !/^v\d+\.\d+$/.test(graphVersion)) return NextResponse.json({ error: "Set a supported Meta Graph API version before connecting Instagram." }, { status: 400 });
  try {
    const validationUrl = platform === "x"
      ? "https://api.x.com/2/users/me?user.fields=id"
      : `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(parsed.data.accountId)}?fields=id`;
    const validation = await fetch(validationUrl, { headers: { authorization: `Bearer ${parsed.data.accessToken}` }, signal: AbortSignal.timeout(15_000) });
    if (!validation.ok) return NextResponse.json({ error: `${platform === "x" ? "X" : "Meta"} rejected the token or account id (HTTP ${validation.status}).` }, { status: 400 });
    const result = await validation.json() as { id?: unknown; data?: { id?: unknown } };
    const verifiedId = platform === "x" ? result.data?.id : result.id;
    if (typeof verifiedId !== "string" || verifiedId !== parsed.data.accountId) return NextResponse.json({ error: "The access token did not verify for the supplied account ID." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Could not validate the platform token. Check server network access and try again." }, { status: 502 });
  }
  const settings = platform === "instagram" ? { graphVersion } : {};
  const account = await prisma.socialAccount.upsert({
    where: { influencerId_platform: { influencerId, platform } },
    update: { externalAccountId: parsed.data.accountId, handle: parsed.data.handle || null, tokenCiphertext, tokenExpiresAt: parsed.data.tokenExpiresAt ? new Date(parsed.data.tokenExpiresAt) : null, settings, status: "connected" },
    create: { influencerId, platform, externalAccountId: parsed.data.accountId, handle: parsed.data.handle || null, tokenCiphertext, tokenExpiresAt: parsed.data.tokenExpiresAt ? new Date(parsed.data.tokenExpiresAt) : null, settings, status: "connected" }
  });
  await audit("admin", "social_account.credentials_updated", "SocialAccount", account.id, { platform, accountId: account.externalAccountId, tokenExpiresAt: account.tokenExpiresAt?.toISOString() ?? null });
  return NextResponse.json({ account: { id: account.id, platform: account.platform, handle: account.handle, status: account.status, tokenConfigured: true, tokenExpiresAt: account.tokenExpiresAt } });
}
