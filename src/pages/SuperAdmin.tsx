import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Users, CreditCard, Plus, Pencil, Trash2,
  Crown, Package, DollarSign, BarChart3
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface SaasPlan {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  commission_percent: number;
  billing_type: string;
  max_courses: number | null;
  max_students: number | null;
  storage_limit_mb: number | null;
  allowed_modules: string[];
  is_active: boolean;
  sort_order: number;
}

interface CoachSub {
  id: string;
  coach_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
  notes: string | null;
  plan?: SaasPlan;
  profile?: { full_name: string; email: string };
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  roles: string[];
}

const ALL_MODULES = [
  { key: "courses", label: "Courses" },
  { key: "events", label: "Events" },
  { key: "community", label: "Community" },
  { key: "gamification", label: "Gamification" },
  { key: "analytics", label: "Analytics" },
  { key: "affiliates", label: "Affiliates" },
  { key: "ai_tools", label: "AI Tools" },
  { key: "page_builder", label: "Page Builder" },
  { key: "email_automation", label: "Email Automation" },
  { key: "certificates", label: "Certificates" },
];

const emptyPlan = {
  name: "",
  description: "",
  monthly_price: 0,
  yearly_price: 0,
  commission_percent: 0,
  billing_type: "monthly",
  max_courses: "",
  max_students: "",
  storage_limit_mb: "",
  allowed_modules: ALL_MODULES.map((m) => m.key),
  is_active: true,
};

export default function SuperAdmin() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<CoachSub[]>([]);
  const [coaches, setCoaches] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [planDialog, setPlanDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...emptyPlan });
  const [assignForm, setAssignForm] = useState({ coach_id: "", plan_id: "", expires_at: "", notes: "" });
  const [stats, setStats] = useState({ totalCoaches: 0, activeSubs: 0, totalRevenue: 0 });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [plansRes, subsRes, profilesRes, rolesRes] = await Promise.all([
      supabase.from("saas_plans").select("*").order("sort_order"),
      supabase.from("coach_subscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
    ]);

    const plansData = (plansRes.data || []) as SaasPlan[];
    setPlans(plansData);

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];

    const usersWithRoles: UserProfile[] = profiles.map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      roles: roles.filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
    }));
    setAllUsers(usersWithRoles);

    const coachUsers = usersWithRoles.filter((u) => u.roles.includes("coach"));
    setCoaches(coachUsers);

    const subs = (subsRes.data || []).map((s: any) => ({
      ...s,
      plan: plansData.find((p) => p.id === s.plan_id),
      profile: usersWithRoles.find((u) => u.id === s.coach_id),
    })) as CoachSub[];
    setSubscriptions(subs);

    setStats({
      totalCoaches: coachUsers.length,
      activeSubs: subs.filter((s) => s.status === "active").length,
      totalRevenue: plansData.reduce((sum, p) => sum + Number(p.monthly_price), 0),
    });
  };

  const savePlan = async () => {
    const payload = {
      name: form.name,
      description: form.description || null,
      monthly_price: Number(form.monthly_price) || 0,
      yearly_price: Number(form.yearly_price) || 0,
      commission_percent: Number(form.commission_percent) || 0,
      billing_type: form.billing_type,
      max_courses: form.max_courses ? Number(form.max_courses) : null,
      max_students: form.max_students ? Number(form.max_students) : null,
      storage_limit_mb: form.storage_limit_mb ? Number(form.storage_limit_mb) : null,
      allowed_modules: form.allowed_modules,
      is_active: form.is_active,
    };

    if (editingPlan) {
      const { error } = await supabase.from("saas_plans").update(payload).eq("id", editingPlan);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Plan updated" });
    } else {
      const { error } = await supabase.from("saas_plans").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Plan created" });
    }
    setPlanDialog(false);
    setEditingPlan(null);
    setForm({ ...emptyPlan });
    loadAll();
  };

  const deletePlan = async (id: string) => {
    await supabase.from("saas_plans").delete().eq("id", id);
    toast({ title: "Plan deleted" });
    loadAll();
  };

  const editPlan = (plan: SaasPlan) => {
    setForm({
      name: plan.name,
      description: plan.description || "",
      monthly_price: plan.monthly_price,
      yearly_price: plan.yearly_price,
      commission_percent: plan.commission_percent,
      billing_type: plan.billing_type,
      max_courses: plan.max_courses ?? "",
      max_students: plan.max_students ?? "",
      storage_limit_mb: plan.storage_limit_mb ?? "",
      allowed_modules: plan.allowed_modules,
      is_active: plan.is_active,
    });
    setEditingPlan(plan.id);
    setPlanDialog(true);
  };

  const assignPlan = async () => {
    if (!user || !assignForm.coach_id || !assignForm.plan_id) return;
    const { error } = await supabase.from("coach_subscriptions").insert({
      coach_id: assignForm.coach_id,
      plan_id: assignForm.plan_id,
      status: "active",
      expires_at: assignForm.expires_at || null,
      notes: assignForm.notes || null,
      assigned_by: user.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Plan assigned to coach" });
    setAssignDialog(false);
    setAssignForm({ coach_id: "", plan_id: "", expires_at: "", notes: "" });
    loadAll();
  };

  const updateSubStatus = async (subId: string, status: string) => {
    await supabase.from("coach_subscriptions").update({ status }).eq("id", subId);
    toast({ title: `Subscription ${status}` });
    loadAll();
  };

  const changeRole = async (userId: string, newRole: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
    toast({ title: "Role updated" });
    loadAll();
  };

  const toggleModule = (key: string) => {
    const mods = form.allowed_modules as string[];
    setForm({
      ...form,
      allowed_modules: mods.includes(key) ? mods.filter((m: string) => m !== key) : [...mods, key],
    });
  };

  if (!hasRole("admin")) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-var(--nav-height))]">
          <div className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Super Admin access required</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold font-display flex items-center gap-2">
              <Crown className="h-5 w-5 text-accent" /> Super Admin
            </h1>
            <p className="text-sm text-muted-foreground">Manage coaches, SaaS plans, and platform access</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="card-shadow">
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10"><Users className="h-5 w-5 text-accent" /></div>
              <div><p className="text-2xl font-bold">{stats.totalCoaches}</p><p className="text-xs text-muted-foreground">Total Coaches</p></div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-success/10"><CreditCard className="h-5 w-5 text-success" /></div>
              <div><p className="text-2xl font-bold">{stats.activeSubs}</p><p className="text-xs text-muted-foreground">Active Subscriptions</p></div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-info/10"><Package className="h-5 w-5 text-info" /></div>
              <div><p className="text-2xl font-bold">{plans.length}</p><p className="text-xs text-muted-foreground">SaaS Plans</p></div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="plans" className="space-y-4">
          <TabsList>
            <TabsTrigger value="plans">SaaS Plans</TabsTrigger>
            <TabsTrigger value="coaches">Coach Management</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="users">All Users</TabsTrigger>
          </TabsList>

          {/* ======== PLANS TAB ======== */}
          <TabsContent value="plans">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">SaaS Plans</h2>
              <Dialog open={planDialog} onOpenChange={(o) => { setPlanDialog(o); if (!o) { setEditingPlan(null); setForm({ ...emptyPlan }); } }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Plus className="h-4 w-4 mr-1" /> Create Plan
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editingPlan ? "Edit Plan" : "Create SaaS Plan"}</DialogTitle></DialogHeader>
                  <div className="space-y-3 mt-2">
                    <div><Label>Plan Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Pro Plan" /></div>
                    <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>

                    <div><Label>Billing Type</Label>
                      <Select value={form.billing_type} onValueChange={(v) => setForm({ ...form, billing_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                          <SelectItem value="commission">Commission Only</SelectItem>
                          <SelectItem value="hybrid">Hybrid (Subscription + Commission)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Monthly ($)</Label><Input type="number" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: e.target.value })} /></div>
                      <div><Label>Yearly ($)</Label><Input type="number" value={form.yearly_price} onChange={(e) => setForm({ ...form, yearly_price: e.target.value })} /></div>
                      <div><Label>Commission %</Label><Input type="number" value={form.commission_percent} onChange={(e) => setForm({ ...form, commission_percent: e.target.value })} /></div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Max Courses</Label><Input type="number" value={form.max_courses} onChange={(e) => setForm({ ...form, max_courses: e.target.value })} placeholder="Unlimited" /></div>
                      <div><Label>Max Students</Label><Input type="number" value={form.max_students} onChange={(e) => setForm({ ...form, max_students: e.target.value })} placeholder="Unlimited" /></div>
                      <div><Label>Storage (MB)</Label><Input type="number" value={form.storage_limit_mb} onChange={(e) => setForm({ ...form, storage_limit_mb: e.target.value })} placeholder="Unlimited" /></div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Module Access</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {ALL_MODULES.map((mod) => (
                          <label key={mod.key} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-secondary/50">
                            <Checkbox
                              checked={form.allowed_modules.includes(mod.key)}
                              onCheckedChange={() => toggleModule(mod.key)}
                              className="h-4 w-4"
                            />
                            {mod.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                      <Label>Active</Label>
                    </div>

                    <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={savePlan}>
                      {editingPlan ? "Update Plan" : "Create Plan"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <Card key={plan.id} className={`card-shadow ${!plan.is_active ? "opacity-60" : ""}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{plan.name}</CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editPlan(plan)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePlan(plan.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {plan.description && <p className="text-xs text-muted-foreground">{plan.description}</p>}
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold">${plan.monthly_price}</span>
                      <span className="text-xs text-muted-foreground">/mo</span>
                      {plan.yearly_price > 0 && <span className="text-xs text-muted-foreground ml-2">or ${plan.yearly_price}/yr</span>}
                    </div>
                    {plan.commission_percent > 0 && (
                      <p className="text-xs text-accent font-medium">+ {plan.commission_percent}% commission</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">{plan.max_courses ?? "∞"} courses</Badge>
                      <Badge variant="outline" className="text-[10px]">{plan.max_students ?? "∞"} students</Badge>
                      <Badge variant="outline" className="text-[10px]">{plan.storage_limit_mb ? `${plan.storage_limit_mb}MB` : "∞ storage"}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {plan.allowed_modules.map((m) => (
                        <Badge key={m} className="bg-accent/10 text-accent text-[10px] border-0">{m.replace("_", " ")}</Badge>
                      ))}
                    </div>
                    <Badge variant={plan.is_active ? "default" : "secondary"} className="text-[10px]">
                      {plan.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
              {plans.length === 0 && (
                <div className="col-span-full text-center py-12 text-sm text-muted-foreground border-2 border-dashed rounded-xl">
                  No plans created yet. Create your first SaaS plan.
                </div>
              )}
            </div>
          </TabsContent>

          {/* ======== COACHES TAB ======== */}
          <TabsContent value="coaches">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Coach Management</h2>
              <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Plus className="h-4 w-4 mr-1" /> Assign Plan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Assign Plan to Coach</DialogTitle></DialogHeader>
                  <div className="space-y-3 mt-2">
                    <div><Label>Select Coach</Label>
                      <Select value={assignForm.coach_id} onValueChange={(v) => setAssignForm({ ...assignForm, coach_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Choose a coach" /></SelectTrigger>
                        <SelectContent>
                          {coaches.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Select Plan</Label>
                      <Select value={assignForm.plan_id} onValueChange={(v) => setAssignForm({ ...assignForm, plan_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Choose a plan" /></SelectTrigger>
                        <SelectContent>
                          {plans.filter((p) => p.is_active).map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — ${p.monthly_price}/mo</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Expires At (optional)</Label><Input type="datetime-local" value={assignForm.expires_at} onChange={(e) => setAssignForm({ ...assignForm, expires_at: e.target.value })} /></div>
                    <div><Label>Notes</Label><Textarea value={assignForm.notes} onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })} rows={2} /></div>
                    <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={assignPlan}>Assign Plan</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="card-shadow">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {coaches.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No coaches yet. Promote a user to coach from the Users tab.</p>
                  ) : coaches.map((coach) => {
                    const coachSub = subscriptions.find((s) => s.coach_id === coach.id && s.status === "active");
                    return (
                      <div key={coach.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-accent/20 text-accent text-sm font-semibold">
                            {(coach.full_name || coach.email).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{coach.full_name || "No name"}</p>
                          <p className="text-xs text-muted-foreground truncate">{coach.email}</p>
                        </div>
                        {coachSub ? (
                          <Badge className="bg-success/10 text-success border-0 text-xs">{coachSub.plan?.name || "Active Plan"}</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">No Plan</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ======== SUBSCRIPTIONS TAB ======== */}
          <TabsContent value="subscriptions">
            <h2 className="text-base font-semibold mb-4">Active Subscriptions</h2>
            <Card className="card-shadow">
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coach</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No subscriptions yet</TableCell></TableRow>
                    ) : subscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="text-sm font-medium">{sub.profile?.full_name || sub.coach_id}</TableCell>
                        <TableCell className="text-sm">{sub.plan?.name || "Unknown"}</TableCell>
                        <TableCell>
                          <Badge variant={sub.status === "active" ? "default" : "secondary"} className="text-xs capitalize">
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{format(new Date(sub.starts_at), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-xs">{sub.expires_at ? format(new Date(sub.expires_at), "MMM d, yyyy") : "Never"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {sub.status === "active" && (
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => updateSubStatus(sub.id, "cancelled")}>Cancel</Button>
                            )}
                            {sub.status === "cancelled" && (
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => updateSubStatus(sub.id, "active")}>Reactivate</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ======== USERS TAB ======== */}
          <TabsContent value="users">
            <h2 className="text-base font-semibold mb-4">All Users</h2>
            <Card className="card-shadow">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {allUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-secondary text-sm font-semibold">
                          {(u.full_name || u.email).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.full_name || "No name"}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <div className="flex gap-1">
                        {u.roles.map((r) => (
                          <Badge key={r} variant="outline" className="text-[10px] capitalize">{r}</Badge>
                        ))}
                      </div>
                      <Select value={u.roles[0] || "student"} onValueChange={(v) => changeRole(u.id, v)}>
                        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="coach">Coach</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  {allUsers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No users yet</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
