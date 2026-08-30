import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Image, Video, Link2, Send, Settings, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { extractEmbeds, parseEmbed } from "@/lib/link-embed";
import { errorMessage } from "@/lib/errorMessage";
import { LinkEmbed } from "@/components/feed/LinkEmbed";
import { PostImage } from "@/components/feed/PostImage";
import { PostVideo } from "@/components/feed/PostVideo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface CreatePostCardProps {
  onPostCreated: () => void;
  channelId?: string;
}

export function CreatePostCard({ onPostCreated, channelId }: CreatePostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showMedia, setShowMedia] = useState<"image" | "video" | "link" | null>(null);
  const [posting, setPosting] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [hideCommentCount, setHideCommentCount] = useState(false);
  const [hideLikeCount, setHideLikeCount] = useState(false);
  const [uploading, setUploading] = useState<"image" | "video" | null>(null);
  const [progress, setProgress] = useState(0);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);

  // Real-time link detection from content
  const detectedEmbeds = useMemo(() => extractEmbeds(content), [content]);
  // What the attached video is: a platform embed, or a file we play ourselves.
  const videoPreview = useMemo(() => (videoUrl ? parseEmbed(videoUrl) : null), [videoUrl]);

  /**
   * Uploads go to the same bucket as every other piece of media, so a post's
   * attachment shows up in the creator's media library like anything else —
   * and the feed gets a plain file URL it can play.
   */
  const handleFile = async (kind: "image" | "video", file: File | undefined) => {
    if (!file || !user) return;
    setUploading(kind);
    setProgress(0);
    try {
      const { uploadUserFile } = await import("@/lib/cloud-storage");
      const { publicUrl } = await uploadUserFile(user.id, "feed", file, { onProgress: setProgress });
      if (kind === "image") setImageUrl(publicUrl);
      else setVideoUrl(publicUrl);
    } catch (err) {
      toast({ title: "Upload failed", description: errorMessage(err), variant: "destructive" });
    } finally {
      setUploading(null);
      setProgress(0);
    }
  };

  const handleSubmit = async () => {
    if (uploading) return;
    if (!content.trim() && !imageUrl && !videoUrl && !linkUrl) return;
    setPosting(true);
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: user!.id,
        content: content.trim() || null,
        image_url: imageUrl || null,
        video_url: videoUrl || null,
        link_url: linkUrl || null,
        is_feed_post: !channelId,
        channel_id: channelId || null,
        comments_enabled: commentsEnabled,
        hide_comment_count: hideCommentCount,
        hide_like_count: hideLikeCount,
      });
      if (error) throw error;
      setContent("");
      setImageUrl("");
      setVideoUrl("");
      setLinkUrl("");
      setShowMedia(null);
      setCommentsEnabled(true);
      setHideCommentCount(false);
      setHideLikeCount(false);
      onPostCreated();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  return (
    <Card className="card-shadow border-border">
      <CardContent className="pt-4 pb-3">
        <Textarea
          placeholder="Share something with the community... Paste YouTube, Instagram, or other links for auto-embed"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[60px] resize-none border-0 px-0 focus-visible:ring-0 text-sm"
        />

        {/* Real-time embed previews */}
        {detectedEmbeds.length > 0 && (
          <div className="space-y-2 mt-2">
            {detectedEmbeds
              .filter((e) => e.type !== "generic")
              .slice(0, 3)
              .map((embed, idx) => (
                <LinkEmbed key={`${embed.url}-${idx}`} embed={embed} lazy={false} />
              ))}
          </div>
        )}

        {showMedia === "image" && (
          <div className="mt-2 flex gap-2">
            <Input placeholder="Image URL, or upload a file" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="text-sm" />
            <Button variant="outline" size="sm" className="h-10 shrink-0" disabled={uploading !== null} onClick={() => imageFileRef.current?.click()}>
              <Upload className="mr-1 h-3.5 w-3.5" /> Upload
            </Button>
          </div>
        )}
        {showMedia === "video" && (
          <div className="mt-2 flex gap-2">
            <Input placeholder="Video URL (youtube, loom, mp4), or upload a file" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="text-sm" />
            <Button variant="outline" size="sm" className="h-10 shrink-0" disabled={uploading !== null} onClick={() => videoFileRef.current?.click()}>
              <Upload className="mr-1 h-3.5 w-3.5" /> Upload
            </Button>
          </div>
        )}
        {showMedia === "link" && (
          <Input placeholder="Link URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="mt-2 text-sm" />
        )}

        <input
          ref={imageFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { handleFile("image", e.target.files?.[0]); e.target.value = ""; }}
        />
        <input
          ref={videoFileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => { handleFile("video", e.target.files?.[0]); e.target.value = ""; }}
        />

        {uploading && (
          <div className="mt-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Uploading {uploading}… {progress}%</p>
          </div>
        )}

        {/* Attached media previews exactly as the feed will render them, so
            nobody has to post to find out whether a video plays. */}
        {imageUrl && (
          <div className="relative mt-2">
            <PostImage src={imageUrl} className="max-h-64 w-full rounded-lg border border-border object-contain" />
            <RemoveAttachment label="Remove image" onClick={() => setImageUrl("")} />
          </div>
        )}
        {videoUrl && (
          <div className="relative mt-2">
            {videoPreview && videoPreview.type !== "generic" && videoPreview.type !== "video" ? (
              <LinkEmbed embed={videoPreview} lazy={false} />
            ) : (
              <PostVideo url={videoUrl} />
            )}
            <RemoveAttachment label="Remove video" onClick={() => setVideoUrl("")} />
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="text-muted-foreground h-8 px-2" onClick={() => setShowMedia(showMedia === "image" ? null : "image")}>
              <Image className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground h-8 px-2" onClick={() => setShowMedia(showMedia === "video" ? null : "video")}>
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground h-8 px-2" onClick={() => setShowMedia(showMedia === "link" ? null : "link")}>
              <Link2 className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground h-8 px-2" title="Change post settings">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 space-y-3" align="start">
                <p className="text-xs font-semibold text-muted-foreground">Post settings</p>
                <div className="flex items-center justify-between">
                  <Label htmlFor="hide-comment-count" className="text-sm font-normal">Hide comment count</Label>
                  <Switch id="hide-comment-count" checked={hideCommentCount} onCheckedChange={setHideCommentCount} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="comments-off" className="text-sm font-normal">Turn off commenting</Label>
                  <Switch id="comments-off" checked={!commentsEnabled} onCheckedChange={(v) => setCommentsEnabled(!v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="hide-like-count" className="text-sm font-normal">Hide like count</Label>
                  <Switch id="hide-like-count" checked={hideLikeCount} onCheckedChange={setHideLikeCount} />
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 h-8 px-4" onClick={handleSubmit} disabled={posting || uploading !== null}>
            <Send className="h-3.5 w-3.5 mr-1" /> {posting ? "Posting..." : "Post"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RemoveAttachment({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute right-2 top-2 z-10 rounded-full bg-black/55 p-1 text-white transition-colors hover:bg-black/75"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
