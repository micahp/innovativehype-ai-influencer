import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "studio_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function createSessionToken(now = Math.floor(Date.now() / 1000)) {
  const payload = Buffer.from(JSON.stringify({ sub: "admin", exp: now + SESSION_TTL_SECONDS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined, now = Math.floor(Date.now() / 1000)) {
  if (!token) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; exp?: number };
    return decoded.sub === "admin" && typeof decoded.exp === "number" && decoded.exp > now;
  } catch {
    return false;
  }
}

export function getCookieValue(cookieHeader: string | null, name = SESSION_COOKIE) {
  if (!cookieHeader) return undefined;
  const entry = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
}

export function isAuthenticated(cookieHeader: string | null) {
  try {
    return verifySessionToken(getCookieValue(cookieHeader));
  } catch {
    return false;
  }
}

export function isWorkerAuthorized(authorizationHeader: string | null) {
  const configured = process.env.INTERNAL_WORKER_TOKEN;
  const token = authorizationHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!configured || configured.length < 32 || !token) return false;
  const expected = Buffer.from(configured);
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function passwordMatches(candidate: string, expected: string | undefined) {
  if (!expected) return false;
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function sessionCookie(token: string, secure = process.env.NODE_ENV === "production") {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure ? "; Secure" : ""}`;
}

export function expiredSessionCookie(secure = process.env.NODE_ENV === "production") {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}
