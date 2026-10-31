const hosts: Record<string, string[]> = {
  instagram: ["instagram.com"],
  x: ["x.com", "twitter.com"],
  youtube: ["youtube.com"],
  tiktok: ["tiktok.com"],
  reddit: ["reddit.com"],
  twitch: ["twitch.tv"]
};

export function profileUrlMatchesPlatform(rawUrl: string, platform: string) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!hosts[platform]?.includes(host)) return false;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return false;
    if (["instagram", "x", "tiktok", "twitch"].includes(platform)) {
      return parts.length === 1 && !["explore", "home", "search", "directory", "settings"].includes(parts[0].toLowerCase());
    }
    if (platform === "youtube") {
      return (parts.length === 1 && parts[0].startsWith("@")) || (parts.length === 2 && ["channel", "c", "user"].includes(parts[0].toLowerCase()));
    }
    return parts.length === 2 && ["user", "u"].includes(parts[0].toLowerCase());
  } catch {
    return false;
  }
}

export function canonicalProfileUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}
