import type { VimeoApi, YouTubeApi } from "./vendor";

// Vendor player SDKs are fetched on demand so a course with only uploaded MP4s
// never pays for them.
const pending = new Map<string, Promise<void>>();

export function loadScript(src: string): Promise<void> {
  const existing = pending.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("no document"));
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      pending.delete(src);
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(el);
  });

  pending.set(src, promise);
  return promise;
}

export function loadYouTubeApi(): Promise<YouTubeApi | undefined> {
  if (window.YT?.Player) return Promise.resolve(window.YT);

  // The API signals readiness through a single global callback, so chain onto
  // any handler that is already installed rather than clobbering it.
  const ready = new Promise<YouTubeApi | undefined>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve(window.YT);
    };
  });

  loadScript("https://www.youtube.com/iframe_api").catch(() => {});
  return ready;
}

export async function loadVimeoApi(): Promise<VimeoApi | undefined> {
  if (window.Vimeo?.Player) return window.Vimeo;
  await loadScript("https://player.vimeo.com/api/player.js");
  return window.Vimeo;
}
