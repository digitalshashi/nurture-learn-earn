/**
 * The media library: everything the creator has in storage, browsable.
 *
 * This page used to list two prefixes — `videos/` and `recordings/` — which
 * meant a chapter video uploaded through the course builder (which writes to
 * `content/`), a course cover, a lesson thumbnail and every PDF resource were
 * all invisible here. They were stored, paid for and reusable, and there was
 * no screen in the app that showed them. Now it reads the creator's whole
 * namespace and presents it as folders they can navigate, add to and organise.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteFromCloud } from "@/lib/cloud-storage";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { UploadProgress } from "@/components/video-library/UploadProgress";
import LessonRecorder from "@/components/video-library/LessonRecorder";
import {
  breadcrumbsFor, createMediaFolder, deleteMediaFolder, folderLabel, folderNameError,
  formatFileSize, listEverything, listMediaFolder, moveMediaFile,
  type MediaFile, type MediaFolder, type MediaKind,
} from "@/lib/mediaLibrary";
import {
  Circle, ChevronRight, Copy, ExternalLink, FileText, Film, FolderPlus, Folder,
  Image as ImageIcon, Loader2, MoreVertical, Music, Play, Search, Trash2, Upload, Video,
} from "lucide-react";

type KindFilter = "all" | MediaKind;

/**
 * The library root is the empty path, and Radix's Select refuses an empty
 * string as an item value, so the root travels through the move dialog under a
 * sentinel and is unwrapped on the way out.
 */
const ROOT_OPTION = "__root__";
const toOption = (path: string) => path || ROOT_OPTION;
const fromOption = (option: string) => (option === ROOT_OPTION ? "" : option);

const KIND_ICON: Record<MediaKind, typeof Video> = {
  video: Video,
  image: ImageIcon,
  audio: Music,
  document: FileText,
  other: FileText,
};

const KIND_LABEL: Record<MediaKind, string> = {
  video: "Video",
  image: "Image",
  audio: "Audio",
  document: "Document",
  other: "File",
};

export default function VideoLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [path, setPath] = useState("");
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");

  /** The whole namespace, fetched only when search or a move actually needs it. */
  const [everything, setEverything] = useState<{ files: MediaFile[]; folderPaths: string[] } | null>(null);
  const [scanning, setScanning] = useState(false);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [moving, setMoving] = useState<MediaFile | null>(null);
  const [moveTarget, setMoveTarget] = useState("");
  const [pendingDelete, setPendingDelete] = useState<MediaFile | null>(null);
  const [previewing, setPreviewing] = useState<MediaFile | null>(null);

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const { job, upload, reset, isBusy } = useVideoUpload();

  const load = useCallback(
    async (next = path) => {
      if (!user) return;
      setLoading(true);
      try {
        const listing = await listMediaFolder(user.id, next);
        setFolders(listing.folders);
        setFiles(listing.files);
      } catch (err) {
        toast({
          title: "Could not open this folder",
          description: err instanceof Error ? err.message : "Check your cloud storage settings.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [path, toast, user],
  );

  useEffect(() => {
    if (user) load(path);
  }, [user, path, load]);

  /**
   * Search looks at everything, not just the folder you are standing in — a
   * search that only covered the current folder would be a filter, and the
   * creator already has one of those.
   */
  const scanEverything = useCallback(async () => {
    if (!user || everything || scanning) return everything;
    setScanning(true);
    try {
      const result = await listEverything(user.id);
      setEverything(result);
      return result;
    } catch (err) {
      toast({
        title: "Could not read your library",
        description: err instanceof Error ? err.message : "Check your cloud storage settings.",
        variant: "destructive",
      });
      return null;
    } finally {
      setScanning(false);
    }
  }, [everything, scanning, toast, user]);

  const term = search.trim().toLowerCase();
  useEffect(() => {
    if (term.length >= 2) void scanEverything();
  }, [term, scanEverything]);

  /** Anything that changes what is stored invalidates the cached full scan. */
  const refresh = useCallback(() => {
    setEverything(null);
    void load(path);
  }, [load, path]);

  const visibleFiles = useMemo(() => {
    const source = term.length >= 2 ? (everything?.files ?? []) : files;
    return source.filter((file) => {
      if (kind !== "all" && file.kind !== kind) return false;
      return !term || file.name.toLowerCase().includes(term);
    });
  }, [everything, files, kind, term]);

  const visibleFolders = useMemo(
    () => (term.length >= 2 ? [] : folders),
    [folders, term],
  );

  const crumbs = useMemo(() => breadcrumbsFor(path), [path]);

  const uploadFiles = async (chosen: File[]) => {
    if (!user) return;
    // Uploads land where you are looking. Dropping every file into a single
    // fixed folder is what made the library unnavigable in the first place.
    const results = await upload(user.id, path || "videos", chosen);
    if (results.length > 0) {
      toast({ title: `${results.length} file${results.length === 1 ? "" : "s"} uploaded` });
      refresh();
    }
    if (results.length === chosen.length) setTimeout(reset, 2500);
  };

  const createFolder = async () => {
    if (!user) return;
    const problem = folderNameError(newFolderName);
    if (problem) {
      toast({ title: "That name will not work", description: problem, variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const created = await createMediaFolder(user.id, path, newFolderName);
      setNewFolderOpen(false);
      setNewFolderName("");
      toast({ title: `Folder “${newFolderName.trim()}” created` });
      setEverything(null);
      setPath(created);
    } catch (err) {
      toast({
        title: "Could not create the folder",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const removeFolder = async (folder: MediaFolder) => {
    if (!user) return;
    try {
      await deleteMediaFolder(user.id, folder.path);
      toast({ title: `Folder “${folder.label}” deleted` });
      refresh();
    } catch (err) {
      toast({
        title: "Folder not deleted",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const confirmMove = async () => {
    if (!user || !moving) return;
    const file = moving;
    const destination = fromOption(moveTarget);
    setMoving(null);
    try {
      await moveMediaFile(user.id, file, destination);
      toast({
        title: "Moved",
        description: `${file.name} is now in ${destination ? folderLabel(destination) : "All media"}.`,
      });
      refresh();
    } catch (err) {
      toast({
        title: "Could not move the file",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const file = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteFromCloud(file.key);
      setFiles((current) => current.filter((f) => f.key !== file.key));
      setEverything(null);
      toast({ title: `${file.name} deleted` });
    } catch (err) {
      toast({
        title: "Could not delete",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const copyLink = async (file: MediaFile) => {
    try {
      await navigator.clipboard.writeText(file.publicUrl);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Could not copy", description: file.publicUrl, variant: "destructive" });
    }
  };

  const openMove = async (file: MediaFile) => {
    setMoveTarget(toOption(file.path));
    setMoving(file);
    await scanEverything();
  };

  const moveOptions = useMemo(() => {
    const paths = new Set<string>(everything?.folderPaths ?? []);
    for (const folder of folders) paths.add(folder.path);
    if (path) paths.add(path);
    return [ROOT_OPTION, ...[...paths].sort((a, b) => a.localeCompare(b))];
  }, [everything, folders, path]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <Film className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">Video Library</h1>
              <p className="text-xs text-muted-foreground">
                Every video, image and file from your courses — organise them into folders.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setNewFolderOpen(true)}>
              <FolderPlus className="mr-2 h-4 w-4" /> New folder
            </Button>

            <input
              ref={uploadInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const chosen = Array.from(e.target.files || []);
                e.target.value = "";
                if (chosen.length > 0) uploadFiles(chosen);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={isBusy}
              onClick={() => uploadInputRef.current?.click()}
            >
              {isBusy ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" /> Upload</>
              )}
            </Button>

            {/* The one recording entry point. It writes into the folder you are
                standing in, so a recording made inside "Module 1" stays there. */}
            <Button className="rounded-xl" onClick={() => setRecordOpen(true)}>
              <Circle className="mr-2 h-4 w-4 fill-current" /> Record
            </Button>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav aria-label="Folders" className="mb-3 flex flex-wrap items-center gap-1 text-sm">
          {crumbs.map((crumb, index) => (
            <span key={crumb.path} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              <button
                type="button"
                onClick={() => setPath(crumb.path)}
                disabled={index === crumbs.length - 1}
                className={cn(
                  "rounded px-1.5 py-0.5",
                  index === crumbs.length - 1
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </nav>

        <UploadProgress job={job} className="mb-4" />

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search every folder…"
              className="h-9 pl-9"
            />
          </div>
          <Select value={kind} onValueChange={(v) => setKind(v as KindFilter)}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everything</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {term.length >= 2
              ? scanning
                ? "Searching everywhere…"
                : `${visibleFiles.length} match${visibleFiles.length === 1 ? "" : "es"} across all folders`
              : `${visibleFolders.length} folder${visibleFolders.length === 1 ? "" : "s"} · ${visibleFiles.length} file${visibleFiles.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {visibleFolders.length > 0 && (
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {visibleFolders.map((folder) => (
                  <div
                    key={folder.path}
                    className="group flex items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-secondary/40"
                  >
                    <button
                      type="button"
                      onClick={() => setPath(folder.path)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <Folder className="h-5 w-5 shrink-0 text-violet-500" />
                      <span className="truncate text-sm font-medium">{folder.label}</span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      title="Delete this folder"
                      onClick={() => removeFolder(folder)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {visibleFiles.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Film className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p className="text-sm font-medium">
                  {term.length >= 2 ? "Nothing matches that search" : "This folder is empty"}
                </p>
                <p className="text-xs">
                  {term.length >= 2
                    ? "Try a different name."
                    : "Upload files or record a lesson — anything your courses upload also lands here."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleFiles.map((file) => (
                  <MediaCard
                    key={file.key}
                    file={file}
                    showPath={term.length >= 2}
                    onPreview={() => setPreviewing(file)}
                    onCopy={() => copyLink(file)}
                    onMove={() => openMove(file)}
                    onDelete={() => setPendingDelete(file)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* New folder */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              Created inside {path ? folderLabel(path) : "All media"}.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createFolder();
            }}
            placeholder="Module 1"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createFolder} disabled={creating || !newFolderName.trim()}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recorder */}
      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Record a video</DialogTitle>
            <DialogDescription>
              Record your screen or camera straight into {path ? folderLabel(path) : "your library"}.
            </DialogDescription>
          </DialogHeader>
          {recordOpen && (
            <LessonRecorder
              folder={path || "recordings"}
              saveLabel="Save to library"
              onClose={() => setRecordOpen(false)}
              onRecordingComplete={() => {
                setRecordOpen(false);
                refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Move */}
      <Dialog open={moving !== null} onOpenChange={(open) => !open && setMoving(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Move file</DialogTitle>
            <DialogDescription className="truncate">{moving?.name}</DialogDescription>
          </DialogHeader>
          {scanning ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading your folders…
            </div>
          ) : (
            <Select value={moveTarget} onValueChange={setMoveTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a folder" />
              </SelectTrigger>
              <SelectContent>
                {moveOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === ROOT_OPTION ? "All media" : option.split("/").map(folderLabel).join(" / ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMoving(null)}>
              Cancel
            </Button>
            <Button onClick={confirmMove} disabled={!moving || fromOption(moveTarget) === moving.path}>
              Move here
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={previewing !== null} onOpenChange={(open) => !open && setPreviewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{previewing?.name}</DialogTitle>
            <DialogDescription>
              {previewing ? `${KIND_LABEL[previewing.kind]} · ${formatFileSize(previewing.size)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {previewing?.kind === "video" && (
            <video src={previewing.publicUrl} controls autoPlay className="max-h-[65vh] w-full rounded-lg bg-black" />
          )}
          {previewing?.kind === "image" && (
            <img
              src={previewing.publicUrl}
              alt={previewing.name}
              className="max-h-[65vh] w-full rounded-lg object-contain"
            />
          )}
          {previewing?.kind === "audio" && <audio src={previewing.publicUrl} controls className="w-full" />}
          {previewing && !["video", "image", "audio"].includes(previewing.kind) && (
            <div className="py-8 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <Button variant="outline" onClick={() => window.open(previewing.publicUrl, "_blank")}>
                <ExternalLink className="mr-2 h-4 w-4" /> Open this file
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the file from storage for good. Any lesson still pointing at it will stop
              playing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

function MediaCard({
  file,
  showPath,
  onPreview,
  onCopy,
  onMove,
  onDelete,
}: {
  file: MediaFile;
  showPath: boolean;
  onPreview: () => void;
  onCopy: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  const Icon = KIND_ICON[file.kind];

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={onPreview}
        className="relative flex aspect-video w-full items-center justify-center bg-secondary/60"
      >
        {file.kind === "image" ? (
          <img src={file.publicUrl} alt={file.name} className="h-full w-full object-cover" loading="lazy" />
        ) : file.kind === "video" ? (
          // `preload="metadata"` renders the first frame as a poster without
          // pulling the whole file down for a grid of twenty.
          <video src={file.publicUrl} preload="metadata" className="h-full w-full bg-black object-contain" />
        ) : (
          <Icon className="h-10 w-10 text-muted-foreground" />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="h-9 w-9 text-white" />
        </span>
        <Badge variant="secondary" className="absolute left-2 top-2 border-0 bg-black/60 text-[10px] text-white">
          {KIND_LABEL[file.kind]}
        </Badge>
      </button>

      <CardContent className="space-y-1.5 p-3">
        <p className="truncate text-sm font-medium" title={file.name}>
          {file.name}
        </p>
        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <span className="truncate">
            {showPath && (
              <>
                <Folder className="mr-1 inline h-2.5 w-2.5" />
                {file.path ? file.path.split("/").map(folderLabel).join(" / ") : "All media"} ·{" "}
              </>
            )}
            {formatFileSize(file.size)} · {new Date(file.createdAt).toLocaleDateString()}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onCopy}>
                <Copy className="mr-2 h-3.5 w-3.5" /> Copy link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(file.publicUrl, "_blank")}>
                <ExternalLink className="mr-2 h-3.5 w-3.5" /> Open in new tab
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMove}>
                <Folder className="mr-2 h-3.5 w-3.5" /> Move to folder…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
