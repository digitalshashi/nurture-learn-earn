import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Image, Video, Link2, Send, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { extractEmbeds } from "@/lib/link-embed";
import { LinkEmbed } from "@/components/feed/LinkEmbed";
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

  // Real-time link detection from content
  const detectedEmbeds = useMemo(() => extractEmbeds(content), [content]);

  const handleSubmit = async () => {
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
          <Input placeholder="Image URL (jpg, png, gif)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-2 text-sm" />
        )}
        {showMedia === "video" && (
          <Input placeholder="Video URL (youtube, loom, mp4)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="mt-2 text-sm" />
        )}
        {showMedia === "link" && (
          <Input placeholder="Link URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="mt-2 text-sm" />
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
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 h-8 px-4" onClick={handleSubmit} disabled={posting}>
            <Send className="h-3.5 w-3.5 mr-1" /> {posting ? "Posting..." : "Post"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
