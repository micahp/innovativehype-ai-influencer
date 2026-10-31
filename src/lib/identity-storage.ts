import path from "node:path";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export function identityStorageDirectory() {
  return path.resolve(process.env.MEDIA_STORAGE_DIR || path.join(process.cwd(), "storage"));
}

export function identityStoragePath(storageKey: string) {
  if (!/^[0-9a-f-]{36}\.enc$/.test(storageKey)) throw new Error("Invalid identity asset storage key.");
  const root = identityStorageDirectory();
  const resolved = path.resolve(root, storageKey);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error("Identity asset path is outside the configured storage directory.");
  return resolved;
}

function encryptionKey() {
  const encoded = process.env.IDENTITY_ASSET_ENCRYPTION_KEY;
  if (!encoded) throw new Error("IDENTITY_ASSET_ENCRYPTION_KEY must be configured before identity references can be stored.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("IDENTITY_ASSET_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return key;
}

export function encryptIdentityAsset(plaintext: Uint8Array) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptIdentityAsset(encrypted: Uint8Array) {
  if (encrypted.byteLength < 29) throw new Error("Encrypted identity image is truncated.");
  const bytes = Buffer.from(encrypted);
  const iv = bytes.subarray(0, 12);
  const tag = bytes.subarray(12, 28);
  const ciphertext = bytes.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function supportedImageType(bytes: Uint8Array) {
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= pngSignature.length && pngSignature.every((value, index) => bytes[index] === value)) return { mime: "image/png", extension: "png" };
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", extension: "jpg" };
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return { mime: "image/webp", extension: "webp" };
  return null;
}

