import { describe, expect, it } from "vitest";
import { decryptIdentityAsset, encryptIdentityAsset, identityStoragePath, supportedImageType } from "@/lib/identity-storage";

describe("private identity asset storage", () => {
  it("accepts known raster file signatures", () => {
    expect(supportedImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.mime).toBe("image/png");
    expect(supportedImageType(new Uint8Array([0xff, 0xd8, 0xff, 0]))?.mime).toBe("image/jpeg");
    expect(supportedImageType(new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]))?.mime).toBe("image/webp");
    expect(supportedImageType(new Uint8Array([0, 1, 2]))).toBeNull();
  });

  it("rejects unsafe storage keys", () => {
    expect(() => identityStoragePath("../../secret.png")).toThrow(/invalid identity asset storage key/i);
  });

  it("encrypts stored references and rejects tampering", () => {
    const previous = process.env.IDENTITY_ASSET_ENCRYPTION_KEY;
    process.env.IDENTITY_ASSET_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    try {
      const source = Buffer.from("original character reference");
      const encrypted = encryptIdentityAsset(source);
      expect(encrypted.equals(source)).toBe(false);
      expect(decryptIdentityAsset(encrypted).equals(source)).toBe(true);
      encrypted[12] ^= 1;
      expect(() => decryptIdentityAsset(encrypted)).toThrow();
    } finally {
      if (previous === undefined) delete process.env.IDENTITY_ASSET_ENCRYPTION_KEY;
      else process.env.IDENTITY_ASSET_ENCRYPTION_KEY = previous;
    }
  });
});
