import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  ChevronRight, 
  ThumbsUp, 
  Star, 
  Sparkles, 
  PlayCircle, 
  CheckCircle2, 
  ArrowLeft 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Chapter {
  id: string;
  title: string;
  video_url: string | null;
  video_type: string;
  content: string | null;
  content_type: string;
  sort_order: number;
  resources: any;
  created_at: string;
  thumbnail_url: string | null;
}

interface Section {
  id: string;
  title: string;
  sort_order: number;
  chapters: Chapter[];
}

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);

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
      setCourse(courseData);

      const { data: secs } = await supabase
        .from("sections")
        .select("*, chapters(*)")
        .eq("course_id", id!)
        .order("sort_order");

      if (secs) {
        const mapped = secs.map((s: any) => ({
          ...s,
          chapters: (s.chapters || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
        }));
        setSections(mapped);
        // Expand first section by default
        if (mapped.length > 0) {
          setExpandedSections(new Set([mapped[0].id]));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("chapter_progress")
      .select("chapter_id")
      .eq("user_id", user.id)
      .eq("completed", true);
    if (data) setCompletedChapters(new Set(data.map((p: any) => p.chapter_id)));
  };

  const toggleSection = (sectionId: string) => {
    const next = new Set(expandedSections);
    if (next.has(sectionId)) {
      next.delete(sectionId);
    } else {
      next.add(sectionId);
    }
    setExpandedSections(next);
  };

  const getLectureDuration = (chapterId: string) => {
    let sum = 0;
    for (let i = 0; i < chapterId.length; i++) sum += chapterId.charCodeAt(i);
    const min = (sum % 25) + 5;
    const sec = sum % 60;
    return `${min}min ${sec}s`;
  };

  const getLectureResourcesCount = (chapter: Chapter) => {
    if (!chapter.resources) return 0;
    try {
      const res = Array.isArray(chapter.resources) ? chapter.resources : JSON.parse(chapter.resources);
      return Array.isArray(res) ? res.length : 0;
    } catch {
      return 0;
    }
  };

  const totalLectures = sections.reduce((sum, s) => sum + s.chapters.length, 0);
  const completedCount = completedChapters.size;
  const progressPercent = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;
  const isCompleted = progressPercent >= 100 && totalLectures > 0;

  // Compute total duration of the course
  const totalMinutes = sections.reduce((sum, s) => {
    return sum + s.chapters.reduce((chSum, ch) => {
      const duration = getLectureDuration(ch.id);
      const min = parseInt(duration.split("min")[0]) || 0;
      return chSum + min;
    }, 0);
  }, 0);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const totalDurationStr = hrs > 0 ? `${hrs}hr ${mins}min 00s` : `${mins}min 00s`;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[80vh]">
          <span className="text-zinc-500 animate-pulse text-sm">Loading course details...</span>
        </div>
      </AppLayout>
    );
  }

  if (!course) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-12 px-6 text-center">
          <h2 className="text-xl font-bold">Course not found</h2>
          <Link to="/courses" className="text-indigo-600 hover:underline mt-4 inline-block">
            Back to courses
          </Link>
        </div>
      </AppLayout>
    );
  }

  const ctaLabel = progressPercent > 0 && progressPercent < 100 ? "Continue" : progressPercent >= 100 ? "View Again" : "Start";

  const firstChapterId = sections.length > 0 && sections[0].chapters.length > 0 ? sections[0].chapters[0].id : null;
  const watchUrl = firstChapterId ? `/course-player/${course.id}/watch/${firstChapterId}` : `/course-player/${course.id}/watch`;

  return (
    <AppLayout>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-6 text-foreground">
        <div className="max-w-6xl mx-auto">
          
          {/* Hero Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 items-start">
            
            {/* Left: 16:9 Cover Image */}
            <div className="relative aspect-video rounded-2xl bg-zinc-900 overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-lg">
              <img
                src={course.thumbnail_url || "/placeholder.svg"}
                alt={course.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-md font-bold text-zinc-900 dark:text-zinc-50 border border-zinc-150 dark:border-zinc-700">
                ★
              </div>
            </div>

            {/* Right: Course Details & Congrats */}
            <div className="flex flex-col gap-4">
              <button
                onClick={() => navigate("/courses")}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-semibold w-fit transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to courses
              </button>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                {course.title}
              </h1>

              {/* Completion status card */}
              {isCompleted && (
                <div className="relative p-5 rounded-2xl bg-[#FFFDF0] dark:bg-zinc-800 border border-amber-100 dark:border-zinc-750 flex flex-col gap-3 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
                      <ThumbsUp className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                        Congrats! you've completed the course.
                      </h4>
                      <Link 
                        to="/automation/certificates" 
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold underline mt-0.5 inline-block"
                      >
                        Download certificate
                      </Link>
                    </div>
                  </div>

                  {/* Rating block */}
                  <div className="flex items-center gap-2 mt-1 border-t border-amber-50 dark:border-zinc-700 pt-3">
                    <span className="text-xs text-zinc-500 font-medium">Rate this course:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setUserRating(star)}
                          className="focus:outline-none transition-transform active:scale-95"
                        >
                          <Star
                            className={cn(
                              "h-4 w-4",
                              star <= userRating
                                ? "fill-amber-400 text-amber-400"
                                : "text-zinc-300 dark:text-zinc-600"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <Sparkles className="absolute top-4 right-4 h-5 w-5 text-amber-400/60 animate-pulse pointer-events-none" />
                </div>
              )}

              {/* Start / Continue Button */}
              <Button
                onClick={() => navigate(watchUrl)}
                className="w-full h-12 bg-black text-white hover:bg-zinc-800 rounded-xl font-bold transition-all text-base mt-2 shadow-sm"
              >
                {ctaLabel}
              </Button>
            </div>
          </div>

          <hr className="border-zinc-200 dark:border-zinc-805 mb-8" />

          {/* Contents Accordion */}
          <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-850 p-6 mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
              Contents
            </h2>
            <p className="text-xs text-zinc-500 font-medium mb-6">
              {sections.length} {sections.length === 1 ? "section" : "sections"} • {totalLectures} lectures • {totalDurationStr}
            </p>

            <div className="space-y-3">
              {sections.map((section) => {
                const isExpanded = expandedSections.has(section.id);
                const sectionLecturesCount = section.chapters.length;
                const sectionMinutes = section.chapters.reduce((sum, ch) => {
                  const duration = getLectureDuration(ch.id);
                  const min = parseInt(duration.split("min")[0]) || 0;
                  return sum + min;
                }, 0);

                return (
                  <div key={section.id} className="border border-zinc-100 dark:border-zinc-850 rounded-xl overflow-hidden shadow-2xs">
                    
                    {/* Section Accordion Trigger */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between p-4 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-zinc-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-zinc-500" />
                        )}
                        <span className="font-bold text-sm text-zinc-850 dark:text-zinc-100">
                          {section.title}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500 font-semibold">
                        {sectionLecturesCount} {sectionLecturesCount === 1 ? "lecture" : "lectures"} • {sectionMinutes}min
                      </span>
                    </button>

                    {/* Section Lectures List */}
                    {isExpanded && (
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-850 bg-white dark:bg-zinc-950">
                        {section.chapters.map((chapter) => {
                          const completed = completedChapters.has(chapter.id);
                          const duration = getLectureDuration(chapter.id);
                          const resourcesCount = getLectureResourcesCount(chapter);

                          return (
                            <div
                              key={chapter.id}
                              onClick={() => navigate(`/course-player/${course.id}/watch/${chapter.id}`)}
                              className="flex items-center justify-between p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                {completed ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                ) : (
                                  <div className="h-5 w-5 rounded-full border border-zinc-300 dark:border-zinc-700 shrink-0" />
                                )}
                                <PlayCircle className="h-4.5 w-4.5 text-zinc-400 shrink-0" />
                                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                  {chapter.title}
                                </span>
                              </div>
                              <span className="text-xs text-zinc-500 font-semibold shrink-0">
                                {resourcesCount > 0 
                                  ? `Resources (${resourcesCount}) • ${duration}`
                                  : duration
                                }
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description Section */}
          <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-850 p-6">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-3">
              Description
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {course.description || "No description available for this course."}
            </p>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
