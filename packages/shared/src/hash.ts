/**
 * Content hashing for deduplication.
 * Uses SHA-256, truncated to 24 chars for turn hashes.
 */

export function contentHash(content: string): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(content);
  return hasher.digest("hex");
}

export function turnHash(content: string): string {
  const normalized = content.trim().toLowerCase().replace(/\s+/g, " ");
  return contentHash(normalized).slice(0, 24);
}
