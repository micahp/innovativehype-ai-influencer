import { randomUUID } from "node:crypto";

export type GenerationInput = {
  influencerSlug: string;
  prompt: string;
  negativePrompt?: string | null;
  modelId?: string | null;
  userModelId?: string | null;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "3:4" | "4:3";
  seed: number;
  referenceImageUrl?: string | null;
};

export type GenerationOutput = {
  outputUrl: string;
  provider: string;
  model: string;
  seed: number;
  isMock: boolean;
  metadata: Record<string, unknown>;
};

export interface MediaGenerationProvider {
  generate(input: GenerationInput): Promise<GenerationOutput>;
}

type FinePhotoGenResponse = {
  success?: boolean;
  error?: string;
  image?: { id?: string; url?: string; width?: number; height?: number; prompt?: string; aspectRatio?: string };
};

export class ProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigurationError";
  }
}

function modelFor(slug: string) {
  const envKey = slug === "mira-byte" ? "FINE_PHOTO_GEN_GAMER_MODEL_ID" : "FINE_PHOTO_GEN_FITNESS_MODEL_ID";
  const userModelEnvKey = slug === "mira-byte" ? "FINE_PHOTO_GEN_GAMER_USER_MODEL_ID" : "FINE_PHOTO_GEN_FITNESS_USER_MODEL_ID";
  return {
    modelId: process.env[envKey] || process.env.FINE_PHOTO_GEN_MODEL_ID || "black-forest-labs/FLUX.1-schnell-Free",
    userModelId: process.env[userModelEnvKey] || undefined
  };
}

export class FinePhotoGenProvider implements MediaGenerationProvider {
  async generate(input: GenerationInput): Promise<GenerationOutput> {
    const baseUrl = process.env.FINE_PHOTO_GEN_BASE_URL?.replace(/\/$/, "");
    const cookie = process.env.FINE_PHOTO_GEN_SESSION_COOKIE;
    if (!baseUrl || !cookie) {
      throw new ProviderConfigurationError("Fine Photo Gen requires FINE_PHOTO_GEN_BASE_URL and FINE_PHOTO_GEN_SESSION_COOKIE. See docs/fine-photo-gen-integration.md.");
    }

    const configured = modelFor(input.influencerSlug);
    const useEditRoute = Boolean(input.referenceImageUrl);
    const endpoint = useEditRoute ? "/api/edit" : "/api/generate";
    const body = useEditRoute
      ? { prompt: input.prompt, imageUrl: input.referenceImageUrl, seed: input.seed }
      : {
          prompt: input.prompt,
          modelId: input.modelId || configured.modelId,
          userModelId: input.userModelId || configured.userModelId,
          aspectRatio: input.aspectRatio || "3:4",
          seed: input.seed
        };

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(240_000)
    });
    const result = await response.json().catch(() => ({})) as FinePhotoGenResponse;
    if (!response.ok || !result.success || !result.image?.url) {
      const detail = result.error || `Fine Photo Gen returned HTTP ${response.status}`;
      throw new Error(`Fine Photo Gen generation failed: ${detail}`);
    }

    const outputUrl = result.image.url;
    if (!outputUrl.startsWith("https://") && !outputUrl.startsWith("http://")) {
      throw new Error("Fine Photo Gen returned an unsupported output URL.");
    }
    return {
      outputUrl,
      provider: "fine-photo-gen",
      model: input.userModelId || configured.userModelId || input.modelId || configured.modelId,
      seed: input.seed,
      isMock: false,
      metadata: {
        finePhotoGenImageId: result.image.id ?? null,
        width: result.image.width ?? null,
        height: result.image.height ?? null,
        returnedAspectRatio: result.image.aspectRatio ?? null,
        operation: useEditRoute ? "image_edit" : "text_to_image"
      }
    };
  }
}

export class MockMediaProvider implements MediaGenerationProvider {
  async generate(input: GenerationInput): Promise<GenerationOutput> {
    return {
      outputUrl: `mock://studio/${randomUUID()}`,
      provider: "mock",
      model: "workflow-fixture",
      seed: input.seed,
      isMock: true,
      metadata: { message: "Workflow fixture only. No image was generated.", prompt: input.prompt }
    };
  }
}

export function getMediaProvider(): MediaGenerationProvider {
  return process.env.MEDIA_PROVIDER === "mock" ? new MockMediaProvider() : new FinePhotoGenProvider();
}
