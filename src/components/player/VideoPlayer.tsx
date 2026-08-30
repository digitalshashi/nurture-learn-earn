import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  PictureInPicture2,
  RotateCcw,
  RotateCw,
  Check,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Minimize2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveSource } from "./sourceKind";
import { useMediaEngine } from "./useMediaEngine";
import { SPEEDS } from "./types";
import { formatTime } from "./formatTime";

export interface VideoPlayerProps {
  videoUrl: string | null | undefined;
  videoType?: string | null;
  poster?: string | null;
  title?: string;
  /** Fired when playback reaches the end. */
  onEnded?: () => void;
  /** Rendered as overlay chrome inside the player (prev/next arrows, etc). */
  overlay?: React.ReactNode;
  /**
   * "aspect" (default) sizes the player itself at 16:9. "fill" makes it stretch
   * to a parent that already has a size — use it when the container caps the
   * height, so the player cannot overflow past that cap.
   */
  fit?: "aspect" | "fill";
  className?: string;
}

type SettingsPane = "root" | "speed" | "quality";

export function VideoPlayer({
  videoUrl,
  videoType,
  poster,
  title,
  onEnded,
  overlay,
  fit = "aspect",
  className,
}: VideoPlayerProps) {
  const source = resolveSource(videoUrl, videoType);
  const sizing = fit === "fill" ? "absolute inset-0" : "relative w-full aspect-video";

  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const embedHostRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number>();

  const { state, controls } = useMediaEngine({
    kind: source.kind,
    src: source.src,
    videoRef,
    embedHostRef,
    onEnded,
  });

  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [miniPlayer, setMiniPlayer] = useState(false);
  const [settingsPane, setSettingsPane] = useState<SettingsPane | null>(null);
  const [scrubPreview, setScrubPreview] = useState<{ time: number; x: number } | null>(null);
  /** Transient "+10s / -10s" badge after a seek, like Netflix's ripple. */
  const [seekFlash, setSeekFlash] = useState<{ dir: 1 | -1; key: number } | null>(null);

  const isEmbedOnly = source.kind === "embed";
  const interactive = source.kind !== "none" && !isEmbedOnly;

  // ------------------------------------------------------------ auto-hide
  const revealControls = useCallback(() => {
    setControlsVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      // Never hide chrome while a menu is open or playback is stopped —
      // the user is still aiming at something.
      setControlsVisible((prev) => {
        if (settingsPane) return prev;
        return false;
      });
    }, 2800);
  }, [settingsPane]);

  useEffect(() => {
    if (!state.playing) setControlsVisible(true);
  }, [state.playing]);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  // ------------------------------------------------------------ fullscreen
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  }, []);

  const flashSeek = useCallback((dir: 1 | -1) => {
    setSeekFlash({ dir, key: Math.random() });
    window.setTimeout(() => setSeekFlash(null), 550);
  }, []);

  const seekBy = useCallback(
    (delta: number) => {
      controls.seekBy(delta);
      flashSeek(delta > 0 ? 1 : -1);
      revealControls();
    },
    [controls, flashSeek, revealControls],
  );

  // -------------------------------------------------------------- keyboard
  useEffect(() => {
    if (!interactive) return;

    const onKey = (e: KeyboardEvent) => {
      // Never steal keys from a form field — the page has a comment composer.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          controls.togglePlay();
          revealControls();
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBy(e.shiftKey ? 30 : 10);
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBy(e.shiftKey ? -30 : -10);
          break;
        case "l":
        case "L":
          e.preventDefault();
          seekBy(10);
          break;
        case "j":
        case "J":
          e.preventDefault();
          seekBy(-10);
          break;
        case "ArrowUp":
          e.preventDefault();
          controls.setVolume(Math.min(1, state.volume + 0.05));
          revealControls();
          break;
        case "ArrowDown":
          e.preventDefault();
          controls.setVolume(Math.max(0, state.volume - 0.05));
          revealControls();
          break;
        case "m":
        case "M":
          e.preventDefault();
          controls.toggleMute();
          revealControls();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "i":
        case "I":
          e.preventDefault();
          if (state.supportsPiP) controls.requestPiP();
          break;
        case "<":
          e.preventDefault();
          controls.setRate(SPEEDS[Math.max(0, SPEEDS.indexOf(state.rate) - 1)] ?? 1);
          break;
        case ">":
          e.preventDefault();
          controls.setRate(SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(state.rate) + 1)] ?? 1);
          break;
        case "Escape":
          if (settingsPane) setSettingsPane(null);
          break;
        default:
          // 0-9 jump to that decile of the timeline
          if (/^[0-9]$/.test(e.key) && state.duration) {
            e.preventDefault();
            controls.seek((Number(e.key) / 10) * state.duration);
            revealControls();
          }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    interactive,
    controls,
    state.volume,
    state.rate,
    state.duration,
    state.supportsPiP,
    settingsPane,
    seekBy,
    revealControls,
    toggleFullscreen,
  ]);

  // --------------------------------------------------------------- scrubber
  const progressRef = useRef<HTMLDivElement>(null);

  const timeFromPointer = (clientX: number) => {
    const bar = progressRef.current;
    if (!bar || !state.duration) return 0;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * state.duration;
  };

  const onScrubMove = (e: React.PointerEvent) => {
    if (!state.duration) return;
    const bar = progressRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    setScrubPreview({ time: timeFromPointer(e.clientX), x: e.clientX - rect.left });
  };

  const onScrubDown = (e: React.PointerEvent) => {
    if (!state.duration) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    controls.seek(timeFromPointer(e.clientX));
  };

  const onScrubDrag = (e: React.PointerEvent) => {
    if (e.buttons !== 1 || !state.duration) return;
    controls.seek(timeFromPointer(e.clientX));
  };

  // ------------------------------------------------------------------ empty
  if (source.kind === "none") {
    return (
      <div
        className={cn(
          sizing,
          "bg-zinc-950 flex flex-col items-center justify-center text-zinc-500",
          className,
        )}
      >
        <AlertCircle className="h-10 w-10 mb-2" />
        <p className="text-sm font-semibold">No video for this lesson</p>
      </div>
    );
  }

  // Providers we cannot drive keep their own controls.
  if (isEmbedOnly) {
    return (
      <div className={cn(sizing, "bg-black", className)}>
        <iframe
          src={source.src}
          title={title || "Lesson video"}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
        {overlay}
      </div>
    );
  }

  const progressPct = state.duration ? (state.currentTime / state.duration) * 100 : 0;
  const bufferedPct = state.duration ? (state.bufferedTo / state.duration) * 100 : 0;
  const showChrome = controlsVisible || !state.playing || !!settingsPane;

  const VolumeIcon = state.muted || state.volume === 0 ? VolumeX : state.volume < 0.5 ? Volume1 : Volume2;

  const activeQualityLabel =
    state.activeQuality === "auto"
      ? "Auto"
      : state.qualities.find((q) => q.id === state.activeQuality)?.label || "Auto";

  return (
    <>
      {/* Keeps the page from collapsing when the player pops out to mini. */}
      {miniPlayer && <div className={cn(sizing, "bg-black", className)} />}

      <div
        ref={shellRef}
        onPointerMove={revealControls}
        onPointerLeave={() => state.playing && !settingsPane && setControlsVisible(false)}
        className={cn(
          "group bg-black overflow-hidden",
          miniPlayer
            ? "fixed bottom-4 right-4 z-[60] w-[min(24rem,calc(100vw-2rem))] aspect-video rounded-xl shadow-2xl ring-1 ring-white/15"
            : cn(sizing, className),
          !showChrome && state.playing && "cursor-none",
        )}
      >
        {/* ---------------------------------------------------- media surface */}
        {source.kind === "youtube" || source.kind === "vimeo" ? (
          <div
            ref={embedHostRef}
            className="absolute inset-0 [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-0 [&>div]:w-full [&>div]:h-full"
          />
        ) : (
          <video
            ref={videoRef}
            poster={poster || undefined}
            playsInline
            className="absolute inset-0 w-full h-full object-contain bg-black"
            onClick={() => {
              controls.togglePlay();
              revealControls();
            }}
            onDoubleClick={toggleFullscreen}
          />
        )}

        {/* Click-catcher for iframe-backed engines, which swallow pointer events */}
        {(source.kind === "youtube" || source.kind === "vimeo") && (
          <div
            className="absolute inset-0"
            onClick={() => {
              controls.togglePlay();
              revealControls();
            }}
            onDoubleClick={toggleFullscreen}
          />
        )}

        {overlay}

        {/* ------------------------------------------------------ status layer */}
        {state.error ? (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 text-center px-6">
            <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
            <p className="text-sm font-semibold text-white">{state.error}</p>
          </div>
        ) : (
          <>
            {state.waiting && (
              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                <Loader2 className="h-12 w-12 text-white/90 animate-spin" />
              </div>
            )}

            {/* Center play button before first frame / while paused */}
            {!state.playing && !state.waiting && (
              <button
                onClick={() => controls.play()}
                aria-label="Play"
                className="absolute inset-0 z-20 flex items-center justify-center group/play"
              >
                <span className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-black/55 backdrop-blur-sm ring-1 ring-white/25 flex items-center justify-center transition-transform duration-200 group-hover/play:scale-110">
                  <Play className="h-8 w-8 sm:h-9 sm:w-9 text-white fill-white ml-1" />
                </span>
              </button>
            )}

            {seekFlash && (
              <div
                key={seekFlash.key}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none",
                  "flex items-center gap-1.5 px-4 py-3 rounded-full bg-black/65 text-white text-sm font-semibold",
                  "animate-in fade-in zoom-in-75 duration-150",
                  seekFlash.dir === 1 ? "right-[12%]" : "left-[12%]",
                )}
              >
                {seekFlash.dir === 1 ? (
                  <>
                    <RotateCw className="h-5 w-5" /> 10s
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-5 w-5" /> 10s
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* --------------------------------------------------------- mini bar */}
        {miniPlayer && (
          <button
            onClick={() => setMiniPlayer(false)}
            aria-label="Close mini player"
            className="absolute top-2 right-2 z-40 h-8 w-8 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Title bar. Fades in with the rest of the chrome so a fullscreen or
            theatre view still says which lesson is playing. */}
        {!miniPlayer && title && (
          <div
            className={cn(
              "absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/80 to-transparent px-4 pb-10 pt-3",
              "transition-opacity duration-300",
              showChrome ? "opacity-100" : "opacity-0",
            )}
          >
            <p className="truncate pr-10 text-sm font-semibold text-white drop-shadow">{title}</p>
          </div>
        )}

        {/* --------------------------------------------------------- controls */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-30 transition-opacity duration-300",
            "bg-gradient-to-t from-black/95 via-black/55 to-transparent",
            miniPlayer ? "px-2 pb-1.5 pt-8" : "px-3 sm:px-4 pb-2 sm:pb-3 pt-16",
            showChrome ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          {/* Scrubber */}
          <div
            ref={progressRef}
            onPointerDown={onScrubDown}
            onPointerMove={(e) => {
              onScrubMove(e);
              onScrubDrag(e);
            }}
            onPointerLeave={() => setScrubPreview(null)}
            className="relative h-4 flex items-center cursor-pointer group/bar touch-none"
          >
            {/* Thin at rest, thicker under the cursor — the bar is the main
                target on the whole surface, so it earns the extra weight. */}
            <div className="relative h-[5px] w-full rounded-full bg-white/25 transition-all group-hover/bar:h-[7px]">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white/40"
                style={{ width: `${Math.min(100, bufferedPct)}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-accent"
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
              <div
                className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent opacity-0 shadow-md ring-2 ring-black/20 transition-opacity group-hover/bar:opacity-100"
                style={{ left: `${Math.min(100, progressPct)}%` }}
              />
            </div>

            {scrubPreview && (
              <div
                className="absolute bottom-5 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/90 text-white text-[11px] font-semibold tabular-nums pointer-events-none"
                style={{ left: scrubPreview.x }}
              >
                {formatTime(scrubPreview.time)}
              </div>
            )}
          </div>

          {/* Button row */}
          <div className="flex items-center gap-1 sm:gap-2 mt-0.5">
            <IconButton onClick={controls.togglePlay} label={state.playing ? "Pause (k)" : "Play (k)"}>
              {state.playing ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current" />
              )}
            </IconButton>

            {!miniPlayer && (
              <>
                <IconButton onClick={() => seekBy(-10)} label="Back 10s (←)">
                  <RotateCcw className="h-[18px] w-[18px]" />
                </IconButton>
                <IconButton onClick={() => seekBy(10)} label="Forward 10s (→)">
                  <RotateCw className="h-[18px] w-[18px]" />
                </IconButton>
              </>
            )}

            {/* Volume — slider expands on hover, Netflix-style */}
            <div className="flex items-center group/vol">
              <IconButton onClick={controls.toggleMute} label={state.muted ? "Unmute (m)" : "Mute (m)"}>
                <VolumeIcon className="h-[18px] w-[18px]" />
              </IconButton>
              {!miniPlayer && (
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={state.muted ? 0 : state.volume}
                  onChange={(e) => controls.setVolume(parseFloat(e.target.value))}
                  aria-label="Volume"
                  className={cn(
                    "h-1 rounded-full bg-white/30 accent-white cursor-pointer",
                    "w-0 opacity-0 group-hover/vol:w-20 group-hover/vol:opacity-100 group-hover/vol:ml-2",
                    "focus:w-20 focus:opacity-100 focus:ml-2 transition-all duration-200",
                  )}
                />
              )}
            </div>

            <span className="ml-1 text-[11px] sm:text-xs font-semibold text-white/90 tabular-nums whitespace-nowrap">
              {formatTime(state.currentTime)}
              <span className="text-white/50"> / {formatTime(state.duration)}</span>
            </span>

            <div className="flex-1" />

            {/* Settings: speed + quality */}
            <div className="relative">
              <IconButton
                onClick={() => setSettingsPane(settingsPane ? null : "root")}
                label="Settings"
                active={!!settingsPane}
              >
                <Settings className={cn("h-[18px] w-[18px] transition-transform", settingsPane && "rotate-45")} />
              </IconButton>

              {settingsPane && (
                <div className="absolute bottom-10 right-0 w-52 rounded-xl bg-zinc-900/97 backdrop-blur border border-white/10 shadow-2xl overflow-hidden text-sm">
                  {settingsPane === "root" && (
                    <div className="py-1">
                      <MenuRow
                        label="Playback speed"
                        value={state.rate === 1 ? "Normal" : `${state.rate}x`}
                        onClick={() => setSettingsPane("speed")}
                      />
                      <MenuRow
                        label="Quality"
                        value={state.qualityLocked ? "Auto (provider)" : activeQualityLabel}
                        onClick={() => !state.qualityLocked && setSettingsPane("quality")}
                        disabled={state.qualityLocked}
                      />
                    </div>
                  )}

                  {settingsPane === "speed" && (
                    <MenuPane title="Playback speed" onBack={() => setSettingsPane("root")}>
                      {SPEEDS.map((sp) => (
                        <MenuOption
                          key={sp}
                          label={sp === 1 ? "Normal" : `${sp}x`}
                          selected={state.rate === sp}
                          onClick={() => {
                            controls.setRate(sp);
                            setSettingsPane(null);
                          }}
                        />
                      ))}
                    </MenuPane>
                  )}

                  {settingsPane === "quality" && (
                    <MenuPane title="Quality" onBack={() => setSettingsPane("root")}>
                      {state.qualities.length > 1 && (
                        <MenuOption
                          label="Auto"
                          selected={state.activeQuality === "auto"}
                          onClick={() => {
                            controls.setQuality("auto");
                            setSettingsPane(null);
                          }}
                        />
                      )}
                      {state.qualities.map((q) => (
                        <MenuOption
                          key={q.id}
                          label={q.label}
                          selected={state.activeQuality === q.id}
                          onClick={() => {
                            controls.setQuality(q.id);
                            setSettingsPane(null);
                          }}
                        />
                      ))}
                      {state.qualities.length === 0 && (
                        <p className="px-3 py-2 text-xs text-zinc-400">
                          Only one rendition is available for this video.
                        </p>
                      )}
                    </MenuPane>
                  )}
                </div>
              )}
            </div>

            {/* Mini player */}
            <IconButton
              onClick={() => setMiniPlayer((m) => !m)}
              label={miniPlayer ? "Expand" : "Mini player"}
              active={miniPlayer}
            >
              <Minimize2 className="h-[18px] w-[18px]" />
            </IconButton>

            {/* Pop-out (Picture-in-Picture) */}
            {state.supportsPiP && (
              <IconButton onClick={controls.requestPiP} label="Pop out (i)">
                <PictureInPicture2 className="h-[18px] w-[18px]" />
              </IconButton>
            )}

            <IconButton onClick={toggleFullscreen} label={isFullscreen ? "Exit fullscreen (f)" : "Fullscreen (f)"}>
              {isFullscreen ? <Minimize className="h-[18px] w-[18px]" /> : <Maximize className="h-[18px] w-[18px]" />}
            </IconButton>
          </div>
        </div>
      </div>
    </>
  );
}

function IconButton({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-colors",
        "text-white/90 hover:text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
        active && "bg-white/15 text-white",
      )}
    >
      {children}
    </button>
  );
}

function MenuRow({
  label,
  value,
  onClick,
  disabled,
}: {
  label: string;
  value: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left text-white/90",
        disabled ? "opacity-55 cursor-default" : "hover:bg-white/10",
      )}
    >
      <span>{label}</span>
      <span className="text-xs text-white/60 truncate max-w-[6.5rem]">{value}</span>
    </button>
  );
}

function MenuPane({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="py-1 max-h-64 overflow-y-auto">
      <button
        type="button"
        onClick={onBack}
        className="w-full px-3 py-2 flex items-center gap-2 text-white/90 hover:bg-white/10 border-b border-white/10 mb-1"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="font-semibold">{title}</span>
      </button>
      {children}
    </div>
  );
}

function MenuOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-3 py-2 flex items-center gap-2.5 text-left text-white/90 hover:bg-white/10"
    >
      <Check className={cn("h-4 w-4 shrink-0", selected ? "opacity-100 text-accent" : "opacity-0")} />
      <span>{label}</span>
    </button>
  );
}

export default VideoPlayer;
