import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SCRYPT_SALT = "dockly-encryption-v1";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Add any secret phrase (or a 64-char hex key) to .env"
    );
  }
  const trimmed = raw.trim();
  // If it looks like a 64-char hex key, use it directly
  if (trimmed.length === 64 && /^[0-9a-fA-F]+$/.test(trimmed)) {
    const buf = Buffer.from(trimmed, "hex");
    if (buf.length === 32) return buf;
  }
  // Otherwise derive a 32-byte key from the passphrase
  return scryptSync(trimmed, SCRYPT_SALT, KEY_LENGTH);
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = (cipher as unknown as { getAuthTag(): Buffer }).getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const enc = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc).toString("utf8") + decipher.final("utf8");
}
