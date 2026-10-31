import { afterEach, describe, expect, it } from "vitest";
import { createSessionToken, getCookieValue, isAuthenticated, isWorkerAuthorized, passwordMatches, verifySessionToken } from "@/lib/auth";

const originalSecret = process.env.SESSION_SECRET;
const originalWorkerToken = process.env.INTERNAL_WORKER_TOKEN;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = originalSecret;
  if (originalWorkerToken === undefined) delete process.env.INTERNAL_WORKER_TOKEN;
  else process.env.INTERNAL_WORKER_TOKEN = originalWorkerToken;
});

describe("admin session handling", () => {
  it("signs expiring sessions and rejects tampering or expiration", () => {
    process.env.SESSION_SECRET = "a-secure-test-secret-with-more-than-32-bytes";
    const token = createSessionToken(1000);
    expect(verifySessionToken(token, 1001)).toBe(true);
    expect(verifySessionToken(token, 1000 + 60 * 60 * 12)).toBe(false);
    expect(verifySessionToken(`${token}x`, 1001)).toBe(false);
  });

  it("reads the signed cookie without confusing neighboring cookies", () => {
    expect(getCookieValue("other=1; studio_session=abc%3D; tail=2")).toBe("abc=");
    process.env.SESSION_SECRET = "a-secure-test-secret-with-more-than-32-bytes";
    expect(isAuthenticated("studio_session=bad")).toBe(false);
  });

  it("compares admin passwords without accepting missing configuration", () => {
    expect(passwordMatches("correct", "correct")).toBe(true);
    expect(passwordMatches("wrong", "correct")).toBe(false);
    expect(passwordMatches("correct", undefined)).toBe(false);
  });

  it("authorizes only the configured internal worker bearer token", () => {
    process.env.INTERNAL_WORKER_TOKEN = "a-long-internal-worker-token-for-this-test";
    expect(isWorkerAuthorized("Bearer a-long-internal-worker-token-for-this-test")).toBe(true);
    expect(isWorkerAuthorized("Bearer wrong-token")).toBe(false);
    expect(isWorkerAuthorized(null)).toBe(false);
    process.env.INTERNAL_WORKER_TOKEN = "short";
    expect(isWorkerAuthorized("Bearer short")).toBe(false);
  });
});
