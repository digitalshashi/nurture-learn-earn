import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { uploadUserFile } from "@/lib/cloud-storage";
import {
  Video, Mic, MicOff, Monitor, Camera, CameraOff,
  Circle, Pause, Square, X, Play, Loader2, Check,
  MonitorSmartphone, ScreenShare,
} from "lucide-react";

type RecordingMode = "screen" | "camera" | "screen_camera" | "tab";
type RecordingState = "idle" | "preview" | "recording" | "paused" | "stopped" | "uploading" | "done";

interface LessonRecorderProps {
  onRecordingComplete: (videoUrl: string) => void;
  onClose: () => void;
}

export default function LessonRecorder({ onRecordingComplete, onClose }: LessonRecorderProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [state, setState] = useState<RecordingState>("idle");
  const [mode, setMode] = useState<RecordingMode>("screen");
  const [micEnabled, setMicEnabled] = useState(true);
  const [systemAudio, setSystemAudio] = useState(false);
  const [cameraOverlay, setCameraOverlay] = useState<"bubble" | "off">("bubble");
  const [elapsed, setElapsed] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllStreams();
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const stopAllStreams = () => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    combinedStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    cameraStreamRef.current = null;
    combinedStreamRef.current = null;
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      chunksRef.current = [];
      const tracks: MediaStreamTrack[] = [];

      // Screen capture
      if (mode === "screen" || mode === "screen_camera" || mode === "tab") {
        const displayOptions: any = {
          video: { cursor: "always" },
          audio: systemAudio,
        };
        if (mode === "tab") {
          displayOptions.preferCurrentTab = true;
        }
        const screenStream = await navigator.mediaDevices.getDisplayMedia(displayOptions);
        screenStreamRef.current = screenStream;
        screenStream.getVideoTracks().forEach((t) => tracks.push(t));
        if (systemAudio) {
          screenStream.getAudioTracks().forEach((t) => tracks.push(t));
        }

        // Auto-stop when user stops sharing
        screenStream.getVideoTracks()[0].onended = () => {
          if (mediaRecorderRef.current?.state === "recording") {
            handleStop();
          }
        };
      }

      // Camera
      if (mode === "camera" || mode === "screen_camera") {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
          audio: false,
        });
        cameraStreamRef.current = camStream;
        if (mode === "camera") {
          camStream.getVideoTracks().forEach((t) => tracks.push(t));
        }
        // Show camera preview
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = camStream;
          cameraVideoRef.current.play().catch(() => {});
        }
      }

      // Microphone
      if (micEnabled) {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream.getAudioTracks().forEach((t) => tracks.push(t));
      }

      const combinedStream = new MediaStream(tracks);
      combinedStreamRef.current = combinedStream;

      // Show preview
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = combinedStream;
        previewVideoRef.current.play().catch(() => {});
      }

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setState("stopped");
        stopAllStreams();
      };

      recorder.start(1000); // Collect data every second
      setState("recording");

      // Timer
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Recording error:", err);
      toast({
        title: "Recording failed",
        description: err.message || "Could not access screen/camera/mic. Check browser permissions.",
        variant: "destructive",
      });
      stopAllStreams();
      setState("idle");
    }
  }, [mode, micEnabled, systemAudio, toast]);

  const handlePause = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setState("paused");
    }
  };

  const handleResume = () => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
      setState("recording");
    }
  };

  const handleStop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleCancel = () => {
    handleStop();
    stopAllStreams();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setState("idle");
    onClose();
  };

  const handleUpload = async () => {
    if (!user || !previewUrl) return;
    setState("uploading");
    setUploadProgress(10);

    try {
      // Convert preview URL back to blob
      const response = await fetch(previewUrl);
      const blob = await response.blob();

      const result = await uploadUserFile(user.id, "recordings", blob, {
        fileName: `lesson-${Date.now()}.webm`,
        contentType: "video/webm",
        onProgress: setUploadProgress,
      });

      toast({ title: "Recording saved!", description: "Video has been uploaded to cloud storage." });
      setState("done");

      setTimeout(() => {
        onRecordingComplete(result.publicUrl);
      }, 500);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      setState("stopped");
    }
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setElapsed(0);
    setState("idle");
  };

  return (
    <div className="border border-border rounded-xl bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
            <Video className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">Lesson Recorder</p>
            <p className="text-[10px] text-muted-foreground">Record directly in your browser</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Mode Selection (idle state) */}
      {state === "idle" && (
        <div className="p-4 space-y-4">
          {/* Recording Mode */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Recording Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "screen" as RecordingMode, label: "Screen Only", icon: Monitor, desc: "Share your screen" },
                { key: "screen_camera" as RecordingMode, label: "Screen + Camera", icon: ScreenShare, desc: "Screen with webcam overlay" },
                { key: "camera" as RecordingMode, label: "Camera Only", icon: Camera, desc: "Webcam recording" },
                { key: "tab" as RecordingMode, label: "Browser Tab", icon: MonitorSmartphone, desc: "Current tab only" },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                    mode === m.key
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <m.icon className={`h-4 w-4 ${mode === m.key ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-xs font-medium">{m.label}</p>
                    <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Audio Options */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Audio</p>
            <div className="flex gap-2">
              <button
                onClick={() => setMicEnabled(!micEnabled)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${
                  micEnabled ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {micEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                Microphone
              </button>
              {(mode === "screen" || mode === "screen_camera" || mode === "tab") && (
                <button
                  onClick={() => setSystemAudio(!systemAudio)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${
                    systemAudio ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  🔊 System Audio
                </button>
              )}
            </div>
          </div>

          {/* Camera Overlay */}
          {mode === "screen_camera" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Camera Overlay</p>
              <div className="flex gap-2">
                {(["bubble", "off"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setCameraOverlay(opt)}
                    className={`px-3 py-2 rounded-lg border text-xs transition-all ${
                      cameraOverlay === opt ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    {opt === "bubble" ? "🎥 Floating Bubble" : "Camera Off"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Start Button */}
          <Button
            className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white"
            onClick={startRecording}
          >
            <Circle className="h-4 w-4 mr-2 fill-current" />
            Start Recording
          </Button>
        </div>
      )}

      {/* Recording / Paused State */}
      {(state === "recording" || state === "paused") && (
        <div className="p-4 space-y-4">
          {/* Live Preview */}
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            <video
              ref={previewVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
            {/* Camera overlay bubble */}
            {mode === "screen_camera" && cameraOverlay === "bubble" && (
              <div className="absolute bottom-3 right-3 w-24 h-18 rounded-full overflow-hidden border-2 border-white shadow-lg">
                <video ref={cameraVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              </div>
            )}
            {/* Recording indicator */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${state === "recording" ? "bg-red-500 animate-pulse" : "bg-yellow-500"}`} />
              <span className="text-white text-xs font-mono bg-black/60 px-2 py-0.5 rounded">
                {formatTime(elapsed)}
              </span>
            </div>
            {/* Status badges */}
            <div className="absolute top-3 right-3 flex gap-1.5">
              {micEnabled && (
                <Badge variant="secondary" className="text-[10px] bg-black/60 text-white border-0">
                  <Mic className="h-2.5 w-2.5 mr-1" /> Mic
                </Badge>
              )}
              {(mode === "screen" || mode === "screen_camera" || mode === "tab") && (
                <Badge variant="secondary" className="text-[10px] bg-black/60 text-white border-0">
                  <Monitor className="h-2.5 w-2.5 mr-1" /> Screen
                </Badge>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            {state === "recording" ? (
              <Button variant="outline" size="sm" onClick={handlePause}>
                <Pause className="h-4 w-4 mr-1" /> Pause
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleResume}>
                <Play className="h-4 w-4 mr-1" /> Resume
              </Button>
            )}
            <Button
              size="sm"
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleStop}
            >
              <Square className="h-4 w-4 mr-1 fill-current" /> Stop
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Stopped - Preview & Upload */}
      {state === "stopped" && previewUrl && (
        <div className="p-4 space-y-4">
          <div className="rounded-lg overflow-hidden bg-black aspect-video">
            <video src={previewUrl} controls className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Duration: {formatTime(elapsed)}</span>
            <span>Format: WebM</span>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleUpload}>
              <Check className="h-4 w-4 mr-1" /> Save & Attach to Lesson
            </Button>
            <Button variant="outline" onClick={handleRetake}>
              Retake
            </Button>
          </div>
        </div>
      )}

      {/* Uploading */}
      {state === "uploading" && (
        <div className="p-6 space-y-4 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
          <p className="text-sm font-medium">Uploading video…</p>
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
        </div>
      )}

      {/* Done */}
      {state === "done" && (
        <div className="p-6 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <Check className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold">Recording Saved Successfully!</p>
          <p className="text-xs text-muted-foreground">Video has been attached to your lesson.</p>
        </div>
      )}
    </div>
  );
}
