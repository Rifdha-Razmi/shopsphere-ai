export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * clamp(q, 0, 1);
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Round a price to a "retail" ending (e.g. 3,299 / 499). */
export function retailRound(value: number): number {
  if (value < 100) return Math.max(9, Math.round(value / 10) * 10 - 1);
  if (value < 1000) return Math.round(value / 50) * 50 - 1;
  return Math.round(value / 100) * 100 - 1;
}
