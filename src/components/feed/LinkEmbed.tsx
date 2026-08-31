import { useState, useEffect, useRef } from "react";
import { type EmbedData } from "@/lib/link-embed";
import { safeUrl } from "@/lib/safeUrl";
import { PostImage } from "@/components/feed/PostImage";
import { ExternalLink } from "lucide-react";
import { FeedVideoPlayer } from "@/components/feed/FeedVideoPlayer";

interface LinkEmbedProps {
  embed: EmbedData;
  lazy?: boolean;
}

export function LinkEmbed({ embed, lazy = true }: LinkEmbedProps) {
  const [isVisible, setIsVisible] = useState(!lazy);
  const ref = useRef<HTMLDivElement>(null);

  // Lazy loading via IntersectionObserver
  useEffect(() => {
    if (!lazy || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [lazy]);

  // Uploaded video — a reel-style player that autoplays muted once scrolled
  // into view, rather than a plain <video> that just sits there until
  // clicked. Gated behind the same lazy IntersectionObserver as the other
  // embeds so an off-screen video doesn't fetch anything.
  if (embed.type === "video") {
    const url = safeUrl(embed.url);
    if (!url) return null;
    return (
      <div ref={ref} className="rounded-lg overflow-hidden border border-border">
        {isVisible ? (
          <FeedVideoPlayer src={url} />
        ) : (
          <div className="aspect-[9/16] max-h-[70vh] bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Loading...</span>
          </div>
        )}
      </div>
    );
  }

  // Uploaded image — opens full size in the platform rather than a new tab.
  // No lazy gate needed: it carries loading="lazy" of its own.
  if (embed.type === "image") {
    return (
      <PostImage
        src={embed.url}
        className="max-h-[70vh] w-full rounded-lg border border-border bg-secondary object-contain"
      />
    );
  }

  // YouTube / Vimeo / Loom — iframe embeds
  if ((embed.type === "youtube" || embed.type === "vimeo" || embed.type === "loom") && embed.embedUrl) {
    return (
      <div ref={ref} className="rounded-lg overflow-hidden border border-border bg-secondary">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
          <span className="text-sm">{embed.platformIcon}</span>
          <span className="text-xs font-medium text-muted-foreground">{embed.platformName}</span>
        </div>
        {isVisible ? (
          <div className="aspect-video">
            <iframe
              src={embed.embedUrl}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="aspect-video bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Loading...</span>
          </div>
        )}
      </div>
    );
  }

  // Instagram embed
  if (embed.type === "instagram" && embed.embedUrl) {
    return (
      <div ref={ref} className="rounded-lg overflow-hidden border border-border bg-secondary">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
          <span className="text-sm">{embed.platformIcon}</span>
          <span className="text-xs font-medium text-muted-foreground">{embed.platformName}</span>
        </div>
        {isVisible ? (
          <div className="max-h-[600px] overflow-auto">
            <iframe
              src={embed.embedUrl}
              className="w-full border-0"
              style={{ minHeight: "480px" }}
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : (
          <div className="h-[480px] bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Loading...</span>
          </div>
        )}
      </div>
    );
  }

  // Twitter / X — use oEmbed or link card
  if (embed.type === "twitter") {
    return (
      <div ref={ref} className="rounded-lg overflow-hidden border border-border bg-secondary">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
          <span className="text-sm font-bold">{embed.platformIcon}</span>
          <span className="text-xs font-medium text-muted-foreground">{embed.platformName}</span>
        </div>
        {isVisible ? (
          <div className="max-h-[500px] overflow-auto">
            <iframe
              src={`https://platform.twitter.com/embed/Tweet.html?id=${embed.videoId}`}
              className="w-full border-0"
              style={{ minHeight: "300px" }}
              loading="lazy"
            />
          </div>
        ) : (
          <div className="h-[300px] bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Loading...</span>
          </div>
        )}
      </div>
    );
  }

  // TikTok embed
  if (embed.type === "tiktok" && embed.embedUrl) {
    return (
      <div ref={ref} className="rounded-lg overflow-hidden border border-border bg-secondary">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
          <span className="text-sm">{embed.platformIcon}</span>
          <span className="text-xs font-medium text-muted-foreground">{embed.platformName}</span>
        </div>
        {isVisible ? (
          <div className="flex justify-center" style={{ minHeight: "400px" }}>
            <iframe
              src={embed.embedUrl}
              className="border-0"
              style={{ width: "325px", height: "580px" }}
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : (
          <div className="h-[400px] bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Loading...</span>
          </div>
        )}
      </div>
    );
  }

  // Generic link — try to embed it in an iframe as part of the platform;
  // if it can't be embedded (or has no embeddable URL), fall back to a
  // direct-link card that redirects out to the site.
  if (embed.type === "generic" && embed.embedUrl) {
    return (
      <GenericIframeEmbed embed={embed} isVisible={isVisible} containerRef={ref} />
    );
  }

  const url = safeUrl(embed.url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-colors overflow-hidden"
    >
      <div className="flex items-center gap-3 p-3">
        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
          <ExternalLink className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{embed.platformName}</p>
          <p className="text-xs text-muted-foreground truncate">{embed.url}</p>
        </div>
      </div>
    </a>
  );
}

// Browsers give no reliable "this iframe was blocked" event for
// X-Frame-Options / frame-ancestors — a blocked frame still fires `load`,
// it just renders blank. We treat "no load within a short window" as a
// failure and fall back to a direct-link card that redirects to the site.
const IFRAME_LOAD_TIMEOUT_MS = 4000;

function GenericIframeEmbed({
  embed,
  isVisible,
  containerRef,
}: {
  embed: EmbedData;
  isVisible: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const embedUrl = safeUrl(embed.embedUrl || "");
  const linkUrl = safeUrl(embed.url);

  useEffect(() => {
    if (!isVisible || !embedUrl || loaded) return;
    const timer = setTimeout(() => setFailed(true), IFRAME_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isVisible, embedUrl, loaded]);

  if (!embedUrl || failed) {
    return (
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-colors overflow-hidden"
      >
        <div className="flex items-center gap-3 p-3">
          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
            <ExternalLink className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{embed.platformName}</p>
            <p className="text-xs text-muted-foreground truncate">{embed.url}</p>
          </div>
        </div>
      </a>
    );
  }

  return (
    <div ref={containerRef} className="rounded-lg overflow-hidden border border-border bg-secondary">
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border hover:bg-muted transition-colors"
      >
        <span className="text-sm">{embed.platformIcon}</span>
        <span className="text-xs font-medium text-muted-foreground truncate">{embed.platformName}</span>
        <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
      </a>
      {isVisible ? (
        <div className="aspect-video">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      ) : (
        <div className="aspect-video bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Loading...</span>
        </div>
      )}
    </div>
  );
}
