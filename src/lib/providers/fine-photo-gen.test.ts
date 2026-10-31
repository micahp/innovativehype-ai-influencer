import { afterEach, describe, expect, it, vi } from "vitest";
import { FinePhotoGenProvider, MockMediaProvider } from "@/lib/providers/fine-photo-gen";

const requiredEnv = ["FINE_PHOTO_GEN_BASE_URL", "FINE_PHOTO_GEN_SESSION_COOKIE", "FINE_PHOTO_GEN_MODEL_ID", "FINE_PHOTO_GEN_GAMER_USER_MODEL_ID", "FINE_PHOTO_GEN_FITNESS_USER_MODEL_ID"] as const;
const originalEnv = Object.fromEntries(requiredEnv.map((key) => [key, process.env[key]]));

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of requiredEnv) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

describe("Fine Photo Gen provider adapter", () => {
  it("maps a text-to-image request to the inspected authenticated endpoint", async () => {
    process.env.FINE_PHOTO_GEN_BASE_URL = "https://photo.example/";
    process.env.FINE_PHOTO_GEN_SESSION_COOKIE = "session-cookie=secret";
    process.env.FINE_PHOTO_GEN_MODEL_ID = "model/base";
    process.env.FINE_PHOTO_GEN_GAMER_USER_MODEL_ID = "fine-photo-user-model-id";
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ success: true, image: { id: "image-1", url: "https://cdn.example/image.webp", width: 900, height: 1200 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const output = await new FinePhotoGenProvider().generate({ influencerSlug: "mira-byte", prompt: "original portrait", negativePrompt: "stored but unsupported", seed: 42, aspectRatio: "3:4" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const requestBody = JSON.parse(String(init.body));
    expect(url).toBe("https://photo.example/api/generate");
    expect(new Headers(init.headers).get("cookie")).toBe("session-cookie=secret");
    expect(requestBody).toMatchObject({ prompt: "original portrait", modelId: "model/base", userModelId: "fine-photo-user-model-id", seed: 42, aspectRatio: "3:4" });
    expect(requestBody).not.toHaveProperty("negativePrompt");
    expect(output).toMatchObject({ provider: "fine-photo-gen", model: "fine-photo-user-model-id", outputUrl: "https://cdn.example/image.webp", isMock: false, seed: 42 });
  });

  it("uses the existing edit route only when a reference image was explicitly supplied", async () => {
    process.env.FINE_PHOTO_GEN_BASE_URL = "https://photo.example";
    process.env.FINE_PHOTO_GEN_SESSION_COOKIE = "session-cookie=secret";
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ success: true, image: { id: "edit-1", url: "https://cdn.example/edited.webp" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const output = await new FinePhotoGenProvider().generate({ influencerSlug: "sana-vale", prompt: "adapt this licensed image", seed: 7, referenceImageUrl: "https://assets.example/licensed.jpg" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://photo.example/api/edit");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ prompt: "adapt this licensed image", imageUrl: "https://assets.example/licensed.jpg", seed: 7 });
    expect(output.metadata.operation).toBe("image_edit");
  });

  it("fails clearly when the server-side session bridge is absent", async () => {
    delete process.env.FINE_PHOTO_GEN_BASE_URL;
    delete process.env.FINE_PHOTO_GEN_SESSION_COOKIE;
    await expect(new FinePhotoGenProvider().generate({ influencerSlug: "mira-byte", prompt: "test", seed: 1 })).rejects.toThrow("FINE_PHOTO_GEN_BASE_URL and FINE_PHOTO_GEN_SESSION_COOKIE");
  });

  it("marks mock output as a fixture rather than an image", async () => {
    const output = await new MockMediaProvider().generate({ influencerSlug: "mira-byte", prompt: "fixture", seed: 3 });
    expect(output.isMock).toBe(true);
    expect(output.outputUrl).toMatch(/^mock:\/\//);
  });
});
