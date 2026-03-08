import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Star, Flame } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const leaderboard = [
  { rank: 1, name: "Alice Johnson", points: 2450, courses: 5, badges: 8, streak: 14 },
  { rank: 2, name: "Bob Smith", points: 2100, courses: 4, badges: 6, streak: 10 },
  { rank: 3, name: "Carol Lee", points: 1890, courses: 4, badges: 5, streak: 7 },
  { rank: 4, name: "David Kim", points: 1650, courses: 3, badges: 4, streak: 5 },
  { rank: 5, name: "Emma Wilson", points: 1420, courses: 3, badges: 3, streak: 3 },
];

export default function Gamification() {
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Gamification</h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 text-center"><Trophy className="h-6 w-6 text-accent mx-auto mb-1" /><p className="text-xs text-muted-foreground">Active Players</p><p className="text-xl font-bold">248</p></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 text-center"><Medal className="h-6 w-6 text-info mx-auto mb-1" /><p className="text-xs text-muted-foreground">Badges Earned</p><p className="text-xl font-bold">1,240</p></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 text-center"><Star className="h-6 w-6 text-accent mx-auto mb-1" /><p className="text-xs text-muted-foreground">Total Points</p><p className="text-xl font-bold">45,200</p></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 text-center"><Flame className="h-6 w-6 text-destructive mx-auto mb-1" /><p className="text-xs text-muted-foreground">Avg Streak</p><p className="text-xl font-bold">6 days</p></CardContent></Card>
        </div>

        <Card className="card-shadow">
          <CardHeader><CardTitle className="text-sm">Leaderboard</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.map((u) => (
              <div key={u.rank} className="flex items-center gap-4 py-3 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                <span className={`text-lg font-bold w-8 text-center ${u.rank <= 3 ? "text-accent" : "text-muted-foreground"}`}>#{u.rank}</span>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-accent/10 text-accent text-sm font-semibold">{u.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.courses} courses · {u.badges} badges</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Flame className="h-3.5 w-3.5 text-destructive" />{u.streak} day streak</div>
                <Badge variant="outline" className="font-bold">{u.points.toLocaleString()} pts</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
