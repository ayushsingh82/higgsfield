import { randomBytes, scrypt, timingSafeEqual, createHmac } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;
const SESSION_COOKIE = "session";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  const derived = await scryptAsync(password, salt, 64);
  const hashBuf = Buffer.from(hash, "hex");
  return derived.length === hashBuf.length && timingSafeEqual(derived, hashBuf);
}

function requireSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

function sign(value: string): string {
  const sig = createHmac("sha256", requireSecret()).update(value).digest("hex");
  return `${value}.${sig}`;
}

function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = createHmac("sha256", requireSecret()).update(value).digest("hex");
  const sigBuf = Buffer.from(sig, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  return value;
}

export async function createSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, sign(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Throws if there's no valid session — callers (API routes) let that 500/reject rather than silently proceeding unauthenticated. */
export async function getCurrentUserId(): Promise<string> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) throw new Error("not authenticated");
  const userId = unsign(raw);
  if (!userId) throw new Error("invalid session");
  return userId;
}
