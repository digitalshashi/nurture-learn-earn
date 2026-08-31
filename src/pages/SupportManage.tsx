/**
 * /support-manage — lets a coach or admin fully customize the Support Hub:
 * stuck areas (+ their checklist and resources), FAQ topics (+ articles),
 * and the contact email. Everything here is the same content Support.tsx
 * reads, so a change is live the moment it saves (that page subscribes to
 * realtime updates on these tables).
 *
 * Each editor also has a "Generate with AI" option that drafts the fields
 * into the form for review — nothing is written until the coach hits Save.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTabParam } from "@/hooks/useTabParam";
import { cn } from "@/lib/utils";
import { AreaIcon, ICON_MAP } from "@/pages/Support";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Save,
  X,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  ExternalLink,
  Search,
} from "lucide-react";

/** Every icon Lucide ships, kebab-case (e.g. "life-buoy") — the same names
 *  AreaIcon already knows how to render. Reading only the keys here (never
 *  calling the dynamic import functions) costs nothing at runtime. */
const ALL_ICON_NAMES = Object.keys(dynamicIconImports).sort();

/** Best-effort hex for the native color swatch. Existing rows store
 *  `hsl(H S% L%)` strings (still valid CSS, still accepted everywhere colors
 *  are used here) — this just gives the <input type="color"> something to
 *  show. If parsing fails the swatch falls back to a neutral default while
 *  the text field keeps whatever the coach typed. */
function colorToHex(color: string): string {
  const trimmed = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  const m = trimmed.match(/^hsl\(\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s*\)$/i);
  if (!m) return "#3b82f6";
  const h = parseFloat(m[1]);
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHexByte = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHexByte(f(0))}${toHexByte(f(8))}${toHexByte(f(4))}`;
}

function ColorPickerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={colorToHex(value)}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-9 shrink-0 rounded-md border border-border cursor-pointer bg-transparent p-0.5"
        aria-label="Pick a color"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#3b82f6"
        className="font-mono text-xs"
      />
    </div>
  );
}

function IconPickerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? ALL_ICON_NAMES.filter((n) => n.includes(q)) : ALL_ICON_NAMES;
    return list.slice(0, 150);
  }, [search]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start gap-2 font-normal">
          <AreaIcon name={value} className="h-4 w-4 shrink-0" />
          <span className="truncate">{value || "Choose an icon"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search icons…"
            className="h-8 pl-7 text-xs"
          />
        </div>
        <div className="grid grid-cols-7 gap-1 max-h-52 overflow-y-auto">
          {filtered.map((name) => (
            <button
              key={name}
              type="button"
              title={name}
              onClick={() => { onChange(name); setOpen(false); }}
              className={cn(
                "h-8 w-8 rounded-md flex items-center justify-center hover:bg-secondary transition-colors",
                value === name && "bg-accent text-accent-foreground hover:bg-accent",
              )}
            >
              <AreaIcon name={name} className="h-4 w-4" />
            </button>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No icons match "{search}".</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
          {ALL_ICON_NAMES.length.toLocaleString()} icons from Lucide (open source)
        </p>
      </PopoverContent>
    </Popover>
  );
}

interface StuckArea {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon_name: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}
interface FaqTopic {
  id: string;
  slug: string;
  title: string;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
}

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const RESOURCE_TYPES = ["article", "video", "template", "link", "course"];

async function callAiJson<T>(prompt: string, system: string, shape: Record<string, string>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("ai-generate", {
    body: { action: "text", system, prompt, shape },
  });
  if (error) {
    const ctx = (error as any).context;
    let message = error.message;
    try {
      if (ctx && typeof ctx.json === "function") {
        const j = await ctx.json();
        if (j?.error) message = j.error;
      }
    } catch {
      /* ignore */
    }
    throw new Error(message || "AI generation failed");
  }
  if (!data?.data) throw new Error("The model returned nothing. Try again.");
  return data.data as T;
}

export default function SupportManage() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const canManage = hasRole("coach") || hasRole("admin") || hasRole("super_admin");
  const [tab, setTab] = useTabParam(["areas", "faq", "settings"] as const);

  const [areas, setAreas] = useState<StuckArea[]>([]);
  const [topics, setTopics] = useState<FaqTopic[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [a, t] = await Promise.all([
      supabase.from("support_stuck_areas" as any).select("*").order("sort_order"),
      supabase.from("support_faq_topics" as any).select("*").order("sort_order"),
    ]);
    setAreas((a.data as any) || []);
    setTopics((t.data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  if (!canManage) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="text-xl font-bold">Manage support content</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Only coaches and admins can customize the Support Hub.
          </p>
          <Button className="mt-6 rounded-xl" onClick={() => navigate("/support")}>
            Back to Support
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4 pb-16">
        <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => navigate("/support")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Support Hub
        </Button>
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-display">Manage Support Content</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customize stuck areas, FAQ, and how members reach you — or draft any of it with AI first.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-5">
            <TabsTrigger value="areas">Stuck Areas ({areas.length})</TabsTrigger>
            <TabsTrigger value="faq">FAQ Topics ({topics.length})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="areas">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto my-10" />
            ) : (
              <AreasManager areas={areas} onChange={load} />
            )}
          </TabsContent>

          <TabsContent value="faq">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto my-10" />
            ) : (
              <FaqManager topics={topics} onChange={load} />
            )}
          </TabsContent>

          <TabsContent value="settings">
            <SettingsManager coachId={user?.id || ""} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// ─── Stuck Areas ─────────────────────────────────────────────────────────

interface ChecklistRow {
  title: string;
  description: string;
}
interface ResourceRow {
  title: string;
  resource_type: string;
  url: string;
  description: string;
}

interface AreaFormState {
  id?: string;
  slug: string;
  title: string;
  description: string;
  icon_name: string;
  color: string;
  is_active: boolean;
  checklist: ChecklistRow[];
  resources: ResourceRow[];
}

const emptyAreaForm: AreaFormState = {
  slug: "",
  title: "",
  description: "",
  icon_name: "help-circle",
  color: "hsl(220 70% 55%)",
  is_active: true,
  checklist: [],
  resources: [],
};

function AreasManager({ areas, onChange }: { areas: StuckArea[]; onChange: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [form, setForm] = useState<AreaFormState>({ ...emptyAreaForm });

  const openCreate = () => {
    setForm({ ...emptyAreaForm });
    setAiPrompt("");
    setOpen(true);
  };

  const openEdit = async (area: StuckArea) => {
    const [{ data: checklist }, { data: resources }] = await Promise.all([
      supabase.from("support_stuck_checklist" as any).select("*").eq("area_id", area.id).order("sort_order"),
      supabase.from("support_stuck_resources" as any).select("*").eq("area_id", area.id).order("sort_order"),
    ]);
    setForm({
      id: area.id,
      slug: area.slug,
      title: area.title,
      description: area.description,
      icon_name: area.icon_name,
      color: area.color,
      is_active: area.is_active,
      checklist: ((checklist as any) || []).map((c: any) => ({ title: c.title, description: c.description || "" })),
      resources: ((resources as any) || []).map((r: any) => ({
        title: r.title,
        resource_type: r.resource_type || "article",
        url: r.url || "",
        description: r.description || "",
      })),
    });
    setAiPrompt("");
    setOpen(true);
  };

  const generateWithAi = async () => {
    if (!aiPrompt.trim()) {
      toast({ title: "Describe the stuck area first", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const result = await callAiJson<{
        title: string;
        description: string;
        icon_name: string;
        checklist: { title: string; description: string }[];
        resources: { title: string; description: string; resource_type: string; url: string }[];
      }>(
        `Draft a "stuck area" for a coaching platform's Support Hub, for a member who feels stuck on: ${aiPrompt}`,
        "You write support content for an online coach's Support Hub. Be specific and actionable, not generic. " +
          `The icon_name must be one of: ${Object.keys(ICON_MAP).join(", ")}.`,
        {
          title: "Short area title, e.g. 'Pricing Stuck'",
          description: "One sentence describing the feeling/situation",
          icon_name: `One of: ${Object.keys(ICON_MAP).join(", ")}`,
          checklist: "Array of 5 objects: {title, description} — concrete action steps, ordered",
          resources: "Array of 2-3 objects: {title, description, resource_type (article|video|template|link|course), url (a relative in-app path like /courses, or empty string)}",
        },
      );
      setForm((f) => ({
        ...f,
        title: result.title || f.title,
        description: result.description || f.description,
        icon_name: Object.keys(ICON_MAP).includes(result.icon_name) ? result.icon_name : f.icon_name,
        checklist: result.checklist?.length ? result.checklist : f.checklist,
        resources: result.resources?.length
          ? result.resources.map((r) => ({ ...r, resource_type: RESOURCE_TYPES.includes(r.resource_type) ? r.resource_type : "article" }))
          : f.resources,
      }));
      toast({ title: "Draft ready — review and save" });
    } catch (e: any) {
      toast({ title: "Couldn't generate", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const updateChecklistRow = (idx: number, patch: Partial<ChecklistRow>) =>
    setForm((f) => ({ ...f, checklist: f.checklist.map((c, i) => (i === idx ? { ...c, ...patch } : c)) }));
  const addChecklistRow = () => setForm((f) => ({ ...f, checklist: [...f.checklist, { title: "", description: "" }] }));
  const removeChecklistRow = (idx: number) => setForm((f) => ({ ...f, checklist: f.checklist.filter((_, i) => i !== idx) }));

  const updateResourceRow = (idx: number, patch: Partial<ResourceRow>) =>
    setForm((f) => ({ ...f, resources: f.resources.map((r, i) => (i === idx ? { ...r, ...patch } : r)) }));
  const addResourceRow = () =>
    setForm((f) => ({ ...f, resources: [...f.resources, { title: "", resource_type: "article", url: "", description: "" }] }));
  const removeResourceRow = (idx: number) => setForm((f) => ({ ...f, resources: f.resources.filter((_, i) => i !== idx) }));

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const slug = form.slug.trim() || slugify(form.title);
      let areaId = form.id;

      if (areaId) {
        const { error } = await supabase
          .from("support_stuck_areas" as any)
          .update({
            slug,
            title: form.title,
            description: form.description,
            icon_name: form.icon_name,
            color: form.color,
            is_active: form.is_active,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", areaId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("support_stuck_areas" as any)
          .insert({
            slug,
            title: form.title,
            description: form.description,
            icon_name: form.icon_name,
            color: form.color,
            is_active: form.is_active,
            sort_order: areas.length + 1,
          } as any)
          .select("id")
          .single();
        if (error) throw error;
        areaId = (data as any).id;
      }

      // Replace-all is simplest and matches how these were seeded — the
      // form's row list is the source of truth for the whole list on every save.
      await supabase.from("support_stuck_checklist" as any).delete().eq("area_id", areaId);
      await supabase.from("support_stuck_resources" as any).delete().eq("area_id", areaId);

      const checklistRows = form.checklist
        .filter((r) => r.title.trim())
        .map((r, i) => ({
          area_id: areaId,
          title: r.title.trim(),
          description: r.description.trim() || null,
          sort_order: i + 1,
        }));
      const resourceRows = form.resources
        .filter((r) => r.title.trim())
        .map((r, i) => ({
          area_id: areaId,
          title: r.title.trim(),
          description: r.description.trim() || null,
          resource_type: r.resource_type,
          url: r.url.trim() || null,
          sort_order: i + 1,
        }));
      if (checklistRows.length) await supabase.from("support_stuck_checklist" as any).insert(checklistRows as any);
      if (resourceRows.length) await supabase.from("support_stuck_resources" as any).insert(resourceRows as any);

      toast({ title: form.id ? "Area updated" : "Area created" });
      setOpen(false);
      onChange();
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (area: StuckArea) => {
    if (!window.confirm(`Delete "${area.title}"? This removes its checklist and resources too.`)) return;
    const { error } = await supabase.from("support_stuck_areas" as any).delete().eq("id", area.id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Area deleted" });
    onChange();
  };

  const toggleActive = async (area: StuckArea) => {
    await supabase.from("support_stuck_areas" as any).update({ is_active: !area.is_active } as any).eq("id", area.id);
    onChange();
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> New stuck area
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {areas.map((area) => (
          <Card key={area.id} className="card-shadow">
            <CardContent className="pt-4 flex items-start gap-3">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `color-mix(in srgb, ${area.color} 14%, transparent)` }}
              >
                <AreaIcon name={area.icon_name} className="h-5 w-5" style={{ color: area.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{area.title}</p>
                  {!area.is_active && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{area.description}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(area)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove(area)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">Visible</span>
                    <Switch checked={area.is_active} onCheckedChange={() => toggleActive(area)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {areas.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center col-span-2">No stuck areas yet.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit stuck area" : "New stuck area"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {!form.id && (
              <div className="rounded-lg border border-accent/30 bg-accent-tint/30 p-3 space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-accent" /> Draft with AI
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. Struggling to price their first offer"
                    className="h-9 text-sm"
                  />
                  <Button size="sm" onClick={generateWithAi} disabled={generating} className="shrink-0">
                    {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Generate"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Fills the fields below — review before saving.</p>
              </div>
            )}

            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Slug (optional)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder={slugify(form.title) || "auto-generated"} /></div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Icon</Label>
                <IconPickerField value={form.icon_name} onChange={(v) => setForm({ ...form, icon_name: v })} />
              </div>
              <div>
                <Label>Color</Label>
                <ColorPickerField value={form.color} onChange={(v) => setForm({ ...form, color: v })} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Checklist items</Label>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addChecklistRow}>
                  <Plus className="h-3 w-3 mr-1" /> Add step
                </Button>
              </div>
              <div className="space-y-2">
                {form.checklist.map((c, i) => (
                  <div key={i} className="flex gap-2 items-start rounded-lg border border-border p-2.5">
                    <span className="text-[10px] font-medium text-muted-foreground mt-2 shrink-0 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Input
                        value={c.title}
                        onChange={(e) => updateChecklistRow(i, { title: e.target.value })}
                        placeholder="Step title"
                        className="h-8 text-xs"
                      />
                      <Input
                        value={c.description}
                        onChange={(e) => updateChecklistRow(i, { description: e.target.value })}
                        placeholder="Description (optional)"
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeChecklistRow(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {form.checklist.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No checklist steps yet.</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Resources</Label>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addResourceRow}>
                  <Plus className="h-3 w-3 mr-1" /> Add resource
                </Button>
              </div>
              <div className="space-y-2">
                {form.resources.map((r, i) => (
                  <div key={i} className="rounded-lg border border-border p-2.5 space-y-1.5 relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 absolute top-1.5 right-1.5"
                      onClick={() => removeResourceRow(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <div className="flex gap-2 pr-7">
                      <Input
                        value={r.title}
                        onChange={(e) => updateResourceRow(i, { title: e.target.value })}
                        placeholder="Title"
                        className="h-8 text-xs flex-1"
                      />
                      <Select value={r.resource_type} onValueChange={(v) => updateResourceRow(i, { resource_type: v })}>
                        <SelectTrigger className="h-8 text-xs w-28 shrink-0"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RESOURCE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      value={r.url}
                      onChange={(e) => updateResourceRow(i, { url: e.target.value })}
                      placeholder="URL (e.g. /courses or https://...)"
                      className="h-8 text-xs font-mono"
                    />
                    <Input
                      value={r.description}
                      onChange={(e) => updateResourceRow(i, { description: e.target.value })}
                      placeholder="Description (optional)"
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
                {form.resources.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No resources yet.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Visible to members</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1.5" /> Save</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────

interface ArticleRow {
  title: string;
  content: string;
}
interface TopicFormState {
  id?: string;
  slug: string;
  title: string;
  icon_name: string;
  is_active: boolean;
  articles: ArticleRow[];
}

const emptyTopicForm: TopicFormState = {
  slug: "",
  title: "",
  icon_name: "help-circle",
  is_active: true,
  articles: [],
};

function FaqManager({ topics, onChange }: { topics: FaqTopic[]; onChange: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [form, setForm] = useState<TopicFormState>({ ...emptyTopicForm });

  const openCreate = () => {
    setForm({ ...emptyTopicForm });
    setAiPrompt("");
    setOpen(true);
  };

  const openEdit = async (topic: FaqTopic) => {
    const { data: articles } = await supabase
      .from("support_faq_articles" as any)
      .select("*")
      .eq("topic_id", topic.id)
      .order("sort_order");
    setForm({
      id: topic.id,
      slug: topic.slug,
      title: topic.title,
      icon_name: topic.icon_name,
      is_active: topic.is_active,
      articles: ((articles as any) || []).map((a: any) => ({ title: a.title, content: a.content })),
    });
    setAiPrompt("");
    setOpen(true);
  };

  const generateWithAi = async () => {
    if (!aiPrompt.trim()) {
      toast({ title: "Describe the FAQ topic first", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const result = await callAiJson<{
        title: string;
        icon_name: string;
        articles: { title: string; content: string }[];
      }>(
        `Draft an FAQ topic for a coaching platform's Support Hub about: ${aiPrompt}`,
        "You write support FAQ content for an online coach's platform. Answers should be concrete, 2-4 sentences, " +
          `no fluff. The icon_name must be one of: ${Object.keys(ICON_MAP).join(", ")}.`,
        {
          title: "Short topic title, e.g. 'Refunds & Billing'",
          icon_name: `One of: ${Object.keys(ICON_MAP).join(", ")}`,
          articles: "Array of 5-8 objects: {title (a question), content (the answer, 2-4 sentences)}",
        },
      );
      setForm((f) => ({
        ...f,
        title: result.title || f.title,
        icon_name: Object.keys(ICON_MAP).includes(result.icon_name) ? result.icon_name : f.icon_name,
        articles: result.articles?.length ? result.articles : f.articles,
      }));
      toast({ title: "Draft ready — review and save" });
    } catch (e: any) {
      toast({ title: "Couldn't generate", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const updateArticle = (idx: number, patch: Partial<ArticleRow>) => {
    setForm((f) => ({ ...f, articles: f.articles.map((a, i) => (i === idx ? { ...a, ...patch } : a)) }));
  };
  const addArticle = () => setForm((f) => ({ ...f, articles: [...f.articles, { title: "", content: "" }] }));
  const removeArticle = (idx: number) =>
    setForm((f) => ({ ...f, articles: f.articles.filter((_, i) => i !== idx) }));

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const slug = form.slug.trim() || slugify(form.title);
      let topicId = form.id;

      if (topicId) {
        const { error } = await supabase
          .from("support_faq_topics" as any)
          .update({ slug, title: form.title, icon_name: form.icon_name, is_active: form.is_active, updated_at: new Date().toISOString() } as any)
          .eq("id", topicId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("support_faq_topics" as any)
          .insert({ slug, title: form.title, icon_name: form.icon_name, is_active: form.is_active, sort_order: topics.length + 1 } as any)
          .select("id")
          .single();
        if (error) throw error;
        topicId = (data as any).id;
      }

      await supabase.from("support_faq_articles" as any).delete().eq("topic_id", topicId);
      const rows = form.articles
        .filter((a) => a.title.trim())
        .map((a, i) => ({ topic_id: topicId, title: a.title, content: a.content, sort_order: i + 1 }));
      if (rows.length) await supabase.from("support_faq_articles" as any).insert(rows as any);

      toast({ title: form.id ? "Topic updated" : "Topic created" });
      setOpen(false);
      onChange();
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (topic: FaqTopic) => {
    if (!window.confirm(`Delete "${topic.title}"? This removes its articles too.`)) return;
    const { error } = await supabase.from("support_faq_topics" as any).delete().eq("id", topic.id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Topic deleted" });
    onChange();
  };

  const toggleActive = async (topic: FaqTopic) => {
    await supabase.from("support_faq_topics" as any).update({ is_active: !topic.is_active } as any).eq("id", topic.id);
    onChange();
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> New FAQ topic
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {topics.map((topic) => (
          <Card key={topic.id} className="card-shadow">
            <CardContent className="pt-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <AreaIcon name={topic.icon_name} className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{topic.title}</p>
                  {!topic.is_active && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(topic)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove(topic)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">Visible</span>
                    <Switch checked={topic.is_active} onCheckedChange={() => toggleActive(topic)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {topics.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center col-span-2">No FAQ topics yet.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit FAQ topic" : "New FAQ topic"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {!form.id && (
              <div className="rounded-lg border border-accent/30 bg-accent-tint/30 p-3 space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-accent" /> Draft with AI
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. Refunds and billing questions"
                    className="h-9 text-sm"
                  />
                  <Button size="sm" onClick={generateWithAi} disabled={generating} className="shrink-0">
                    {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Generate"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Fills the fields below — review before saving.</p>
              </div>
            )}

            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Slug (optional)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder={slugify(form.title) || "auto-generated"} /></div>
            <div>
              <Label>Icon</Label>
              <IconPickerField value={form.icon_name} onChange={(v) => setForm({ ...form, icon_name: v })} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Articles</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addArticle}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {form.articles.map((a, i) => (
                  <div key={i} className="rounded-lg border border-border p-2.5 space-y-1.5 relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 absolute top-1.5 right-1.5"
                      onClick={() => removeArticle(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <Input
                      value={a.title}
                      onChange={(e) => updateArticle(i, { title: e.target.value })}
                      placeholder="Question"
                      className="h-8 text-xs pr-7"
                    />
                    <Textarea
                      value={a.content}
                      onChange={(e) => updateArticle(i, { content: e.target.value })}
                      placeholder="Answer"
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                ))}
                {form.articles.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No articles yet.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Visible to members</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1.5" /> Save</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsManager({ coachId }: { coachId: string }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [supportHours, setSupportHours] = useState("");
  const [directChatEnabled, setDirectChatEnabled] = useState(true);
  const [aiChatName, setAiChatName] = useState("Coach AI");
  const [aiChatUrl, setAiChatUrl] = useState("");
  const [aiChatEnabled, setAiChatEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!coachId) return;
    (async () => {
      const { data } = await supabase
        .from("support_settings" as any)
        .select("support_email, whatsapp_number, whatsapp_message, phone_number, support_hours, direct_chat_enabled, ai_chat_name, ai_chat_url, ai_chat_enabled")
        .eq("coach_id", coachId)
        .maybeSingle();
      if (data) {
        const d = data as any;
        setEmail(d?.support_email || "");
        setWhatsappNumber(d?.whatsapp_number || "");
        setWhatsappMessage(d?.whatsapp_message || "");
        setPhoneNumber(d?.phone_number || "");
        setSupportHours(d?.support_hours || "");
        setDirectChatEnabled(d?.direct_chat_enabled !== false);
        setAiChatName(d?.ai_chat_name || "Coach AI");
        setAiChatUrl(d?.ai_chat_url || "");
        setAiChatEnabled(d?.ai_chat_enabled !== false);
      }
      setLoading(false);
    })();
  }, [coachId]);

  const cleanWhatsappDigits = whatsappNumber.replace(/[^0-9]/g, "");
  const whatsappPreviewUrl = cleanWhatsappDigits
    ? `https://wa.me/${cleanWhatsappDigits}${
        whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : ""
      }`
    : "";

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("support_settings" as any)
      .upsert(
        {
          coach_id: coachId,
          support_email: email.trim() || null,
          whatsapp_number: whatsappNumber.trim() || null,
          whatsapp_message: whatsappMessage.trim() || null,
          phone_number: phoneNumber.trim() || null,
          support_hours: supportHours.trim() || null,
          direct_chat_enabled: directChatEnabled,
          ai_chat_name: aiChatName.trim() || "Coach AI",
          ai_chat_url: aiChatUrl.trim() || null,
          ai_chat_enabled: aiChatEnabled,
          updated_at: new Date().toISOString(),
        } as any,
        {
          onConflict: "coach_id",
        }
      );
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save settings", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Support settings saved successfully" });
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto my-10" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Settings Form */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-accent" />
              Support Channels & AI Configuration
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Configure how members reach you and integrate your custom AI assistant on the Support Hub.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Coach AI Configuration */}
            <div className="space-y-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-[#5B4DF5] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Coach AI Assistant</Label>
                    <p className="text-[11px] text-muted-foreground">Appears as a prominent pill button on top of the Support Hub</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Show in Support</span>
                  <Switch checked={aiChatEnabled} onCheckedChange={setAiChatEnabled} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="ai-name" className="text-xs">
                    AI Button Label / Name
                  </Label>
                  <Input
                    id="ai-name"
                    value={aiChatName}
                    onChange={(e) => setAiChatName(e.target.value)}
                    placeholder="e.g. Sidz.ai, Coach AI, Growth Bot"
                    className="text-xs h-9 font-medium"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Button displays as "Chat with {aiChatName || 'AI'}"
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ai-url" className="text-xs">
                      Custom AI Link / URL
                    </Label>
                    {aiChatUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1 text-[11px] text-[#5B4DF5] hover:text-[#5B4DF5]"
                        onClick={() => window.open(aiChatUrl, "_blank", "noopener,noreferrer")}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" /> Test
                      </Button>
                    )}
                  </div>
                  <Input
                    id="ai-url"
                    value={aiChatUrl}
                    onChange={(e) => setAiChatUrl(e.target.value)}
                    placeholder="https://your-custom-ai-bot.com"
                    className="text-xs h-9 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Link to your custom GPT, Botpress, Voiceflow, or web AI agent
                  </p>
                </div>
              </div>
            </div>
            {/* Direct In-App Chat */}
            <div className="flex items-start justify-between gap-3 rounded-xl border border-border p-4 bg-secondary/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-accent" />
                  <Label htmlFor="direct-chat-switch" className="text-sm font-semibold cursor-pointer">
                    Direct In-App Chat
                  </Label>
                  <Badge variant="outline" className="text-[10px] bg-accent-tint text-accent border-accent/30">
                    Recommended
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Allow members to chat with you directly inside the platform via the Messages inbox.
                </p>
              </div>
              <Switch
                id="direct-chat-switch"
                checked={directChatEnabled}
                onCheckedChange={setDirectChatEnabled}
              />
            </div>

            {/* WhatsApp Support */}
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-[#25D366]/10 text-[#25D366] flex items-center justify-center font-bold text-xs">
                    WA
                  </div>
                  <Label className="text-sm font-semibold">WhatsApp Support</Label>
                </div>
                {whatsappPreviewUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10"
                    onClick={() => window.open(whatsappPreviewUrl, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" /> Test WhatsApp link
                  </Button>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp-num" className="text-xs text-muted-foreground">
                  WhatsApp Number (with country code)
                </Label>
                <Input
                  id="whatsapp-num"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+91 98765 43210 or +1 555 123 4567"
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Opens WhatsApp Web or mobile app directly when clicked by students.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <Label htmlFor="whatsapp-msg" className="text-xs text-muted-foreground">
                  Default Greeting Message (optional)
                </Label>
                <Input
                  id="whatsapp-msg"
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  placeholder="Hi! I have a question about the course..."
                  className="text-xs"
                />
              </div>
            </div>

            {/* Support Email */}
            <div className="space-y-2 rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4 text-accent" />
                <Label htmlFor="support-email" className="text-sm font-semibold">
                  Support Email Address
                </Label>
              </div>
              <Input
                id="support-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="support@yourbrand.com"
              />
              <p className="text-[11px] text-muted-foreground">
                Inquiries and tickets sent via the Support Hub email form will be directed to this address.
              </p>
            </div>

            {/* Phone / Mobile Support */}
            <div className="space-y-2 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-accent" />
                  <Label htmlFor="support-phone" className="text-sm font-semibold">
                    Mobile / Phone Number for Calls
                  </Label>
                </div>
                {phoneNumber && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => window.open(`tel:${phoneNumber}`, "_self")}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" /> Test Call Link
                  </Button>
                )}
              </div>
              <Input
                id="support-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Click-to-call direct phone assistance for your students and members.
              </p>
            </div>

            {/* Support Hours */}
            <div className="space-y-2 rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-accent" />
                <Label htmlFor="support-hours" className="text-sm font-semibold">
                  Support Hours & Expected Response Time
                </Label>
              </div>
              <Input
                id="support-hours"
                value={supportHours}
                onChange={(e) => setSupportHours(e.target.value)}
                placeholder="Mon–Sat: 9:00 AM – 7:00 PM IST · Usually replies within 2 hours"
              />
              <p className="text-[11px] text-muted-foreground">
                Displayed in the Support Hub contact modal to set clear expectations.
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <Button onClick={save} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving settings...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" /> Save Support Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Member Preview */}
      <div className="space-y-4">
        <Card className="card-shadow bg-accent-tint/10 border-accent/20 sticky top-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Member View Preview</span>
              <Badge variant="secondary" className="text-[10px]">Live Preview</Badge>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              This is how your support contact card looks to students on the Support Hub:
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* AI Chat Pill Preview */}
            {aiChatEnabled && (
              <div className="rounded-full bg-[#5B4DF5] text-white p-2.5 px-4 shadow-sm flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold truncate">Chat with {aiChatName || "AI"}</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" />
              </div>
            )}

            {/* Direct Chat Card */}
            {directChatEnabled && (
              <div className="rounded-lg border border-accent/30 bg-card p-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">Direct In-App Chat</p>
                    <p className="text-[10px] text-muted-foreground">Chat directly inside the platform</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Active</Badge>
                </div>
              </div>
            )}

            {/* WhatsApp Card */}
            {whatsappNumber ? (
              <div className="rounded-lg border border-[#25D366]/30 bg-card p-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-[#25D366]/15 text-[#25D366] flex items-center justify-center font-bold text-xs shrink-0">
                    WA
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">WhatsApp Chat</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{whatsappNumber}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-[#25D366] border-[#25D366]/40">Active</Badge>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-2.5 text-center text-[11px] text-muted-foreground">
                WhatsApp not configured
              </div>
            )}

            {/* Email Card */}
            {email ? (
              <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">Email Support</p>
                    <p className="text-[10px] text-muted-foreground truncate">{email}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Active</Badge>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-2.5 text-center text-[11px] text-muted-foreground">
                Email not configured
              </div>
            )}

            {/* Phone Card */}
            {phoneNumber ? (
              <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">Mobile Call</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{phoneNumber}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Active</Badge>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-2.5 text-center text-[11px] text-muted-foreground">
                Phone not configured
              </div>
            )}

            {/* Support hours display */}
            {supportHours && (
              <div className="pt-2 border-t border-border/60 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="truncate">{supportHours}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
