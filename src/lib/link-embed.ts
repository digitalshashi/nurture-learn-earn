// URL detection and embed metadata extraction

export type EmbedType =
  | "youtube"
  | "instagram"
  | "twitter"
  | "vimeo"
  | "tiktok"
  | "loom"
  /** A media file served straight from our own bucket — or anywhere else. */
  | "video"
  | "image"
  | "generic";

export interface EmbedData {
  type: EmbedType;
  url: string;
  embedUrl?: string;
  videoId?: string;
  platformIcon?: string;
  platformName?: string;
}

const URL_REGEX = /https?:\/\/[^\s<]+/gi;

const TRUSTED_DOMAINS = [
  "youtube.com", "youtu.be", "www.youtube.com",
  "instagram.com", "www.instagram.com",
  "twitter.com", "x.com", "www.twitter.com", "www.x.com",
  "vimeo.com", "www.vimeo.com",
  "tiktok.com", "www.tiktok.com", "vm.tiktok.com",
  "loom.com", "www.loom.com",
];

/**
 * Media the app stores itself, rather than a page to embed.
 *
 * An upload lands in R2 under its own file name, so the public URL carries the
 * extension — `…/1712345678-clip.mp4`. Without this the parser called such a
 * URL "generic" and the feed rendered the raw R2 link as a link card, which is
 * why uploaded videos never played.
 *
 * `.m3u8` is deliberately absent: a bare <video> cannot play HLS outside
 * Safari, so a stream stays a link rather than becoming a dead player.
 */
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".ogv"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".bmp", ".svg"];

export function directMediaKind(url: string): "video" | "image" | null {
  let path: string;
  try {
    // A signed R2/S3 URL keeps the extension in the path and appends a query
    // string after it, so the path alone is what to match on.
    path = new URL(url).pathname.toLowerCase();
  } catch {
    path = url.split(/[?#]/)[0].toLowerCase();
  }
  if (VIDEO_EXTENSIONS.some((ext) => path.endsWith(ext))) return "video";
  if (IMAGE_EXTENSIONS.some((ext) => path.endsWith(ext))) return "image";
  return null;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isTrustedDomain(url: string): boolean {
  const domain = getDomain(url);
  return TRUSTED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

export function extractUrls(text: string): string[] {
  return (text.match(URL_REGEX) || []).filter((url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  });
}

export function parseEmbed(url: string): EmbedData | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // YouTube
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      let videoId: string | null = null;
      if (hostname.includes("youtu.be")) {
        videoId = parsed.pathname.split("/").filter(Boolean)[0] || null;
      } else {
        videoId = parsed.searchParams.get("v");
        if (!videoId) {
          const match = parsed.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/);
          videoId = match?.[1] || null;
        }
      }
      if (!videoId) return null;
      return {
        type: "youtube",
        url,
        embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`,
        videoId,
        platformIcon: "▶",
        platformName: "YouTube",
      };
    }

    // Vimeo
    if (hostname.includes("vimeo.com")) {
      const vimeoId = parsed.pathname.split("/").filter(Boolean).pop();
      if (!vimeoId || !/^\d+$/.test(vimeoId)) return null;
      return {
        type: "vimeo",
        url,
        embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
        videoId: vimeoId,
        platformIcon: "▶",
        platformName: "Vimeo",
      };
    }

    // Loom
    if (hostname.includes("loom.com")) {
      const loomId = parsed.pathname.match(/\/(?:share|embed)\/([a-f0-9]+)/)?.[1];
      if (!loomId) return null;
      return {
        type: "loom",
        url,
        embedUrl: `https://www.loom.com/embed/${loomId}`,
        videoId: loomId,
        platformIcon: "🎥",
        platformName: "Loom",
      };
    }

    // Instagram
    if (hostname.includes("instagram.com")) {
      const match = parsed.pathname.match(/\/(p|reel|reels|tv)\/([^/?]+)/);
      if (!match) return null;
      return {
        type: "instagram",
        url,
        embedUrl: `https://www.instagram.com/${match[1]}/${match[2]}/embed`,
        videoId: match[2],
        platformIcon: "📷",
        platformName: "Instagram",
      };
    }

    // Twitter / X
    if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
      const match = parsed.pathname.match(/\/(\w+)\/status\/(\d+)/);
      if (!match) return null;
      return {
        type: "twitter",
        url,
        videoId: match[2],
        platformIcon: "𝕏",
        platformName: "X (Twitter)",
      };
    }

    // TikTok
    if (hostname.includes("tiktok.com")) {
      const match = parsed.pathname.match(/\/video\/(\d+)/) ||
                    parsed.pathname.match(/@[^/]+\/video\/(\d+)/);
      return {
        type: "tiktok",
        url,
        embedUrl: `https://www.tiktok.com/embed/v2/${match?.[1] || ""}`,
        videoId: match?.[1],
        platformIcon: "🎵",
        platformName: "TikTok",
      };
    }

    // A direct media file — played or shown inline instead of linked to.
    const media = directMediaKind(url);
    if (media) {
      return {
        type: media,
        url,
        embedUrl: url,
        platformIcon: media === "video" ? "🎬" : "🖼",
        platformName: media === "video" ? "Video" : "Image",
      };
    }

    // Generic link (non-embeddable but trusted or any URL)
    return {
      type: "generic",
      url,
      platformIcon: "🔗",
      platformName: getDomain(url),
    };
  } catch {
    return null;
  }
}

export function extractEmbeds(text: string): EmbedData[] {
  const urls = extractUrls(text);
  const embeds: EmbedData[] = [];
  const seen = new Set<string>();

  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);
    const embed = parseEmbed(url);
    if (embed) embeds.push(embed);
  }

  return embeds;
}

/** Remove embed URLs from text for cleaner display */
export function removeEmbedUrls(text: string, embeds: EmbedData[]): string {
  let result = text;
  for (const embed of embeds) {
    if (embed.type !== "generic") {
      result = result.replace(embed.url, "").trim();
    }
  }
  return result;
}
