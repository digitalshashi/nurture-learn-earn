import { describe, it, expect } from "vitest";
import { parseEmbed, extractEmbeds, removeEmbedUrls, directMediaKind } from "./link-embed";

const R2_MP4 = "https://cdn.1corehub.com/user-1/feed/1712345678-clip.mp4";
const R2_SIGNED = "https://pub-abc.r2.dev/user-1/feed/1712345678-clip.mp4?X-Amz-Expires=900&X-Amz-Signature=deadbeef";
const R2_IMAGE = "https://cdn.1corehub.com/user-1/feed/1712345678-photo.webp";

describe("directMediaKind", () => {
  it("reads the extension of an uploaded file", () => {
    expect(directMediaKind(R2_MP4)).toBe("video");
    expect(directMediaKind(R2_IMAGE)).toBe("image");
  });

  it("ignores a signed URL's query string, which follows the extension", () => {
    expect(directMediaKind(R2_SIGNED)).toBe("video");
  });

  it("leaves an ordinary page alone", () => {
    expect(directMediaKind("https://example.com/some/article")).toBeNull();
  });
});

describe("parseEmbed", () => {
  it("treats an uploaded video as playable media, not a link card", () => {
    const embed = parseEmbed(R2_MP4);
    expect(embed?.type).toBe("video");
    expect(embed?.embedUrl).toBe(R2_MP4);
  });

  it("treats an uploaded image as media", () => {
    expect(parseEmbed(R2_IMAGE)?.type).toBe("image");
  });

  it("still recognises platform links first", () => {
    expect(parseEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.type).toBe("youtube");
    expect(parseEmbed("https://vimeo.com/123456789")?.type).toBe("vimeo");
  });

  it("keeps HLS as a link, since a bare <video> cannot play it", () => {
    expect(parseEmbed("https://cdn.1corehub.com/stream/master.m3u8")?.type).toBe("generic");
  });

  it("falls back to a generic card for a page", () => {
    expect(parseEmbed("https://example.com/pricing")?.type).toBe("generic");
  });
});

describe("post body handling", () => {
  it("pulls an uploaded video out of the text so it renders as a player", () => {
    const content = `Here's the walkthrough ${R2_MP4}`;
    const embeds = extractEmbeds(content);
    expect(embeds.map((e) => e.type)).toEqual(["video"]);
    // The raw R2 link is what used to sit in the post as unreadable text.
    expect(removeEmbedUrls(content, embeds)).toBe("Here's the walkthrough");
  });
});
