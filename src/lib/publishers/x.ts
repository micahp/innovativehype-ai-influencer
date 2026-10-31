import { isSafeHttpsMediaUrl, readJsonResponse } from "./http";
import { PublisherError, type Publisher } from "./types";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const CHUNK_BYTES = 1024 * 1024;

function xApiBase() {
  const configured = process.env.X_API_BASE_URL || "https://api.x.com/2";
  let base: URL;
  try { base = new URL(configured); } catch { throw new PublisherError("X_API_BASE_URL must be an HTTPS X API v2 base URL ending in /2.", false); }
  if (base.protocol !== "https:" || base.pathname !== "/2" || base.search || base.hash) throw new PublisherError("X_API_BASE_URL must be an HTTPS X API v2 base URL ending in /2.", false);
  return base.toString().replace(/\/$/, "");
}

async function uploadImage(accessToken: string, mediaUrl: string) {
  const allowedHosts = (process.env.PUBLISH_MEDIA_ALLOWED_HOSTS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (!isSafeHttpsMediaUrl(mediaUrl, allowedHosts)) throw new PublisherError("X media upload requires HTTPS and a host listed in PUBLISH_MEDIA_ALLOWED_HOSTS.", false);
  const downloaded = await fetch(mediaUrl, { redirect: "error", signal: AbortSignal.timeout(15_000) });
  if (!downloaded.ok) throw new PublisherError(`Could not retrieve approved media (HTTP ${downloaded.status}).`, false, downloaded.status);
  const contentType = (downloaded.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (!new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]).has(contentType)) throw new PublisherError("X image publishing supports JPEG, PNG, WebP, and GIF assets.", false);
  const declaredLength = Number(downloaded.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) throw new PublisherError("X image assets must be no larger than 5 MB.", false);
  const reader = downloaded.body?.getReader();
  if (!reader) throw new PublisherError("The approved image response had no body.", false);
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new PublisherError("X image assets must be no larger than 5 MB.", false);
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  if (bytes.length === 0) throw new PublisherError("The approved image is empty.", false);
  const base = xApiBase();
  const headers = { authorization: `Bearer ${accessToken}`, "content-type": "application/json" };
  const initialized = await readJsonResponse(await fetch(`${base}/media/upload/initialize`, {
    method: "POST", headers,
    body: JSON.stringify({ total_bytes: bytes.length, media_type: contentType, media_category: "tweet_image", shared: false }),
    signal: AbortSignal.timeout(20_000)
  }));
  const mediaId = typeof (initialized.data as { id?: unknown } | undefined)?.id === "string" ? (initialized.data as { id: string }).id : null;
  if (!mediaId) throw new PublisherError("X returned no media upload id.", false);
  let segmentIndex = 0;
  for (let offset = 0; offset < bytes.length; offset += CHUNK_BYTES) {
    const media = bytes.subarray(offset, Math.min(offset + CHUNK_BYTES, bytes.length)).toString("base64");
    await readJsonResponse(await fetch(`${base}/media/upload/${encodeURIComponent(mediaId)}/append`, {
      method: "POST", headers,
      body: JSON.stringify({ media, segment_index: segmentIndex++ }), signal: AbortSignal.timeout(20_000)
    }));
  }
  await readJsonResponse(await fetch(`${base}/media/upload/${encodeURIComponent(mediaId)}/finalize`, {
    method: "POST", headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(20_000)
  }));
  return mediaId;
}

export const publishXPost: Publisher = async ({ accessToken, accountId, caption, mediaUrl }) => {
  const base = xApiBase();
  const account = await readJsonResponse(await fetch(`${base}/users/me?user.fields=id`, {
    headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15_000)
  }));
  const authenticatedId = typeof (account.data as { id?: unknown } | undefined)?.id === "string" ? (account.data as { id: string }).id : null;
  if (!authenticatedId) throw new PublisherError("X did not return the authenticated user id.", false);
  if (authenticatedId !== accountId) throw new PublisherError("X token belongs to a different account than the configured user id.", false);
  const mediaId = mediaUrl ? await uploadImage(accessToken, mediaUrl) : null;
  const body: Record<string, unknown> = { text: caption, made_with_ai: true };
  if (mediaId) body.media = { media_ids: [mediaId] };
  const response = await readJsonResponse(await fetch(`${base}/tweets`, {
    method: "POST", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(25_000)
  }));
  const data = response.data as { id?: unknown } | undefined;
  const externalPostId = typeof data?.id === "string" ? data.id : null;
  if (!externalPostId) throw new PublisherError("X did not confirm a post id after create.", true);
  return { externalPostId, postUrl: `https://x.com/i/web/status/${externalPostId}`, result: { provider: "x-api-v2", mediaId, response } };
};
