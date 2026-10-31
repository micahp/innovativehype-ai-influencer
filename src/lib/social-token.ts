import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey() {
  const configured = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  if (!configured) throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY is required to save social credentials");
  const key = Buffer.from(configured, "base64");
  if (key.length !== 32) throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  return key;
}

export function encryptSocialToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSocialToken(ciphertext: string) {
  const [version, iv, authTag, encrypted, extra] = ciphertext.split(".");
  if (version !== "v1" || !iv || !authTag || !encrypted || extra) throw new Error("Unsupported encrypted social credential format");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}
