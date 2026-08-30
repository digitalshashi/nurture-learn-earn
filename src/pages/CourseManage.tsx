/**
 * /course-manage/:id — the course editor.
 *
 * The shell does three jobs the tabs cannot do for themselves: it says what
 * state the course is in (live or draft, how much is built, who is enrolled),
 * it keeps the open section in the URL so a link points at a section rather
 * than at "wherever the editor last opened", and it puts publish and preview
 * within reach of every tab.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { DeleteCourseDialog } from "@/components/courses/DeleteCourseDialog";
import { useTabParam } from "@/hooks/useTabParam";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BarChart3,
  Bot,
  BookOpen,
  Check,
  ClipboardList,
  Clock,
  Copy,
  Eye,
  Trash2,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Layers,
  Link2,
  Loader2,
  MessageCircle,
  MoreVertical,
  Rocket,
  Star,
  Undo2,
  Users,
} from "lucide-react";
import CurriculumTab from "@/components/course-manage/CurriculumTab";
import InformationTab from "@/components/course-manage/InformationTab";
import DripTab from "@/components/course-manage/DripTab";
import ReportsTab from "@/components/course-manage/ReportsTab";
import CommentsTab from "@/components/course-manage/CommentsTab";
import QnATab from "@/components/course-manage/QnATab";
import AssignmentsTab from "@/components/course-manage/AssignmentsTab";
import ReviewsTab from "@/components/course-manage/ReviewsTab";
import ChatbotTab from "@/components/course-manage/ChatbotTab";

const TAB_KEYS = [
  "curriculum",
  "information",
  "drip",
  "reports",
  "comments",
  "qna",
  "assignments",
  "reviews",
  "chatbot",
] as const;

type TabKey = (typeof TAB_KEYS)[number];

interface NavItem {
  key: TabKey;
  label: string;
  icon: typeof BookOpen;
  hint: string;
  badge?: string;
  /** Name of the live counter shown on the right of the row, when there is one. */
  count?: "comments" | "qna" | "reviews" | "assignments";
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Build",
    items: [
      { key: "curriculum", label: "Curriculum", icon: BookOpen, hint: "Sections, lessons and videos" },
      { key: "information", label: "Information", icon: Info, hint: "Title, pricing, cover art" },
      { key: "drip", label: "Drip schedule", icon: Clock, hint: "When each section unlocks", badge: "BETA" },
    ],
  },
  {
    label: "Engage",
    items: [
      { key: "comments", label: "Comments", icon: MessageCircle, hint: "Lesson discussion", count: "comments" },
      { key: "qna", label: "QnA", icon: HelpCircle, hint: "Learner questions", count: "qna" },
      {
        key: "assignments",
        label: "Assignments",
        icon: ClipboardList,
        hint: "Submissions and scores",
        count: "assignments",
      },
      { key: "reviews", label: "Reviews", icon: Star, hint: "Ratings and replies", count: "reviews" },
      { key: "chatbot", label: "QnA Chatbot", icon: Bot, hint: "Bot transcripts", badge: "EXPERIMENTAL" },
    ],
  },
  {
    label: "Measure",
    items: [{ key: "reports", label: "Reports", icon: BarChart3, hint: "Completion and leaderboard" }],
  },
];

interface CourseStats {
  sections: number;
  chapters: number;
  seconds: number;
  students: number;
}

interface TabCounts {
  comments: number;
  qna: number;
  reviews: number;
  assignments: number;
}

const EMPTY_STATS: CourseStats = { sections: 0, chapters: 0, seconds: 0, students: 0 };
const EMPTY_COUNTS: TabCounts = { comments: 0, qna: 0, reviews: 0, assignments: 0 };

function formatRuntime(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

export default function CourseManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useTabParam(TAB_KEYS);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [stats, setStats] = useState<CourseStats>(EMPTY_STATS);
  const [counts, setCounts] = useState<TabCounts>(EMPTY_COUNTS);
  const [deleting, setDeleting] = useState(false);

  const loadCourse = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from("courses").select("*").eq("id", id).single();
    setCourse(data);
    setLoading(false);
  }, [id]);

  /**
   * Everything the header claims about the course, in one pass. The tabs each
   * load their own rows anyway; these are only the headline numbers, so they
   * are counted rather than fetched in full.
   */
  const loadStats = useCallback(async () => {
    if (!id) return;

    const [{ data: sections }, { count: students }, { count: reviews }] = await Promise.all([
      supabase.from("sections").select("id, chapters(id, duration_seconds)").eq("course_id", id),
      supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("course_id", id),
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("course_id", id),
    ]);

    const chapterIds: string[] = [];
    const next: CourseStats = { ...EMPTY_STATS, students: students || 0 };
    (sections || []).forEach((s: any) => {
      next.sections += 1;
      (s.chapters || []).forEach((ch: any) => {
        next.chapters += 1;
        next.seconds += ch.duration_seconds || 0;
        chapterIds.push(ch.id);
      });
    });
    setStats(next);

    if (chapterIds.length === 0) {
      setCounts({ ...EMPTY_COUNTS, reviews: reviews || 0 });
      return;
    }

    const [{ count: comments }, { count: qna }, { count: assignments }] = await Promise.all([
      supabase.from("chapter_comments").select("id", { count: "exact", head: true }).in("chapter_id", chapterIds),
      supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .in("chapter_id", chapterIds)
        .eq("is_resolved", false),
      supabase.from("assignments").select("id", { count: "exact", head: true }).in("chapter_id", chapterIds),
    ]);

    setCounts({
      comments: comments || 0,
      qna: qna || 0,
      reviews: reviews || 0,
      assignments: assignments || 0,
    });
  }, [id]);

  useEffect(() => {
    void loadCourse();
    void loadStats();
  }, [loadCourse, loadStats]);

  const refresh = useCallback(() => {
    void loadCourse();
    void loadStats();
  }, [loadCourse, loadStats]);

  const togglePublish = async () => {
    if (!id || !course) return;
    const next = !course.is_published;
    setPublishing(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .update({ is_published: next, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id");
      if (error) throw error;
      // An update RLS refuses is invisible rather than an error, so a silent
      // no-op would otherwise report success and leave the badge lying.
      if (!data || data.length === 0) {
        throw new Error("The course was not updated — you may not have permission to publish it.");
      }
      toast({
        title: next ? "Course is live" : "Moved back to draft",
        description: next
          ? "Learners can now find and open this course."
          : "Only you can see this course until you publish it again.",
      });
      refresh();
    } catch (err: any) {
      toast({ title: "Could not update", description: err.message, variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/course-player/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: url });
    } catch {
      toast({ title: "Could not copy", description: url, variant: "destructive" });
    }
  };

  const activeItem = useMemo(
    () => NAV_GROUPS.flatMap((g) => g.items).find((i) => i.key === activeTab),
    [activeTab],
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-lg font-semibold">That course could not be found</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          It may have been deleted, or the link may point at a course on another account.
        </p>
        <Button variant="outline" className="rounded-xl" onClick={() => navigate("/course-manage")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to your courses
        </Button>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case "curriculum":
        return <CurriculumTab courseId={id!} course={course} onUpdate={refresh} />;
      case "information":
        return <InformationTab courseId={id!} course={course} onUpdate={refresh} />;
      case "drip":
        return <DripTab courseId={id!} course={course} onUpdate={refresh} />;
      case "reports":
        return <ReportsTab courseId={id!} />;
      case "comments":
        return <CommentsTab courseId={id!} />;
      case "qna":
        return <QnATab courseId={id!} onChanged={loadStats} />;
      case "assignments":
        return <AssignmentsTab courseId={id!} />;
      case "reviews":
        return <ReviewsTab courseId={id!} />;
      case "chatbot":
        return <ChatbotTab courseId={id!} />;
      default:
        return null;
    }
  };

  const art = course.thumbnail_url || course.cover_image_url;
  const backdrop = course.cover_image_url || course.thumbnail_url;

  const headline = [
    { icon: Layers, label: "sections", value: String(stats.sections) },
    { icon: BookOpen, label: "lessons", value: String(stats.chapters) },
    { icon: Clock, label: "runtime", value: formatRuntime(stats.seconds) },
    { icon: Users, label: "students", value: String(stats.students) },
  ];

  return (
    <div className="flex h-screen flex-col bg-background lg:flex-row">
      {/* Left rail */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="border-b border-border p-4">
          <button
            onClick={() => navigate("/course-manage")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All courses
          </button>
          <div className="mt-3 flex gap-3">
            <div className="h-12 w-[74px] shrink-0 overflow-hidden rounded-lg border border-border bg-secondary">
              {art ? (
                <img src={art} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{course.title}</p>
              <span
                className={cn(
                  "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  course.is_published
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                )}
              >
                {course.is_published ? <Check className="h-2.5 w-2.5" /> : null}
                {course.is_published ? "Live" : "Draft"}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="px-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {group.label}
              </p>
              {group.items.map((item) => {
                const active = activeTab === item.key;
                const count = item.count ? counts[item.count] : 0;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={cn(
                      "flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left text-sm transition-colors",
                      active
                        ? "border-accent bg-accent/10 font-semibold text-accent"
                        : "border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="rounded bg-foreground px-1.5 py-0.5 text-[9px] font-bold text-background">
                        {item.badge}
                      </span>
                    )}
                    {!item.badge && count > 0 && (
                      <span
                        className={cn(
                          "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums",
                          active ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-border p-3">
          <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/course-player/${id}`)}>
            <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview as learner
          </Button>
          {/* Deleting is the editor's job as much as the list's — this is
              where a coach is standing when they decide a course is finished
              with. Only the owner sees it; RLS would refuse anyone else. */}
          {course.coach_id === user?.id && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleting(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete course
            </Button>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Hero header — the cover art doubles as the backdrop, so a coach can
            see the image they picked doing its real job while they edit. */}
        <header className="relative isolate shrink-0 overflow-hidden border-b border-border">
          {backdrop && (
            <div className="absolute inset-0 -z-10">
              <img src={backdrop} alt="" aria-hidden className="h-full w-full scale-110 object-cover blur-2xl" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/70" />
            </div>
          )}

          <div className="px-4 pb-4 pt-4 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => navigate("/course-manage")}
                  className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground lg:hidden"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> All courses
                </button>
                <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">{course.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge
                    className={cn(
                      "border-0 text-[10px] font-bold uppercase tracking-wider",
                      course.is_published ? "bg-emerald-500 text-white" : "bg-amber-500 text-white",
                    )}
                  >
                    {course.is_published ? "Live" : "Draft"}
                  </Badge>
                  {course.category && (
                    <span className="rounded-full border border-border bg-card/70 px-2.5 py-0.5 text-[11px] font-medium">
                      {course.category}
                    </span>
                  )}
                  <span className="rounded-full border border-border bg-card/70 px-2.5 py-0.5 text-[11px] font-medium">
                    {course.price > 0 ? `₹${course.price}` : "Free"}
                  </span>
                  <span className="rounded-full border border-border bg-card/70 px-2.5 py-0.5 text-[11px] font-medium capitalize">
                    {course.access_level} tier
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => navigate(`/course-player/${id}`)}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview
                </Button>
                <Button
                  size="sm"
                  disabled={publishing}
                  onClick={togglePublish}
                  className={cn(
                    course.is_published
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      : "bg-accent text-accent-foreground hover:bg-accent/90",
                  )}
                >
                  {publishing ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : course.is_published ? (
                    <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <Rocket className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {course.is_published ? "Unpublish" : "Publish"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9" aria-label="More course actions">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => navigate(`/course-player/${id}`)}>
                      <Eye className="mr-2 h-3.5 w-3.5" /> Preview landing page
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/course-player/${id}/watch`)}>
                      <BookOpen className="mr-2 h-3.5 w-3.5" /> Open the player
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={copyLink}>
                      <Link2 className="mr-2 h-3.5 w-3.5" /> Copy share link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveTab("information")}>
                      <Copy className="mr-2 h-3.5 w-3.5" /> Edit cover &amp; details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Headline numbers */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {headline.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border bg-card/70 px-3 py-2 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    <stat.icon className="h-3 w-3" /> {stat.label}
                  </div>
                  <p className="mt-0.5 text-lg font-bold tabular-nums leading-tight">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile section switcher — the rail is hidden below lg, so the same
              destinations ride along as a scrollable strip. */}
          <div className="flex gap-1.5 overflow-x-auto border-t border-border px-4 py-2 lg:hidden">
            {NAV_GROUPS.flatMap((g) => g.items).map((item) => {
              const active = activeTab === item.key;
              const count = item.count ? counts[item.count] : 0;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                  {count > 0 && <span className="tabular-nums opacity-80">{count > 99 ? "99+" : count}</span>}
                </button>
              );
            })}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            {activeItem && (
              <p className="mb-5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{activeItem.label}</span> · {activeItem.hint}
              </p>
            )}
            {renderTab()}
          </div>
        </main>
      </div>

      <DeleteCourseDialog
        course={deleting ? course : null}
        onOpenChange={setDeleting}
        // Nothing left to edit once it is gone, so the editor hands back to
        // the list rather than sitting on a 404.
        onDeleted={() => navigate("/course-manage")}
      />
    </div>
  );
}
