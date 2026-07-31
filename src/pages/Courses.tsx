import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { CourseCard } from "@/components/courses/CourseCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Sparkles, GripVertical, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CourseReorderPanel } from "@/components/courses/CourseReorderPanel";

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  category: string | null;
  access_level: string;
  display_order: number;
  coach_id: string;
}

interface ChapterProgress {
  chapter_id: string;
  completed: boolean;
  course_id?: string;
}

const ACCESS_LEVELS = ["free", "silver", "gold", "diamond"] as const;
const LEVEL_HIERARCHY: Record<string, number> = { free: 0, silver: 1, gold: 2, diamond: 3 };

const BADGE_STYLES: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  silver: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
  gold: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  diamond: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200",
};

type ProgressFilter = "all" | "in-progress" | "completed" | "not-started";

export default function Courses() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("all");
  const [reorderOpen, setReorderOpen] = useState(false);
  const [studentLevel, setStudentLevel] = useState("free");
  const [courseProgress, setCourseProgress] = useState<Record<string, { total: number; completed: number }>>({});

  const isCoachOrAdmin = hasRole("coach") || hasRole("admin");

  useEffect(() => {
    fetchCourses();
    if (user && !isCoachOrAdmin) fetchStudentLevel();
  }, [user]);

  useEffect(() => {
    if (user && courses.length > 0) fetchProgress();
  }, [user, courses]);

  const fetchCourses = async () => {
    const { data } = await supabase
      .from("courses")
      .select("id, title, description, thumbnail_url, price, category, access_level, display_order, coach_id")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (data) setCourses(data as Course[]);
    setLoading(false);
  };

  const fetchStudentLevel = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("service_level").eq("id", user.id).single();
    if (data?.service_level) setStudentLevel(data.service_level);
  };

  const fetchProgress = async () => {
    if (!user) return;
    // Get all chapters grouped by course
    const courseIds = courses.map((c) => c.id);
    const { data: sections } = await supabase
      .from("sections")
      .select("id, course_id, chapters(id)")
      .in("course_id", courseIds);

    if (!sections) return;

    const chapterToCourse: Record<string, string> = {};
    const courseTotals: Record<string, number> = {};
    sections.forEach((s: any) => {
      const cid = s.course_id;
      (s.chapters || []).forEach((ch: any) => {
        chapterToCourse[ch.id] = cid;
        courseTotals[cid] = (courseTotals[cid] || 0) + 1;
      });
    });

    const { data: progress } = await supabase
      .from("chapter_progress")
      .select("chapter_id, completed")
      .eq("user_id", user.id)
      .eq("completed", true);

    const courseCompleted: Record<string, number> = {};
    (progress || []).forEach((p: any) => {
      const cid = chapterToCourse[p.chapter_id];
      if (cid) courseCompleted[cid] = (courseCompleted[cid] || 0) + 1;
    });

    const result: Record<string, { total: number; completed: number }> = {};
    courseIds.forEach((cid) => {
      result[cid] = { total: courseTotals[cid] || 0, completed: courseCompleted[cid] || 0 };
    });
    setCourseProgress(result);
  };

  const canAccess = (level: string) => {
    if (isCoachOrAdmin) return true;
    return LEVEL_HIERARCHY[level] <= LEVEL_HIERARCHY[studentLevel];
  };

  const getProgressPercent = (courseId: string) => {
    const p = courseProgress[courseId];
    if (!p || p.total === 0) return 0;
    return Math.round((p.completed / p.total) * 100);
  };

  const filtered = courses.filter((c) => {
    // Search
    const q = search.toLowerCase();
    if (q && !c.title.toLowerCase().includes(q) && !(c.category || "").toLowerCase().includes(q)) return false;
    // Service level filter
    if (serviceFilter !== "all" && c.access_level !== serviceFilter) return false;
    // Progress filter
    if (progressFilter !== "all") {
      const pct = getProgressPercent(c.id);
      if (progressFilter === "completed" && pct < 100) return false;
      if (progressFilter === "in-progress" && (pct === 0 || pct >= 100)) return false;
      if (progressFilter === "not-started" && pct > 0) return false;
    }
    return true;
  });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Courses</h1>
          {isCoachOrAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setReorderOpen(true)}>
                <GripVertical className="h-4 w-4 mr-1" /> Reorder Courses
              </Button>
              <Button variant="outline" onClick={() => navigate("/ai-course-generator")}>
                <Sparkles className="h-4 w-4 mr-1" /> Create with AI
              </Button>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate("/course-builder")}>
                <Plus className="h-4 w-4 mr-1" /> Create Course
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Progress filter tabs */}
            <div className="flex gap-1 rounded-lg border border-border p-1">
              {([
                { value: "all", label: "All" },
                { value: "in-progress", label: "In Progress" },
                { value: "completed", label: "Completed" },
                { value: "not-started", label: "Not Started" },
              ] as const).map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setProgressFilter(tab.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    progressFilter === tab.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Service level filter */}
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Service Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="diamond">Diamond</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Course Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading courses...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {courses.length === 0 ? "No courses yet" : "No courses match your filters"}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((course) => {
              const locked = !canAccess(course.access_level);
              const progress = getProgressPercent(course.id);
              return (
                <div key={course.id} className="relative">
                  <CourseCard
                    id={course.id}
                    title={course.title}
                    description={course.description || ""}
                    thumbnail={course.thumbnail_url || "/placeholder.svg"}
                    price={course.price}
                    category={course.category || "General"}
                    accessLevel={course.access_level}
                    progress={progress}
                    locked={locked}
                    onClick={() => {
                      if (locked) return;
                      navigate(`/course-player/${course.id}`);
                    }}
                  />
                  {isCoachOrAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 text-xs"
                      onClick={(e) => { e.stopPropagation(); navigate(`/course-manage/${course.id}`); }}
                    >
                      Manage
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reorder Panel */}
      {isCoachOrAdmin && (
        <CourseReorderPanel
          open={reorderOpen}
          onOpenChange={setReorderOpen}
          courses={courses}
          onReordered={fetchCourses}
        />
      )}
    </AppLayout>
  );
}
