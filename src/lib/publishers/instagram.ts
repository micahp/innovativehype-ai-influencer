import { readJsonResponse } from "./http";
import { PublisherError, type Publisher } from "./types";

export const publishInstagramImage: Publisher = async ({ accessToken, accountId, caption, mediaUrl, graphVersion }) => {
  if (!mediaUrl) throw new PublisherError("Instagram feed publishing requires an approved image URL.", false);
  if (!mediaUrl.startsWith("https://")) throw new PublisherError("Instagram requires a publicly reachable HTTPS image URL.", false);
  const version = graphVersion || process.env.INSTAGRAM_GRAPH_VERSION;
  if (!version || !/^v\d+\.\d+$/.test(version)) throw new PublisherError("Set INSTAGRAM_GRAPH_VERSION to an API version enabled for your Meta app.", false);
  const base = `https://graph.facebook.com/${version}`;
  const headers = { authorization: `Bearer ${accessToken}` };
  const containerParams = new URLSearchParams({ image_url: mediaUrl, caption });
  const container = await readJsonResponse(await fetch(`${base}/${encodeURIComponent(accountId)}/media`, {
    method: "POST", headers: { ...headers, "content-type": "application/x-www-form-urlencoded" },
    body: containerParams, signal: AbortSignal.timeout(25_000)
  }));
  const containerId = typeof container.id === "string" ? container.id : null;
  if (!containerId) throw new PublisherError("Instagram returned no media container id.", false);
  const publishParams = new URLSearchParams({ creation_id: containerId });
  const published = await readJsonResponse(await fetch(`${base}/${encodeURIComponent(accountId)}/media_publish`, {
    method: "POST", headers: { ...headers, "content-type": "application/x-www-form-urlencoded" },
    body: publishParams, signal: AbortSignal.timeout(25_000)
  }));
  const externalPostId = typeof published.id === "string" ? published.id : null;
  if (!externalPostId) throw new PublisherError("Instagram did not confirm the published media id.", true);
  return { externalPostId, result: { provider: "instagram-graph-api", containerId, published } };
};
