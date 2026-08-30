import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Sparkles,
  Layout,
  Loader2,
  ExternalLink,
  Trash2,
  Pencil,
  Copy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  PAGE_TYPES,
  type PageType, slugify, type BuilderPage } from "@/lib/pageBuilder";

/**
 * The list of pages a coach has built.
 *
 * This page used to render three hardcoded rows and save nothing at all.
 */
export default function PageBuilder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const coachId = user?.id;

  const [pages, setPages] = useState<BuilderPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", prompt: "", type: "landing" as PageType });

  const load = useCallback(async () => {
    if (!coachId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("builder_pages")
      .select("*")
      .eq("coach_id", coachId)
      .order("updated_at", { ascending: false });

    if (error) toast({ title: "Couldn't load pages", description: error.message, variant: "destructive" });
    setPages((data as unknown as BuilderPage[]) || []);
    setLoading(false);
  }, [coachId, toast]);

  useEffect(() => {
    if (coachId) load();
  }, [coachId, load]);

  const create = async (withAi: boolean) => {
    if (!coachId) return;
    const title = form.title.trim() || "Untitled page";

    setCreating(true);
    // The slug has to be unique per coach; a timestamp suffix avoids a clash
    // without making the user think about it.
    const slug = `${slugify(title)}-${Date.now().toString(36).slice(-4)}`;

    const { data, error } = await supabase
      .from("builder_pages")
      .insert({
        coach_id: coachId,
        title,
        slug,
        page_type: form.type,
        prompt: withAi ? form.prompt.trim() || null : null,
        html: "",
        css: "",
      })
      .select()
      .single();

    setCreating(false);

    if (error || !data) {
      toast({ title: "Couldn't create the page", description: error?.message, variant: "destructive" });
      return;
    }

    setOpen(false);
    setForm({ title: "", prompt: "", type: "landing" });
    // Carry the brief through so the editor can generate straight away.
    navigate(`/page-builder/${data.id}${withAi && form.prompt.trim() ? "?generate=1" : ""}`);
  };

  const remove = async (page: BuilderPage) => {
    const { error } = await supabase.from("builder_pages").delete().eq("id", page.id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Page deleted" });
    load();
  };

  const copyLink = async (page: BuilderPage) => {
    const url = `${window.location.origin}/p/${page.slug}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copied", description: url });
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold font-display">Pages</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Build landing pages, checkouts and anything else — by hand or with AI.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-1" /> New page
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New page</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">What kind of page?</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v: PageType) => setForm({ ...form, type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PAGE_TYPES) as PageType[]).map((t) => (
                        <SelectItem key={t} value={t}>{PAGE_TYPES[t].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {PAGE_TYPES[form.type].description}
                  </p>
                </div>

                <div>
                  <Label className="text-xs">Page name</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Growth Masterclass landing page"
                  />
                </div>

                <div>
                  <Label className="text-xs flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-accent" /> Describe it (optional)
                  </Label>
                  <Textarea
                    rows={4}
                    value={form.prompt}
                    onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                    placeholder={PAGE_TYPES[form.type].samplePrompt}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    The more specific the brief, the less you'll have to fix afterwards.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => create(true)}
                    disabled={creating || !form.prompt.trim()}
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Build with AI
                  </Button>
                  <Button variant="outline" onClick={() => create(false)} disabled={creating}>
                    Start blank
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : pages.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Layout className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold">No pages yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Describe the page you want and the AI writes the HTML and CSS. You can edit
                everything afterwards.
              </p>
              <Button className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setOpen(true)}>
                <Sparkles className="h-4 w-4 mr-1" /> Build your first page
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <Card key={page.id} className="overflow-hidden group">
                <div className="h-32 bg-muted border-b relative overflow-hidden">
                  {page.html ? (
                    // Sandboxed and inert: a thumbnail must never run the page.
                    <iframe
                      title={`${page.title} preview`}
                      sandbox=""
                      srcDoc={page.html}
                      aria-hidden="true"
                      className="w-[1280px] h-[512px] origin-top-left scale-[0.25] pointer-events-none border-0 bg-white"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <Layout className="h-8 w-8" />
                    </div>
                  )}
                </div>

                <CardContent className="pt-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{page.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Updated {new Date(page.updated_at).toLocaleDateString(undefined, {
                          day: "numeric", month: "short",
                        })}
                      </p>
                    </div>
                    <Badge
                      variant={page.status === "published" ? "default" : "secondary"}
                      className={page.status === "published" ? "bg-success text-success-foreground" : ""}
                    >
                      {page.status}
                    </Badge>
                  </div>

                  <div className="flex gap-1 mt-3">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/page-builder/${page.id}`)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    {page.status === "published" && (
                      <>
                        <Button size="sm" variant="ghost" aria-label="Copy link" onClick={() => copyLink(page)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" aria-label="Open page" asChild>
                          <a href={`/p/${page.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      aria-label={`Delete ${page.title}`}
                      onClick={() => remove(page)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
