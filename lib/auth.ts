// Single-user passphrase gate. Cookie value is `<expiresAtMs>.<hex(hmac(expiresAtMs))>`.
// Web Crypto only — this module is imported by Edge middleware.

const COOKIE_NAME = "jdy_auth";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const enc = new TextEncoder();

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET must be set (>= 16 chars)");
  }
  return s;
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function createSession(): Promise<{ name: string; value: string; maxAge: number }> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const sig = await hmac(String(expiresAt));
  return {
    name: COOKIE_NAME,
    value: `${expiresAt}.${sig}`,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export async function verifySession(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot === -1) return false;
  const expiresAtStr = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expected = await hmac(expiresAtStr);
  return constantTimeEqual(sig, expected);
}

export function checkPassphrase(submitted: string): boolean {
  const expected = process.env.APP_PASSPHRASE ?? "";
  if (expected.length === 0) return false;
  return constantTimeEqual(submitted, expected);
}

export function isGateEnabled(): boolean {
  return (process.env.APP_PASSPHRASE ?? "").length > 0;
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
