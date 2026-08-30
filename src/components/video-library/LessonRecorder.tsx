/**
 * Record a lesson in the browser: a screen, a webcam, or a screen with the
 * webcam in a bubble over it. The finished file goes straight into the
 * creator's media library, so it can be attached to any number of chapters
 * afterwards.
 *
 * This replaces a version that failed for four separate reasons, all of which
 * presented identically as "Recording failed":
 *
 *   1. The site's own Permissions-Policy header denied camera and microphone
 *      (public/_headers), so the browser refused before prompting. Fixed
 *      there; the message here now names that cause when it recurs.
 *   2. The MediaRecorder was always constructed with `video/webm`, which
 *      Safari does not record — the constructor threw. Now the container is
 *      negotiated (src/lib/screenRecording.ts).
 *   3. Mic and system audio were pushed into the stream as two separate
 *      tracks. WebM carries one; browsers either dropped the second silently
 *      or refused the stream outright. They are now mixed through WebAudio.
 *   4. "Screen + Camera" never recorded the camera at all — it was shown in a
 *      DOM overlay that the recorder could not see. The two are now composited
 *      onto a canvas, which is what gets recorded.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { uploadUserFile } from "@/lib/cloud-storage";
import { formatFileSize } from "@/lib/mediaLibrary";
import {
  captureErrorMessage,
  describeSizePerMinute,
  DEFAULT_QUALITY,
  formatDuration,
  needsDownscale,
  pickRecordingFormat,
  QUALITY_PROFILES,
  readRecorderEnvironment,
  recorderUnavailableReason,
  recordingFileName,
  fitWithin,
  videoBitrateFor,
  type CaptureTarget,
  type QualityPreset,
} from "@/lib/screenRecording";
import {
  AlertCircle, Camera, Check, Circle, Loader2, Mic, MicOff, Monitor,
  MonitorSmartphone, Pause, Play, ScreenShare, Square, Video, Volume2, X,
} from "lucide-react";

type RecordingMode = "screen" | "screen_camera" | "camera" | "tab";
type RecordingState = "idle" | "recording" | "paused" | "stopped" | "uploading" | "done";

export interface RecordingResult {
  publicUrl: string;
  path: string;
  fileName: string;
  size: number;
  /** Measured on the clock while recording — a WebM's own header reports Infinity. */
  durationSeconds: number;
}

interface LessonRecorderProps {
  /** The URL comes first so existing call sites keep working unchanged. */
  onRecordingComplete: (videoUrl: string, result: RecordingResult) => void;
  onClose: () => void;
  /** Storage folder for the finished file. */
  folder?: string;
  /** Wording on the save button — "attach to lesson" vs "save to library". */
  saveLabel?: string;
}

const MODES: { key: RecordingMode; label: string; desc: string; icon: typeof Monitor }[] = [
  { key: "screen", label: "Screen only", desc: "Share a screen or window", icon: Monitor },
  { key: "screen_camera", label: "Screen + camera", desc: "You in a bubble on top", icon: ScreenShare },
  { key: "camera", label: "Camera only", desc: "Talking head", icon: Camera },
  { key: "tab", label: "This tab", desc: "Just this browser tab", icon: MonitorSmartphone },
];


export default function LessonRecorder({
  onRecordingComplete,
  onClose,
  folder = "recordings",
  saveLabel = "Save & attach to lesson",
}: LessonRecorderProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [state, setState] = useState<RecordingState>("idle");
  const [mode, setMode] = useState<RecordingMode>("screen");
  const [micEnabled, setMicEnabled] = useState(true);
  const [systemAudio, setSystemAudio] = useState(false);
  const [quality, setQuality] = useState<QualityPreset>(DEFAULT_QUALITY);
  const [elapsed, setElapsed] = useState(0);
  /** Live byte count, so a recording growing too fast is visible while it runs. */
  const [bytesRecorded, setBytesRecorded] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  /** Every track opened this session, so cleanup can never miss one. */
  const streamsRef = useRef<MediaStream[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  // Negotiated once: MediaRecorder.isTypeSupported does not change mid-session,
  // and this component re-renders on every tick of the timer.
  const format = useMemo(() => pickRecordingFormat(), []);

  const wantsScreen = mode !== "camera";
  const profile = QUALITY_PROFILES[quality];

  /**
   * What this setting will cost, before recording rather than after. The
   * estimate uses the preset's own cap, since the real frame size is not known
   * until the share has been picked.
   */
  const sizeEstimate = useMemo(() => {
    const content = wantsScreen ? "screen" : "camera";
    const limits = profile[content];
    return describeSizePerMinute(
      videoBitrateFor(profile, content, limits.maxWidth, limits.maxHeight, limits.frameRate),
      micEnabled || systemAudio ? profile.audioBitsPerSecond : 0,
    );
  }, [micEnabled, profile, systemAudio, wantsScreen]);

  const environment = useMemo(() => readRecorderEnvironment(), []);
  const unavailable = useMemo(
    () => recorderUnavailableReason(environment, wantsScreen) ??
      (format ? null : "This browser has no video container the recorder can write."),
    [environment, format, wantsScreen],
  );

  const stopEverything = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = null;
    for (const stream of streamsRef.current) stream.getTracks().forEach((t) => t.stop());
    streamsRef.current = [];
    // An AudioContext left open holds the microphone light on after the
    // recording has stopped, which reads as the page still listening.
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    setLiveStream(null);
  }, []);

  useEffect(() => stopEverything, [stopEverything]);

  // The preview element only exists once recording has started, so the stream
  // is attached from an effect. Setting `.srcObject` inside the start handler —
  // as this component used to — always ran against a ref that was still null,
  // and the creator watched a black rectangle throughout.
  useEffect(() => {
    const element = previewVideoRef.current;
    if (!element || !liveStream) return;
    element.srcObject = liveStream;
    element.play().catch(() => {
      /* autoplay policies; the recording is unaffected */
    });
    return () => {
      element.srcObject = null;
    };
  }, [liveStream]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const stopRecording = useCallback(() => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = null;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const startRecording = useCallback(async () => {
    if (!format) return;
    setError(null);
    setNotice(null);
    chunksRef.current = [];

    try {
      let videoStream: MediaStream;
      let cameraStream: MediaStream | null = null;
      const audioTracks: MediaStreamTrack[] = [];

      const content: "screen" | "camera" = mode === "camera" ? "camera" : "screen";
      const limits = profile[content];

      if (mode === "camera") {
        cameraStream = await capture(streamsRef, "camera", () =>
          navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: limits.maxWidth, max: limits.maxWidth },
              height: { ideal: limits.maxHeight, max: limits.maxHeight },
              frameRate: { ideal: limits.frameRate, max: limits.frameRate },
              facingMode: "user",
            },
            audio: false,
          }),
        );
        videoStream = cameraStream;
      } else {
        const displayOptions: DisplayMediaStreamOptions & { preferCurrentTab?: boolean } = {
          // `max` is what makes this work: browsers downscale the capture
          // themselves, in the capture pipeline, which is both cheaper and
          // sharper than redrawing a 4K frame through a canvas afterwards.
          video: {
            width: { max: limits.maxWidth },
            height: { max: limits.maxHeight },
            frameRate: { ideal: limits.frameRate, max: limits.frameRate },
          },
          audio: systemAudio,
        };
        // Skips the picker's screen and window tabs and offers this tab first,
        // which is what "record this tab" means to the person clicking it.
        if (mode === "tab") displayOptions.preferCurrentTab = true;

        const screen = await capture(streamsRef, "screen", () =>
          navigator.mediaDevices.getDisplayMedia(displayOptions),
        );

        if (systemAudio) audioTracks.push(...screen.getAudioTracks());

        if (mode === "screen_camera") {
          // A camera the creator has denied should not throw away a screen
          // share they already granted — record the screen and say so.
          try {
            cameraStream = await capture(streamsRef, "camera", () =>
              navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
                audio: false,
              }),
            );
          } catch (err) {
            setNotice(
              `${err instanceof Error ? err.message : "The camera could not be opened."} Recording the screen only.`,
            );
          }
        }

        const settings = screen.getVideoTracks()[0]?.getSettings() ?? {};
        // Firefox and Safari ignore `max` on a display capture, so the frame
        // can still arrive at 4K. Compositing is the fallback that guarantees
        // the cap; a capture already inside it is recorded from its own track,
        // untouched, because redrawing it would only soften the text.
        const oversized = needsDownscale(
          settings.width || 0,
          settings.height || 0,
          limits.maxWidth,
          limits.maxHeight,
        );

        videoStream =
          cameraStream || oversized
            ? composite(frameRef, screen, cameraStream, limits)
            : screen;

        // Stopping the share from the browser's own bar ends the recording,
        // rather than leaving it running against a frozen frame.
        screen.getVideoTracks()[0]?.addEventListener("ended", () => stopRecording());
      }

      if (micEnabled) {
        // Same rule as the camera: a blocked mic downgrades to a silent
        // recording instead of losing the take.
        try {
          const mic = await capture(streamsRef, "microphone", () =>
            navigator.mediaDevices.getUserMedia({
              // A voice track is mono. Recording narration in stereo doubles
              // the audio for two copies of the same signal.
              audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
            }),
          );
          audioTracks.push(...mic.getAudioTracks());
        } catch (err) {
          setNotice(
            `${err instanceof Error ? err.message : "The microphone could not be opened."} Recording without sound.`,
          );
        }
      }

      const tracks = [...videoStream.getVideoTracks(), ...mixAudio(audioTracks, audioContextRef)];
      const combined = new MediaStream(tracks);

      // Bitrate is read back off the track that will actually be encoded, not
      // off the preset — a shared 800x600 window and a 4K monitor end up in
      // very different places.
      const encoded = tracks[0]?.getSettings() ?? {};
      const videoBitsPerSecond = videoBitrateFor(
        profile,
        content,
        encoded.width || limits.maxWidth,
        encoded.height || limits.maxHeight,
        encoded.frameRate || limits.frameRate,
      );

      const recorder = new MediaRecorder(combined, {
        ...(format.mimeType ? { mimeType: format.mimeType } : {}),
        videoBitsPerSecond,
        audioBitsPerSecond: audioTracks.length > 0 ? profile.audioBitsPerSecond : undefined,
      });
      recorderRef.current = recorder;

      setBytesRecorded(0);
      recorder.ondataavailable = (event) => {
        if (event.data.size === 0) return;
        chunksRef.current.push(event.data);
        // Shown live, so a recording that is running away in size is obvious
        // while it is still cheap to stop and change the setting.
        setBytesRecorded((total) => total + event.data.size);
      };
      recorder.onerror = () => {
        setError("The recording stopped unexpectedly. What was captured up to that point is kept.");
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: format.contentType });
        stopEverything();
        if (blob.size === 0) {
          setError("Nothing was captured. Start again and choose a screen or window to share.");
          setState("idle");
          return;
        }
        setPreview({ url: URL.createObjectURL(blob), blob });
        setState("stopped");
      };

      // One chunk a second, so a crash mid-recording still leaves usable video.
      recorder.start(1000);
      setLiveStream(combined);
      setElapsed(0);
      setState("recording");
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (err) {
      stopEverything();
      setState("idle");
      setError(err instanceof Error ? err.message : "Recording could not be started.");
    }
  }, [format, micEnabled, mode, profile, stopEverything, stopRecording, systemAudio]);

  const pause = () => {
    if (recorderRef.current?.state !== "recording") return;
    recorderRef.current.pause();
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = null;
    setState("paused");
  };

  const resume = () => {
    if (recorderRef.current?.state !== "paused") return;
    recorderRef.current.resume();
    timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    setState("recording");
  };

  const cancel = () => {
    // Drop the take rather than handing a half-recording to onstop.
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    recorderRef.current = null;
    stopEverything();
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setState("idle");
    onClose();
  };

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setElapsed(0);
    setError(null);
    setNotice(null);
    setState("idle");
  };

  const save = async () => {
    if (!user || !preview) return;
    setState("uploading");
    setUploadProgress(0);
    setError(null);

    const fileName = recordingFileName(format.extension);
    try {
      const result = await uploadUserFile(user.id, folder, preview.blob, {
        fileName,
        contentType: format.contentType,
        onProgress: setUploadProgress,
      });

      setState("done");
      toast({ title: "Recording saved", description: `${fileName} is in your video library.` });
      onRecordingComplete(result.publicUrl, {
        publicUrl: result.publicUrl,
        path: result.path,
        fileName,
        size: preview.blob.size,
        durationSeconds: elapsed,
      });
    } catch (err) {
      // Stay on the preview: the recording is still in memory and still
      // savable, and losing a 40-minute take to one failed request is not
      // something to be casual about.
      setState("stopped");
      setError(
        err instanceof Error
          ? `${err.message} Your recording is still here — try saving again.`
          : "The upload failed. Your recording is still here — try saving again.",
      );
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-rose-600">
            <Video className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">Recorder</p>
            <p className="text-[10px] text-muted-foreground">
              {state === "recording" || state === "paused"
                ? "Recording in progress"
                : "Record straight into your library"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {(error || notice) && (
        <div
          className={`flex items-start gap-2 border-b px-4 py-2.5 text-xs ${
            error
              ? "border-destructive/20 bg-destructive/5 text-destructive"
              : "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400"
          }`}
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>{error || notice}</p>
        </div>
      )}

      {state === "idle" && (
        <div className="space-y-4 p-4">
          {unavailable ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
              <AlertCircle className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">Recording is not available here</p>
              <p className="mt-1 text-xs text-muted-foreground">{unavailable}</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">What to record</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {MODES.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMode(m.key)}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-all ${
                        mode === m.key
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <m.icon
                        className={`h-4 w-4 shrink-0 ${mode === m.key ? "text-primary" : "text-muted-foreground"}`}
                      />
                      <span>
                        <span className="block text-xs font-medium">{m.label}</span>
                        <span className="block text-[10px] text-muted-foreground">{m.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Audio</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setMicEnabled(!micEnabled)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${
                      micEnabled ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    {micEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                    Microphone
                  </button>
                  {wantsScreen && (
                    <button
                      type="button"
                      onClick={() => setSystemAudio(!systemAudio)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${
                        systemAudio ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      <Volume2 className="h-3.5 w-3.5" /> System sound
                    </button>
                  )}
                </div>
                {micEnabled && systemAudio && (
                  <p className="text-[10px] text-muted-foreground">
                    Both are mixed into one track, so your voice and the video you play are both audible.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Quality</p>
                  <p className="text-[10px] tabular-nums text-muted-foreground">{sizeEstimate}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(QUALITY_PROFILES) as QualityPreset[]).map((key) => {
                    const option = QUALITY_PROFILES[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setQuality(key)}
                        className={`rounded-lg border p-2 text-left transition-all ${
                          quality === key
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <span className="block text-[11px] font-medium">{option.label}</span>
                        <span className="block text-[10px] leading-tight text-muted-foreground">
                          {option.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700"
                onClick={startRecording}
              >
                <Circle className="mr-2 h-4 w-4 fill-current" /> Start recording
              </Button>
            </>
          )}
        </div>
      )}

      {(state === "recording" || state === "paused") && (
        <div className="space-y-4 p-4">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
            <video ref={previewVideoRef} autoPlay muted playsInline className="h-full w-full object-contain" />
            <div className="absolute left-3 top-3 flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${state === "recording" ? "animate-pulse bg-red-500" : "bg-yellow-500"}`}
              />
              <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-xs text-white">
                {formatDuration(elapsed)}
              </span>
              {bytesRecorded > 0 && (
                <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-xs text-white/80">
                  {formatFileSize(bytesRecorded)}
                </span>
              )}
            </div>
            <div className="absolute right-3 top-3 flex gap-1.5">
              {micEnabled && (
                <Badge variant="secondary" className="border-0 bg-black/60 text-[10px] text-white">
                  <Mic className="mr-1 h-2.5 w-2.5" /> Mic
                </Badge>
              )}
              {wantsScreen && (
                <Badge variant="secondary" className="border-0 bg-black/60 text-[10px] text-white">
                  <Monitor className="mr-1 h-2.5 w-2.5" /> Screen
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            {state === "recording" ? (
              <Button variant="outline" size="sm" onClick={pause}>
                <Pause className="mr-1 h-4 w-4" /> Pause
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={resume}>
                <Play className="mr-1 h-4 w-4" /> Resume
              </Button>
            )}
            <Button size="sm" className="bg-red-500 text-white hover:bg-red-600" onClick={stopRecording}>
              <Square className="mr-1 h-4 w-4 fill-current" /> Stop
            </Button>
            <Button variant="ghost" size="sm" onClick={cancel}>
              Discard
            </Button>
          </div>
        </div>
      )}

      {state === "stopped" && preview && (
        <div className="space-y-4 p-4">
          <div className="aspect-video overflow-hidden rounded-lg bg-black">
            <video src={preview.url} controls className="h-full w-full object-contain" />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatDuration(elapsed)}</span>
            <span>
              {formatFileSize(preview.blob.size)} · {format?.extension.replace(".", "").toUpperCase()}
            </span>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={save}>
              <Check className="mr-1 h-4 w-4" /> {saveLabel}
            </Button>
            <Button variant="outline" onClick={retake}>
              Record again
            </Button>
          </div>
        </div>
      )}

      {state === "uploading" && (
        <div className="space-y-4 p-6 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Saving your recording…</p>
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
        </div>
      )}

      {state === "done" && (
        <div className="space-y-3 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold">Recording saved</p>
          <p className="text-xs text-muted-foreground">It is in your video library, ready to reuse.</p>
        </div>
      )}
    </div>
  );
}

/**
 * Open one device, turning whatever it throws into something a creator can act
 * on, and remembering the stream so cleanup can never miss a track.
 */
async function capture(
  streamsRef: React.MutableRefObject<MediaStream[]>,
  target: CaptureTarget,
  open: () => Promise<MediaStream>,
): Promise<MediaStream> {
  try {
    const stream = await open();
    streamsRef.current.push(stream);
    return stream;
  } catch (err) {
    throw new Error(captureErrorMessage(err, target));
  }
}

/**
 * Screen and camera drawn onto one canvas, which is what actually gets
 * recorded. The old component put the camera in a DOM overlay instead, so
 * "Screen + Camera" produced a file with no camera in it at all.
 */
function composite(
  frameRef: React.MutableRefObject<number | null>,
  screen: MediaStream,
  camera: MediaStream | null,
  limits: { maxWidth: number; maxHeight: number; frameRate: number },
): MediaStream {
  const [track] = screen.getVideoTracks();
  const settings = track.getSettings();
  const size = fitWithin(
    settings.width || limits.maxWidth,
    settings.height || limits.maxHeight,
    limits.maxWidth,
    limits.maxHeight,
  );

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not open a canvas to combine the two videos.");
  // Screen content is mostly text, and text survives a downscale far better
  // with a proper resampling filter than with the default nearest-ish one.
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const screenVideo = playIntoElement(screen);
  const cameraVideo = camera ? playIntoElement(camera) : null;

  const bubble = Math.round(Math.min(canvas.width, canvas.height) * 0.22);
  const margin = Math.round(bubble * 0.18);

  const draw = () => {
    context.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

    if (cameraVideo && cameraVideo.videoWidth > 0) {
      const x = canvas.width - bubble - margin;
      const y = canvas.height - bubble - margin;
      const centreX = x + bubble / 2;
      const centreY = y + bubble / 2;

      context.save();
      context.beginPath();
      context.arc(centreX, centreY, bubble / 2, 0, Math.PI * 2);
      context.clip();
      drawCover(context, cameraVideo, x, y, bubble, bubble);
      context.restore();

      context.beginPath();
      context.arc(centreX, centreY, bubble / 2, 0, Math.PI * 2);
      context.lineWidth = Math.max(2, Math.round(bubble * 0.03));
      context.strokeStyle = "#ffffff";
      context.stroke();
    }

    frameRef.current = requestAnimationFrame(draw);
  };
  draw();

  // The canvas is driven at the profile frame rate rather than the display
  // refresh: a 15fps screen recording that captures 60 identical frames a
  // second is four times the data for the same picture.
  return canvas.captureStream(limits.frameRate);
}

/** A hidden, playing <video> for a stream the canvas needs to read frames from. */
function playIntoElement(stream: MediaStream): HTMLVideoElement {
  const element = document.createElement("video");
  element.srcObject = stream;
  element.muted = true;
  element.playsInline = true;
  element.play().catch(() => {});
  return element;
}

/** Draw a video into a box, cropping rather than squashing. */
function drawCover(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
  const drawWidth = video.videoWidth * scale;
  const drawHeight = video.videoHeight * scale;
  context.drawImage(
    video,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

/**
 * Mix every audio source down to a single track.
 *
 * WebM carries one audio track. Handing MediaRecorder a stream with both the
 * microphone and the shared tab's sound in it either dropped one silently or
 * was refused outright, depending on the browser — which is why a recording
 * made with "system sound" on came back with no narration.
 */
function mixAudio(
  tracks: MediaStreamTrack[],
  contextRef: React.MutableRefObject<AudioContext | null>,
): MediaStreamTrack[] {
  if (tracks.length === 0) return [];
  if (tracks.length === 1) return tracks;

  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  // No WebAudio is not worth failing the recording over; the first source
  // (system sound, then the mic) still gets recorded.
  if (!AudioContextClass) return tracks.slice(0, 1);

  const context = new AudioContextClass();
  contextRef.current = context;
  const destination = context.createMediaStreamDestination();
  for (const track of tracks) {
    context.createMediaStreamSource(new MediaStream([track])).connect(destination);
  }
  return destination.stream.getAudioTracks();
}
