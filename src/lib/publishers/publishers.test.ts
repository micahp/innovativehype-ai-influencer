import { afterEach, describe, expect, it, vi } from "vitest";
import { publishInstagramImage } from "@/lib/publishers/instagram";
import { isSafeHttpsMediaUrl } from "@/lib/publishers/http";
import { publishXPost } from "@/lib/publishers/x";

const oldGraphVersion = process.env.INSTAGRAM_GRAPH_VERSION;
const oldXBase = process.env.X_API_BASE_URL;
const oldAllowedHosts = process.env.PUBLISH_MEDIA_ALLOWED_HOSTS;

afterEach(() => {
  vi.unstubAllGlobals();
  if (oldGraphVersion === undefined) delete process.env.INSTAGRAM_GRAPH_VERSION;
  else process.env.INSTAGRAM_GRAPH_VERSION = oldGraphVersion;
  if (oldXBase === undefined) delete process.env.X_API_BASE_URL;
  else process.env.X_API_BASE_URL = oldXBase;
  if (oldAllowedHosts === undefined) delete process.env.PUBLISH_MEDIA_ALLOWED_HOSTS;
  else process.env.PUBLISH_MEDIA_ALLOWED_HOSTS = oldAllowedHosts;
});

describe("Instagram publisher", () => {
  it("creates and publishes an image container using the configured professional account", async () => {
    process.env.INSTAGRAM_GRAPH_VERSION = "v24.0";
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return new Response(JSON.stringify(calls.length === 1 ? { id: "container-1" } : { id: "media-1" }), { status: 200 });
    }));
    const result = await publishInstagramImage({ accessToken: "secret-token", accountId: "ig-user-1", caption: "Hello", mediaUrl: "https://assets.example/image.jpg" });
    expect(result.externalPostId).toBe("media-1");
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toContain("graph.facebook.com/v24.0/ig-user-1/media");
    expect(calls[0].init?.headers).toMatchObject({ authorization: "Bearer secret-token" });
    expect(String(calls[0].init?.body)).toContain("image_url=https%3A%2F%2Fassets.example%2Fimage.jpg");
    expect(calls[1].url).toContain("/ig-user-1/media_publish");
    expect(String(calls[1].init?.body)).toContain("creation_id=container-1");
  });

  it("fails closed without an approved public HTTPS asset or a Graph version", async () => {
    await expect(publishInstagramImage({ accessToken: "token", accountId: "account", caption: "Hi" })).rejects.toThrow(/requires an approved image/);
    delete process.env.INSTAGRAM_GRAPH_VERSION;
    await expect(publishInstagramImage({ accessToken: "token", accountId: "account", caption: "Hi", mediaUrl: "https://assets.example/a.jpg" })).rejects.toThrow(/INSTAGRAM_GRAPH_VERSION/);
  });
});

describe("X publisher", () => {
  it("marks AI-generated content and creates text posts through API v2", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return calls.length === 1
        ? new Response(JSON.stringify({ data: { id: "user-id" } }), { status: 200 })
        : new Response(JSON.stringify({ data: { id: "post-22" } }), { status: 201 });
    }));
    const result = await publishXPost({ accessToken: "oauth-user-token", accountId: "user-id", caption: "My generated post" });
    expect(result.externalPostId).toBe("post-22");
    expect(calls[0].url).toBe("https://api.x.com/2/users/me?user.fields=id");
    expect(calls[1].url).toBe("https://api.x.com/2/tweets");
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({ text: "My generated post", made_with_ai: true });
  });

  it("uploads a public approved image before attaching it to the post", async () => {
    process.env.PUBLISH_MEDIA_ALLOWED_HOSTS = "assets.example";
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.includes("/users/me?")) return new Response(JSON.stringify({ data: { id: "user-id" } }), { status: 200 });
      if (url === "https://assets.example/image.jpg") return new Response(Uint8Array.from([1, 2, 3]), { status: 200, headers: { "content-type": "image/jpeg" } });
      if (url.endsWith("/media/upload/initialize")) return new Response(JSON.stringify({ data: { id: "media-44" } }), { status: 200 });
      if (url.endsWith("/media/upload/media-44/append")) return new Response(JSON.stringify({ data: {} }), { status: 200 });
      if (url.endsWith("/media/upload/media-44/finalize")) return new Response(JSON.stringify({ data: { id: "media-44" } }), { status: 200 });
      return new Response(JSON.stringify({ data: { id: "post-45" } }), { status: 201 });
    }));
    const result = await publishXPost({ accessToken: "oauth-user-token", accountId: "user-id", caption: "Image post", mediaUrl: "https://assets.example/image.jpg" });
    expect(result.externalPostId).toBe("post-45");
    expect(calls.map((call) => call.url)).toEqual([
      "https://api.x.com/2/users/me?user.fields=id",
      "https://assets.example/image.jpg",
      "https://api.x.com/2/media/upload/initialize",
      "https://api.x.com/2/media/upload/media-44/append",
      "https://api.x.com/2/media/upload/media-44/finalize",
      "https://api.x.com/2/tweets"
    ]);
    expect(JSON.parse(String(calls[2].init?.body))).toMatchObject({ total_bytes: 3, media_type: "image/jpeg", media_category: "tweet_image" });
    expect(JSON.parse(String(calls[3].init?.body))).toMatchObject({ media: "AQID", segment_index: 0 });
    expect(JSON.parse(String(calls[5].init?.body))).toMatchObject({ text: "Image post", made_with_ai: true, media: { media_ids: ["media-44"] } });
  });

  it("only downloads HTTPS media from explicitly allowed hosts", () => {
    expect(isSafeHttpsMediaUrl("https://cdn.example.test/file.png", ["example.test"])).toBe(true);
    expect(isSafeHttpsMediaUrl("http://cdn.example.test/file.png", ["example.test"])).toBe(false);
    expect(isSafeHttpsMediaUrl("https://localhost/file.png", ["localhost"])).toBe(false);
    expect(isSafeHttpsMediaUrl("https://evil.test/file.png", ["example.test"])).toBe(false);
  });

  it("distinguishes definite platform rejection from an uncertain server failure", async () => {
    const definite = vi.fn(async () => new Response("{}", { status: 400 }));
    vi.stubGlobal("fetch", definite);
    await expect(publishXPost({ accessToken: "token", accountId: "user", caption: "Hi" })).rejects.toMatchObject({ ambiguous: false, status: 400 });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
    await expect(publishXPost({ accessToken: "token", accountId: "user", caption: "Hi" })).rejects.toMatchObject({ ambiguous: true, status: 503 });
  });
});
