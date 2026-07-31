import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  duration_days: number;
  xp_reward: number;
}

interface Participation {
  id: string;
  challenge_id: string;
  progress_percent: number;
  is_completed: boolean;
  joined_at: string;
}

export function LevelUpChallenges() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [participations, setParticipations] = useState<Participation[]>([]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const { data: c } = await supabase.from("gamification_challenges").select("*").eq("is_active", true);
    setChallenges(c || []);
    const { data: p } = await supabase.from("challenge_participants").select("*").eq("user_id", user.id);
    setParticipations(p || []);
  };

  const joinChallenge = async (challengeId: string) => {
    if (!user) return;
    await supabase.from("challenge_participants").insert({ challenge_id: challengeId, user_id: user.id });
    loadData();
    toast({ title: "Challenge joined!" });
  };

  const getParticipation = (cId: string) => participations.find((p) => p.challenge_id === cId);
  const activeChallenges = challenges.filter((c) => {
    const p = getParticipation(c.id);
    return p && !p.is_completed;
  });
  const allChallenges = challenges;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-bold">Challenges</h2>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Active Challenges</p>
            <p className="text-2xl font-bold text-accent">{activeChallenges.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">All Challenges</p>
            <p className="text-2xl font-bold text-success">{allChallenges.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">My Challenges</TabsTrigger>
          <TabsTrigger value="all">All Challenges</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3 mt-4">
          {activeChallenges.length === 0 && (
            <Card className="card-shadow">
              <CardContent className="py-12 text-center">
                <p className="font-bold text-lg">No Active Challenge Found</p>
                <p className="text-sm text-muted-foreground mt-1">Go to "All Challenges" tab to view and join them</p>
              </CardContent>
            </Card>
          )}
          {activeChallenges.map((c) => {
            const p = getParticipation(c.id);
            return (
              <Card key={c.id} className="card-shadow">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.duration_days} days · {c.xp_reward} XP</p>
                    </div>
                    <Badge className="bg-accent/10 text-accent">{p?.progress_percent || 0}%</Badge>
                  </div>
                  <Progress value={p?.progress_percent || 0} className="h-2" />
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="all" className="space-y-3 mt-4">
          {allChallenges.map((c) => {
            const joined = !!getParticipation(c.id);
            return (
              <Card key={c.id} className="card-shadow">
                <CardContent className="pt-4 pb-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.duration_days} days · {c.xp_reward} XP reward</p>
                    {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
                  </div>
                  {joined ? (
                    <Badge>Joined</Badge>
                  ) : (
                    <Button size="sm" onClick={() => joinChallenge(c.id)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                      Join
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {allChallenges.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No challenges available yet</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
