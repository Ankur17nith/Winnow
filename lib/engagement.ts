export const ROAST_COUNT_COOKIE = "winnow_n";

/** How many roasts this visitor already got, from a plain counter cookie. Analytics only, so it needs no signature. */
export function parseRoastCount(value: string | undefined): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 && n < 1000 ? n : 0;
}
