import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Building2,
  CheckCircle2,
  Circle,
  Cpu,
  ExternalLink,
  FileText,
  Handshake,
  HelpCircle,
  Loader2,
  Mail,
  PenLine,
  Rocket,
  Search,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  UserCog,
  UserPlus,
  Users,
  Video,
  Wrench,
  icons,
  type LucideIcon,
} from "lucide-react";

interface StuckArea {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon_name: string;
  color: string;
  sort_order: number;
}

interface ChecklistItem {
  id: string;
  area_id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface Resource {
  id: string;
  area_id: string;
  title: string;
  description: string | null;
  resource_type: string;
  url: string | null;
  sort_order: number;
}

interface FaqTopic {
  id: string;
  slug: string;
  title: string;
  icon_name: string;
  sort_order: number;
}

interface FaqArticle {
  id: string;
  topic_id: string;
  title: string;
  content: string;
  sort_order: number;
}

const ICON_MAP: Record<string, LucideIcon> = {
  target: Target,
  tag: Tag,
  cpu: Cpu,
  "pen-line": PenLine,
  "user-plus": UserPlus,
  video: Video,
  handshake: Handshake,
  brain: Brain,
  users: Users,
  "trending-up": TrendingUp,
  rocket: Rocket,
  "user-cog": UserCog,
  "book-open": BookOpen,
  "building-2": Building2,
  sparkles: Sparkles,
  wrench: Wrench,
  "help-circle": HelpCircle,
};

function AreaIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const FromMap = ICON_MAP[name];
  if (FromMap) return <FromMap className={className} style={style} />;
  const pascal = name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  const Comp = (icons as any)[pascal] as LucideIcon | undefined;
  if (Comp) return <Comp className={className} style={style} />;
  return <HelpCircle className={className} style={style} />;
}

const RESOURCE_TYPE_LABEL: Record<string, string> = {
  article: "Article",
  video: "Video",
  template: "Template",
  link: "Open",
  course: "Course",
};

export default function Support() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState<StuckArea[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [progress, setProgress] = useState<Set<string>>(new Set());
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [togglingItem, setTogglingItem] = useState<string | null>(null);

  const [faqTopics, setFaqTopics] = useState<FaqTopic[]>([]);
  const [faqArticles, setFaqArticles] = useState<FaqArticle[]>([]);
  const [faqSearch, setFaqSearch] = useState("");
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [openArticleId, setOpenArticleId] = useState<string | null>(null);

  const [supportEmail, setSupportEmail] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [sendingContact, setSendingContact] = useState(false);

  const topicSlugParam = searchParams.get("topic");
  const areaSlugParam = searchParams.get("area");

  const loadContent = useCallback(async () => {
    const [areasRes, checklistRes, resourcesRes, topicsRes, articlesRes] = await Promise.all([
      supabase.from("support_stuck_areas" as any).select("*").eq("is_active", true).order("sort_order"),
      supabase.from("support_stuck_checklist" as any).select("*").eq("is_active", true).order("sort_order"),
      supabase.from("support_stuck_resources" as any).select("*").eq("is_active", true).order("sort_order"),
      supabase.from("support_faq_topics" as any).select("*").eq("is_active", true).order("sort_order"),
      supabase.from("support_faq_articles" as any).select("*").eq("is_active", true).order("sort_order"),
    ]);

    if (areasRes.data) setAreas(areasRes.data as unknown as StuckArea[]);
    if (checklistRes.data) setChecklist(checklistRes.data as unknown as ChecklistItem[]);
    if (resourcesRes.data) setResources(resourcesRes.data as unknown as Resource[]);
    if (topicsRes.data) setFaqTopics(topicsRes.data as unknown as FaqTopic[]);
    if (articlesRes.data) setFaqArticles(articlesRes.data as unknown as FaqArticle[]);
  }, []);

  const loadUserState = useCallback(async () => {
    if (!user) return;
    const [progressRes, stuckRes, supportRes] = await Promise.all([
      supabase
        .from("support_checklist_progress" as any)
        .select("checklist_item_id, completed")
        .eq("user_id", user.id)
        .eq("completed", true),
      supabase.from("support_user_stuck" as any).select("area_id").eq("user_id", user.id).maybeSingle(),
      supabase.from("support_settings" as any).select("support_email").limit(1).maybeSingle(),
    ]);

    const done = new Set<string>(
      ((progressRes.data as any[]) || [])
        .filter((p) => p.completed)
        .map((p) => p.checklist_item_id as string),
    );
    setProgress(done);

    if ((stuckRes.data as any)?.area_id) {
      setSelectedAreaId((stuckRes.data as any).area_id);
    }
    if ((supportRes.data as any)?.support_email) {
      setSupportEmail((supportRes.data as any).support_email);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadContent();
      if (!cancelled) setLoading(false);
      await loadUserState();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadContent, loadUserState]);

  // Deep-link: ?area=niche or ?topic=getting-started
  useEffect(() => {
    if (areaSlugParam && areas.length) {
      const match = areas.find((a) => a.slug === areaSlugParam);
      if (match) setSelectedAreaId(match.id);
    }
  }, [areaSlugParam, areas]);

  useEffect(() => {
    if (topicSlugParam && faqTopics.length) {
      const match = faqTopics.find((t) => t.slug === topicSlugParam);
      if (match) {
        setActiveTopicId(match.id);
        document.getElementById("faq-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [topicSlugParam, faqTopics]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("support-hub-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_stuck_areas" }, () => loadContent())
      .on("postgres_changes", { event: "*", schema: "public", table: "support_stuck_checklist" }, () => loadContent())
      .on("postgres_changes", { event: "*", schema: "public", table: "support_stuck_resources" }, () => loadContent())
      .on("postgres_changes", { event: "*", schema: "public", table: "support_faq_topics" }, () => loadContent())
      .on("postgres_changes", { event: "*", schema: "public", table: "support_faq_articles" }, () => loadContent())
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_checklist_progress",
          filter: user ? `user_id=eq.${user.id}` : undefined,
        },
        () => loadUserState(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_user_stuck",
          filter: user ? `user_id=eq.${user.id}` : undefined,
        },
        () => loadUserState(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadContent, loadUserState]);

  const selectedArea = useMemo(
    () => areas.find((a) => a.id === selectedAreaId) || null,
    [areas, selectedAreaId],
  );

  const areaChecklist = useMemo(
    () => checklist.filter((c) => c.area_id === selectedAreaId),
    [checklist, selectedAreaId],
  );

  const areaResources = useMemo(
    () => resources.filter((r) => r.area_id === selectedAreaId),
    [resources, selectedAreaId],
  );

  const completedInArea = areaChecklist.filter((c) => progress.has(c.id)).length;
  const areaProgressPct =
    areaChecklist.length === 0 ? 0 : Math.round((completedInArea / areaChecklist.length) * 100);

  const articleCountByTopic = useMemo(() => {
    const map: Record<string, number> = {};
    faqArticles.forEach((a) => {
      map[a.topic_id] = (map[a.topic_id] || 0) + 1;
    });
    return map;
  }, [faqArticles]);

  const filteredArticles = useMemo(() => {
    const q = faqSearch.trim().toLowerCase();
    let list = faqArticles;
    if (activeTopicId) list = list.filter((a) => a.topic_id === activeTopicId);
    if (q) {
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          faqTopics.find((t) => t.id === a.topic_id)?.title.toLowerCase().includes(q),
      );
    }
    return list;
  }, [faqArticles, faqSearch, activeTopicId, faqTopics]);

  const selectArea = async (area: StuckArea) => {
    setSelectedAreaId(area.id);
    setSearchParams({ area: area.slug }, { replace: true });
    if (!user) return;
    const { error } = await supabase.from("support_user_stuck" as any).upsert(
      {
        user_id: user.id,
        area_id: area.id,
        selected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "user_id" },
    );
    if (error) {
      toast({ title: "Could not save selection", description: error.message, variant: "destructive" });
    }
  };

  const clearArea = () => {
    setSelectedAreaId(null);
    setSearchParams({}, { replace: true });
  };

  const toggleChecklistItem = async (item: ChecklistItem) => {
    if (!user || togglingItem) return;
    setTogglingItem(item.id);
    const isDone = progress.has(item.id);

    // Optimistic update
    setProgress((prev) => {
      const next = new Set(prev);
      if (isDone) next.delete(item.id);
      else next.add(item.id);
      return next;
    });

    try {
      if (isDone) {
        const { error } = await supabase
          .from("support_checklist_progress" as any)
          .delete()
          .eq("user_id", user.id)
          .eq("checklist_item_id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("support_checklist_progress" as any).upsert(
          {
            user_id: user.id,
            checklist_item_id: item.id,
            completed: true,
            completed_at: new Date().toISOString(),
          } as any,
          { onConflict: "user_id,checklist_item_id" },
        );
        if (error) throw error;
      }
    } catch (e: any) {
      // Revert
      setProgress((prev) => {
        const next = new Set(prev);
        if (isDone) next.add(item.id);
        else next.delete(item.id);
        return next;
      });
      toast({ title: "Could not update checklist", description: e.message, variant: "destructive" });
    } finally {
      setTogglingItem(null);
    }
  };

  const openResource = (resource: Resource) => {
    if (!resource.url) return;
    if (resource.url.startsWith("http")) {
      window.open(resource.url, "_blank", "noopener,noreferrer");
    } else if (resource.url.startsWith("/support")) {
      const url = new URL(resource.url, window.location.origin);
      const topic = url.searchParams.get("topic");
      if (topic) {
        setSearchParams({ topic }, { replace: false });
        const match = faqTopics.find((t) => t.slug === topic);
        if (match) setActiveTopicId(match.id);
        document.getElementById("faq-section")?.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate(resource.url);
    }
  };

  const openTopic = (topic: FaqTopic) => {
    setActiveTopicId(topic.id);
    setSearchParams({ topic: topic.slug }, { replace: true });
    setFaqSearch("");
  };

  const handleContact = async () => {
    if (!contactSubject.trim() || !contactMessage.trim()) {
      toast({ title: "Add a subject and message", variant: "destructive" });
      return;
    }
    setSendingContact(true);
    try {
      // Prefer mailto when support email is configured; always log intent via toast.
      if (supportEmail) {
        const body = encodeURIComponent(
          `${contactMessage}\n\n— Sent from Support Hub\nUser: ${user?.email || user?.id || "unknown"}`,
        );
        const subject = encodeURIComponent(contactSubject);
        window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
        toast({ title: "Opening your email app…" });
      } else {
        toast({
          title: "Message ready",
          description: "No support email is configured yet. Please post in the community Feed for help.",
        });
        navigate("/feed");
      }
      setContactOpen(false);
      setContactSubject("");
      setContactMessage("");
    } finally {
      setSendingContact(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6 px-4 pb-16">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3D1B16] via-[#5A241C] to-accent p-6 sm:p-8 mb-8 text-white">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white,transparent_55%)]" />
          <div className="relative">
            <Badge className="bg-white/15 text-white border-0 mb-3 hover:bg-white/20">Support Hub</Badge>
            <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight">
              Where are you stuck right now?
            </h1>
            <p className="mt-2 text-white/85 text-sm sm:text-base max-w-2xl">
              Pick the area that matches what you&apos;re feeling. Each one has a clear checklist and the exact
              resources to move you forward.
            </p>
            <p className="mt-4 text-sm text-white/70 italic">
              You don&apos;t need to feel fully confident to take action. Confidence comes after action.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white text-[#3D1B16] hover:bg-white/90"
                onClick={() => document.getElementById("faq-section")?.scrollIntoView({ behavior: "smooth" })}
              >
                <BookOpen className="h-4 w-4 mr-1.5" />
                Browse FAQ
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-white/30 text-white hover:bg-white/10 hover:text-white"
                onClick={() => setContactOpen(true)}
              >
                <Mail className="h-4 w-4 mr-1.5" />
                Contact support
              </Button>
            </div>
          </div>
        </div>

        {/* Stuck areas grid OR detail */}
        {!selectedArea ? (
          <section className="mb-12">
            <div className="flex items-end justify-between mb-4 gap-3">
              <div>
                <h2 className="text-lg font-bold font-display">Choose your stuck area</h2>
                <p className="text-sm text-muted-foreground">Your selection and checklist progress save automatically.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {areas.map((area) => {
                const items = checklist.filter((c) => c.area_id === area.id);
                const done = items.filter((c) => progress.has(c.id)).length;
                const pct = items.length ? Math.round((done / items.length) * 100) : 0;
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => selectArea(area)}
                    className={cn(
                      "text-left rounded-xl border bg-card p-4 card-shadow transition-all",
                      "hover:border-accent/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${area.color}22` }}
                      >
                        <AreaIcon name={area.icon_name} className="h-5 w-5" style={{ color: area.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{area.title}</h3>
                          {pct === 100 && items.length > 0 && (
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{area.description}</p>
                        {items.length > 0 && (
                          <div className="mt-3">
                            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                              <span>
                                {done}/{items.length} steps
                              </span>
                              <span>{pct}%</span>
                            </div>
                            <Progress value={pct} className="h-1.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {areas.length === 0 && (
              <Card className="card-shadow">
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  No stuck areas configured yet. Check back soon.
                </CardContent>
              </Card>
            )}
          </section>
        ) : (
          <section className="mb-12">
            <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={clearArea}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              All stuck areas
            </Button>

            <Card className="card-shadow overflow-hidden mb-4">
              <div className="h-1.5" style={{ backgroundColor: selectedArea.color }} />
              <CardContent className="pt-5 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div
                    className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${selectedArea.color}22` }}
                  >
                    <AreaIcon
                      name={selectedArea.icon_name}
                      className="h-7 w-7"
                      style={{ color: selectedArea.color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold font-display">{selectedArea.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{selectedArea.description}</p>
                    <div className="mt-4 max-w-md">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                        <span>
                          Checklist progress · {completedInArea}/{areaChecklist.length}
                        </span>
                        <span className="font-medium text-foreground">{areaProgressPct}%</span>
                      </div>
                      <Progress value={areaProgressPct} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Checklist */}
              <Card className="card-shadow lg:col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    Your action checklist
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Check items off as you complete them — progress syncs in realtime.
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {areaChecklist.map((item, idx) => {
                    const done = progress.has(item.id);
                    return (
                      <label
                        key={item.id}
                        className={cn(
                          "flex gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                          done ? "bg-success/5 border-success/20" : "bg-card hover:bg-secondary/40",
                          togglingItem === item.id && "opacity-70",
                        )}
                      >
                        <Checkbox
                          checked={done}
                          disabled={togglingItem === item.id}
                          onCheckedChange={() => toggleChecklistItem(item)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <span className="text-[11px] font-medium text-muted-foreground mt-0.5 shrink-0">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <p
                                className={cn(
                                  "text-sm font-medium leading-snug",
                                  done && "line-through text-muted-foreground",
                                )}
                              >
                                {item.title}
                              </p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {done ? (
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                        )}
                      </label>
                    );
                  })}
                  {areaChecklist.length === 0 && (
                    <p className="text-sm text-muted-foreground py-6 text-center">No checklist items yet.</p>
                  )}
                  {areaProgressPct === 100 && areaChecklist.length > 0 && (
                    <div className="rounded-lg bg-success/10 border border-success/20 p-3 text-sm text-success mt-2">
                      Nice work — you cleared this checklist. Confidence comes after action. Pick another stuck area or
                      dig into the FAQ below.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resources */}
              <Card className="card-shadow lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    Exact resources
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Use these to move forward right now.</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {areaResources.map((resource) => (
                    <button
                      key={resource.id}
                      type="button"
                      onClick={() => openResource(resource)}
                      className="w-full text-left rounded-lg border p-3 hover:border-accent/40 hover:bg-accent-tint/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="secondary" className="text-[10px] mb-1.5">
                            {RESOURCE_TYPE_LABEL[resource.resource_type] || resource.resource_type}
                          </Badge>
                          <p className="text-sm font-medium">{resource.title}</p>
                          {resource.description && (
                            <p className="text-xs text-muted-foreground mt-1">{resource.description}</p>
                          )}
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                  {areaResources.length === 0 && (
                    <p className="text-sm text-muted-foreground py-6 text-center">No resources linked yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section id="faq-section" className="scroll-mt-20">
          <div className="mb-4">
            <h2 className="text-lg font-bold font-display">Browse FAQ Topics</h2>
            <p className="text-sm text-muted-foreground">Common questions members have already asked.</p>
          </div>

          <div className="relative mb-5 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={faqSearch}
              onChange={(e) => {
                setFaqSearch(e.target.value);
                if (e.target.value) setActiveTopicId(null);
              }}
              placeholder="Search for help…"
              className="pl-9 h-11 bg-card"
            />
          </div>

          {/* Topic cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {faqTopics.map((topic) => {
              const count = articleCountByTopic[topic.id] || 0;
              const active = activeTopicId === topic.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => openTopic(topic)}
                  className={cn(
                    "text-left rounded-xl border bg-card p-4 card-shadow transition-all",
                    "hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active && "border-accent bg-accent-tint ring-1 ring-accent/30",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                        active ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground",
                      )}
                    >
                      <AreaIcon name={topic.icon_name} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{topic.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {count} {count === 1 ? "article" : "articles"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Articles list */}
          <Card className="card-shadow">
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                {activeTopicId
                  ? faqTopics.find((t) => t.id === activeTopicId)?.title || "Articles"
                  : faqSearch
                    ? "Search results"
                    : "All articles"}
              </CardTitle>
              {(activeTopicId || faqSearch) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActiveTopicId(null);
                    setFaqSearch("");
                    setSearchParams({}, { replace: true });
                  }}
                >
                  Clear filter
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {filteredArticles.length === 0 ? (
                <div className="py-10 text-center">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No articles match your search.</p>
                </div>
              ) : (
                <Accordion
                  type="single"
                  collapsible
                  value={openArticleId || undefined}
                  onValueChange={(v) => setOpenArticleId(v || null)}
                  className="w-full"
                >
                  {filteredArticles.map((article) => {
                    const topic = faqTopics.find((t) => t.id === article.topic_id);
                    return (
                      <AccordionItem key={article.id} value={article.id}>
                        <AccordionTrigger className="text-left text-sm hover:no-underline">
                          <div className="pr-3">
                            <p className="font-medium">{article.title}</p>
                            {topic && !activeTopicId && (
                              <span className="text-[11px] text-muted-foreground font-normal">{topic.title}</span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap pb-1">
                            {article.content}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Bottom CTA */}
        <Card className="card-shadow mt-8 border-accent/20 bg-gradient-to-r from-accent-tint/50 to-card">
          <CardContent className="py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Still stuck?</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Reach out to support or ask the community — you don&apos;t have to figure it out alone.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" onClick={() => navigate("/feed")}>
                Ask community
              </Button>
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => setContactOpen(true)}
              >
                Contact support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact support</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {supportEmail && (
              <p className="text-xs text-muted-foreground">
                Messages go to <span className="font-medium text-foreground">{supportEmail}</span>
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="support-subject">Subject</Label>
              <Input
                id="support-subject"
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                placeholder={selectedArea ? `${selectedArea.title} — need help` : "How can we help?"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="support-message">Message</Label>
              <Textarea
                id="support-message"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Describe where you're stuck and what you've already tried…"
                rows={5}
              />
            </div>
            <ScrollArea className="max-h-0" />
            <Button
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleContact}
              disabled={sendingContact}
            >
              {sendingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send message"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
