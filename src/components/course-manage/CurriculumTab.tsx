/**
 * Curriculum editor.
 *
 * The old version rendered every chapter fully expanded, so a ten-lesson
 * course was a wall of textareas you had to scroll past to reach the section
 * you wanted, and the only way to change an order was to retype the titles.
 * This one keeps lessons collapsed to a scannable row, opens one at a time
 * for editing, and lets rows be dragged (or nudged) into place — within a
 * section and across sections.
 *
 * Nothing is written until Save: a sticky bar appears the moment the draft
 * differs from what was loaded, so it is always clear whether the thing on
 * screen is on disk.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { saveCurriculum } from "@/lib/courseSave";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  File,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Layers,
  Link as LinkIcon,
  Loader2,
  Music,
  Play,
  Plus,
  Save,
  Trash2,
  Video,
} from "lucide-react";
import ChapterResources, { type Resource } from "./ChapterResources";
import ChapterVideoUpload from "./ChapterVideoUpload";

interface Chapter {
  id?: string;
  title: string;
  video_url: string;
  video_type: string;
  content: string;
  content_type: string;
  sort_order: number;
  resources: Resource[];
  thumbnail_url: string;
  video_description: string;
  duration_seconds: number | null;
}

interface Section {
  id?: string;
  title: string;
  sort_order: number;
  chapters: Chapter[];
}

interface Props {
  courseId: string;
  course?: { default_video_thumbnail_url?: string | null } | null;
  onUpdate?: () => void;
}

const CONTENT_TYPES = [
  { value: "video", label: "Video", icon: Video },
  { value: "youtube", label: "YouTube", icon: Play },
  { value: "audio", label: "Audio", icon: Music },
  { value: "pdf", label: "PDF", icon: File },
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "link", label: "Link", icon: LinkIcon },
  { value: "text", label: "Text", icon: FileText },
  { value: "iframe", label: "Embed", icon: Video },
] as const;

const ICONS: Record<string, typeof Video> = Object.fromEntries(
  CONTENT_TYPES.map((t) => [t.value, t.icon]),
);
ICONS.loom = Video;
ICONS.vimeo = Video;
ICONS.drive = Video;

function emptyChapter(order: number, thumbnail = ""): Chapter {
  return {
    title: "",
    video_url: "",
    video_type: "direct",
    content: "",
    content_type: "video",
    sort_order: order,
    resources: [],
    thumbnail_url: thumbnail,
    video_description: "",
    duration_seconds: null,
  };
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function totalRuntime(sections: Section[]): string {
  const seconds = sections.reduce(
    (sum, s) => sum + s.chapters.reduce((cs, c) => cs + (c.duration_seconds || 0), 0),
    0,
  );
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Identifies a chapter while it is being dragged. */
interface DragRef {
  section: number;
  chapter: number;
}

export default function CurriculumTab({ courseId, course, onUpdate }: Props) {
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [baseline, setBaseline] = useState("");
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const dragChapter = useRef<DragRef | null>(null);
  const dragSection = useRef<number | null>(null);

  const defaultThumb = course?.default_video_thumbnail_url || "";

  const loadSections = useCallback(async () => {
    const { data } = await supabase
      .from("sections")
      .select("*, chapters(*)")
      .eq("course_id", courseId)
      .order("sort_order");

    const mapped: Section[] = (data || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      sort_order: s.sort_order,
      chapters: (s.chapters || [])
        .slice()
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((c: any) => ({
          id: c.id,
          title: c.title,
          video_url: c.video_url || "",
          video_type: c.video_type || "direct",
          content: c.content || "",
          content_type: c.content_type || "video",
          sort_order: c.sort_order,
          resources: Array.isArray(c.resources) ? c.resources : [],
          thumbnail_url: c.thumbnail_url || "",
          video_description: c.video_description || "",
          duration_seconds: c.duration_seconds ?? null,
        })),
    }));

    setSections(mapped);
    setBaseline(JSON.stringify(mapped));
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  const dirty = useMemo(() => baseline !== "" && JSON.stringify(sections) !== baseline, [sections, baseline]);

  // A half-finished curriculum is easy to lose to a stray click on the sidebar
  // or the browser's back button, so the tab asks before it goes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const mutate = (fn: (draft: Section[]) => void) => {
    setSections((prev) => {
      const next: Section[] = JSON.parse(JSON.stringify(prev));
      fn(next);
      return next;
    });
  };

  const chapterKey = (sIdx: number, cIdx: number, ch: Chapter) => ch.id || `new-${sIdx}-${cIdx}`;

  /* ------------------------------ sections ------------------------------ */

  const addSection = () => {
    setSections((prev) => [...prev, { title: "", sort_order: prev.length, chapters: [] }]);
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.delete(sections.length);
      return next;
    });
  };

  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= sections.length || from === to) return;
    mutate((draft) => {
      const [moved] = draft.splice(from, 1);
      draft.splice(to, 0, moved);
    });
  };

  const toggleSection = (idx: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  /* ------------------------------ chapters ------------------------------ */

  const addChapter = (sIdx: number) => {
    mutate((draft) => {
      draft[sIdx].chapters.push(emptyChapter(draft[sIdx].chapters.length, defaultThumb));
    });
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.delete(sIdx);
      return next;
    });
    setOpenChapter(`new-${sIdx}-${sections[sIdx].chapters.length}`);
  };

  const duplicateChapter = (sIdx: number, cIdx: number) => {
    mutate((draft) => {
      const source = draft[sIdx].chapters[cIdx];
      const copy: Chapter = {
        ...JSON.parse(JSON.stringify(source)),
        id: undefined,
        title: `${source.title || "Untitled"} (copy)`,
      };
      draft[sIdx].chapters.splice(cIdx + 1, 0, copy);
    });
  };

  const updateChapter = <K extends keyof Chapter>(sIdx: number, cIdx: number, field: K, value: Chapter[K]) => {
    mutate((draft) => {
      draft[sIdx].chapters[cIdx][field] = value;
    });
  };

  /** Moves a chapter to a position in (possibly) another section. */
  const relocateChapter = (from: DragRef, toSection: number, toIndex: number) => {
    if (from.section === toSection && (toIndex === from.chapter || toIndex === from.chapter + 1)) return;
    mutate((draft) => {
      const [moved] = draft[from.section].chapters.splice(from.chapter, 1);
      // Removing from an earlier position in the same list shifts the target.
      const target = from.section === toSection && toIndex > from.chapter ? toIndex - 1 : toIndex;
      draft[toSection].chapters.splice(Math.max(0, Math.min(target, draft[toSection].chapters.length)), 0, moved);
    });
  };

  const moveChapter = (sIdx: number, cIdx: number, dir: -1 | 1) => {
    const target = cIdx + dir;
    if (target < 0 || target >= sections[sIdx].chapters.length) return;
    mutate((draft) => {
      const list = draft[sIdx].chapters;
      [list[cIdx], list[target]] = [list[target], list[cIdx]];
    });
  };

  /* -------------------------------- save -------------------------------- */

  const handleSave = async () => {
    const untitled = sections.some((s) => !s.title.trim());
    if (untitled) {
      toast({
        title: "Every section needs a title",
        description: "Name the untitled sections before saving.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await saveCurriculum(
        courseId,
        sections.map((sec) => ({
          id: sec.id,
          title: sec.title,
          chapters: sec.chapters.map((ch) => ({
            id: ch.id,
            title: ch.title.trim() || "Untitled lesson",
            video_url: ch.video_url || null,
            video_type: ch.video_type,
            content: ch.content || null,
            content_type: ch.content_type,
            thumbnail_url: ch.thumbnail_url || null,
            video_description: ch.video_description || null,
            duration_seconds: ch.duration_seconds ?? null,
            resources: JSON.parse(JSON.stringify(ch.resources || [])),
          })),
        })),
      );
      toast({ title: "Curriculum saved", description: "Your learners see this straight away." });
      await loadSections();
      onUpdate?.();
    } catch (err: any) {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!baseline) return;
    setSections(JSON.parse(baseline));
    setOpenChapter(null);
  };

  const lessonCount = sections.reduce((n, s) => n + s.chapters.length, 0);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Curriculum</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {sections.length} {sections.length === 1 ? "section" : "sections"} · {lessonCount}{" "}
            {lessonCount === 1 ? "lesson" : "lessons"} · {totalRuntime(sections)} of video
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addSection}>
            <Plus className="mr-1 h-4 w-4" /> Add section
          </Button>
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            {saving ? "Saving..." : dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card/50 py-16 text-center">
          <Layers className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-4 text-sm font-medium">Your course is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sections group your lessons — start with one like &ldquo;Getting started&rdquo;.
          </p>
          <Button className="mt-5" onClick={addSection}>
            <Plus className="mr-1 h-4 w-4" /> Add the first section
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, sIdx) => {
            const isOpen = !collapsed.has(sIdx);
            const secSeconds = section.chapters.reduce((n, c) => n + (c.duration_seconds || 0), 0);
            return (
              <div
                key={section.id || `s-${sIdx}`}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                onDragOver={(e) => {
                  if (dragSection.current !== null || dragChapter.current) e.preventDefault();
                }}
                onDrop={(e) => {
                  if (dragSection.current !== null) {
                    e.preventDefault();
                    moveSection(dragSection.current, sIdx);
                    dragSection.current = null;
                  } else if (dragChapter.current) {
                    e.preventDefault();
                    relocateChapter(dragChapter.current, sIdx, section.chapters.length);
                    dragChapter.current = null;
                  }
                }}
              >
                {/* Section header */}
                <div className="flex items-center gap-2 border-b border-border bg-secondary/30 px-3 py-2.5">
                  <button
                    type="button"
                    draggable
                    onDragStart={() => {
                      dragSection.current = sIdx;
                    }}
                    onDragEnd={() => {
                      dragSection.current = null;
                    }}
                    className="cursor-grab text-muted-foreground active:cursor-grabbing"
                    aria-label="Drag to reorder section"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSection(sIdx)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={isOpen ? "Collapse section" : "Expand section"}
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <span className="shrink-0 rounded bg-background px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {String(sIdx + 1).padStart(2, "0")}
                  </span>
                  <Input
                    value={section.title}
                    onChange={(e) =>
                      mutate((draft) => {
                        draft[sIdx].title = e.target.value;
                      })
                    }
                    placeholder="Section title"
                    className="h-8 flex-1 border-transparent bg-transparent text-sm font-semibold focus-visible:border-input focus-visible:bg-background"
                  />
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                    {section.chapters.length} {section.chapters.length === 1 ? "lesson" : "lessons"}
                    {secSeconds > 0 && ` · ${Math.round(secSeconds / 60)}m`}
                  </span>
                  <div className="flex shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={sIdx === 0}
                      onClick={() => moveSection(sIdx, sIdx - 1)}
                      aria-label="Move section up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={sIdx === sections.length - 1}
                      onClick={() => moveSection(sIdx, sIdx + 1)}
                      aria-label="Move section down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() =>
                        mutate((draft) => {
                          draft.splice(sIdx, 1);
                        })
                      }
                      aria-label="Delete section"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {isOpen && (
                  <div className="p-2">
                    {section.chapters.length === 0 && (
                      <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                        No lessons here yet — add one, or drag one in from another section.
                      </p>
                    )}

                    <div className="space-y-1.5">
                      {section.chapters.map((ch, cIdx) => {
                        const key = chapterKey(sIdx, cIdx, ch);
                        const expanded = openChapter === key;
                        const Icon = ICONS[ch.content_type] || FileText;
                        const dur = formatDuration(ch.duration_seconds);
                        return (
                          <div
                            key={key}
                            className={cn(
                              "rounded-lg border transition-colors",
                              expanded ? "border-accent/50 bg-accent/[0.03]" : "border-border bg-background",
                            )}
                            onDragOver={(e) => {
                              if (dragChapter.current) e.preventDefault();
                            }}
                            onDrop={(e) => {
                              if (!dragChapter.current) return;
                              e.preventDefault();
                              e.stopPropagation();
                              relocateChapter(dragChapter.current, sIdx, cIdx);
                              dragChapter.current = null;
                            }}
                          >
                            {/* Collapsed row */}
                            <div className="flex items-center gap-2 p-2">
                              <button
                                type="button"
                                draggable
                                onDragStart={(e) => {
                                  dragChapter.current = { section: sIdx, chapter: cIdx };
                                  e.dataTransfer.effectAllowed = "move";
                                }}
                                onDragEnd={() => {
                                  dragChapter.current = null;
                                }}
                                className="cursor-grab text-muted-foreground active:cursor-grabbing"
                                aria-label="Drag to reorder lesson"
                              >
                                <GripVertical className="h-4 w-4" />
                              </button>

                              <div className="h-9 w-14 shrink-0 overflow-hidden rounded border border-border bg-secondary">
                                {ch.thumbnail_url ? (
                                  <img src={ch.thumbnail_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => setOpenChapter(expanded ? null : key)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <p className="truncate text-sm font-medium">
                                  {ch.title || <span className="text-muted-foreground">Untitled lesson</span>}
                                </p>
                                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <Icon className="h-3 w-3" />
                                  <span className="capitalize">{ch.content_type}</span>
                                  {dur && (
                                    <>
                                      <span aria-hidden>·</span>
                                      <Clock className="h-3 w-3" />
                                      {dur}
                                    </>
                                  )}
                                  {!ch.video_url && ch.content_type !== "text" && (
                                    <>
                                      <span aria-hidden>·</span>
                                      <span className="text-amber-600 dark:text-amber-500">no content yet</span>
                                    </>
                                  )}
                                </p>
                              </button>

                              <div className="flex shrink-0 items-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={cIdx === 0}
                                  onClick={() => moveChapter(sIdx, cIdx, -1)}
                                  aria-label="Move lesson up"
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={cIdx === section.chapters.length - 1}
                                  onClick={() => moveChapter(sIdx, cIdx, 1)}
                                  aria-label="Move lesson down"
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      aria-label="Lesson actions"
                                    >
                                      Move
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel className="text-xs">Move to section</DropdownMenuLabel>
                                    {sections.map((target, tIdx) => (
                                      <DropdownMenuItem
                                        key={target.id || `t-${tIdx}`}
                                        disabled={tIdx === sIdx}
                                        onClick={() =>
                                          relocateChapter(
                                            { section: sIdx, chapter: cIdx },
                                            tIdx,
                                            target.chapters.length,
                                          )
                                        }
                                      >
                                        {String(tIdx + 1).padStart(2, "0")} ·{" "}
                                        {target.title || "Untitled section"}
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => duplicateChapter(sIdx, cIdx)}>
                                      <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate lesson
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() =>
                                    mutate((draft) => {
                                      draft[sIdx].chapters.splice(cIdx, 1);
                                    })
                                  }
                                  aria-label="Delete lesson"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setOpenChapter(expanded ? null : key)}
                                  aria-label={expanded ? "Close lesson" : "Edit lesson"}
                                >
                                  {expanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Expanded editor */}
                            {expanded && (
                              <div className="space-y-3 border-t border-border/70 p-3">
                                <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground">
                                      Lesson title
                                    </label>
                                    <Input
                                      value={ch.title}
                                      onChange={(e) => updateChapter(sIdx, cIdx, "title", e.target.value)}
                                      placeholder="e.g. How the framework works"
                                      className="mt-1 h-9 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground">
                                      Content type
                                    </label>
                                    <Select
                                      value={ch.content_type}
                                      onValueChange={(v) => updateChapter(sIdx, cIdx, "content_type", v)}
                                    >
                                      <SelectTrigger className="mt-1 h-9 text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {CONTENT_TYPES.map((t) => (
                                          <SelectItem key={t.value} value={t.value}>
                                            <span className="flex items-center gap-2">
                                              <t.icon className="h-3.5 w-3.5" /> {t.label}
                                            </span>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <ChapterVideoUpload
                                  contentType={ch.content_type}
                                  contentUrl={ch.video_url}
                                  thumbnailUrl={ch.thumbnail_url}
                                  fallbackThumbnailUrl={defaultThumb}
                                  durationSeconds={ch.duration_seconds}
                                  onContentChange={(url) => updateChapter(sIdx, cIdx, "video_url", url)}
                                  onThumbnailChange={(url) => updateChapter(sIdx, cIdx, "thumbnail_url", url)}
                                  onDurationChange={(secs) => updateChapter(sIdx, cIdx, "duration_seconds", secs)}
                                />

                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground">
                                      Short summary
                                    </label>
                                    <Textarea
                                      value={ch.video_description}
                                      onChange={(e) =>
                                        updateChapter(sIdx, cIdx, "video_description", e.target.value)
                                      }
                                      placeholder="One line shown under the player"
                                      className="mt-1 min-h-[64px] text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground">
                                      Lesson notes
                                    </label>
                                    <Textarea
                                      value={ch.content}
                                      onChange={(e) => updateChapter(sIdx, cIdx, "content", e.target.value)}
                                      placeholder="Longer notes, transcript or steps"
                                      className="mt-1 min-h-[64px] text-sm"
                                    />
                                  </div>
                                </div>

                                <ChapterResources
                                  resources={ch.resources}
                                  onChange={(next) => updateChapter(sIdx, cIdx, "resources", next)}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full justify-center border border-dashed border-border text-accent hover:bg-accent/5"
                      onClick={() => addChapter(sIdx)}
                    >
                      <Plus className="mr-1 h-4 w-4" /> Add lesson to &ldquo;
                      {section.title || "this section"}&rdquo;
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky save bar */}
      {dirty && (
        <div className="sticky bottom-4 z-20 mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
          <p className="text-sm">
            <span className="font-semibold">Unsaved changes</span>
            <span className="ml-1.5 hidden text-muted-foreground sm:inline">
              Learners will not see these until you save.
            </span>
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={discard} disabled={saving}>
              Discard
            </Button>
            <Button
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
