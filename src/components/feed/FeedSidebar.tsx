import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const leaderboardData = [
  { name: "CA Gopal Singh Negl", points: "2.4K", rank: 1 },
  { name: "Sunita Yaduvanshi", points: "2.1K", rank: 2 },
  { name: "Nandkishor Gajbhiye", points: "1.9K", rank: 3 },
  { name: "Dr. Chithra P.", points: "1.7K", rank: 4 },
  { name: "Amritaanshu", points: "1.5K", rank: 5 },
];

const rankColors = ["bg-amber-400", "bg-gray-400", "bg-amber-700"];

export function FeedSidebar() {
  return (
    <div className="space-y-4">
      {/* Trust Quotient */}
      <div className="bg-card rounded-lg border border-border p-4 card-shadow">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-accent text-lg">🔥</span>
          <h3 className="font-semibold text-sm">Introducing Trust Quotient (TQ)</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Complete your profile to unlock your trust score
        </p>
        <Button variant="outline" size="sm" className="w-full text-xs">
          Complete profile
        </Button>
      </div>

      {/* Leaderboard */}
      <div className="bg-card rounded-lg border border-border p-4 card-shadow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Leaderboard</h3>
          <div className="flex gap-1">
            <button className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Month</button>
            <button className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">Day</button>
          </div>
        </div>
        <div className="space-y-2">
          {leaderboardData.map((user, i) => (
            <div key={user.name} className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground w-4">{user.rank}</span>
              <Avatar className="h-7 w-7">
                <AvatarFallback className={`${i < 3 ? rankColors[i] : "bg-secondary"} text-[10px] font-semibold ${i < 3 ? "text-card" : "text-foreground"}`}>
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs flex-1 truncate">{user.name}</span>
              <span className="text-xs font-semibold text-accent">{user.points}</span>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-accent">
          View all
        </Button>
      </div>
    </div>
  );
}
