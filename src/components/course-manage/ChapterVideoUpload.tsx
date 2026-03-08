import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, Video, X, Image, Loader2 } from "lucide-react";

interface ChapterVideoUploadProps {
  videoUrl: string;
  thumbnailUrl: string;
  onVideoChange: (url: string) => void;
  onThumbnailChange: (url: string) => void;
}

const VIDEO_FORMATS = ".mp4,.mov,.webm,.avi,.mkv";
const THUMB_FORMATS = ".jpg,.jpeg,.png,.webp";

export default function ChapterVideoUpload({
  videoUrl,
  thumbnailUrl,
  onVideoChange,
  onThumbnailChange,
}: ChapterVideoUploadProps) {
  const { user } = useAuth();
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const videoRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (
    file: File,
    folder: string,
    setUploading: (v: boolean) => void,
    onDone: (url: string) => void,
    setProgress?: (v: number) => void
  ) => {
    if (!user) return;
    setUploading(true);
    setProgress?.(10);
    try {
      const filePath = `${user.id}/${folder}/${Date.now()}-${file.name}`;
      setProgress?.(30);
      const { error } = await supabase.storage
        .from("course-videos")
        .upload(filePath, file);
      if (error) throw error;
      setProgress?.(80);
      const { data: urlData } = supabase.storage
        .from("course-videos")
        .getPublicUrl(filePath);
      onDone(urlData.publicUrl);
      setProgress?.(100);
    } catch (err: any) {
      console.error("Upload error:", err.message);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress?.(0), 500);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file, "videos", setUploadingVideo, onVideoChange, setVideoProgress);
    e.target.value = "";
  };

  const handleThumbSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file, "thumbnails", setUploadingThumb, onThumbnailChange);
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      {/* Video Upload Area */}
      <div className="border-2 border-dashed border-border rounded-lg p-4 text-center space-y-2 bg-secondary/10">
        {videoUrl ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 justify-center text-sm text-primary">
              <Video className="h-4 w-4" />
              <span className="truncate max-w-[300px]">{videoUrl.split("/").pop()}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => onVideoChange("")}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <video src={videoUrl} controls className="w-full max-h-48 rounded" />
          </div>
        ) : (
          <>
            <Video className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">Drag & Drop Video Here</p>
            <p className="text-xs text-muted-foreground">MP4, MOV, WEBM, AVI, MKV • Max 2GB</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-1"
              disabled={uploadingVideo}
              onClick={() => videoRef.current?.click()}
            >
              {uploadingVideo ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="h-3 w-3 mr-1" /> Select Video File</>
              )}
            </Button>
          </>
        )}
        {videoProgress > 0 && videoProgress < 100 && (
          <Progress value={videoProgress} className="h-1.5 mt-2" />
        )}
        <input
          ref={videoRef}
          type="file"
          accept={VIDEO_FORMATS}
          className="hidden"
          onChange={handleVideoSelect}
        />
      </div>

      {/* Thumbnail Upload */}
      <div className="flex items-center gap-3">
        <div className="border border-border rounded-lg overflow-hidden bg-secondary/10 w-24 h-16 flex items-center justify-center shrink-0">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
          ) : (
            <Image className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-xs font-medium">Video Thumbnail</p>
          <p className="text-[10px] text-muted-foreground">JPG, PNG, WEBP</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2"
              disabled={uploadingThumb}
              onClick={() => thumbRef.current?.click()}
            >
              {uploadingThumb ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Upload Thumbnail"
              )}
            </Button>
            {thumbnailUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 text-destructive"
                onClick={() => onThumbnailChange("")}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
        <input
          ref={thumbRef}
          type="file"
          accept={THUMB_FORMATS}
          className="hidden"
          onChange={handleThumbSelect}
        />
      </div>
    </div>
  );
}
