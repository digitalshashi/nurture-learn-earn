import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { fetchRolePermissions, togglePermission } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, Users, BookOpen, Crown, ChevronRight, Loader2,
  Home, MessageSquare, Hash, Trophy, Calendar, Video, Megaphone,
  LayoutDashboard, BarChart3, DollarSign, Layout, Contact,
  Send, Route, Handshake, Gift, Rocket, Settings, Award, Target,
  FileText, Clock,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ROLES = [
  { key: "admin", label: "Admin", icon: Crown, color: "bg-amber-500", desc: "Full platform control" },
  { key: "coach", label: "Coach", icon: Shield, color: "bg-blue-500", desc: "Manage students, courses & services" },
  { key: "student", label: "Student", icon: Users, color: "bg-emerald-500", desc: "Consume content & participate" },
];

const FEATURE_CATEGORIES: { category: string; features: { key: string; label: string; icon: any; desc: string }[] }[] = [
  {
    category: "Community",
    features: [
      { key: "community_feed", label: "Community Feed", icon: Home, desc: "Access the main feed" },
      { key: "messages", label: "Messages", icon: MessageSquare, desc: "Direct messaging" },
      { key: "channels", label: "Channels", icon: Hash, desc: "View & join channels" },
      { key: "create_post", label: "Create Posts", icon: FileText, desc: "Create posts in feed" },
      { key: "create_channels", label: "Create Channels", icon: Hash, desc: "Create new channels" },
      { key: "leaderboard", label: "Leaderboard", icon: Trophy, desc: "View leaderboard" },
    ],
  },
  {
    category: "Learning",
    features: [
      { key: "courses", label: "Courses", icon: BookOpen, desc: "Access courses" },
      { key: "workshops", label: "Workshops", icon: Video, desc: "Access workshops" },
      { key: "events", label: "Events", icon: Calendar, desc: "Access events" },
      { key: "certificates", label: "Certificates", icon: Award, desc: "Download certificates" },
      { key: "quest", label: "Quest Dashboard", icon: Target, desc: "Quests & achievements" },
      { key: "levelup", label: "Level Up", icon: Trophy, desc: "LevelUp platform" },
    ],
  },
  {
    category: "Business",
    features: [
      { key: "services", label: "Services", icon: Megaphone, desc: "Manage services" },
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Main dashboard" },
      { key: "analytics", label: "Analytics", icon: BarChart3, desc: "View analytics" },
      { key: "sales", label: "Sales & Revenue", icon: DollarSign, desc: "Sales management" },
      { key: "page_builder", label: "Page Builder", icon: Layout, desc: "Build landing pages" },
    ],
  },
  {
    category: "CRM & Marketing",
    features: [
      { key: "crm", label: "CRM", icon: Contact, desc: "Contact management" },
      { key: "customers", label: "Customers", icon: Users, desc: "Customer management" },
      { key: "marketing", label: "Marketing", icon: Send, desc: "Broadcasts, banners, coupons" },
      { key: "automation", label: "Automation", icon: Route, desc: "Email, WhatsApp automation" },
    ],
  },
  {
    category: "Growth",
    features: [
      { key: "partnerships", label: "Partnerships", icon: Handshake, desc: "Partner management" },
      { key: "affiliate", label: "Affiliate System", icon: Gift, desc: "Affiliate program" },
      { key: "gamification", label: "Gamification", icon: Trophy, desc: "Badges, XP, challenges" },
      { key: "ai_suite", label: "AI Suite", icon: Rocket, desc: "AI tools" },
    ],
  },
  {
    category: "Settings",
    features: [
      { key: "my_settings", label: "My Settings", icon: Settings, desc: "Personal settings" },
      { key: "platform_settings", label: "Platform Settings", icon: Settings, desc: "Platform config" },
      { key: "security_settings", label: "Security", icon: Shield, desc: "Security settings" },
      { key: "team_management", label: "Team Management", icon: Users, desc: "Manage team" },
      { key: "cloud_storage", label: "Cloud Storage", icon: Layout, desc: "File storage" },
      { key: "billing", label: "Billing & Plans", icon: DollarSign, desc: "Billing management" },
      { key: "referral", label: "Refer & Earn", icon: Gift, desc: "Referral program" },
    ],
  },
];

export default function RolePermissions() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [activeRole, setActiveRole] = useState("student");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [activeTab, setActiveTab] = useState("permissions");

  const isAdmin = hasRole("admin");

  useEffect(() => {
    loadPermissions(activeRole);
  }, [activeRole]);

  const loadPermissions = async (role: string) => {
    setLoading(true);
    try {
      const data = await fetchRolePermissions(role);
      const perms: Record<string, boolean> = {};
      data.forEach((r: any) => {
        perms[r.feature_key] = r.enabled;
      });
      setPermissions(perms);
    } catch (e: any) {
      toast({ title: "Error loading permissions", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleToggle = async (featureKey: string, enabled: boolean) => {
    if (!user || !isAdmin) return;
    setToggling(featureKey);
    try {
      await togglePermission(activeRole, featureKey, enabled, user.id);
      setPermissions((p) => ({ ...p, [featureKey]: enabled }));
      toast({ title: `${enabled ? "Enabled" : "Disabled"} ${featureKey.replace(/_/g, " ")}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setToggling(null);
  };

  const loadAuditLog = async () => {
    setLoadingLog(true);
    const { data } = await supabase
      .from("permission_audit_log" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setAuditLog((data as any[]) || []);
    setLoadingLog(false);
  };

  useEffect(() => {
    if (activeTab === "audit") loadAuditLog();
  }, [activeTab]);

  const enabledCount = Object.values(permissions).filter(Boolean).length;
  const totalCount = Object.keys(permissions).length;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display">User Roles & Permissions</h1>
            <p className="text-xs text-muted-foreground">Control feature access for each role</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="permissions">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Role Selector */}
              <div className="lg:col-span-1 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Roles</p>
                {ROLES.map((role) => (
                  <button
                    key={role.key}
                    onClick={() => setActiveRole(role.key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      activeRole === role.key
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className={`h-9 w-9 rounded-lg ${role.color} flex items-center justify-center`}>
                      <role.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{role.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{role.desc}</p>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${activeRole === role.key ? "rotate-90" : ""}`} />
                  </button>
                ))}

                {/* Summary card */}
                <Card className="mt-4 border-dashed">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-2">Active Permissions</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-primary">{enabledCount}</span>
                      <span className="text-sm text-muted-foreground">/ {totalCount}</span>
                    </div>
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                        style={{ width: `${totalCount ? (enabledCount / totalCount) * 100 : 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Permissions Grid */}
              <div className="lg:col-span-3">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{activeRole}</Badge>
                    <span className="text-xs text-muted-foreground">Feature Toggles</span>
                  </div>
                  {activeRole === "admin" && (
                    <Badge variant="secondary" className="text-[10px]">Admin has full access by default</Badge>
                  )}
                </div>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    <div className="space-y-6 pr-4">
                      {FEATURE_CATEGORIES.map((cat) => (
                        <Card key={cat.category}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">{cat.category}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-1">
                            {cat.features.map((feat) => {
                              const isEnabled = permissions[feat.key] ?? false;
                              const isDisabled = activeRole === "admin"; // Admin always on
                              return (
                                <div
                                  key={feat.key}
                                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                      <feat.icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">{feat.label}</p>
                                      <p className="text-[10px] text-muted-foreground">{feat.desc}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {toggling === feat.key && <Loader2 className="h-3 w-3 animate-spin" />}
                                    <Switch
                                      checked={isDisabled ? true : isEnabled}
                                      disabled={isDisabled || toggling === feat.key || !isAdmin}
                                      onCheckedChange={(val) => handleToggle(feat.key, val)}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Permission Change History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingLog ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : auditLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No permission changes recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {auditLog.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${log.new_value ? "bg-emerald-500" : "bg-red-500"}`} />
                          <div>
                            <p className="text-sm">
                              <span className="font-medium capitalize">{log.role}</span>
                              {" → "}
                              <span className="font-mono text-xs">{log.feature_key.replace(/_/g, " ")}</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {log.old_value !== null ? (log.old_value ? "ON" : "OFF") : "—"} → {log.new_value ? "ON" : "OFF"}
                            </p>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
