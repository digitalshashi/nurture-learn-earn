import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Image, Video, Link2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
      });
      if (error) throw error;
      setContent("");
      setImageUrl("");
      setVideoUrl("");
      setLinkUrl("");
      setShowMedia(null);
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
          placeholder="Share something with the community..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[60px] resize-none border-0 px-0 focus-visible:ring-0 text-sm"
        />

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
          </div>
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 h-8 px-4" onClick={handleSubmit} disabled={posting}>
            <Send className="h-3.5 w-3.5 mr-1" /> {posting ? "Posting..." : "Post"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
