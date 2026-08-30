/**
 * /course-manage — the picker that sits in front of /course-manage/:id.
 *
 * Managing a course used to be reachable only from a dropdown buried on a
 * course card, so typing the bare /course-manage URL landed on the 404 page
 * and there was no single place answering "which of my courses needs work?".
 * This page is that place: every course a coach owns, the state it is in, and
 * a direct jump into any section of its editor.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  BarChart3,
  BookOpen,
  Clock,
  Eye,
  Image as ImageIcon,
  Info,
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Users,
} from "lucide-react";

interface ManagedCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  cover_image_url: string | null;
  category: string | null;
  price: number;
  access_level: string;
  is_published: boolean;
  updated_at: string;
  coach_id: string;
}

interface CourseStats {
  sections: number;
  chapters: number;
  minutes: number;
  students: number;
}

type StatusFilter = "all" | "published" | "draft";

const EMPTY_STATS: CourseStats = { sections: 0, chapters: 0, minutes: 0, students: 0 };

function formatUpdated(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "never";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function CourseManageIndex() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [courses, setCourses] = useState<ManagedCourse[]>([]);
  const [stats, setStats] = useState<Record<string, CourseStats>>({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);

  const isCoachOrAdmin = hasRole("coach") || hasRole("admin") || hasRole("super_admin");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("courses")
      .select(
        "id, title, description, thumbnail_url, cover_image_url, category, price, access_level, is_published, updated_at, coach_id",
      )
      .order("updated_at", { ascending: false });

    const list = (data || []) as ManagedCourse[];
    setCourses(list);
    setLoading(false);
    if (list.length > 0) void loadStats(list.map((c) => c.id));
  }, []);

  useEffect(() => {
    void load();
  }, [load, user]);

  const loadStats = async (courseIds: string[]) => {
    const [{ data: sections }, { data: enrollments }] = await Promise.all([
      supabase.from("sections").select("id, course_id, chapters(id, duration_seconds)").in("course_id", courseIds),
      supabase.from("enrollments").select("course_id, user_id").in("course_id", courseIds),
    ]);

    const next: Record<string, CourseStats> = {};
    const seatsSeen: Record<string, Set<string>> = {};

    (sections || []).forEach((s) => {
      const row = (next[s.course_id] ||= { ...EMPTY_STATS });
      row.sections += 1;
      (s.chapters || []).forEach((ch) => {
        row.chapters += 1;
        row.minutes += Math.round((ch.duration_seconds || 0) / 60);
      });
    });

    (enrollments || []).forEach((e) => {
      const row = (next[e.course_id] ||= { ...EMPTY_STATS });
      // A learner can hold more than one enrolment row; the number a coach
      // expects next to "students" is distinct people, not rows.
      const seen = (seatsSeen[e.course_id] ||= new Set<string>());
      if (!seen.has(e.user_id)) {
        seen.add(e.user_id);
        row.students += 1;
      }
    });

    setStats(next);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (status === "published" && !c.is_published) return false;
      if (status === "draft" && c.is_published) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q) ||
        (c.category || "").toLowerCase().includes(q)
      );
    });
  }, [courses, search, status]);

  const publishedCount = courses.filter((c) => c.is_published).length;

  if (!isCoachOrAdmin) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="text-xl font-bold">Course manage</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Only coaches and admins can edit courses. Head to the catalogue to keep learning.
          </p>
          <Button className="mt-6 rounded-xl" onClick={() => navigate("/courses")}>
            Browse courses
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Creator studio
              </p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Manage courses</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {courses.length} {courses.length === 1 ? "course" : "courses"} · {publishedCount} live ·{" "}
                {courses.length - publishedCount} in draft
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => navigate("/ai-course-generator")}>
                <Sparkles className="mr-2 h-4 w-4 text-indigo-500" /> Create with AI
              </Button>
              <Button className="rounded-xl" onClick={() => navigate("/course-builder")}>
                <Plus className="mr-2 h-4 w-4" /> New course
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your courses..."
                className="h-11 rounded-xl bg-background pl-11"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "published", "draft"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setStatus(key)}
                  className={cn(
                    "h-11 rounded-xl border px-4 text-xs font-semibold capitalize transition-colors",
                    status === key
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background py-20 text-center">
              <Layers className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-4 text-sm font-medium">
                {courses.length === 0 ? "You haven't built a course yet" : "No courses match this filter"}
              </p>
              {courses.length === 0 && (
                <Button className="mt-5 rounded-xl" onClick={() => navigate("/course-builder")}>
                  <Plus className="mr-2 h-4 w-4" /> Create your first course
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((course) => {
                const s = stats[course.id] || EMPTY_STATS;
                const art = course.thumbnail_url || course.cover_image_url;
                return (
                  <div
                    key={course.id}
                    onClick={() => navigate(`/course-manage/${course.id}`)}
                    className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg"
                  >
                    <div className="relative aspect-video overflow-hidden bg-secondary">
                      {art ? (
                        <img
                          src={art}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                          <ImageIcon className="h-7 w-7 opacity-40" />
                          <span className="text-[11px]">No cover yet</span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                        <Badge
                          className={cn(
                            "border-0 text-[10px] font-bold uppercase tracking-wider",
                            course.is_published ? "bg-emerald-500 text-white" : "bg-amber-500 text-white",
                          )}
                        >
                          {course.is_published ? "Live" : "Draft"}
                        </Badge>
                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label="Course actions"
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel className="text-xs">Jump to</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => navigate(`/course-manage/${course.id}?tab=curriculum`)}>
                                <BookOpen className="mr-2 h-3.5 w-3.5" /> Curriculum
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/course-manage/${course.id}?tab=information`)}>
                                <Info className="mr-2 h-3.5 w-3.5" /> Information &amp; cover
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/course-manage/${course.id}?tab=reports`)}>
                                <BarChart3 className="mr-2 h-3.5 w-3.5" /> Reports
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => navigate(`/course-player/${course.id}`)}>
                                <Eye className="mr-2 h-3.5 w-3.5" /> Preview landing page
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div>
                        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug">{course.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {course.category || "Uncategorised"} · {course.price > 0 ? `₹${course.price}` : "Free"} ·
                          edited {formatUpdated(course.updated_at)}
                        </p>
                      </div>

                      <div className="grid grid-cols-4 gap-1 rounded-xl bg-secondary/50 p-2 text-center">
                        {[
                          { icon: Layers, value: s.sections, label: "sections" },
                          { icon: BookOpen, value: s.chapters, label: "lessons" },
                          { icon: Clock, value: s.minutes ? `${s.minutes}m` : "—", label: "runtime" },
                          { icon: Users, value: s.students, label: "students" },
                        ].map((stat) => (
                          <div key={stat.label} className="min-w-0">
                            <stat.icon className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
                            <p className="mt-1 truncate text-sm font-bold tabular-nums">{stat.value}</p>
                            <p className="truncate text-[10px] text-muted-foreground">{stat.label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-auto flex gap-2 pt-1">
                        <Button
                          className="h-9 flex-1 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/course-manage/${course.id}`);
                          }}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Manage
                        </Button>
                        <Button
                          variant="outline"
                          className="h-9 rounded-lg"
                          aria-label="Preview course"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/course-player/${course.id}`);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
