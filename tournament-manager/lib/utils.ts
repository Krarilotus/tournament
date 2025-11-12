import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Helper: Converts a 0-based index into an alphabetic code.
 * 0 -> "A", 1 -> "B", 25 -> "Z", 26 -> "AA", 27 -> "AB"
 */
export function alphaCode(idx: number): string {
  let n = idx;
  let s = "";
  while (true) {
    const rem = n % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor(n / 26) - 1;
    if (n < 0) break;
  }
  return s;
}

/**
 * Creates a stable, sorted lookup key from a list of player IDs.
 * e.g., ["c", "a", "b"] -> "a|b|c"
 */
export function makeTeamLookupKey(playerIds: string[]): string {
  return playerIds.slice().sort().join("|");
}