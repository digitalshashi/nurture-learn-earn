import type { VideoKind } from "./sourceKind";

export interface QualityOption {
  /** Stable id passed back to setQuality. "auto" is reserved. */
  id: string;
  label: string;
  height?: number;
}

export interface MediaState {
  ready: boolean;
  playing: boolean;
  waiting: boolean;
  ended: boolean;
  currentTime: number;
  duration: number;
  /** Seconds buffered ahead of currentTime, as an absolute timestamp. */
  bufferedTo: number;
  volume: number;
  muted: boolean;
  rate: number;
  qualities: QualityOption[];
  activeQuality: string;
  /** Set when the source type cannot honour a quality choice (e.g. YouTube). */
  qualityLocked: boolean;
  supportsPiP: boolean;
  error: string | null;
}

export interface MediaControls {
  play(): void;
  pause(): void;
  togglePlay(): void;
  seek(seconds: number): void;
  seekBy(delta: number): void;
  setVolume(v: number): void;
  toggleMute(): void;
  setRate(r: number): void;
  setQuality(id: string): void;
  requestPiP(): void;
}

export const initialMediaState = (kind: VideoKind): MediaState => ({
  ready: false,
  playing: false,
  waiting: false,
  ended: false,
  currentTime: 0,
  duration: 0,
  bufferedTo: 0,
  volume: 1,
  muted: false,
  rate: 1,
  qualities: [],
  activeQuality: "auto",
  qualityLocked: kind === "youtube" || kind === "embed",
  supportsPiP: kind === "native" || kind === "hls",
  error: null,
});

export const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
