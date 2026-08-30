import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { appLink, notify } from "@/lib/notify";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Video,
  Download,
  FileText,
  CheckCircle2,
  Share2,
  ChevronDown,
  Sun,
  Moon,
  List,
  Lock,
  Play,
  Volume2,
  X
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { BrandMark } from "@/components/BrandMark";
import { useSeo } from "@/hooks/useSeo";
import { courseMeta } from "@/lib/seo";
import { computeDripLocks, lockedChapterIds } from "@/lib/drip";

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
  video_description: string | null;
  duration_seconds: number | null;
}

/** "8:05" for a queue row. Null when the chapter has no measured length. */
function formatLectureDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

interface Section {
  id: string;
  title: string;
  sort_order: number;
  chapters: Chapter[];
  drip_delay_days?: number | null;
  drip_date?: string | null;
}

export default function CoursePlayer() {
  const { id, chapterId } = useParams();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [enrolledAt, setEnrolledAt] = useState<string | null>(null);

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem(`sidebar-collapsed-${id}`) === "true";
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // The watch URL is a share route too — the edge Worker treats /watch and
  // /watch/:chapterId as the same course — so the tab title has to agree.
  useSeo(course ? courseMeta(course, window.location.origin) : null);

  // Player theme: light by default, user can opt into dark
  const [playerDark, setPlayerDark] = useState(() => {
    return localStorage.getItem("course-player-theme") === "dark";
  });

  useEffect(() => {
    localStorage.setItem("course-player-theme", playerDark ? "dark" : "light");
  }, [playerDark]);

  // Playback state now lives in <VideoPlayer />.

  // Tabs state
  const [activeTab, setActiveTab] = useState<"description" | "resources" | "qna">("description");

  // Comments state
  const [comments, setComments] = useState<ChapterComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [visibleCommentCount, setVisibleCommentCount] = useState(5);
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);

  interface ChapterComment {
    id: string;
    chapter_id: string;
    user_id: string;
    content: string;
    parent_id: string | null;
    created_at: string;
    author_name: string;
    author_avatar: string | null;
  }

  // Which sections the course's drip schedule leaves open for this person.
  // Declared above the effects because chapter selection has to respect it:
  // deep-linking to a lesson that has not opened yet must not play it.
  const canBypassDrip = hasRole("coach") || hasRole("admin") || hasRole("super_admin");
  const dripLocks = useMemo(
    () =>
      computeDripLocks({
        dripType: course?.drip_type,
        sections,
        enrolledAt,
        completedChapterIds: completedChapters,
        bypass: canBypassDrip,
      }),
    [course?.drip_type, sections, enrolledAt, completedChapters, canBypassDrip],
  );
  const lockedChapters = useMemo(() => lockedChapterIds(sections, dripLocks), [sections, dripLocks]);

  useEffect(() => {
    localStorage.setItem(`sidebar-collapsed-${id}`, String(isSidebarCollapsed));
  }, [isSidebarCollapsed, id]);

  useEffect(() => {
    loadCourseData();
    loadProgress();
    loadProfile();
  }, [id]);

  useEffect(() => {
    if (selectedChapter) {
      loadComments(selectedChapter.id);
      setVisibleCommentCount(5);
      setReplyingTo(null);
    }
  }, [selectedChapter?.id]);

  useEffect(() => {
    if (sections.length > 0) {
      const open = sections.flatMap((s) => s.chapters).filter((c) => !lockedChapters.has(c.id));
      let targetChapter: Chapter | null = null;
      if (chapterId) {
        // A link to a dripped lesson falls through to the first open one
        // rather than loading a player the learner may not watch yet.
        targetChapter = open.find((c) => c.id === chapterId) || null;
      }
      if (!targetChapter && open.length > 0) {
        targetChapter = open[0];
      }
      if (targetChapter) {
        setSelectedChapter(targetChapter);
        // Expand the section containing the active chapter
        const parentSec = sections.find((s) => s.chapters.some((c) => c.id === targetChapter!.id));
        if (parentSec) {
          setExpandedSections((prev) => new Set([...prev, parentSec.id]));
        }
      }
    }
  }, [sections, chapterId, lockedChapters]);

  const loadCourseData = async () => {
    try {
      const { data: courseData } = await supabase.from("courses").select("*").eq("id", id!).single();
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
      // The clock a "days after enrolling" drip schedule counts from.
      supabase
        .from("enrollments")
        .select("enrolled_at")
        .eq("course_id", id!)
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
    if (data) setCompletedChapters(new Set(data.map((p: any) => p.chapter_id)));
    setEnrolledAt(enrolment?.enrolled_at ?? null);
  };

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single();
    if (data) setProfile(data as any);
  };

  const loadComments = async (chId: string) => {
    setCommentsLoading(true);
    try {
      const { data: rows, error } = await (supabase as any)
        .from("chapter_comments")
        .select("*")
        .eq("chapter_id", chId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds: string[] = Array.from(new Set((rows || []).map((r: any) => String(r.user_id))));
      const authorMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);
        (profiles || []).forEach((p: any) => {
          authorMap[p.id] = { full_name: p.full_name || "Member", avatar_url: p.avatar_url };
        });
      }

      setComments(
        (rows || []).map((r: any) => ({
          ...r,
          author_name: authorMap[r.user_id]?.full_name || "Member",
          author_avatar: authorMap[r.user_id]?.avatar_url || null,
        })),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const postComment = async (content: string, parentId: string | null = null) => {
    if (!user || !selectedChapter || !content.trim()) return;
    setPostingComment(true);
    try {
      const { error } = await (supabase as any).from("chapter_comments").insert({
        chapter_id: selectedChapter.id,
        user_id: user.id,
        content: content.trim(),
        parent_id: parentId,
      });
      if (error) throw error;
      setNewComment("");
      setReplyText("");
      setReplyingTo(null);
      loadComments(selectedChapter.id);
    } catch (err: any) {
      toast({ title: "Couldn't post comment", description: err.message, variant: "destructive" });
    } finally {
      setPostingComment(false);
    }
  };

  const formatRelativeTime = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    const months = Math.floor(days / 30);
    return `${months}mo`;
  };

  const copyResourceLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Resource link copied to clipboard" });
    } catch {
      toast({ title: "Couldn't copy link", variant: "destructive" });
    }
  };

  const shareChapter = async (chapter: Chapter) => {
    const url = `${window.location.origin}/course-player/${id}/watch/${chapter.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Lecture link copied to clipboard" });
    } catch {
      toast({ title: "Couldn't copy link", variant: "destructive" });
    }
  };

  const toggleComplete = async (chId: string) => {
    if (!user) return;
    const isCompleted = completedChapters.has(chId);
    const nextCompleted = new Set(completedChapters);

    if (isCompleted) {
      nextCompleted.delete(chId);
      await supabase.from("chapter_progress").delete().eq("user_id", user.id).eq("chapter_id", chId);
      toast({ title: "Lesson marked as incomplete" });
    } else {
      nextCompleted.add(chId);
      await supabase.from("chapter_progress").upsert({
        user_id: user.id,
        chapter_id: chId,
        completed: true,
        progress_percent: 100
      });
      toast({ title: "Lesson marked as complete!" });
      void announceProgress(nextCompleted);
    }
    setCompletedChapters(nextCompleted);
  };

  /**
   * Emails the learner when finishing a lesson means something.
   *
   * Only at a quarter, a half, three quarters and the end: an email after
   * every lesson is noise, and noise is how someone learns to ignore the one
   * that says they finished.
   */
  const announceProgress = async (completed: Set<string>) => {
    const chapters = sections.flatMap((section) => section.chapters);
    if (!chapters.length || !course) return;

    const done = chapters.filter((chapter) => completed.has(chapter.id)).length;
    const percent = Math.round((done / chapters.length) * 100);
    const resumeLink = appLink(`/course-player/${id}`);

    if (done === chapters.length) {
      void notify({
        event: "course.completed",
        coachId: course.coach_id ?? null,
        variables: {
          course_name: course.title ?? "your course",
          lessons_completed: String(done),
          // Minutes actually watched are not recorded per lesson, so this is
          // stated as lessons rather than invented as hours.
          time_invested: `${done} ${done === 1 ? "lesson" : "lessons"}`,
          next_course_name: "your next course",
          next_course_link: appLink("/courses"),
        },
      });
      return;
    }

    // Crossed on this lesson, not merely past — otherwise every later lesson
    // re-sends the same milestone.
    const previous = Math.round(((done - 1) / chapters.length) * 100);
    const crossed = [25, 50, 75].find((mark) => previous < mark && percent >= mark);
    if (!crossed) return;

    void notify({
      event: "course.milestone_reached",
      coachId: course.coach_id ?? null,
      variables: {
        course_name: course.title ?? "your course",
        progress_percent: String(crossed),
        lessons_completed: String(done),
        resume_link: resumeLink,
      },
    });
  };

  const allChapters = sections.flatMap((s) => s.chapters);
  const currentChapterIndex = selectedChapter ? allChapters.findIndex((c) => c.id === selectedChapter.id) : -1;
  const totalChapters = allChapters.length;
  // `completedChapters` holds this learner's progress across every course, so
  // the header used to read things like "23/6" on a six-lesson course.
  const completedCount = allChapters.filter((c) => completedChapters.has(c.id)).length;

  const navigateToChapter = (chapter: Chapter) => {
    const lock = sections.find((s) => s.chapters.some((c) => c.id === chapter.id));
    const state = lock ? dripLocks.get(lock.id) : undefined;
    if (state?.locked) {
      toast({ title: "Not open yet", description: state.reason });
      return;
    }
    navigate(`/course-player/${id}/watch/${chapter.id}`);
    setIsMobileSidebarOpen(false);
  };

  // Next/previous walk past dripped lessons rather than stopping dead on one.
  const nextChapter = () => {
    const target = allChapters.slice(currentChapterIndex + 1).find((c) => !lockedChapters.has(c.id));
    if (currentChapterIndex >= 0 && target) navigateToChapter(target);
  };

  const prevChapter = () => {
    const target = allChapters
      .slice(0, Math.max(0, currentChapterIndex))
      .reverse()
      .find((c) => !lockedChapters.has(c.id));
    if (target) navigateToChapter(target);
  };

  const getResources = (chapter: Chapter) => {
    if (!chapter.resources) return [];
    try {
      return Array.isArray(chapter.resources) ? chapter.resources : JSON.parse(chapter.resources);
    } catch {
      return [];
    }
  };

  const getLectureDuration = (chapterId: string) => {
    let sum = 0;
    for (let i = 0; i < chapterId.length; i++) sum += chapterId.charCodeAt(i);
    const min = (sum % 25) + 5;
    const sec = sum % 60;
    return `${min}min ${sec}s`;
  };

  const toggleSection = (sectionId: string) => {
    const next = new Set(expandedSections);
    next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId);
    setExpandedSections(next);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400">
        <span className="animate-pulse">Loading lecture watch room...</span>
      </div>
    );
  }

  return (
    <div className={cn(playerDark && "dark", "h-screen flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white overflow-hidden select-none")}>

      {/* Minimal Top Bar */}
      <header className="h-14 sm:h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-3 sm:px-6 bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={() => navigate(`/course-player/${id}`)}
            className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors text-zinc-700 dark:text-white shrink-0"
            title="Back to course detail"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <BrandMark size={35} className="shrink-0" />
          <span className="text-sm font-semibold tracking-wide text-zinc-700 dark:text-zinc-300 truncate max-w-[140px] sm:max-w-[280px]">
            {course?.title}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
            <Video className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            <span>{completedCount} of {totalChapters} complete</span>
          </div>
          <button
            onClick={() => setPlayerDark(!playerDark)}
            className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors text-zinc-700 dark:text-zinc-200 shrink-0"
            title={playerDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {playerDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors text-zinc-700 dark:text-zinc-200 shrink-0"
            title="Course content"
          >
            <List className="h-4 w-4" />
          </button>
          <Avatar className="h-8 w-8 border border-zinc-200 dark:border-zinc-700 shrink-0">
            <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Body Columns */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden pb-14 lg:pb-0">
        
        {/* Left Column: Video player & Tabs (approx 75% width on large screens) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-black relative">
          
          {/* Video stage. The box has to *be* 16:9, not merely be capped at a
              height: a full-width aspect-video box clipped by max-height stays
              full width, so a 16:9 source got pillarboxed inside it with black
              bars down both sides. Capping width and height together keeps the
              frame true and centres it in the theatre. */}
          <div className="flex justify-center bg-black">
            <div className="relative aspect-video w-full max-h-[68vh] max-w-[calc(68vh*16/9)] overflow-hidden">
            <VideoPlayer
              fit="fill"
              key={selectedChapter?.id}
              videoUrl={selectedChapter?.video_url}
              videoType={selectedChapter?.video_type}
              poster={selectedChapter?.thumbnail_url || course?.default_video_thumbnail_url}
              title={selectedChapter?.title}
              onEnded={() => {
                if (selectedChapter && !completedChapters.has(selectedChapter.id)) {
                  toggleComplete(selectedChapter.id);
                }
                nextChapter();
              }}
              overlay={
                <>
                  {/* Previous lecture */}
                  {currentChapterIndex > 0 && (
                    <button
                      onClick={prevChapter}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-40 h-12 w-12 rounded-full bg-black/60 hover:bg-black/85 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100 border border-white/20 text-white"
                      title="Previous lecture"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                  )}

                  {/* Next lecture */}
                  {currentChapterIndex < totalChapters - 1 && (
                    <button
                      onClick={nextChapter}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-40 h-12 w-12 rounded-full bg-black/60 hover:bg-black/85 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100 border border-white/20 text-white"
                      title="Next lecture"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  )}

                  {/* Sidebar collapse toggle */}
                  <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="hidden lg:flex absolute top-4 right-4 z-40 h-9 w-9 rounded-lg bg-black/60 hover:bg-black/80 items-center justify-center border border-white/20 text-white/90 transition-opacity opacity-0 group-hover:opacity-100"
                    title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  >
                    {isSidebarCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </>
              }
            />
            </div>
          </div>

          {/* Lecture Info Panel (Bottom 35%) */}
          <div className="flex-1 overflow-auto bg-white dark:bg-zinc-900 p-4 sm:p-6 flex flex-col border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-col gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-5">
              <h2 className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-white">
                {selectedChapter?.title}
              </h2>

              {/* Tab Header Row (pill style) */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: "description", label: "Description" },
                  {
                    id: "resources",
                    label: selectedChapter ? `Resources (${getResources(selectedChapter).length})` : "Resources"
                  },
                  { id: "qna", label: "QnA" }
                ].map((tab) => {
                  const isQna = tab.id === "qna";
                  const isDisabled = isQna && course?.disable_qna;

                  return (
                    <div
                      key={tab.id}
                      className="relative group shrink-0"
                    >
                      <button
                        disabled={isDisabled}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors focus:outline-none",
                          activeTab === tab.id
                            ? "bg-accent/10 text-accent"
                            : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                          isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {tab.label}
                      </button>

                      {/* Tooltip for Disabled QnA */}
                      {isDisabled && (
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-zinc-800 text-zinc-200 border border-zinc-700 text-[10px] font-semibold py-1 px-2.5 rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                          QnA has been disabled by the creator
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tab Body Contents */}
            <div className="flex-1 text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
              {activeTab === "description" && (
                <div>
                  <p>{selectedChapter?.video_description || "No description provided for this lecture."}</p>
                  {selectedChapter?.content && (
                    <div className="mt-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850">
                      <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Lesson Notes</p>
                      <div className="prose dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300">
                        {selectedChapter.content}
                      </div>
                    </div>
                  )}

                  {!course?.disable_comments && (
                    <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                      <h3 className="text-zinc-900 dark:text-white font-bold mb-4">Comments</h3>

                      {/* Composer */}
                      <div className="flex items-center gap-3 mb-6">
                        <Avatar className="h-8 w-8 shrink-0">
                          {profile?.avatar_url && <img src={profile.avatar_url} alt="" />}
                          <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs">
                            {(profile?.full_name || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                postComment(newComment);
                              }
                            }}
                            placeholder="Add a comment..."
                            disabled={postingComment}
                            className="flex-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                          />
                          <button
                            onClick={() => postComment(newComment)}
                            disabled={postingComment || !newComment.trim()}
                            className="h-8 w-8 rounded-full flex items-center justify-center text-accent hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors shrink-0"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* List */}
                      {commentsLoading ? (
                        <p className="text-xs text-zinc-500">Loading comments...</p>
                      ) : comments.filter((c) => !c.parent_id).length === 0 ? (
                        <p className="text-xs text-zinc-500">No comments yet. Be the first to share your thoughts.</p>
                      ) : (
                        <div className="space-y-4">
                          {comments
                            .filter((c) => !c.parent_id)
                            .slice(0, visibleCommentCount)
                            .map((c) => {
                              const replies = comments.filter((r) => r.parent_id === c.id);
                              return (
                                <div key={c.id}>
                                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Avatar className="h-6 w-6 shrink-0">
                                        {c.author_avatar && <img src={c.author_avatar} alt="" />}
                                        <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px]">
                                          {c.author_name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{c.author_name}</span>
                                      <span className="text-[10px] text-zinc-500">{formatRelativeTime(c.created_at)}</span>
                                    </div>
                                    <p className="text-sm text-zinc-700 dark:text-zinc-300 ml-8">{c.content}</p>
                                    <button
                                      onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                                      className="ml-8 mt-1 text-[10px] font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                    >
                                      Reply
                                    </button>
                                  </div>

                                  {replyingTo === c.id && (
                                    <div className="flex items-center gap-2 mt-2 ml-8">
                                      <input
                                        autoFocus
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            postComment(replyText, c.id);
                                          }
                                        }}
                                        placeholder={`Reply to ${c.author_name}...`}
                                        className="flex-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                                      />
                                      <button
                                        onClick={() => postComment(replyText, c.id)}
                                        disabled={postingComment || !replyText.trim()}
                                        className="text-[10px] font-bold text-accent disabled:opacity-30 shrink-0"
                                      >
                                        Post
                                      </button>
                                    </div>
                                  )}

                                  {replies.length > 0 && (
                                    <div className="mt-2 ml-8 space-y-2">
                                      {replies.map((r) => (
                                        <div key={r.id} className="p-3 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Avatar className="h-5 w-5 shrink-0">
                                              {r.author_avatar && <img src={r.author_avatar} alt="" />}
                                              <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[9px]">
                                                {r.author_name.charAt(0).toUpperCase()}
                                              </AvatarFallback>
                                            </Avatar>
                                            <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">{r.author_name}</span>
                                            <span className="text-[10px] text-zinc-500">{formatRelativeTime(r.created_at)}</span>
                                          </div>
                                          <p className="text-xs text-zinc-700 dark:text-zinc-300 ml-7">{r.content}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                          {comments.filter((c) => !c.parent_id).length > visibleCommentCount && (
                            <button
                              onClick={() => setVisibleCommentCount((n) => n + 10)}
                              className="text-xs font-semibold text-accent hover:opacity-80"
                            >
                              View more
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "resources" && (
                <div className="space-y-3">
                  {selectedChapter && getResources(selectedChapter).length > 0 ? (
                    getResources(selectedChapter).map((file: any, index: number) => {
                      const name = file.name || "Resource file";
                      const ext = name.split(".").pop()?.toUpperCase() || "FILE";
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-750 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 dark:text-zinc-450 border border-zinc-200 dark:border-zinc-800">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-bold text-zinc-900 dark:text-zinc-100">{name}</p>
                              <p className="text-xs text-zinc-500 font-semibold">{ext}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => copyResourceLink(file.url)}
                              className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center justify-center transition-colors border border-zinc-200 dark:border-zinc-800"
                              title="Copy share link"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-9 w-9 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 flex items-center justify-center transition-colors border border-red-500/20"
                              title="Download resource"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-zinc-500">
                      No additional resources available for this chapter.
                    </div>
                  )}
                </div>
              )}

              {activeTab === "qna" && !course?.disable_qna && (
                <div className="space-y-4">
                  <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">Discuss the lecture topic below.</p>
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-center text-zinc-500 text-xs">
                    QnA section is ready. Submit queries or discuss lessons directly inside Course Detail.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile sidebar backdrop */}
        {isMobileSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Right Column: Sidebar (Collapsible on desktop, drawer on mobile) */}
        <aside
          className={cn(
            "bg-card text-card-foreground border-l border-border flex-col transition-all duration-300",
            "fixed inset-y-0 right-0 z-50 w-[85vw] max-w-[340px]",
            isMobileSidebarOpen ? "flex" : "hidden",
            "lg:static lg:z-auto lg:flex lg:max-w-none",
            isSidebarCollapsed ? "lg:w-[60px]" : "lg:w-[340px]"
          )}
        >
          <div className="lg:hidden p-4 border-b border-border flex items-center justify-between shrink-0">
            <span className="font-extrabold text-base">Content</span>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="h-8 w-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-center text-zinc-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {isSidebarCollapsed && !isMobileSidebarOpen ? (
            // Collapsed View: Thin strip with section indicators and re-expand trigger (desktop only)
            <div className="flex flex-col items-center py-4 gap-4 flex-1">
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="h-8 w-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-center text-zinc-500"
                title="Expand sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex-1 flex flex-col gap-3 mt-4">
                {sections.map((s, idx) => (
                  <div
                    key={s.id}
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    title={`${s.title} (click to expand)`}
                  >
                    S{idx + 1}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Expanded View: Full Contents List
            <>
              {/* Sidebar Header (desktop only — mobile has its own header above) */}
              <div className="hidden lg:block border-b border-border p-4 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Course content</span>
                  <button
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary"
                    title="Collapse sidebar"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                {/* Course-wide progress, so the rail answers "how far in am I?"
                    without counting checkmarks. */}
                <div className="mt-3 flex items-center gap-2.5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-300"
                      style={{
                        width: `${totalChapters > 0 ? (completedCount / totalChapters) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {completedCount}/{totalChapters}
                  </span>
                </div>
              </div>

              {/* Sections & Chapters List */}
              <div className="flex-1 overflow-y-auto">
                {sections.map((section) => {
                  const isSecExpanded = expandedSections.has(section.id);
                  const totalLecturesCount = section.chapters.length;
                  const completedLecturesCount = section.chapters.filter((ch) => completedChapters.has(ch.id)).length;
                  const sectionPct =
                    totalLecturesCount > 0 ? (completedLecturesCount / totalLecturesCount) * 100 : 0;
                  const sectionLock = dripLocks.get(section.id);

                  return (
                    <div key={section.id} className="border-b border-border">
                      {/* Section Accordion Trigger */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        aria-expanded={isSecExpanded}
                        className="w-full px-4 py-3 text-left transition-colors hover:bg-secondary/60"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                              !isSecExpanded && "-rotate-90",
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate text-xs font-bold">
                            {section.title}
                          </span>
                          {sectionLock?.locked ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                              <Lock className="h-2.5 w-2.5" /> {sectionLock.reason}
                            </span>
                          ) : (
                            <span className="shrink-0 text-[10px] font-semibold tabular-nums text-muted-foreground">
                              {completedLecturesCount}/{totalLecturesCount}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 ml-6 h-1 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-accent transition-[width] duration-300"
                            style={{ width: `${sectionPct}%` }}
                          />
                        </div>
                      </button>

                      {/* Section Lectures */}
                      {isSecExpanded && (
                        <ul className="pb-1">
                          {section.chapters.map((chapter, chapterIndex) => {
                            const isActive = selectedChapter?.id === chapter.id;
                            const isCompleted = completedChapters.has(chapter.id);
                            const resCount = getResources(chapter).length;
                            const duration = formatLectureDuration(chapter.duration_seconds);

                            return (
                              <li key={chapter.id}>
                                <div
                                  onClick={() => navigateToChapter(chapter)}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") navigateToChapter(chapter);
                                  }}
                                  aria-disabled={sectionLock?.locked || undefined}
                                  className={cn(
                                    "group/row relative flex gap-3 px-3 py-2.5 transition-colors",
                                    // The active row is marked by an accent
                                    // edge rather than a wash, so it stays
                                    // legible against either theme.
                                    isActive ? "bg-accent-tint/70" : "hover:bg-secondary/60",
                                    sectionLock?.locked
                                      ? "cursor-not-allowed opacity-55 hover:bg-transparent"
                                      : "cursor-pointer",
                                  )}
                                >
                                  {isActive && (
                                    <span className="absolute inset-y-0 left-0 w-[3px] rounded-r bg-accent" />
                                  )}

                                  {/* Thumbnail, with the duration on it the way
                                      a video queue reads at a glance. */}
                                  <div className="relative aspect-video w-[86px] shrink-0 overflow-hidden rounded-md bg-secondary">
                                    {chapter.thumbnail_url ? (
                                      <img
                                        src={chapter.thumbnail_url}
                                        alt=""
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <span className="flex h-full w-full items-center justify-center text-[11px] font-bold tabular-nums text-muted-foreground">
                                        {String(chapterIndex + 1).padStart(2, "0")}
                                      </span>
                                    )}

                                    <span
                                      className={cn(
                                        "absolute inset-0 flex items-center justify-center bg-black/45 transition-opacity",
                                        isActive || sectionLock?.locked
                                          ? "opacity-100"
                                          : "opacity-0 group-hover/row:opacity-100",
                                      )}
                                    >
                                      {sectionLock?.locked ? (
                                        <Lock className="h-4 w-4 text-white" />
                                      ) : isActive ? (
                                        <Volume2 className="h-4 w-4 text-white" />
                                      ) : (
                                        <Play className="h-4 w-4 fill-white text-white" />
                                      )}
                                    </span>

                                    {duration && (
                                      <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[9px] font-semibold leading-[14px] text-white">
                                        {duration}
                                      </span>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={cn(
                                        "line-clamp-2 text-xs font-semibold leading-snug",
                                        isActive ? "text-accent" : isCompleted && "text-muted-foreground",
                                      )}
                                    >
                                      {chapter.title}
                                    </p>
                                    <p className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                                      {isActive && <span className="font-bold text-accent">Now playing</span>}
                                      {isCompleted && !isActive && <span>Watched</span>}
                                      {resCount > 0 && <span>· {resCount} resources</span>}
                                    </p>
                                  </div>

                                  <div
                                    className="flex shrink-0 flex-col items-center gap-1.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => toggleComplete(chapter.id)}
                                      title={isCompleted ? "Mark as not watched" : "Mark as watched"}
                                      aria-label={isCompleted ? "Mark as not watched" : "Mark as watched"}
                                      className="focus:outline-none"
                                    >
                                      {isCompleted ? (
                                        <CheckCircle2 className="h-4 w-4 text-success" />
                                      ) : (
                                        <span className="block h-4 w-4 rounded-full border border-border" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => shareChapter(chapter)}
                                      className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus:opacity-100 group-hover/row:opacity-100"
                                      title="Copy lecture link"
                                      aria-label="Copy lecture link"
                                    >
                                      <Share2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </aside>

      </div>

      {/* Mobile bottom Previous/Next bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 py-3">
        <button
          onClick={prevChapter}
          disabled={currentChapterIndex <= 0}
          className="flex items-center gap-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <button
          onClick={nextChapter}
          disabled={currentChapterIndex >= totalChapters - 1}
          className="flex items-center gap-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
