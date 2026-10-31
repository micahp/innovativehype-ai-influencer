import { describe, expect, it } from "vitest";
import { isPublicHttpsSourceUrl } from "@/lib/research-trend";

describe("trend source URL validation", () => {
  it("accepts public HTTPS evidence links including query-based source pages", () => {
    expect(isPublicHttpsSourceUrl("https://trends.google.com/trends/explore?q=gaming")).toBe(true);
    expect(isPublicHttpsSourceUrl("https://www.youtube.com/watch?v=example")).toBe(true);
  });

  it("rejects insecure, credentialed, and local-network URLs", () => {
    expect(isPublicHttpsSourceUrl("http://news.example.com/story")).toBe(false);
    expect(isPublicHttpsSourceUrl("https://user:pass@news.example.com/story")).toBe(false);
    expect(isPublicHttpsSourceUrl("https://localhost/story")).toBe(false);
    expect(isPublicHttpsSourceUrl("https://192.168.1.4/story")).toBe(false);
    expect(isPublicHttpsSourceUrl("not a url")).toBe(false);
  });
});
