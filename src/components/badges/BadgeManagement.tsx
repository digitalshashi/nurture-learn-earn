import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Upload, Medal, Award, Users, Loader2 } from "lucide-react";

interface BadgeDef {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  icon_url: string | null;
  badge_type: string;
  xp_required: number | null;
  assignment_rule: any;
  created_by: string | null;
}

interface UserBadgeRow {
  id: string;
  user_id: string;
  badge_id: string;
  awarded_at: string;
  profile?: { full_name: string };
}

const RULE_TRIGGERS = [
  { value: "complete_course", label: "Complete a Course" },
  { value: "complete_lessons", label: "Complete N Lessons" },
  { value: "post_messages", label: "Post N Community Messages" },
  { value: "win_challenge", label: "Win a Challenge" },
  { value: "top_leaderboard", label: "Top Leaderboard Rank" },
  { value: "purchase_service", label: "Purchase a Service" },
  { value: "manual", label: "Manual Assignment" },
];

export function BadgeManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [badges, setBadges] = useState<BadgeDef[]>([]);
  const [dialog, setDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [form, setForm] = useState({
    name: "",
    description: "",
    icon: "🏅",
    icon_url: "",
    badge_type: "achievement",
    xp_required: 0,
    rule_trigger: "manual",
    rule_value: "",
  });

  useEffect(() => { loadBadges(); }, []);

  const loadBadges = async () => {
    const { data } = await supabase.from("badges").select("*").order("created_at", { ascending: false });
    setBadges((data || []) as any as BadgeDef[]);
    // Load badge award counts
    const { data: ub } = await supabase.from("user_badges" as any).select("badge_id");
    if (ub) {
      const counts: Record<string, number> = {};
      (ub as any[]).forEach((r) => { counts[r.badge_id] = (counts[r.badge_id] || 0) + 1; });
      setStats(counts);
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("badge-icons").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("badge-icons").getPublicUrl(path);
      setForm((f) => ({ ...f, icon_url: urlData.publicUrl }));
    }
    setUploading(false);
  };

  const saveBadge = async () => {
    if (!form.name.trim()) {
      toast({ title: "Badge name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      name: form.name,
      description: form.description || null,
      icon: form.icon,
      icon_url: form.icon_url || null,
      badge_type: form.badge_type,
      xp_required: form.xp_required || null,
      assignment_rule: { trigger: form.rule_trigger, value: form.rule_value || null },
      created_by: user?.id,
    };
    const { error } = await supabase.from("badges").insert(payload);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Badge created!" });
      setDialog(false);
      setForm({ name: "", description: "", icon: "🏅", icon_url: "", badge_type: "achievement", xp_required: 0, rule_trigger: "manual", rule_value: "" });
      loadBadges();
    }
    setSaving(false);
  };

  const deleteBadge = async (id: string) => {
    if (!confirm("Delete this badge?")) return;
    await supabase.from("badges").delete().eq("id", id);
    loadBadges();
    toast({ title: "Badge deleted" });
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="card-shadow">
          <CardContent className="pt-4 pb-3 text-center">
            <Medal className="h-5 w-5 text-accent mx-auto mb-1" />
            <p className="text-lg font-bold">{badges.length}</p>
            <p className="text-[10px] text-muted-foreground">Total Badges</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="pt-4 pb-3 text-center">
            <Award className="h-5 w-5 text-accent mx-auto mb-1" />
            <p className="text-lg font-bold">{Object.values(stats).reduce((a, b) => a + b, 0)}</p>
            <p className="text-[10px] text-muted-foreground">Total Awarded</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardContent className="pt-4 pb-3 text-center">
            <Users className="h-5 w-5 text-accent mx-auto mb-1" />
            <p className="text-lg font-bold">{badges.filter((b) => b.badge_type === "service").length}</p>
            <p className="text-[10px] text-muted-foreground">Service Badges</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Button */}
      <div className="flex justify-end">
        <Dialog open={dialog} onOpenChange={setDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-1" /> Create Badge
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Badge</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Badge Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Diamond Member" />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.badge_type} onValueChange={(v) => setForm({ ...form, badge_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Service Level</SelectItem>
                    <SelectItem value="achievement">Achievement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Emoji Icon</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🏅" className="w-20" />
              </div>
              <div>
                <Label className="text-xs">Or Upload Icon (PNG/SVG)</Label>
                <div className="flex items-center gap-2">
                  <Input type="file" accept=".png,.svg,.jpg,.webp" onChange={handleIconUpload} className="text-xs" />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                {form.icon_url && <img src={form.icon_url} className="h-8 w-8 rounded mt-1" alt="preview" />}
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Earned when..." />
              </div>
              <div>
                <Label className="text-xs">Assignment Rule</Label>
                <Select value={form.rule_trigger} onValueChange={(v) => setForm({ ...form, rule_trigger: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RULE_TRIGGERS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {["complete_lessons", "post_messages"].includes(form.rule_trigger) && (
                <div>
                  <Label className="text-xs">Count Required</Label>
                  <Input type="number" value={form.rule_value} onChange={(e) => setForm({ ...form, rule_value: e.target.value })} placeholder="e.g. 10" />
                </div>
              )}
              <Button onClick={saveBadge} disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create Badge
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Badge Table */}
      <Card className="card-shadow">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Icon</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead className="text-right">Awarded</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {badges.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    {b.icon_url ? (
                      <img src={b.icon_url} className="h-7 w-7 rounded-full object-cover" alt="" />
                    ) : (
                      <span className="text-lg">{b.icon || "🏅"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{b.name}</p>
                    {b.description && <p className="text-[10px] text-muted-foreground truncate max-w-40">{b.description}</p>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.badge_type === "service" ? "default" : "secondary"} className="text-[10px]">
                      {b.badge_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {b.assignment_rule?.trigger || "manual"}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">{stats[b.id] || 0}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteBadge(b.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {badges.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No badges created yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
