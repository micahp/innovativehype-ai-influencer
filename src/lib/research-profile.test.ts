import { describe, expect, it } from "vitest";
import { canonicalProfileUrl, profileUrlMatchesPlatform } from "@/lib/research-profile";

describe("reference creator profile URL validation", () => {
  it("accepts supported public profile URL shapes", () => {
    expect(profileUrlMatchesPlatform("https://www.instagram.com/creator.name/", "instagram")).toBe(true);
    expect(profileUrlMatchesPlatform("https://x.com/creator", "x")).toBe(true);
    expect(profileUrlMatchesPlatform("https://youtube.com/@creator", "youtube")).toBe(true);
    expect(profileUrlMatchesPlatform("https://www.reddit.com/u/creator", "reddit")).toBe(true);
    expect(profileUrlMatchesPlatform("https://twitch.tv/creator", "twitch")).toBe(true);
  });

  it("rejects non-HTTPS, mismatched, non-profile, and tracking URLs", () => {
    expect(profileUrlMatchesPlatform("http://instagram.com/creator", "instagram")).toBe(false);
    expect(profileUrlMatchesPlatform("https://instagram.com/creator", "x")).toBe(false);
    expect(profileUrlMatchesPlatform("https://instagram.com/explore", "instagram")).toBe(false);
    expect(profileUrlMatchesPlatform("https://x.com/creator/status/123", "x")).toBe(false);
    expect(profileUrlMatchesPlatform("https://reddit.com/r/gaming", "reddit")).toBe(false);
    expect(profileUrlMatchesPlatform("https://instagram.com/creator?utm_source=feed", "instagram")).toBe(false);
    expect(profileUrlMatchesPlatform("https://instagram.com.evil.test/creator", "instagram")).toBe(false);
  });

  it("normalizes host casing and trailing slashes before duplicate checks", () => {
    expect(canonicalProfileUrl("https://WWW.Instagram.com/creator///")).toBe("https://instagram.com/creator");
  });
});
