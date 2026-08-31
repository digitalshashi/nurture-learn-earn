import { useEffect, useRef, useState } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedVideoPlayerProps {
  src: string;
  className?: string;
}

/**
 * A reel-style player: autoplays muted (looping) once scrolled into view,
 * pauses out of view, and taps to toggle sound or play/pause — the behaviour
 * people expect from Instagram/TikTok rather than a plain <video> tag that
 * just sits there until clicked.
 */
export function FeedVideoPlayer({ src, className }: FeedVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        } else {
          video.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMuted((m) => !m);
  };

  return (
    <div
      ref={containerRef}
      onClick={togglePlay}
      className={cn(
        "relative w-full overflow-hidden bg-black cursor-pointer select-none",
        "max-h-[70vh]",
        className,
      )}
    >
      <video
        ref={videoRef}
        src={src}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        className="w-full max-h-[70vh] object-contain mx-auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity">
          <div className="h-14 w-14 rounded-full bg-black/50 flex items-center justify-center">
            <Play className="h-6 w-6 text-white fill-white ml-1" />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
