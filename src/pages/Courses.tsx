import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { CourseCard } from "@/components/courses/CourseCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Sparkles, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CourseReorderPanel } from "@/components/courses/CourseReorderPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const LEVEL_HIERARCHY: Record<string, number> = { free: 0, silver: 1, gold: 2, diamond: 3 };

export default function Courses() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [studentLevel, setStudentLevel] = useState("free");

  // Filters State
  const [courseTypeFilter, setCourseTypeFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState<"all" | "in-progress" | "completed" | "expired">("all");
  const [paidFilter, setPaidFilter] = useState<"all" | "paid" | "free">("all");
  const [membershipFilter, setMembershipFilter] = useState("all");
  const [durationFilter, setDurationFilter] = useState("all");

  // Analytics/Totals state for cards
  const [courseProgress, setCourseProgress] = useState<Record<string, { total: number; completed: number }>>({});
  const [courseLecturesCount, setCourseLecturesCount] = useState<Record<string, number>>({});
  const [courseSectionsCount, setCourseSectionsCount] = useState<Record<string, number>>({});
  const [coachNames, setCoachNames] = useState<Record<string, string>>({});

  const isCoachOrAdmin = hasRole("coach") || hasRole("admin") || hasRole("super_admin");

  useEffect(() => {
    fetchCourses();
    if (user && !isCoachOrAdmin) fetchStudentLevel();
  }, [user]);

  useEffect(() => {
    if (user && courses.length > 0) fetchProgressAndTotals();
  }, [user, courses]);

  const fetchCourses = async () => {
    const { data } = await supabase
      .from("courses")
      .select("id, title, description, thumbnail_url, price, category, access_level, display_order, coach_id")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (data) {
      setCourses(data as Course[]);
      const coachIds = [...new Set(data.map((c) => c.coach_id).filter(Boolean))];
      if (coachIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", coachIds);
        if (profiles) {
          const names: Record<string, string> = {};
          profiles.forEach((p) => {
            names[p.id] = p.full_name || "Instructor";
          });
          setCoachNames(names);
        }
      }
    }
    setLoading(false);
  };

  const fetchStudentLevel = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("service_level").eq("id", user.id).single();
    if (data?.service_level) setStudentLevel(data.service_level);
  };

  const fetchProgressAndTotals = async () => {
    if (!user) return;
    const courseIds = courses.map((c) => c.id);
    const { data: sections } = await supabase
      .from("sections")
      .select("id, course_id, chapters(id)")
      .in("course_id", courseIds);

    if (!sections) return;

    const chapterToCourse: Record<string, string> = {};
    const courseTotals: Record<string, number> = {};
    const courseSections: Record<string, number> = {};

    sections.forEach((s: any) => {
      const cid = s.course_id;
      courseSections[cid] = (courseSections[cid] || 0) + 1;
      (s.chapters || []).forEach((ch: any) => {
        chapterToCourse[ch.id] = cid;
        courseTotals[cid] = (courseTotals[cid] || 0) + 1;
      });
    });

    setCourseSectionsCount(courseSections);
    setCourseLecturesCount(courseTotals);

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
    if (q && !c.title.toLowerCase().includes(q) && !(c.description || "").toLowerCase().includes(q)) return false;

    // Course type dropdown
    if (courseTypeFilter === "free" && c.price > 0) return false;
    if (courseTypeFilter === "paid" && c.price === 0) return false;

    // Paid filter chip
    if (paidFilter === "paid" && c.price === 0) return false;

    // Membership dropdown chip
    if (membershipFilter !== "all" && c.access_level !== membershipFilter) return false;

    // Progress filter chips
    const pct = getProgressPercent(c.id);
    if (progressFilter === "completed" && pct < 100) return false;
    if (progressFilter === "in-progress" && (pct === 0 || pct >= 100)) return false;
    if (progressFilter === "expired") return false; // Expired always empty/locked in default setup

    // Duration filter chip (using chapter/lecture count as proxy: short < 5, medium 5-10, long > 10)
    const lecturesCount = courseLecturesCount[c.id] || 0;
    if (durationFilter === "short" && lecturesCount >= 5) return false;
    if (durationFilter === "medium" && (lecturesCount < 5 || lecturesCount > 10)) return false;
    if (durationFilter === "long" && lecturesCount <= 10) return false;

    return true;
  });

  return (
    <AppLayout>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Courses
            </h1>
            {isCoachOrAdmin && (
              <div className="flex gap-3">
                <Button variant="outline" className="rounded-xl" onClick={() => setReorderOpen(true)}>
                  <GripVertical className="h-4 w-4 mr-2" /> Reorder
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => navigate("/ai-course-generator")}>
                  <Sparkles className="h-4 w-4 mr-2 text-indigo-500" /> Create with AI
                </Button>
                <Button className="bg-zinc-955 text-white hover:bg-zinc-800 rounded-xl" onClick={() => navigate("/course-builder")}>
                  <Plus className="h-4 w-4 mr-2" /> Create Course
                </Button>
              </div>
            )}
          </div>

          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
              <input
                type="text"
                placeholder="search by course title or description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-300"
              />
            </div>
            <Select value={courseTypeFilter} onValueChange={setCourseTypeFilter}>
              <SelectTrigger className="w-full sm:w-[220px] h-12 rounded-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                <SelectValue placeholder="Course Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="free">Free Courses</SelectItem>
                <SelectItem value="paid">Paid Courses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            {[
              { id: "all", label: "All" },
              { id: "in-progress", label: "In Progress" },
              { id: "completed", label: "Completed" },
              { id: "expired", label: "Expired" },
              { id: "paid", label: "Paid" },
            ].map((chip) => {
              const isActive =
                chip.id === "all"
                  ? (progressFilter === "all" && paidFilter === "all")
                  : chip.id === "paid"
                  ? paidFilter === "paid"
                  : progressFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => {
                    if (chip.id === "all") {
                      setProgressFilter("all");
                      setPaidFilter("all");
                    } else if (chip.id === "paid") {
                      setPaidFilter("paid");
                      setProgressFilter("all");
                    } else {
                      setProgressFilter(chip.id as any);
                      setPaidFilter("all");
                    }
                  }}
                  className={cn(
                    "h-9 px-4 rounded-full text-xs font-semibold border transition-all",
                    isActive
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900",
                  )}
                >
                  {chip.label}
                </button>
              );
            })}

            {/* Membership Dropdown Chip */}
            <Select value={membershipFilter} onValueChange={setMembershipFilter}>
              <SelectTrigger className="h-9 w-auto px-4 rounded-full border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 gap-1.5 focus:ring-0 focus:ring-offset-0 bg-white dark:bg-zinc-950">
                <span>Membership: <span className="capitalize text-zinc-900 dark:text-zinc-100">{membershipFilter === "all" ? "All" : membershipFilter}</span></span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Memberships</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="diamond">Diamond</SelectItem>
              </SelectContent>
            </Select>

            {/* Duration Dropdown Chip */}
            <Select value={durationFilter} onValueChange={setDurationFilter}>
              <SelectTrigger className="h-9 w-auto px-4 rounded-full border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 gap-1.5 focus:ring-0 focus:ring-offset-0 bg-white dark:bg-zinc-950">
                <span>Duration: <span className="capitalize text-zinc-900 dark:text-zinc-100">
                  {durationFilter === "all" ? "All" : durationFilter === "short" ? "< 2 hrs" : durationFilter === "medium" ? "2-5 hrs" : "> 5 hrs"}
                </span></span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Durations</SelectItem>
                <SelectItem value="short">&lt; 2 hours</SelectItem>
                <SelectItem value="medium">2 - 5 hours</SelectItem>
                <SelectItem value="long">&gt; 5 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex justify-center py-20">
              <span className="text-zinc-500 text-sm animate-pulse">Loading courses...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-850">
              <p className="text-base font-medium">No courses found matching your criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((course) => {
                const locked = !canAccess(course.access_level);
                const progress = getProgressPercent(course.id);
                const sCount = courseSectionsCount[course.id] || 0;
                const lCount = courseLecturesCount[course.id] || 0;

                return (
                  <CourseCard
                    key={course.id}
                    id={course.id}
                    title={course.title}
                    description={course.description || ""}
                    thumbnail={course.thumbnail_url || ""}
                    price={course.price}
                    category={course.category || "General"}
                    accessLevel={course.access_level}
                    progress={progress}
                    locked={locked}
                    instructorName={coachNames[course.coach_id] || "Instructor"}
                    sectionCount={sCount}
                    lectureCount={lCount}
                    onClick={() => {
                      if (locked) return;
                      navigate(`/course-player/${course.id}`);
                    }}
                    onContinue={() => {
                      if (locked) return;
                      navigate(`/course-player/${course.id}`);
                    }}
                    onManage={isCoachOrAdmin ? () => navigate(`/course-manage/${course.id}`) : undefined}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CourseReorderPanel
        open={reorderOpen}
        onOpenChange={setReorderOpen}
        courses={courses}
        onReordered={fetchCourses}
      />
    </AppLayout>
  );
}
