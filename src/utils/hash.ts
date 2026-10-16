/** Deterministic 32-bit FNV-1a hash — used for stable mock data (variants, stock). */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Deterministic pseudo-random number in [0, 1) for a given seed string. */
export function seededRandom(seed: string): number {
  return (hashString(seed) % 100000) / 100000;
}
