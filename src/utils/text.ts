export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(value: string): string[] {
  return normalizeText(value).split(" ").filter(Boolean);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * "Did you mean" suggestions: returns vocabulary terms within an edit distance
 * proportional to the term length (edge case 6).
 */
export function suggestSpellings(query: string, vocabulary: string[], limit = 3): string[] {
  const q = normalizeText(query);
  if (q.length < 3) return [];
  const maxDistance = q.length <= 5 ? 1 : 2;
  const scored: { term: string; distance: number }[] = [];
  const seen = new Set<string>();
  for (const raw of vocabulary) {
    const term = normalizeText(raw);
    if (!term || seen.has(term) || term === q) continue;
    seen.add(term);
    const distance = levenshtein(q, term);
    if (distance <= maxDistance) scored.push({ term, distance });
  }
  return scored.sort((a, b) => a.distance - b.distance).slice(0, limit).map((s) => s.term);
}

export function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
