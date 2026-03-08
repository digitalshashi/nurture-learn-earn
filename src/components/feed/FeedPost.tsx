import { useMemo } from "react";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { extractEmbeds, removeEmbedUrls, parseEmbed } from "@/lib/link-embed";
import { LinkEmbed } from "@/components/feed/LinkEmbed";

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
  // Auto-detect embeds from content text
  const embeds = useMemo(() => extractEmbeds(content || ""), [content]);
  const richEmbeds = embeds.filter((e) => e.type !== "generic");
  const cleanContent = useMemo(
    () => (richEmbeds.length > 0 ? removeEmbedUrls(content || "", richEmbeds) : content),
    [content, richEmbeds]
  );

  // Legacy video_url support (for posts created before auto-embed)
  const legacyVideoEmbed = useMemo(() => {
    if (!videoUrl || richEmbeds.some((e) => e.url === videoUrl)) return null;
    const { parseEmbed } = require("@/lib/link-embed");
    return parseEmbed(videoUrl);
  }, [videoUrl, richEmbeds]);

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

        {/* Clean text content (URLs removed for embedded ones) */}
        {cleanContent && <p className="text-sm leading-relaxed mb-3 whitespace-pre-wrap">{cleanContent}</p>}

        {/* Non-embeddable link (legacy link_url field) */}
        {linkUrl && !richEmbeds.some((e) => e.url === linkUrl) && (
          <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline break-all mb-3 block">
            🔗 {linkUrl}
          </a>
        )}
      </div>

      {/* Image */}
      {image && image !== "/placeholder.svg" && (
        <img src={image} alt="" className="w-full max-h-96 object-cover" loading="lazy" />
      )}

      {/* Auto-detected rich embeds from content */}
      {richEmbeds.length > 0 && (
        <div className="px-4 pb-3 space-y-3">
          {richEmbeds.map((embed, idx) => (
            <LinkEmbed key={`${embed.url}-${idx}`} embed={embed} />
          ))}
        </div>
      )}

      {/* Legacy video embed for old posts */}
      {legacyVideoEmbed && (
        <div className="px-4 pb-3">
          <LinkEmbed embed={legacyVideoEmbed} />
        </div>
      )}

      {/* Actions */}
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
