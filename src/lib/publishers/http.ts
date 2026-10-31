import { PublisherError } from "./types";

export async function readJsonResponse(response: Response) {
  const text = await response.text();
  let body: Record<string, unknown> = {};
  try { body = text ? JSON.parse(text) as Record<string, unknown> : {}; } catch { body = {}; }
  if (!response.ok) {
    const ambiguous = response.status >= 500 || response.status === 408;
    throw new PublisherError(`Platform request failed with HTTP ${response.status}.`, ambiguous, response.status);
  }
  return body;
}

export function isSafeHttpsMediaUrl(raw: string, allowedHosts: string[]) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) return false;
    return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch { return false; }
}
