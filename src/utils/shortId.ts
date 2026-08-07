import { randomInt } from "crypto";

// Base62 alphabet (no look-alike-free requirement; codes are copied via UI,
// not typed by hand). 62^7 ≈ 3.5 trillion combos → collisions effectively nil.
const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CODE_LENGTH = 7;

/** Generate one random base62 short code (no uniqueness check). */
export function makeShortCode(length: number = CODE_LENGTH): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

/**
 * Generate a short code guaranteed unique against `exists`.
 * `exists(code)` should resolve true if the code is already taken.
 * Retries a handful of times before giving up (astronomically unlikely).
 */
export async function generateUniqueShortCode(
  exists: (code: string) => Promise<boolean>,
  length: number = CODE_LENGTH
): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeShortCode(length);
    if (!(await exists(code))) return code;
  }
  // Extremely unlikely; widen the space rather than fail.
  return makeShortCode(length + 3);
}
