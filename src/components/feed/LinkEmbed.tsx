import { useState, useEffect, useRef } from "react";
import { type EmbedData } from "@/lib/link-embed";
import { ExternalLink } from "lucide-react";

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

  // Generic link card
  return (
    <a
      href={embed.url}
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
