import { useCallback, useEffect, useRef, useState } from "react";
import type { VideoKind } from "./sourceKind";
import { initialMediaState, type MediaControls, type MediaState, type QualityOption } from "./types";
import { loadVimeoApi, loadYouTubeApi } from "./loadScript";
import { decodeFailureHint } from "@/lib/videoFormats";
import type { VimeoEventData, VimeoPlayer, YouTubePlayer } from "./vendor";
import type HlsType from "hls.js";
import type { ErrorData, Level } from "hls.js";

interface EngineHandle {
  play(): void;
  pause(): void;
  seek(t: number): void;
  /**
   * Live position/duration straight from the backend. Relative seeks must not
   * be computed from React state: several keypresses can land in one batch
   * before a re-render, and each would then seek from the same stale time.
   */
  getTime(): number;
  getDuration(): number;
  setVolume(v: number): void;
  setMuted(m: boolean): void;
  setRate(r: number): void;
  setQuality(id: string): void;
  destroy(): void;
}

interface Options {
  kind: VideoKind;
  src: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  embedHostRef: React.RefObject<HTMLDivElement>;
  onEnded?: () => void;
}

/**
 * Normalises every supported source behind one state + controls pair, so the
 * control bar never has to know whether it is driving a <video>, hls.js, or a
 * vendor iframe.
 */
export function useMediaEngine({ kind, src, videoRef, embedHostRef, onEnded }: Options) {
  const [state, setState] = useState<MediaState>(() => initialMediaState(kind));
  const engineRef = useRef<EngineHandle | null>(null);
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;

  const patch = useCallback((p: Partial<MediaState>) => {
    setState((s) => ({ ...s, ...p }));
  }, []);

  useEffect(() => {
    setState(initialMediaState(kind));
    if (!src || kind === "none" || kind === "embed") return;

    let disposed = false;
    let cleanup = () => {};

    // ---------------------------------------------------------------- native
    if (kind === "native" || kind === "hls") {
      const video = videoRef.current;
      if (!video) return;

      let hls: HlsType | null = null;

      const readBuffered = () => {
        const b = video.buffered;
        if (!b.length) return 0;
        // The range containing the playhead is the only one that matters for
        // the "loaded" bar behind the scrubber.
        for (let i = 0; i < b.length; i++) {
          if (b.start(i) <= video.currentTime && video.currentTime <= b.end(i)) return b.end(i);
        }
        return b.end(b.length - 1);
      };

      const onTime = () => patch({ currentTime: video.currentTime, bufferedTo: readBuffered() });
      const onMeta = () =>
        patch({
          duration: Number.isFinite(video.duration) ? video.duration : 0,
          ready: true,
          // A progressive file has exactly one rendition; report its real size
          // rather than inventing choices that do nothing.
          ...(kind === "native" && video.videoHeight
            ? {
                qualities: [
                  {
                    id: "source",
                    label: `Source (${video.videoWidth}×${video.videoHeight})`,
                    height: video.videoHeight,
                  },
                ],
                activeQuality: "source",
              }
            : {}),
        });
      const onPlay = () => patch({ playing: true, ended: false });
      const onPause = () => patch({ playing: false });
      const onWaiting = () => patch({ waiting: true });
      const onPlaying = () => patch({ waiting: false, playing: true });
      const onEnd = () => {
        patch({ playing: false, ended: true });
        endedRef.current?.();
      };
      const onVolume = () => patch({ volume: video.volume, muted: video.muted });
      const onRate = () => patch({ rate: video.playbackRate });
      // MediaError distinguishes "the network dropped" from "this browser
      // cannot decode that", and those need different answers from whoever is
      // watching. A single "could not be loaded" sent people looking for a
      // connection problem when the real answer was to re-export the file.
      const onError = () => {
        // The numeric codes, not the MediaError global: the values are fixed
        // by the spec, and the global does not exist in jsdom, where reading
        // it threw before the message could be set at all.
        const MEDIA_ERR_NETWORK = 2;
        const MEDIA_ERR_DECODE = 3;
        const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;

        const code = video.error?.code;
        let message = "This video could not be loaded.";
        if (code === MEDIA_ERR_NETWORK) {
          message = "The connection dropped while loading this video. Check your network and try again.";
        } else if (code === MEDIA_ERR_DECODE || code === MEDIA_ERR_SRC_NOT_SUPPORTED) {
          message = decodeFailureHint(src);
        }
        patch({ error: message, waiting: false });
      };

      video.addEventListener("timeupdate", onTime);
      video.addEventListener("progress", onTime);
      video.addEventListener("loadedmetadata", onMeta);
      video.addEventListener("play", onPlay);
      video.addEventListener("pause", onPause);
      video.addEventListener("waiting", onWaiting);
      video.addEventListener("playing", onPlaying);
      video.addEventListener("ended", onEnd);
      video.addEventListener("volumechange", onVolume);
      video.addEventListener("ratechange", onRate);
      video.addEventListener("error", onError);

      if (kind === "hls") {
        const canPlayNatively = video.canPlayType("application/vnd.apple.mpegurl");
        if (canPlayNatively) {
          // Safari decodes HLS itself; levels are then managed by the browser.
          video.src = src;
          patch({ qualityLocked: true });
        } else {
          import("hls.js")
            .then(({ default: Hls }) => {
              if (disposed || !Hls.isSupported()) {
                if (!disposed) patch({ error: "HLS playback is not supported in this browser." });
                return;
              }
              hls = new Hls({ enableWorker: true });
              hls.loadSource(src);
              hls.attachMedia(video);
              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                const levels: QualityOption[] = hls!.levels.map((l: Level, i: number) => ({
                  id: String(i),
                  label: l.height ? `${l.height}p` : `${Math.round((l.bitrate || 0) / 1000)}kbps`,
                  height: l.height,
                }));
                levels.sort((a, b) => (b.height || 0) - (a.height || 0));
                patch({ qualities: levels, activeQuality: "auto", ready: true });
              });
              hls.on(Hls.Events.ERROR, (_e: unknown, data: ErrorData) => {
                if (data?.fatal) patch({ error: "This video could not be loaded." });
              });
            })
            .catch(() => {
              if (!disposed) patch({ error: "HLS playback is unavailable." });
            });
        }
      } else {
        video.src = src;
      }

      engineRef.current = {
        play: () => video.play().catch(() => {}),
        pause: () => video.pause(),
        seek: (t) => {
          video.currentTime = t;
          patch({ currentTime: t });
        },
        getTime: () => video.currentTime || 0,
        getDuration: () => (Number.isFinite(video.duration) ? video.duration : 0),
        setVolume: (v) => {
          video.volume = v;
          video.muted = v === 0;
        },
        setMuted: (m) => {
          video.muted = m;
        },
        setRate: (r) => {
          video.playbackRate = r;
        },
        setQuality: (id) => {
          if (!hls) return;
          hls.currentLevel = id === "auto" ? -1 : Number(id);
          patch({ activeQuality: id });
        },
        destroy: () => {},
      };

      cleanup = () => {
        video.removeEventListener("timeupdate", onTime);
        video.removeEventListener("progress", onTime);
        video.removeEventListener("loadedmetadata", onMeta);
        video.removeEventListener("play", onPlay);
        video.removeEventListener("pause", onPause);
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("ended", onEnd);
        video.removeEventListener("volumechange", onVolume);
        video.removeEventListener("ratechange", onRate);
        video.removeEventListener("error", onError);
        if (hls) hls.destroy();
      };
    }

    // --------------------------------------------------------------- youtube
    if (kind === "youtube") {
      const host = embedHostRef.current;
      if (!host) return;

      let player: YouTubePlayer | null = null;
      let poll: number | undefined;

      loadYouTubeApi()
        .then((YT) => {
          if (disposed || !YT?.Player) return;
          const mount = document.createElement("div");
          host.appendChild(mount);

          player = new YT.Player(mount, {
            videoId: src,
            playerVars: { controls: 0, modestbranding: 1, rel: 0, disablekb: 1, playsinline: 1 },
            events: {
              onReady: () => {
                if (disposed) return;
                patch({
                  ready: true,
                  duration: player.getDuration() || 0,
                  volume: (player.getVolume?.() ?? 100) / 100,
                  muted: !!player.isMuted?.(),
                  // YouTube ignores programmatic quality requests, so present
                  // it as vendor-managed instead of offering a dead menu.
                  qualityLocked: true,
                });
                poll = window.setInterval(() => {
                  if (!player?.getCurrentTime) return;
                  patch({
                    currentTime: player.getCurrentTime() || 0,
                    duration: player.getDuration() || 0,
                    bufferedTo:
                      (player.getVideoLoadedFraction?.() || 0) * (player.getDuration() || 0),
                  });
                }, 250);
              },
              onStateChange: (e: { data: number }) => {
                if (disposed) return;
                const S = YT.PlayerState;
                if (e.data === S.PLAYING) patch({ playing: true, waiting: false, ended: false });
                if (e.data === S.PAUSED) patch({ playing: false });
                if (e.data === S.BUFFERING) patch({ waiting: true });
                if (e.data === S.ENDED) {
                  patch({ playing: false, ended: true });
                  endedRef.current?.();
                }
              },
              onError: () => patch({ error: "This YouTube video could not be played." }),
            },
          });

          engineRef.current = {
            play: () => player?.playVideo?.(),
            pause: () => player?.pauseVideo?.(),
            seek: (t) => {
              player?.seekTo?.(t, true);
              patch({ currentTime: t });
            },
            getTime: () => player?.getCurrentTime?.() || 0,
            getDuration: () => player?.getDuration?.() || 0,
            setVolume: (v) => {
              player?.setVolume?.(v * 100);
              if (v === 0) player?.mute?.();
              else player?.unMute?.();
              patch({ volume: v, muted: v === 0 });
            },
            setMuted: (m) => {
              if (m) player?.mute?.();
              else player?.unMute?.();
              patch({ muted: m });
            },
            setRate: (r) => {
              player?.setPlaybackRate?.(r);
              patch({ rate: r });
            },
            setQuality: () => {},
            destroy: () => player?.destroy?.(),
          };
        })
        .catch(() => {
          if (!disposed) patch({ error: "YouTube player failed to load." });
        });

      cleanup = () => {
        if (poll) window.clearInterval(poll);
        try {
          player?.destroy?.();
        } catch {
          /* player already torn down with the host node */
        }
        host.innerHTML = "";
      };
    }

    // ----------------------------------------------------------------- vimeo
    if (kind === "vimeo") {
      const host = embedHostRef.current;
      if (!host) return;

      let player: VimeoPlayer | null = null;
      // Vimeo's getters are promise-based; mirror position synchronously so
      // relative seeks stay accurate between renders.
      let lastTime = 0;
      let lastDuration = 0;

      loadVimeoApi()
        .then((Vimeo) => {
          if (disposed || !Vimeo?.Player) return;
          const mount = document.createElement("div");
          mount.style.width = "100%";
          mount.style.height = "100%";
          host.appendChild(mount);

          player = new Vimeo.Player(mount, {
            id: Number(src),
            controls: false,
            responsive: true,
          });

          player.on("play", () => patch({ playing: true, ended: false, waiting: false }));
          player.on("pause", () => patch({ playing: false }));
          player.on("bufferstart", () => patch({ waiting: true }));
          player.on("bufferend", () => patch({ waiting: false }));
          player.on("timeupdate", (d: VimeoEventData) => {
            lastTime = d.seconds;
            lastDuration = d.duration;
            patch({ currentTime: d.seconds, duration: d.duration });
          });
          player.on("progress", (d: VimeoEventData) => patch({ bufferedTo: d.seconds }));
          player.on("ended", () => {
            patch({ playing: false, ended: true });
            endedRef.current?.();
          });
          player.on("error", () => patch({ error: "This Vimeo video could not be played." }));

          player
            .ready()
            .then(async () => {
              if (disposed) return;
              const duration = await player.getDuration().catch(() => 0);
              let qualities: QualityOption[] = [];
              try {
                const raw = await player.getQualities();
                qualities = (raw || [])
                  .filter((q) => q.id !== "auto")
                  .map((q) => ({
                    id: String(q.id),
                    label: String(q.label || q.id),
                    height: parseInt(String(q.id), 10) || undefined,
                  }));
              } catch {
                // getQualities is unavailable on some plans; leave the menu to
                // fall back to Auto only.
              }
              patch({ ready: true, duration, qualities, activeQuality: "auto" });
            })
            .catch(() => patch({ error: "This Vimeo video could not be played." }));

          engineRef.current = {
            play: () => player?.play?.().catch(() => {}),
            pause: () => player?.pause?.(),
            seek: (t) => {
              player?.setCurrentTime?.(t);
              lastTime = t;
              patch({ currentTime: t });
            },
            getTime: () => lastTime,
            getDuration: () => lastDuration,
            setVolume: (v) => {
              player?.setVolume?.(v);
              patch({ volume: v, muted: v === 0 });
            },
            setMuted: (m) => {
              player?.setVolume?.(m ? 0 : 1);
              patch({ muted: m });
            },
            setRate: (r) => {
              player?.setPlaybackRate?.(r).catch(() => {});
              patch({ rate: r });
            },
            setQuality: (id) => {
              player?.setQuality?.(id).catch(() => {});
              patch({ activeQuality: id });
            },
            destroy: () => player?.destroy?.(),
          };
        })
        .catch(() => {
          if (!disposed) patch({ error: "Vimeo player failed to load." });
        });

      cleanup = () => {
        try {
          player?.destroy?.();
        } catch {
          /* already gone */
        }
        host.innerHTML = "";
      };
    }

    return () => {
      disposed = true;
      engineRef.current = null;
      cleanup();
    };
  }, [kind, src, videoRef, embedHostRef, patch]);

  // ------------------------------------------------------------- public API
  const controls: MediaControls = {
    play: () => engineRef.current?.play(),
    pause: () => engineRef.current?.pause(),
    togglePlay: () => (state.playing ? engineRef.current?.pause() : engineRef.current?.play()),
    seek: (t) => {
      const engine = engineRef.current;
      if (!engine) return;
      const limit = engine.getDuration() || state.duration || 0;
      engine.seek(Math.max(0, Math.min(limit, t)));
    },
    seekBy: (delta) => {
      const engine = engineRef.current;
      if (!engine) return;
      const limit = engine.getDuration() || state.duration || 0;
      engine.seek(Math.max(0, Math.min(limit, engine.getTime() + delta)));
    },
    setVolume: (v) => {
      const clamped = Math.max(0, Math.min(1, v));
      engineRef.current?.setVolume(clamped);
      setState((s) => ({ ...s, volume: clamped, muted: clamped === 0 }));
    },
    toggleMute: () => {
      const next = !state.muted;
      engineRef.current?.setMuted(next);
      setState((s) => ({ ...s, muted: next }));
    },
    setRate: (r) => {
      engineRef.current?.setRate(r);
      setState((s) => ({ ...s, rate: r }));
    },
    setQuality: (id) => engineRef.current?.setQuality(id),
    requestPiP: () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture?.().catch(() => {});
      } else {
        video.requestPictureInPicture?.().catch(() => {});
      }
    },
  };

  return { state, controls };
}
