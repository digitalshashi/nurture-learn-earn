import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trophy, Star, Medal, Target, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BadgeManagement } from "@/components/badges/BadgeManagement";

interface XpRule {
  id: string;
  action_name: string;
  xp_value: number;
  daily_limit: number | null;
  is_enabled: boolean;
}

interface LevelDef {
  id: string;
  level_number: number;
  xp_required: number;
  badge_name: string | null;
  reward_description: string | null;
}

interface BadgeDef {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  xp_required: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  duration_days: number;
  xp_reward: number;
  is_active: boolean;
}

export default function Gamification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState<XpRule[]>([]);
  const [levels, setLevels] = useState<LevelDef[]>([]);
  const [badges, setBadges] = useState<BadgeDef[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [newLevel, setNewLevel] = useState({ level_number: 0, xp_required: 0, badge_name: "" });
  const [newBadge, setNewBadge] = useState({ name: "", description: "", icon: "🏆", xp_required: 0 });
  const [newChallenge, setNewChallenge] = useState({ title: "", description: "", duration_days: 7, xp_reward: 100 });
  const [newRule, setNewRule] = useState({ action_name: "", xp_value: 10, daily_limit: "" as string });
  const [levelDialog, setLevelDialog] = useState(false);
  const [badgeDialog, setBadgeDialog] = useState(false);
  const [challengeDialog, setChallengeDialog] = useState(false);
  const [ruleDialog, setRuleDialog] = useState(false);

  const XP_ACTION_OPTIONS = [
    "login", "complete_lesson", "complete_chapter", "complete_course", "complete_quiz",
    "post_content", "comment", "like_post", "share_post", "reply_comment",
    "attend_event", "daily_habit", "task_completed", "challenge_completed",
    "refer_friend", "profile_complete", "streak_bonus", "first_purchase",
    "review_course", "upload_assignment", "join_community", "watch_video",
    "read_article", "earn_certificate", "charity_donation",
  ];

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [r, l, b, c] = await Promise.all([
      supabase.from("xp_rules").select("*").order("action_name"),
      supabase.from("level_definitions").select("*").order("level_number"),
      supabase.from("badges").select("*").order("xp_required"),
      supabase.from("gamification_challenges").select("*").order("created_at", { ascending: false }),
    ]);
    setRules(r.data || []);
    setLevels(l.data || []);
    setBadges(b.data || []);
    setChallenges(c.data || []);
  };

  const updateRule = async (id: string, field: string, value: any) => {
    await supabase.from("xp_rules").update({ [field]: value }).eq("id", id);
    loadAll();
  };

  const addRule = async () => {
    if (!newRule.action_name) { toast({ title: "Select an action", variant: "destructive" }); return; }
    const existing = rules.find(r => r.action_name === newRule.action_name);
    if (existing) { toast({ title: "This action already exists", variant: "destructive" }); return; }
    await supabase.from("xp_rules").insert({
      action_name: newRule.action_name,
      xp_value: newRule.xp_value,
      daily_limit: newRule.daily_limit ? Number(newRule.daily_limit) : null,
    });
    setRuleDialog(false);
    setNewRule({ action_name: "", xp_value: 10, daily_limit: "" });
    loadAll();
    toast({ title: "XP Rule added" });
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Delete this XP rule?")) return;
    await supabase.from("xp_rules").delete().eq("id", id);
    loadAll();
    toast({ title: "XP Rule deleted" });
  };

  const addLevel = async () => {
    await supabase.from("level_definitions").insert(newLevel);
    setLevelDialog(false);
    setNewLevel({ level_number: 0, xp_required: 0, badge_name: "" });
    loadAll();
    toast({ title: "Level added" });
  };

  const addBadge = async () => {
    await supabase.from("badges").insert(newBadge);
    setBadgeDialog(false);
    setNewBadge({ name: "", description: "", icon: "🏆", xp_required: 0 });
    loadAll();
    toast({ title: "Badge added" });
  };

  const addChallenge = async () => {
    if (!user) return;
    await supabase.from("gamification_challenges").insert({ ...newChallenge, created_by: user.id });
    setChallengeDialog(false);
    setNewChallenge({ title: "", description: "", duration_days: 7, xp_reward: 100 });
    loadAll();
    toast({ title: "Challenge created" });
  };

  const toggleChallenge = async (id: string, active: boolean) => {
    await supabase.from("gamification_challenges").update({ is_active: !active }).eq("id", id);
    loadAll();
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Gamification Settings</h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 text-center"><Trophy className="h-6 w-6 text-accent mx-auto mb-1" /><p className="text-xs text-muted-foreground">XP Rules</p><p className="text-xl font-bold">{rules.length}</p></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 text-center"><Star className="h-6 w-6 text-accent mx-auto mb-1" /><p className="text-xs text-muted-foreground">Levels</p><p className="text-xl font-bold">{levels.length}</p></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 text-center"><Medal className="h-6 w-6 text-info mx-auto mb-1" /><p className="text-xs text-muted-foreground">Badges</p><p className="text-xl font-bold">{badges.length}</p></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 text-center"><Target className="h-6 w-6 text-destructive mx-auto mb-1" /><p className="text-xs text-muted-foreground">Challenges</p><p className="text-xl font-bold">{challenges.length}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="xp-rules">
          <TabsList>
            <TabsTrigger value="xp-rules">XP Rules</TabsTrigger>
            <TabsTrigger value="levels">Levels</TabsTrigger>
            <TabsTrigger value="badge-mgmt">Badge Management</TabsTrigger>
            <TabsTrigger value="badges">Legacy Badges</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
          </TabsList>

          {/* Badge Management (new full system) */}
          <TabsContent value="badge-mgmt">
            <div className="mt-4">
              <BadgeManagement />
            </div>
          </TabsContent>

          {/* XP Rules */}
          <TabsContent value="xp-rules">
            <div className="flex justify-end mt-4 mb-3">
              <Dialog open={ruleDialog} onOpenChange={setRuleDialog}>
                <DialogTrigger asChild><Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1" /> Add XP Rule</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add XP Rule</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Action</Label>
                      <Select value={newRule.action_name} onValueChange={v => setNewRule({ ...newRule, action_name: v })}>
                        <SelectTrigger><SelectValue placeholder="Select action..." /></SelectTrigger>
                        <SelectContent>
                          {XP_ACTION_OPTIONS.filter(a => !rules.find(r => r.action_name === a)).map(a => (
                            <SelectItem key={a} value={a}>{a.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>XP Value</Label><Input type="number" value={newRule.xp_value} onChange={e => setNewRule({ ...newRule, xp_value: Number(e.target.value) })} /></div>
                    <div><Label>Daily Limit (leave empty for unlimited)</Label><Input type="number" placeholder="∞" value={newRule.daily_limit} onChange={e => setNewRule({ ...newRule, daily_limit: e.target.value })} /></div>
                    <Button onClick={addRule} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Add Rule</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card className="card-shadow">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>XP Value</TableHead>
                      <TableHead>Daily Limit</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No XP rules yet. Add your first rule!</TableCell></TableRow>
                    ) : rules.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium capitalize">{r.action_name.replace(/_/g, " ")}</TableCell>
                        <TableCell>
                          <Input type="number" className="w-20 h-8" defaultValue={r.xp_value}
                            onBlur={(e) => updateRule(r.id, "xp_value", Number(e.target.value))} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" className="w-20 h-8" defaultValue={r.daily_limit || ""}
                            placeholder="∞"
                            onBlur={(e) => updateRule(r.id, "daily_limit", e.target.value ? Number(e.target.value) : null)} />
                        </TableCell>
                        <TableCell>
                          <Switch checked={r.is_enabled} onCheckedChange={(v) => updateRule(r.id, "is_enabled", v)} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRule(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Levels */}
          <TabsContent value="levels">
            <div className="flex justify-end mt-4 mb-3">
              <Dialog open={levelDialog} onOpenChange={setLevelDialog}>
                <DialogTrigger asChild><Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1" /> Add Level</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Level</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Level Number</Label><Input type="number" value={newLevel.level_number} onChange={(e) => setNewLevel({ ...newLevel, level_number: Number(e.target.value) })} /></div>
                    <div><Label>XP Required</Label><Input type="number" value={newLevel.xp_required} onChange={(e) => setNewLevel({ ...newLevel, xp_required: Number(e.target.value) })} /></div>
                    <div><Label>Badge Name</Label><Input value={newLevel.badge_name} onChange={(e) => setNewLevel({ ...newLevel, badge_name: e.target.value })} /></div>
                    <Button onClick={addLevel} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card className="card-shadow">
              <Table>
                <TableHeader><TableRow><TableHead>Level</TableHead><TableHead>XP Required</TableHead><TableHead>Badge</TableHead></TableRow></TableHeader>
                <TableBody>
                  {levels.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-bold">Level {l.level_number}</TableCell>
                      <TableCell>{l.xp_required.toLocaleString()} XP</TableCell>
                      <TableCell><Badge variant="outline">{l.badge_name || "–"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Badges */}
          <TabsContent value="badges">
            <div className="flex justify-end mt-4 mb-3">
              <Dialog open={badgeDialog} onOpenChange={setBadgeDialog}>
                <DialogTrigger asChild><Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1" /> Add Badge</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Badge</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Name</Label><Input value={newBadge.name} onChange={(e) => setNewBadge({ ...newBadge, name: e.target.value })} /></div>
                    <div><Label>Description</Label><Input value={newBadge.description} onChange={(e) => setNewBadge({ ...newBadge, description: e.target.value })} /></div>
                    <div><Label>Icon (emoji)</Label><Input value={newBadge.icon} onChange={(e) => setNewBadge({ ...newBadge, icon: e.target.value })} /></div>
                    <div><Label>XP Required</Label><Input type="number" value={newBadge.xp_required} onChange={(e) => setNewBadge({ ...newBadge, xp_required: Number(e.target.value) })} /></div>
                    <Button onClick={addBadge} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {badges.map((b) => (
                <Card key={b.id} className="card-shadow">
                  <CardContent className="pt-4 pb-3 text-center">
                    <span className="text-3xl">{b.icon}</span>
                    <p className="font-semibold text-sm mt-2">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.description}</p>
                    <Badge variant="outline" className="mt-2 text-xs">{b.xp_required} XP</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Challenges */}
          <TabsContent value="challenges">
            <div className="flex justify-end mt-4 mb-3">
              <Dialog open={challengeDialog} onOpenChange={setChallengeDialog}>
                <DialogTrigger asChild><Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1" /> Create Challenge</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Challenge</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Title</Label><Input value={newChallenge.title} onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })} /></div>
                    <div><Label>Description</Label><Input value={newChallenge.description} onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })} /></div>
                    <div><Label>Duration (days)</Label><Input type="number" value={newChallenge.duration_days} onChange={(e) => setNewChallenge({ ...newChallenge, duration_days: Number(e.target.value) })} /></div>
                    <div><Label>XP Reward</Label><Input type="number" value={newChallenge.xp_reward} onChange={(e) => setNewChallenge({ ...newChallenge, xp_reward: Number(e.target.value) })} /></div>
                    <Button onClick={addChallenge} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Create</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card className="card-shadow">
              <Table>
                <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Duration</TableHead><TableHead>XP Reward</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {challenges.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.title}</TableCell>
                      <TableCell>{c.duration_days} days</TableCell>
                      <TableCell>{c.xp_reward} XP</TableCell>
                      <TableCell><Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell><Switch checked={c.is_active} onCheckedChange={() => toggleChallenge(c.id, c.is_active)} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
