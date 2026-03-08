import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface FeedPostProps {
  author: string;
  authorAvatar: string;
  badge: string;
  badgePoints: string;
  timeAgo: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K";
  return n.toString();
}

export function FeedPost({ author, authorAvatar, badge, badgePoints, timeAgo, content, image, likes, comments, shares }: FeedPostProps) {
  return (
    <div className="bg-card rounded-lg border border-border card-shadow animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <Avatar className="h-10 w-10">
          <AvatarImage src={authorAvatar} />
          <AvatarFallback className="bg-accent/20 text-accent font-semibold text-sm">
            {author.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{author}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0 h-4">
              {badge}
            </Badge>
            <span className="text-[10px] text-success font-semibold">{badgePoints}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm leading-relaxed">{content}</p>
      </div>

      {/* Image */}
      {image && (
        <div className="px-4 pb-3">
          <img src={image} alt="" className="w-full rounded-lg bg-secondary aspect-video object-cover" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <div className="flex items-center gap-5">
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors">
            <Heart className="h-4 w-4" />
            <span className="text-xs">{formatCount(likes)}</span>
          </button>
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-info transition-colors">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{formatCount(comments)}</span>
          </button>
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <Share2 className="h-4 w-4" />
            <span className="text-xs">{formatCount(shares)}</span>
          </button>
        </div>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <Bookmark className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
