import { afterEach, describe, expect, it } from "vitest";
import { decryptSocialToken, encryptSocialToken } from "@/lib/social-token";

const originalKey = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  else process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = originalKey;
});

describe("social token encryption", () => {
  it("encrypts with authenticated encryption and roundtrips the value", () => {
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 17).toString("base64");
    const token = "long-social-access-token-value-for-a-test";
    const ciphertext = encryptSocialToken(token);
    expect(ciphertext).not.toContain(token);
    expect(decryptSocialToken(ciphertext)).toBe(token);
    const parts = ciphertext.split(".");
    parts[2] = `${parts[2][0] === "A" ? "B" : "A"}${parts[2].slice(1)}`;
    expect(() => decryptSocialToken(parts.join("."))).toThrow();
  });

  it("rejects absent or invalid encryption keys", () => {
    delete process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
    expect(() => encryptSocialToken("token" )).toThrow(/required/);
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(12).toString("base64");
    expect(() => encryptSocialToken("token")).toThrow(/32-byte/);
  });
});
