import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Save,
  Globe,
  Code,
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  Download,
  Undo2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAutoGrow } from "@/hooks/useAutoGrow";
import { cn } from "@/lib/utils";
import {
  MAX_PROMPT_CHARS,
  PAGE_TYPES,
  VIEWPORTS,
  partialDocument,
  promptSuggestions,
  toPreviewDocument,
  type BuilderPage,
  type ViewportKey,
} from "@/lib/pageBuilder";

/**
 * Prompt, preview, edit, publish.
 *
 * The AI returns a complete document, so the preview is the real page rather
 * than an approximation of it — what you see here is what gets served.
 */
export default function PageEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState<BuilderPage | null>(null);
  const [html, setHtml] = useState("");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewport, setViewport] = useState<ViewportKey>("desktop");
  const [tab, setTab] = useState("preview");
  /** Lets one bad generation be undone without losing the previous page. */
  const previousHtml = useRef<string | null>(null);

  // What the model has written so far, and what it is doing. Both exist only
  // while a generation is running.
  const [streamedText, setStreamedText] = useState("");
  const [status, setStatus] = useState("");
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const streamBuffer = useRef("");
  const codeRef = useRef<HTMLTextAreaElement | null>(null);
  /**
   * The page as it stands mid-write, sampled rather than tracked.
   *
   * Re-rendering an iframe on every token would thrash it into uselessness, so
   * the preview refreshes a few times a second — fast enough to watch the page
   * appear, slow enough to actually see it.
   */
  const [livePreview, setLivePreview] = useState("");
  /**
   * Whether the stream is a whole page or a set of changes.
   *
   * An edit streams search-and-replace blocks. Rendering those as a page would
   * show the viewer nonsense, so the preview keeps showing the current page
   * until the changes have actually been applied.
   */
  const streamMode = useRef<"page" | "edit">("page");
  /** Product details handed in by whatever launched the generator. */
  const contextRef = useRef<Record<string, string> | undefined>(undefined);

  const dirty = page !== null && (html !== page.html || title !== page.title);

  const promptRef = useAutoGrow(prompt);

  const suggestions = promptSuggestions(page?.page_type ?? "landing", html.trim().length > 0);

  /**
   * A suggestion either runs or gets typed for you.
   *
   * An edit to an existing page is cheap and undoable, so it runs. A starter
   * builds the whole page from scratch, which is worth a moment to adjust
   * first — so that one lands in the box.
   */
  const applySuggestion = (suggestion: { prompt: string }) => {
    setPrompt(suggestion.prompt);
    if (html.trim()) generate(suggestion.prompt, true);
  };

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase.from("builder_pages").select("*").eq("id", id).maybeSingle();

    if (error || !data) {
      toast({ title: "Page not found", variant: "destructive" });
      navigate("/page-builder");
      return;
    }

    const row = data as unknown as BuilderPage;
    setPage(row);
    setHtml(row.html || "");
    setTitle(row.title);
    setPrompt(row.prompt || "");
    setLoading(false);
  }, [id, navigate, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const generate = useCallback(
    async (brief: string, iterate: boolean) => {
      if (!brief.trim()) {
        toast({ title: "Describe what you want", variant: "destructive" });
        return;
      }
      if (brief.length > MAX_PROMPT_CHARS) {
        toast({
          title: "That brief is too long",
          description: `${brief.length.toLocaleString()} characters, and the limit is ${MAX_PROMPT_CHARS.toLocaleString()}. Trim it, or build the page in two passes.`,
          variant: "destructive",
        });
        return;
      }
      setGenerating(true);
      setStreamedText("");
      setStatus("Contacting the model…");
      setStartedAt(Date.now());
      setElapsed(0);
      streamBuffer.current = "";
      streamMode.current = iterate ? "edit" : "page";
      previousHtml.current = html;
      // Watching it get written is the point, so start on the code view.
      setTab("code");

      const finish = () => {
        setGenerating(false);
        setStatus("");
        setStreamedText("");
        streamBuffer.current = "";
      };

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-page`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionData?.session?.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              prompt: brief,
              page_type: page?.page_type ?? "landing",
              // Real product details, so a checkout page is not generated with
              // an invented price that then has to be corrected by hand.
              context: contextRef.current,
              // Sending the current page turns a rebuild into an edit.
              existing_html: iterate ? html : "",
              stream: true,
            }),
          },
        );

        const streaming = res.ok && res.headers.get("content-type")?.includes("text/event-stream");

        // An older function, or an error, answers with plain JSON.
        if (!streaming) {
          setStatus("Writing the page — this one arrives all at once…");
          const body = await res.json().catch(() => ({}));
          if (!res.ok) {
            toast({ title: "Couldn't generate", description: body.error, variant: "destructive" });
            return;
          }
          setHtml(body.html);
          setTab("preview");
          toast({
            title: iterate ? "Page updated" : "Page generated",
            description: "Nothing is saved until you press Save.",
          });
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let failed: string | null = null;
        let finished = false;
        /** How many targeted changes landed, when this was an edit. */
        let applied: number | null = null;

        const handle = (event: Record<string, unknown>) => {
          if (event.type === "delta") {
            streamBuffer.current += String(event.text ?? "");
            setStreamedText(streamBuffer.current);
            return;
          }
          if (event.type === "reset") {
            // The model answered in the wrong form and is being asked again;
            // leaving the first attempt on screen would read as corruption.
            streamBuffer.current = "";
            setStreamedText("");
            return;
          }
          if (event.type === "status") {
            setStatus(String(event.message ?? ""));
            if (event.mode === "edit" || event.mode === "page") {
              streamMode.current = event.mode;
            }
            return;
          }
          if (event.type === "error") {
            failed = String(event.error ?? "The generator stopped unexpectedly.");
            return;
          }
          if (event.type === "done") {
            finished = true;
            applied = (event.edits as { applied?: number } | null)?.applied ?? null;
            setHtml(String(event.html ?? ""));
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let cut: number;
          while ((cut = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, cut).trim();
            buffer = buffer.slice(cut + 1);
            if (!line.startsWith("data:")) continue;
            try {
              handle(JSON.parse(line.slice(5).trim()));
            } catch {
              // A frame split across reads is retried on the next line.
            }
          }
        }

        if (failed) {
          toast({ title: "Couldn't generate", description: failed, variant: "destructive" });
          setTab(html ? "code" : "preview");
          return;
        }

        if (!finished) {
          toast({
            title: "The generation was cut short",
            description: "The connection closed before the page was finished. Try again.",
            variant: "destructive",
          });
          return;
        }

        setTab("preview");
        toast({
          title: iterate ? "Page updated" : "Page generated",
          description: applied
            ? `${applied} ${applied === 1 ? "change" : "changes"} applied. Nothing is saved until you press Save.`
            : "Nothing is saved until you press Save.",
        });
      } catch {
        toast({ title: "Couldn't reach the generator", variant: "destructive" });
      } finally {
        finish();
      }
    },
    // page_type belongs here: the auto-generate effect below fires the moment
    // the page loads, and without it that call closes over the null page and
    // asks for a landing page whatever kind this actually is.
    [html, page?.page_type, toast],
  );

  useEffect(() => {
    if (!generating) return;
    const id = window.setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 500);
    return () => window.clearInterval(id);
  }, [generating, startedAt]);

  useEffect(() => {
    if (!generating) {
      setLivePreview("");
      return;
    }
    const id = window.setInterval(() => {
      if (streamMode.current === "edit") return;
      const partial = partialDocument(streamBuffer.current);
      if (partial) setLivePreview(partial);
    }, 700);
    return () => window.clearInterval(id);
  }, [generating]);

  // Follow the text as it is written, the way a build log scrolls itself.
  useEffect(() => {
    if (!generating || !codeRef.current) return;
    codeRef.current.scrollTop = codeRef.current.scrollHeight;
  }, [streamedText, generating]);

  // A brief entered on the previous screen generates immediately on arrival.
  useEffect(() => {
    if (searchParams.get("generate") !== "1" || !page || generating || html) return;

    const raw = searchParams.get("context");
    if (raw) {
      try {
        contextRef.current = JSON.parse(raw);
      } catch {
        // A malformed context is not worth blocking generation over.
      }
    }
    const brief = page.prompt;
    setSearchParams({}, { replace: true });
    if (brief) generate(brief, false);
  }, [searchParams, page, generating, html, generate, setSearchParams]);

  const save = async () => {
    if (!page) return;
    setSaving(true);
    const { error } = await supabase
      .from("builder_pages")
      .update({ title, html, last_prompt: prompt || null })
      .eq("id", page.id);
    setSaving(false);

    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved" });
    load();
  };

  const publish = async () => {
    if (!page) return;
    if (!html.trim()) {
      toast({ title: "Nothing to publish yet", variant: "destructive" });
      return;
    }
    setSaving(true);
    const next = page.status === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("builder_pages")
      .update({
        title,
        html,
        status: next,
        published_at: next === "published" ? new Date().toISOString() : null,
      })
      .eq("id", page.id);
    setSaving(false);

    if (error) {
      toast({ title: "Couldn't publish", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: next === "published" ? "Published" : "Unpublished",
      description: next === "published" ? `Live at /p/${page.slug}` : "No longer public.",
    });
    load();
  };

  const download = () => {
    const blob = new Blob([toPreviewDocument(html)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${page?.slug ?? "page"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-[calc(100vh-var(--nav-height,4rem))] flex flex-col">
        <header className="border-b px-4 py-3 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Back to pages" onClick={() => navigate("/page-builder")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Page title"
            className="w-56 h-9 font-semibold"
          />

          <Badge
            variant={page?.status === "published" ? "default" : "secondary"}
            className={page?.status === "published" ? "bg-success text-success-foreground" : ""}
          >
            {page?.status}
          </Badge>
          {page && (
            <Badge variant="outline" className="capitalize">
              {PAGE_TYPES[page.page_type]?.label ?? page.page_type}
            </Badge>
          )}
          {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={download} disabled={!html}>
              <Download className="h-4 w-4 mr-1" /> HTML
            </Button>
            <Button variant="outline" size="sm" onClick={save} disabled={saving || !dirty}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
            <Button
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={publish}
              disabled={saving}
            >
              <Globe className="h-4 w-4 mr-1" />
              {page?.status === "published" ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Prompt rail */}
          <aside className="lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r p-4 space-y-3 overflow-y-auto">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold">Build with AI</h2>
            </div>

            <Textarea
              ref={promptRef}
              rows={6}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              aria-label="Describe the page"
              className="resize-none"
              placeholder={
                html
                  ? "Make the hero dark, add a pricing table with three tiers, move the testimonial above the FAQ…"
                  : "A landing page for a 6-week coaching programme. Dark hero, three benefit cards, a testimonial and an email signup."
              }
            />

            {prompt.length > 400 && (
              <p
                className={cn(
                  "text-[11px]",
                  prompt.length > MAX_PROMPT_CHARS ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {prompt.length.toLocaleString()} characters
                {prompt.length > MAX_PROMPT_CHARS
                  ? ` — over the ${MAX_PROMPT_CHARS.toLocaleString()} limit. Trim it, or build the page in two passes.`
                  : ". A long, specific brief is fine — it is the vague ones that need fixing afterwards."}
              </p>
            )}

            {generating && (
              <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
                <p className="text-xs font-medium flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                  {status || "Writing the page…"}
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {elapsed}s
                  {streamedText.length > 0 && ` · ${(streamedText.length / 1024).toFixed(1)} KB written`}
                </p>
                <div className="h-1 rounded-full bg-border overflow-hidden">
                  {/* Length, not a percentage: nobody knows how long the page
                      will be, and a bar that lies is worse than none. */}
                  <div
                    className={cn(
                      "h-full bg-accent",
                      streamedText.length > 0 ? "transition-[width] duration-300" : "animate-pulse",
                    )}
                    style={{
                      width:
                        streamedText.length > 0
                          ? `${Math.min(95, (streamedText.length / 14000) * 100)}%`
                          : "35%",
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => generate(prompt, html.length > 0)}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {html ? "Apply change" : "Generate page"}
              </Button>

              {html && (
                <Button variant="outline" onClick={() => generate(prompt, false)} disabled={generating}>
                  Rebuild from scratch
                </Button>
              )}

              {previousHtml.current !== null && previousHtml.current !== html && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setHtml(previousHtml.current ?? "");
                    previousHtml.current = null;
                    toast({ title: "Reverted to the previous version" });
                  }}
                >
                  <Undo2 className="h-4 w-4 mr-1" /> Undo last generation
                </Button>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground">
              Edits build on the current page, so you can refine it a step at a time. Nothing is
              saved until you press Save.
            </p>

            {suggestions.map((group) => (
              <div key={group.title} className="pt-1">
                <p className="text-xs font-semibold">{group.title}</p>
                <p className="text-[11px] text-muted-foreground mb-2">{group.hint}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.prompts.map((suggestion) => (
                    <button
                      key={suggestion.label}
                      type="button"
                      title={suggestion.prompt}
                      onClick={() => applySuggestion(suggestion)}
                      disabled={generating}
                      className="rounded-full border px-2.5 py-1 text-[11px] transition-colors hover:border-accent hover:text-accent disabled:opacity-50 disabled:hover:border-border disabled:hover:text-foreground"
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {page?.status === "published" && (
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold mb-1">Live at</p>
                <a
                  href={`/p/${page.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline break-all"
                >
                  /p/{page.slug}
                </a>
              </div>
            )}
          </aside>

          {/* Canvas */}
          <div className="flex-1 flex flex-col min-h-0">
            <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
              <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
                <TabsList>
                  <TabsTrigger value="preview" className="gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </TabsTrigger>
                  <TabsTrigger value="code" className="gap-1.5">
                    <Code className="h-3.5 w-3.5" /> Code
                  </TabsTrigger>
                </TabsList>

                {tab === "preview" && (
                  <div className="ml-auto flex gap-1">
                    {(Object.keys(VIEWPORTS) as ViewportKey[]).map((key) => {
                      const Icon = key === "mobile" ? Smartphone : key === "tablet" ? Tablet : Monitor;
                      return (
                        <Button
                          key={key}
                          variant={viewport === key ? "secondary" : "ghost"}
                          size="icon"
                          aria-label={VIEWPORTS[key].label}
                          aria-pressed={viewport === key}
                          onClick={() => setViewport(key)}
                        >
                          <Icon className="h-4 w-4" />
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>

              <TabsContent value="preview" className="flex-1 min-h-0 m-0 bg-muted/40 overflow-auto">
                {generating && livePreview ? (
                  <div className="flex justify-center p-4">
                    <iframe
                      title="Page being written"
                      sandbox=""
                      srcDoc={livePreview}
                      style={{ width: VIEWPORTS[viewport].width }}
                      className="h-[calc(100vh-14rem)] max-w-full bg-white border rounded-lg shadow-sm"
                    />
                  </div>
                ) : html ? (
                  <div className="flex justify-center p-4">
                    {/* sandbox="" keeps generated markup from touching the app. */}
                    <iframe
                      title="Page preview"
                      sandbox=""
                      srcDoc={toPreviewDocument(html)}
                      style={{ width: VIEWPORTS[viewport].width }}
                      className={cn(
                        "h-[calc(100vh-14rem)] max-w-full bg-white border rounded-lg shadow-sm transition-all",
                      )}
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6">
                    <Sparkles
                      className={cn(
                        "h-10 w-10 text-muted-foreground mb-3",
                        generating && "animate-pulse text-accent",
                      )}
                    />
                    <p className="font-semibold">
                      {generating ? status || "Writing the page…" : "Nothing here yet"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                      {generating
                        ? "The page appears here as it is written. Switch to Code to watch the markup arrive."
                        : "Describe the page on the left and the AI writes the HTML and CSS. You can edit every line afterwards."}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="code" className="flex-1 min-h-0 m-0">
                <Textarea
                  ref={codeRef}
                  value={generating ? streamedText : html}
                  readOnly={generating}
                  onChange={(e) => setHtml(e.target.value)}
                  aria-label="Page HTML"
                  spellCheck={false}
                  className="h-full w-full rounded-none border-0 font-mono text-xs resize-none focus-visible:ring-0"
                  placeholder="<!doctype html>…"
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
