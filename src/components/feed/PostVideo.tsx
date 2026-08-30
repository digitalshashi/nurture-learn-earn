import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { safeUrl } from "@/lib/safeUrl";

interface PostVideoProps {
  url: string;
  poster?: string;
}

/**
 * An uploaded video, played where it was posted.
 *
 * The course player is deliberately not reused here: it binds window-level
 * keyboard shortcuts per instance, so a feed of ten posts would fight over
 * every space bar press. Native controls are the right size for a feed.
 *
 * If the browser cannot play the file the element renders as an empty black
 * box with no explanation, so a failed load falls back to a link card — the
 * old behaviour, kept only for the cases where playback genuinely can't work.
 */
export function PostVideo({ url, poster }: PostVideoProps) {
  const [failed, setFailed] = useState(false);
  const safe = safeUrl(url);
  if (!safe) return null;

  if (failed) {
    return (
      <a
        href={safe}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-lg border border-border bg-secondary transition-colors hover:bg-secondary/80"
      >
        <div className="flex items-center gap-3 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <ExternalLink className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Video</p>
            <p className="truncate text-xs text-muted-foreground">{url}</p>
          </div>
        </div>
      </a>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-black">
      <video
        src={safe}
        poster={safeUrl(poster)}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload"
        onError={() => setFailed(true)}
        className="max-h-[70vh] w-full bg-black"
      />
    </div>
  );
}
