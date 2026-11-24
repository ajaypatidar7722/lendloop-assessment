// HMAC-SHA256 request signing, shared by both directions of the n8n integration.
//
//   signed string:  `${timestamp}.${rawBody}`   (timestamp = Unix seconds)
//   headers:        X-LendLoop-Timestamp, X-LendLoop-Signature (lowercase hex)
//
// The timestamp is inside the signed string, so it can't be swapped to defeat
// the replay window. Uses Web Crypto, which the default Convex runtime provides.

export const TIMESTAMP_HEADER = "X-LendLoop-Timestamp";
export const SIGNATURE_HEADER = "X-LendLoop-Signature";
export const EVENT_ID_HEADER = "X-LendLoop-Event-Id";

/** Requests older (or newer) than this are rejected as possible replays. */
export const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

const encoder = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length !== 64 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export function nowSeconds(now: number = Date.now()): string {
  return Math.floor(now / 1000).toString();
}

export async function sign(secret: string, timestamp: string, body: string): Promise<string> {
  const key = await hmacKey(secret);
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`)));
}

/**
 * True only for a well-formed signature over `${timestamp}.${body}` whose
 * timestamp is within the replay window. `crypto.subtle.verify` compares in
 * constant time, so the check doesn't leak how many bytes matched.
 */
export async function verify(
  secret: string,
  timestamp: string | null,
  body: string,
  signature: string | null,
  now: number = Date.now(),
): Promise<boolean> {
  if (!timestamp || !signature || !/^\d{1,12}$/.test(timestamp)) return false;
  if (Math.abs(Math.floor(now / 1000) - Number(timestamp)) > MAX_CLOCK_SKEW_SECONDS) return false;
  const expected = fromHex(signature);
  if (expected === null) return false;
  const key = await hmacKey(secret);
  return await crypto.subtle.verify("HMAC", key, expected, encoder.encode(`${timestamp}.${body}`));
}
