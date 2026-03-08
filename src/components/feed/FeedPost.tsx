import { Heart, MessageCircle, Share2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface FeedPostProps {
  id: string;
  author: string;
  authorAvatar: string;
  content: string;
  image?: string;
  videoUrl?: string;
  linkUrl?: string;
  timeAgo: string;
  likes: number;
  comments: number;
}

export function FeedPost({ author, authorAvatar, content, image, videoUrl, linkUrl, timeAgo, likes, comments }: FeedPostProps) {
  const getVideoEmbed = (url: string) => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const id = url.includes("youtu.be") ? url.split("/").pop() : new URL(url).searchParams.get("v");
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes("loom.com")) return url.replace("/share/", "/embed/");
    return url;
  };

  return (
    <div className="bg-card rounded-xl border border-border card-shadow overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={authorAvatar} />
            <AvatarFallback className="bg-accent/20 text-accent font-semibold text-sm">
              {author.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{author}</p>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
        </div>
        {content && <p className="text-sm leading-relaxed mb-3">{content}</p>}
        {linkUrl && (
          <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline break-all mb-3 block">
            🔗 {linkUrl}
          </a>
        )}
      </div>
      {image && image !== "/placeholder.svg" && (
        <img src={image} alt="" className="w-full max-h-96 object-cover" />
      )}
      {videoUrl && (
        <div className="aspect-video">
          <iframe src={getVideoEmbed(videoUrl)} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
        </div>
      )}
      <div className="px-4 py-3 border-t border-border flex items-center gap-6">
        <button className="flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors text-sm">
          <Heart className="h-4 w-4" /> {likes > 0 && likes}
        </button>
        <button className="flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors text-sm">
          <MessageCircle className="h-4 w-4" /> {comments > 0 && comments}
        </button>
        <button className="flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors text-sm">
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
