import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  FileText,
  Pencil,
  Lock,
  Play,
  Share2,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeDripLocks, lockedChapterIds } from "@/lib/drip";
import { useSeo } from "@/hooks/useSeo";
import { courseMeta } from "@/lib/seo";
import { ShareDialog } from "@/components/share/ShareDialog";

interface Chapter {
  id: string;
  title: string;
  video_url: string | null;
  video_type: string;
  content: string | null;
  content_type: string;
  sort_order: number;
  resources: unknown;
  thumbnail_url: string | null;
  duration_seconds: number | null;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  price: number;
  thumbnail_url: string | null;
  cover_image_url?: string | null;
  drip_type?: string | null;
}

interface Section {
  id: string;
  title: string;
  sort_order: number;
  chapters: Chapter[];
  drip_delay_days?: number | null;
  drip_date?: string | null;
}

/** "8:05", or "1:02:30" once it passes an hour. Null when nothing is known. */
function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** "3h 20m" for the summary line, where seconds would be noise. */
function formatTotal(seconds: number): string | null {
  if (seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function resourceCount(chapter: Chapter): number {
  const raw = chapter.resources;
  if (!raw) return 0;
  try {
    const list = Array.isArray(raw) ? raw : JSON.parse(String(raw));
    return Array.isArray(list) ? list.length : 0;
  } catch {
    return 0;
  }
}

export default function CourseDetail() {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [enrolledAt, setEnrolledAt] = useState<string | null>(null);

  const canEdit = hasRole("coach") || hasRole("admin") || hasRole("super_admin");

  const seo = course ? courseMeta(course, window.location.origin) : null;
  useSeo(seo);

  useEffect(() => {
    loadCourseDetail();
    loadProgress();
  }, [id]);

  const loadCourseDetail = async () => {
    try {
      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id!)
        .single();
      setCourse(courseData as Course);

      const { data: secs } = await supabase
        .from("sections")
        .select("*, chapters(*)")
        .eq("course_id", id!)
        .order("sort_order");

      if (secs) {
        setSections(
          (secs as unknown as Section[]).map((s) => ({
            ...s,
            chapters: [...(s.chapters || [])].sort((a, b) => a.sort_order - b.sort_order),
          })),
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    if (!user) return;
    const [{ data }, { data: enrolment }] = await Promise.all([
      supabase.from("chapter_progress").select("chapter_id").eq("user_id", user.id).eq("completed", true),
      // The enrolment date is the clock a "days after enrolling" drip counts from.
      supabase
        .from("enrollments")
        .select("enrolled_at")
        .eq("course_id", id!)
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
    if (data) setCompletedChapters(new Set(data.map((p) => p.chapter_id)));
    setEnrolledAt(enrolment?.enrolled_at ?? null);
  };

  const toggleSection = (sectionId: string) => {
    const next = new Set(collapsedSections);
    if (next.has(sectionId)) next.delete(sectionId);
    else next.add(sectionId);
    setCollapsedSections(next);
  };

  // What the course's drip schedule leaves open for this person right now.
  const dripLocks = useMemo(
    () =>
      computeDripLocks({
        dripType: course?.drip_type,
        sections,
        enrolledAt,
        completedChapterIds: completedChapters,
        bypass: canEdit,
      }),
    [course?.drip_type, sections, enrolledAt, completedChapters, canEdit],
  );
  const lockedChapters = useMemo(() => lockedChapterIds(sections, dripLocks), [sections, dripLocks]);

  const allChapters = useMemo(() => sections.flatMap((s) => s.chapters), [sections]);
  const totalLectures = allChapters.length;
  const completedCount = allChapters.filter((c) => completedChapters.has(c.id)).length;
  const progressPercent = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;
  const totalSeconds = allChapters.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
  const totalDuration = formatTotal(totalSeconds);
  const totalResources = allChapters.reduce((sum, c) => sum + resourceCount(c), 0);

  // Resume where they stopped: the first lecture they have not finished and
  // can actually open — sending someone to a dripped lesson is a dead end.
  const nextChapter =
    allChapters.find((c) => !completedChapters.has(c.id) && !lockedChapters.has(c.id)) ??
    allChapters.find((c) => !lockedChapters.has(c.id)) ??
    allChapters[0];
  const started = completedCount > 0;
  const finished = totalLectures > 0 && completedCount === totalLectures;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <span className="animate-pulse text-sm text-muted-foreground">Loading course…</span>
        </div>
      </AppLayout>
    );
  }

  if (!course) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-xl font-bold">Course not found</h2>
          <Link to="/courses" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
            Back to courses
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Two images, two jobs: the poster is the 16:9 card art, the backdrop is the
  // wide cover photo uploaded for this page. Either stands in for the other
  // when only one has been set.
  const artwork = course.thumbnail_url || course.cover_image_url || "/placeholder.svg";
  const backdrop = course.cover_image_url || course.thumbnail_url || "/placeholder.svg";
  /** A purpose-made cover is already framed, so it does not want the heavy blur the poster needs. */
  const hasDedicatedCover = Boolean(course.cover_image_url);
  const ctaLabel = finished ? "Watch again" : started ? "Resume" : "Start course";

  return (
    <AppLayout>
      {/* Hero. A cover photo uploaded for this page is shown close to as-is,
          only dimmed and scrimmed enough to keep the title legible. With no
          cover, the poster stands in — blown up and blurred, the way a
          streaming title page handles art that was never meant to be wide. */}
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src={backdrop}
            alt=""
            aria-hidden
            className={cn(
              "h-full w-full object-cover",
              hasDedicatedCover ? "scale-105 brightness-[0.7]" : "scale-110 blur-2xl brightness-[0.55]",
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
          <button
            onClick={() => navigate("/courses")}
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to courses
          </button>

          <div className="grid gap-8 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:items-end">
            {/* Poster */}
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-card shadow-2xl md:aspect-[3/2]">
              <img src={artwork} alt={course.title} className="h-full w-full object-cover" />
              {progressPercent > 0 && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                  <div className="h-full bg-accent" style={{ width: `${progressPercent}%` }} />
                </div>
              )}
            </div>

            {/* Title block */}
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {course.category && (
                  <span className="rounded-full bg-accent-tint px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
                    {course.category}
                  </span>
                )}
                <span className="rounded-full border border-border bg-card/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {course.price > 0 ? `₹${course.price}` : "Free"}
                </span>
                {finished && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-success">
                    <Check className="h-3 w-3" /> Completed
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                {course.title}
              </h1>

              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span>{sections.length} {sections.length === 1 ? "section" : "sections"}</span>
                <span aria-hidden>·</span>
                <span>{totalLectures} {totalLectures === 1 ? "lecture" : "lectures"}</span>
                {totalDuration && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{totalDuration}</span>
                  </>
                )}
                {progressPercent > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="font-semibold text-accent">{progressPercent}% complete</span>
                  </>
                )}
              </p>

              {course.description && (
                <p className="mt-4 line-clamp-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {course.description}
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  disabled={!nextChapter}
                  onClick={() =>
                    nextChapter && navigate(`/course-player/${course.id}/watch/${nextChapter.id}`)
                  }
                  className="h-12 gap-2 rounded-xl px-7 text-base font-bold"
                >
                  <Play className="h-5 w-5 fill-current" />
                  {ctaLabel}
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setShareOpen(true)}
                  className="h-12 gap-2 rounded-xl"
                >
                  <Share2 className="h-4 w-4" /> Share
                </Button>

                {canEdit && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate(`/course-manage/${course.id}`)}
                    className="h-12 gap-2 rounded-xl"
                  >
                    <Pencil className="h-4 w-4" /> Edit course
                  </Button>
                )}
              </div>

              {started && !finished && nextChapter && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Up next · {nextChapter.title}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          {/* Curriculum */}
          <div>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xl font-bold">Course content</h2>
              {totalLectures > 0 && (
                <span className="text-xs font-medium text-muted-foreground">
                  {completedCount} of {totalLectures} complete
                </span>
              )}
            </div>

            {sections.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  This course has no lectures yet.
                </p>
                {canEdit && (
                  <Button
                    variant="outline"
                    className="mt-4 rounded-xl"
                    onClick={() => navigate(`/course-manage/${course.id}`)}
                  >
                    Add the first chapter
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-3">
              {sections.map((section, sIdx) => {
                const collapsed = collapsedSections.has(section.id);
                const done = section.chapters.filter((c) => completedChapters.has(c.id)).length;
                const sectionSeconds = section.chapters.reduce(
                  (sum, c) => sum + (c.duration_seconds || 0),
                  0,
                );
                const sectionDuration = formatTotal(sectionSeconds);
                const lock = dripLocks.get(section.id);

                return (
                  <section
                    key={section.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card"
                  >
                    <button
                      onClick={() => toggleSection(section.id)}
                      aria-expanded={!collapsed}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60"
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          collapsed && "-rotate-90",
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {section.title || `Section ${sIdx + 1}`}
                      </span>
                      {lock?.locked && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          <Lock className="h-3 w-3" /> {lock.reason}
                        </span>
                      )}
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">
                        {done}/{section.chapters.length}
                        {sectionDuration && ` · ${sectionDuration}`}
                      </span>
                    </button>

                    {!collapsed && (
                      <ul className="border-t border-border">
                        {section.chapters.map((chapter, cIdx) => {
                          const completed = completedChapters.has(chapter.id);
                          const duration = formatDuration(chapter.duration_seconds);
                          const resources = resourceCount(chapter);
                          const isNext = nextChapter?.id === chapter.id;

                          return (
                            <li key={chapter.id}>
                              <button
                                disabled={Boolean(lock?.locked)}
                                onClick={() =>
                                  navigate(`/course-player/${course.id}/watch/${chapter.id}`)
                                }
                                className={cn(
                                  "group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-secondary/60",
                                  isNext && !lock?.locked && "bg-accent-tint/60",
                                  lock?.locked && "cursor-not-allowed opacity-55 hover:bg-transparent",
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-6 shrink-0 text-center text-xs font-semibold tabular-nums",
                                    completed ? "text-success" : "text-muted-foreground",
                                  )}
                                >
                                  {lock?.locked ? (
                                    <Lock className="mx-auto h-3.5 w-3.5" />
                                  ) : completed ? (
                                    <Check className="mx-auto h-4 w-4" />
                                  ) : (
                                    cIdx + 1
                                  )}
                                </span>

                                {/* Thumbnail with the duration pill sitting on
                                    it, the way a video list reads at a glance. */}
                                <span className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-secondary">
                                  {chapter.thumbnail_url ? (
                                    <img
                                      src={chapter.thumbnail_url}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="flex h-full w-full items-center justify-center">
                                      <Play className="h-4 w-4 fill-current text-muted-foreground" />
                                    </span>
                                  )}
                                  <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                                    <Play className="h-5 w-5 fill-white text-white" />
                                  </span>
                                  {duration && (
                                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] font-semibold leading-4 text-white">
                                      {duration}
                                    </span>
                                  )}
                                </span>

                                <span className="min-w-0 flex-1">
                                  <span
                                    className={cn(
                                      "block truncate text-sm font-medium",
                                      completed && "text-muted-foreground",
                                    )}
                                  >
                                    {chapter.title || "Untitled lecture"}
                                  </span>
                                  <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                    {isNext && !completed && (
                                      <span className="font-semibold text-accent">Up next</span>
                                    )}
                                    {resources > 0 && (
                                      <span className="inline-flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        {resources} {resources === 1 ? "resource" : "resources"}
                                      </span>
                                    )}
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })}

                        {section.chapters.length === 0 && (
                          <li className="px-4 py-6 text-center text-xs text-muted-foreground">
                            No lectures in this section yet.
                          </li>
                        )}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>

            {course.description && (
              <div className="mt-8 rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-3 text-lg font-bold">About this course</h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {course.description}
                </p>
              </div>
            )}
          </div>

          {/* Aside: progress and what the course holds. */}
          <aside className="lg:sticky lg:top-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              {totalLectures > 0 && (
                <>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-sm font-semibold">Your progress</span>
                    <span className="text-sm font-bold text-accent">{progressPercent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {completedCount} of {totalLectures} lectures finished
                  </p>
                </>
              )}

              <dl className="mt-5 space-y-2.5 border-t border-border pt-5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Lectures</dt>
                  <dd className="font-semibold">{totalLectures}</dd>
                </div>
                {totalDuration && (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Total length</dt>
                    <dd className="font-semibold">{totalDuration}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Resources</dt>
                  <dd className="font-semibold">{totalResources}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Price</dt>
                  <dd className="font-semibold">
                    {course.price > 0 ? `₹${course.price}` : "Free"}
                  </dd>
                </div>
              </dl>

              {finished && (
                <Link
                  to="/automation/certificates"
                  className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
                >
                  <Star className="h-4 w-4" /> Get your certificate
                </Link>
              )}
            </div>
          </aside>
        </div>
      </div>

      {seo && (
        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          heading="Share this course"
          url={seo.canonical}
          title={course.title}
          description={seo.description}
          imageUrl={course.cover_image_url || course.thumbnail_url}
        />
      )}
    </AppLayout>
  );
}
