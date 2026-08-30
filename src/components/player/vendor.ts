// Minimal structural types for the third-party player SDKs we drive. Only the
// members this codebase actually calls are declared — these are hand-written
// because neither SDK ships types we depend on.

export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getVideoLoadedFraction(): number;
  getVolume(): number;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setPlaybackRate(rate: number): void;
  destroy(): void;
}

export interface YouTubeApi {
  Player: new (
    host: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: () => void;
      };
    },
  ) => YouTubePlayer;
  PlayerState: {
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    ENDED: number;
  };
}

export interface VimeoQuality {
  id: string;
  label?: string;
}

export interface VimeoPlayer {
  play(): Promise<void>;
  pause(): Promise<void>;
  ready(): Promise<void>;
  getDuration(): Promise<number>;
  getQualities(): Promise<VimeoQuality[]>;
  setCurrentTime(seconds: number): Promise<number>;
  setVolume(volume: number): Promise<number>;
  setPlaybackRate(rate: number): Promise<number>;
  setQuality(id: string): Promise<string>;
  destroy(): Promise<void>;
  on(event: string, handler: (data: VimeoEventData) => void): void;
}

export interface VimeoEventData {
  seconds: number;
  duration: number;
  percent: number;
}

export interface VimeoApi {
  Player: new (
    host: HTMLElement,
    options: { id: number; controls?: boolean; responsive?: boolean },
  ) => VimeoPlayer;
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    Vimeo?: VimeoApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}
