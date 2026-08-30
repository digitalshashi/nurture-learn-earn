import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PLAYABLE_VIDEO_ACCEPT } from "@/lib/videoFormats";
import { formatFileSize, listLibraryVideos, type LibraryVideo } from "@/lib/videoLibrary";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { UploadProgress } from "./UploadProgress";
import LessonRecorder from "./LessonRecorder";
import { Circle, Loader2, Mic, Search, Upload, Video } from "lucide-react";

const VIDEO_ACCEPT = PLAYABLE_VIDEO_ACCEPT;

/**
 * Pick a video that is already in the creator's library instead of uploading
 * the same file into every chapter that needs it. Uploading from here is the
 * same call the library page makes, so a file added mid-flow is in the library
 * afterwards too.
 */
export function VideoLibraryPicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the chosen video's public URL and its file name. */
  onSelect: (video: LibraryVideo) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const { job, upload, reset, isBusy } = useVideoUpload();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && user) load();
    if (!open) {
      setSearch("");
      setSelectedId(null);
      setRecording(false);
    }
  }, [open, user?.id]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      setVideos(await listLibraryVideos(user.id));
    } catch (err) {
      toast({
        title: "Could not load your library",
        description: err instanceof Error ? err.message : "Check cloud storage config",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    const [result] = await upload(user.id, "videos", [file]);
    if (!result) return; // the progress panel is showing why
    // Hand the fresh upload straight back: uploading from the picker means
    // this is the video they wanted for this chapter.
    onSelect({
      id: result.path,
      key: result.path,
      name: result.fileName,
      folder: "videos",
      publicUrl: result.publicUrl,
      createdAt: new Date().toISOString(),
      size: result.size,
      durationSeconds: result.probe.durationSeconds,
    });
    onOpenChange(false);
    reset();
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? videos.filter((v) => v.name.toLowerCase().includes(term)) : videos;
  }, [videos, search]);

  const selected = filtered.find((v) => v.id === selectedId);

  // Recording lives inside the picker as well as on the library page: a coach
  // filling in a chapter reaches for "Library" and finds they have nothing to
  // attach yet, and making one right there beats sending them to another page.
  if (recording) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Record a video</DialogTitle>
            <DialogDescription>Record your screen or camera for this lesson.</DialogDescription>
          </DialogHeader>
          <LessonRecorder
            saveLabel="Save & use for this lesson"
            onClose={() => setRecording(false)}
            onRecordingComplete={(url, result) => {
              onSelect({
                id: result.path,
                key: result.path,
                name: result.fileName,
                folder: "recordings",
                publicUrl: url,
                createdAt: new Date().toISOString(),
                size: result.size,
                durationSeconds: result.durationSeconds,
              });
              onOpenChange(false);
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose from your video library</DialogTitle>
          <DialogDescription>
            Every video you have uploaded or recorded, ready to attach to this lesson.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your videos…"
              className="h-9 pl-9"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={VIDEO_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) handleUpload(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            disabled={isBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            {isBusy ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload new
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9"
            disabled={isBusy}
            onClick={() => setRecording(true)}
          >
            <Circle className="mr-1.5 h-3.5 w-3.5 fill-current" /> Record
          </Button>
        </div>

        <UploadProgress job={job} />

        <div className="max-h-[45vh] min-h-[220px] overflow-y-auto rounded-xl border border-border">
          {loading ? (
            <div className="flex h-[220px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-[220px] flex-col items-center justify-center gap-2 px-6 text-center">
              <Video className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                {videos.length === 0 ? "Your library is empty" : "No videos match that search"}
              </p>
              <p className="text-xs text-muted-foreground">
                {videos.length === 0
                  ? "Upload one or record one right here — both land in your video library."
                  : "Try a different name."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((video) => {
                const isSelected = video.id === selectedId;
                return (
                  <li key={video.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(video.id)}
                      onDoubleClick={() => {
                        onSelect(video);
                        onOpenChange(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        isSelected ? "bg-accent-tint" : "hover:bg-secondary/60",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          isSelected ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {video.folder === "recordings" ? (
                          <Mic className="h-4 w-4" />
                        ) : (
                          <Video className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-sm font-medium", isSelected && "text-accent")}>
                          {video.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {video.folder === "recordings" ? "Recording" : "Upload"} ·{" "}
                          {formatFileSize(video.size)} ·{" "}
                          {new Date(video.createdAt).toLocaleDateString()}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs text-muted-foreground">
            {selected ? selected.name : `${videos.length} video${videos.length === 1 ? "" : "s"} in your library`}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selected}
              onClick={() => {
                if (!selected) return;
                onSelect(selected);
                onOpenChange(false);
              }}
            >
              Use this video
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
