import { AppLayout } from "@/components/layout/AppLayout";
import { FeedPost } from "@/components/feed/FeedPost";
import { FeedSidebar } from "@/components/feed/FeedSidebar";

const mockPosts = [
  {
    id: "1",
    author: "Internet Lifestyle Hub",
    authorAvatar: "",
    badge: "Freedom Business Blueprint",
    badgePoints: "+25",
    timeAgo: "2d",
    content: "Remember these days? Dial-up modem connection sound before the internet connects 🔊",
    image: "/placeholder.svg",
    likes: 1720,
    comments: 641,
    shares: 288690,
  },
  {
    id: "2",
    author: "Internet Lifestyle Hub",
    authorAvatar: "",
    badge: "Freedom Business Blueprint",
    badgePoints: "+25",
    timeAgo: "5d",
    content: "What are your TOP LEARNINGS from this week? Share below! 👇",
    image: "/placeholder.svg",
    likes: 892,
    comments: 234,
    shares: 12400,
  },
  {
    id: "3",
    author: "Internet Lifestyle Hub",
    authorAvatar: "",
    badge: "Freedom Business Blueprint",
    badgePoints: "+25",
    timeAgo: "6d",
    content: "What lessons did you learn in today's SALES SUPERSTAR session? Drop your takeaways! 🎯",
    image: "/placeholder.svg",
    likes: 456,
    comments: 178,
    shares: 8900,
  },
];

export default function Feed() {
  return (
    <AppLayout>
      <div className="flex max-w-7xl mx-auto w-full">
        <div className="flex-1 max-w-2xl mx-auto py-4 px-4">
          {/* Upcoming Events Banner */}
          <div className="bg-card rounded-lg border border-border p-4 mb-4 card-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Upcoming events</h3>
              <button className="text-accent text-xs font-medium">See all</button>
            </div>
            <div className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">11:00 AM</div>
                <div className="text-xs text-muted-foreground">02:00 PM</div>
              </div>
              <div>
                <p className="font-medium text-sm">Leadership Council Call</p>
                <p className="text-xs text-muted-foreground">By Internet Lifestyle Hub</p>
              </div>
            </div>
          </div>

          {/* Feed Posts */}
          <div className="space-y-4">
            {mockPosts.map((post) => (
              <FeedPost key={post.id} {...post} />
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="hidden lg:block w-80 py-4 pr-4">
          <FeedSidebar />
        </div>
      </div>
    </AppLayout>
  );
}
