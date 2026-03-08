import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, Video, X, Image, Loader2, File, Link2 } from "lucide-react";

interface ChapterVideoUploadProps {
  contentType: string;
  contentUrl: string;
  thumbnailUrl: string;
  onContentChange: (url: string) => void;
  onThumbnailChange: (url: string) => void;
}

const ALL_FORMATS = ".mp4,.mov,.webm,.avi,.mkv,.pdf,.doc,.docx,.ppt,.pptx,.zip,.jpg,.jpeg,.png,.webp,.gif,.svg,.txt,.csv,.xls,.xlsx,.mp3,.wav,.m4a";
const THUMB_FORMATS = ".jpg,.jpeg,.png,.webp";
const EXTERNAL_TYPES = new Set(["youtube", "vimeo", "loom", "drive", "iframe", "link"]);

function isVideoFile(url: string) {
  return /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url);
}

export default function ChapterVideoUpload({
  contentType,
  contentUrl,
  thumbnailUrl,
  onContentChange,
  onThumbnailChange,
}: ChapterVideoUploadProps) {
  const { user } = useAuth();
  const [uploadingContent, setUploadingContent] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sourceMode, setSourceMode] = useState<"upload" | "link">("upload");
  const [externalUrl, setExternalUrl] = useState(contentUrl || "");

  const contentRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  const externalType = useMemo(() => EXTERNAL_TYPES.has(contentType), [contentType]);
  const canUseThumbnail = useMemo(
    () => contentType === "video" || isVideoFile(contentUrl),
    [contentType, contentUrl],
  );

  useEffect(() => {
    setSourceMode(externalType ? "link" : "upload");
    setExternalUrl(contentUrl || "");
  }, [externalType, contentUrl]);

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
      const filePath = `${user.id}/${folder}/${Date.now()}-${file.name}`;
      setProgress?.(30);
      const { error } = await supabase.storage.from("course-videos").upload(filePath, file);
      if (error) throw error;
      setProgress?.(80);
      const { data: urlData } = supabase.storage.from("course-videos").getPublicUrl(filePath);
      onDone(urlData.publicUrl);
      setProgress?.(100);
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
        </div>
      </div>

      {sourceMode === "upload" ? (
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
            <p className="text-xs font-medium">Video Thumbnail</p>
            <p className="text-[10px] text-muted-foreground">JPG, PNG, WEBP</p>
            <div className="flex gap-2">
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
    </div>
  );
}
