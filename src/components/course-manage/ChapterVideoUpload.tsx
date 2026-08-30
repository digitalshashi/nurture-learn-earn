import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, Video, X, Image, Loader2, File, Link2, Film, Circle } from "lucide-react";
import LessonRecorder from "@/components/video-library/LessonRecorder";
import { uploadUserFile } from "@/lib/cloud-storage";
import { VideoLibraryPicker } from "@/components/video-library/VideoLibraryPicker";

interface ChapterVideoUploadProps {
  contentType: string;
  contentUrl: string;
  thumbnailUrl: string;
  /** The course's default video thumbnail, offered when this lesson has none. */
  fallbackThumbnailUrl?: string;
  durationSeconds?: number | null;
  onContentChange: (url: string) => void;
  onThumbnailChange: (url: string) => void;
  /** Called once a direct video file reports its length, so runtime totals are real. */
  onDurationChange?: (seconds: number | null) => void;
}

const ALL_FORMATS = ".mp4,.mov,.webm,.m4v,.pdf,.doc,.docx,.ppt,.pptx,.zip,.jpg,.jpeg,.png,.webp,.gif,.svg,.txt,.csv,.xls,.xlsx,.mp3,.wav,.m4a";
const THUMB_FORMATS = ".jpg,.jpeg,.png,.webp";
const EXTERNAL_TYPES = new Set(["youtube", "vimeo", "loom", "drive", "iframe", "link"]);

function isVideoFile(url: string) {
  return /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url);
}

export default function ChapterVideoUpload({
  contentType,
  contentUrl,
  thumbnailUrl,
  fallbackThumbnailUrl = "",
  durationSeconds,
  onContentChange,
  onThumbnailChange,
  onDurationChange,
}: ChapterVideoUploadProps) {
  const { user } = useAuth();
  const [uploadingContent, setUploadingContent] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sourceMode, setSourceMode] = useState<"upload" | "link" | "record">("upload");
  const [externalUrl, setExternalUrl] = useState(contentUrl || "");
  const [showRecorder, setShowRecorder] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const contentRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);
  const probedUrl = useRef<string | null>(null);
  const durationRef = useRef<number | null | undefined>(durationSeconds);
  const durationCallback = useRef(onDurationChange);
  durationRef.current = durationSeconds;
  durationCallback.current = onDurationChange;

  const externalType = useMemo(() => EXTERNAL_TYPES.has(contentType), [contentType]);
  const canUseThumbnail = useMemo(
    () => contentType === "video" || isVideoFile(contentUrl),
    [contentType, contentUrl],
  );

  useEffect(() => {
    setSourceMode(externalType ? "link" : "upload");
    setExternalUrl(contentUrl || "");
  }, [externalType, contentUrl]);

  /**
   * Read the video's own length rather than asking the coach to type it.
   * Runtime totals, the "8:05" on a lesson row and the course length on the
   * landing page all come from `duration_seconds`, which nothing was setting,
   * so every course read as having no length at all.
   */
  useEffect(() => {
    // The parent re-renders on every keystroke, so the URL — not the callback
    // identity — decides whether a probe is due. Without this, each render
    // would start another one.
    if (probedUrl.current === contentUrl) return;
    const firstLook = probedUrl.current === null;
    const previous = probedUrl.current;
    probedUrl.current = contentUrl;

    if (!contentUrl || !isVideoFile(contentUrl)) {
      // Swapping a video out for a link or a PDF has to drop the old length,
      // or the lesson keeps advertising a runtime it no longer has.
      if (!firstLook && previous) durationCallback.current?.(null);
      return;
    }
    // A length already on the row is trusted on the way in; once the coach
    // swaps the file, the new one is measured and overwrites it.
    if (firstLook && durationRef.current && durationRef.current > 0) return;

    let cancelled = false;
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.muted = true;
    probe.addEventListener(
      "loadedmetadata",
      () => {
        if (cancelled) return;
        const secs = Number.isFinite(probe.duration) ? Math.round(probe.duration) : 0;
        if (secs > 0) durationCallback.current?.(secs);
        probe.removeAttribute("src");
      },
      { once: true },
    );
    // A cross-origin or still-processing file simply yields no length; the
    // coach can carry on, the runtime line just stays blank.
    probe.addEventListener("error", () => { cancelled = true; }, { once: true });
    probe.src = contentUrl;

    return () => {
      cancelled = true;
      probe.removeAttribute("src");
    };
  }, [contentUrl]);

  const uploadFile = async (
    file: File,
    folder: string,
    setUploading: (v: boolean) => void,
    onDone: (url: string) => void,
    setProgress?: (v: number) => void,
  ) => {
    if (!user) return;
    setUploading(true);
    setProgress?.(10);
    try {
      const result = await uploadUserFile(user.id, folder, file, {
        onProgress: setProgress,
      });
      onDone(result.publicUrl);
    } catch (err: any) {
      console.error("Upload error:", err.message);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress?.(0), 500);
    }
  };

  const handleContentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file, "content", setUploadingContent, onContentChange, setUploadProgress);
    e.target.value = "";
  };

  const handleThumbSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file, "thumbnails", setUploadingThumb, onThumbnailChange);
    e.target.value = "";
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-secondary/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">Content Source</p>
        <div className="flex gap-1">
          {/* Library first: for a creator who has already uploaded their
              videos, picking one is the common case and re-uploading the
              same file into a second chapter is the wasteful one. */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px]"
            onClick={() => setShowLibrary(true)}
          >
            <Film className="h-3 w-3" /> Library
          </Button>
          <Button
            type="button"
            size="sm"
            variant={sourceMode === "upload" ? "secondary" : "ghost"}
            className="h-6 px-2 text-[10px]"
            onClick={() => setSourceMode("upload")}
          >
            <Upload className="h-3 w-3" /> Upload File
          </Button>
          <Button
            type="button"
            size="sm"
            variant={sourceMode === "link" ? "secondary" : "ghost"}
            className="h-6 px-2 text-[10px]"
            onClick={() => setSourceMode("link")}
          >
            <Link2 className="h-3 w-3" /> External Link
          </Button>
          <Button
            type="button"
            size="sm"
            variant={sourceMode === "record" ? "secondary" : "ghost"}
            className="h-6 px-2 text-[10px]"
            onClick={() => { setSourceMode("record"); setShowRecorder(true); }}
          >
            <Circle className="h-3 w-3 fill-red-500 text-red-500" /> Record
          </Button>
        </div>
      </div>

      {sourceMode === "record" ? (
        <LessonRecorder
          onRecordingComplete={(url, result) => {
            onContentChange(url);
            // The recorder timed the take. Without this the lesson row shows no
            // runtime, and the probe below cannot supply one either — a WebM
            // written by MediaRecorder reports its duration as Infinity.
            if (result?.durationSeconds) onDurationChange?.(result.durationSeconds);
            setSourceMode("upload");
            setShowRecorder(false);
          }}
          onClose={() => {
            setSourceMode("upload");
            setShowRecorder(false);
          }}
        />
      ) : sourceMode === "upload" ? (
        <div className="space-y-2 rounded-md border-2 border-dashed border-border bg-background p-3 text-center">
          {contentUrl ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 justify-center text-sm text-primary">
                {isVideoFile(contentUrl) ? <Video className="h-4 w-4" /> : <File className="h-4 w-4" />}
                <span className="truncate max-w-[280px]">{contentUrl.split("/").pop()}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => onContentChange("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {isVideoFile(contentUrl) && <video src={contentUrl} controls className="w-full max-h-48 rounded" />}
            </div>
          ) : (
            <>
              <Upload className="h-7 w-7 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium">Upload any content file</p>
              <p className="text-xs text-muted-foreground">Video, PDF, DOC, PPT, ZIP, images, audio • Max 2GB</p>
            </>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1"
            disabled={uploadingContent}
            onClick={() => contentRef.current?.click()}
          >
            {uploadingContent ? (
              <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="h-3 w-3 mr-1" /> Select File</>
            )}
          </Button>
          {uploadProgress > 0 && uploadProgress < 100 && <Progress value={uploadProgress} className="h-1.5 mt-2" />}
          <input ref={contentRef} type="file" accept={ALL_FORMATS} className="hidden" onChange={handleContentSelect} />
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="Paste YouTube/Vimeo/Drive or external URL"
            className="h-8 text-sm"
          />
          <Button
            type="button"
            size="sm"
            className="h-8"
            onClick={() => onContentChange(externalUrl.trim())}
            disabled={!externalUrl.trim()}
          >
            Save Link
          </Button>
        </div>
      )}

      {canUseThumbnail && (
        <div className="flex items-center gap-3">
          <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-background flex items-center justify-center">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="Thumbnail" className="h-full w-full object-cover" />
            ) : (
              <Image className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs font-medium">
              Video Thumbnail
              {durationSeconds ? (
                <span className="ml-2 font-normal text-muted-foreground">
                  {Math.floor(durationSeconds / 60)}:{String(Math.round(durationSeconds % 60)).padStart(2, "0")} long
                </span>
              ) : null}
            </p>
            <p className="text-[10px] text-muted-foreground">JPG, PNG, WEBP</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px]"
                disabled={uploadingThumb}
                onClick={() => thumbRef.current?.click()}
              >
                {uploadingThumb ? <Loader2 className="h-3 w-3 animate-spin" /> : "Upload Thumbnail"}
              </Button>
              {/* Most lessons want the course's default rather than their own
                  image, and setting that one field per lesson by hand was the
                  slowest part of building a curriculum. */}
              {fallbackThumbnailUrl && fallbackThumbnailUrl !== thumbnailUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => onThumbnailChange(fallbackThumbnailUrl)}
                >
                  Use course default
                </Button>
              )}
              {thumbnailUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-destructive"
                  onClick={() => onThumbnailChange("")}
                >
                  Remove
                </Button>
              )}
            </div>
            <input ref={thumbRef} type="file" accept={THUMB_FORMATS} className="hidden" onChange={handleThumbSelect} />
          </div>
        </div>
      )}

      <VideoLibraryPicker
        open={showLibrary}
        onOpenChange={setShowLibrary}
        onSelect={(video) => {
          onContentChange(video.publicUrl);
          setSourceMode("upload");
        }}
      />
    </div>
  );
}
