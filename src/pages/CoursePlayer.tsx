import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, ChevronRight, PlayCircle, CheckCircle2, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Chapter {
  id: string;
  title: string;
  video_url: string | null;
  video_type: string;
  content: string | null;
  sort_order: number;
  resources: any;
}

interface Section {
  id: string;
  title: string;
  sort_order: number;
  chapters: Chapter[];
}

export default function CoursePlayer() {
  const { id } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCourse();
    loadProgress();
  }, [id]);

  const loadCourse = async () => {
    const { data: courseData } = await supabase.from("courses").select("*").eq("id", id).single();
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
      // Auto-select first chapter
      if (mapped.length > 0 && mapped[0].chapters.length > 0) {
        setSelectedChapter(mapped[0].chapters[0]);
        setExpandedSections(new Set([mapped[0].id]));
      }
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
    next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId);
    setExpandedSections(next);
  };

  const markComplete = async () => {
    if (!selectedChapter || !user) return;
    await supabase.from("chapter_progress").upsert({
      user_id: user.id,
      chapter_id: selectedChapter.id,
      completed: true,
      progress_percent: 100,
    }, { onConflict: "user_id,chapter_id" });
    setCompletedChapters(new Set([...completedChapters, selectedChapter.id]));
  };

  const getVideoEmbed = (url: string, type: string) => {
    if (type === "youtube" || url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.includes("youtu.be") ? url.split("/").pop() : new URL(url).searchParams.get("v");
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (type === "loom" || url.includes("loom.com")) {
      return url.replace("/share/", "/embed/");
    }
    if (type === "vimeo" || url.includes("vimeo.com")) {
      const vimeoId = url.split("/").pop();
      return `https://player.vimeo.com/video/${vimeoId}`;
    }
    return url;
  };

  const totalChapters = sections.reduce((sum, s) => sum + s.chapters.length, 0);
  const progressPercent = totalChapters > 0 ? Math.round((completedChapters.size / totalChapters) * 100) : 0;

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-var(--nav-height))]">
        {/* Sidebar - Sections & Chapters */}
        <div className="w-80 border-r border-border bg-card overflow-y-auto">
          <div className="p-4 border-b border-border">
            <h2 className="font-bold text-sm truncate">{course?.title || "Loading..."}</h2>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={progressPercent} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground">{progressPercent}%</span>
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.id}>
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-secondary/50 transition-colors"
              >
                {expandedSections.has(section.id) ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <span className="text-left flex-1 truncate">{section.title}</span>
                <span className="text-xs text-muted-foreground">
                  {section.chapters.filter(c => completedChapters.has(c.id)).length}/{section.chapters.length}
                </span>
              </button>

              {expandedSections.has(section.id) && section.chapters.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChapter(ch)}
                  className={`w-full flex items-center gap-2 px-6 py-2.5 text-sm transition-colors ${
                    selectedChapter?.id === ch.id ? "bg-accent/10 text-accent font-medium" : "text-muted-foreground hover:bg-secondary/30"
                  }`}
                >
                  {completedChapters.has(ch.id) ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <PlayCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span className="text-left truncate">{ch.title}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedChapter ? (
            <div>
              {/* Video Player */}
              {selectedChapter.video_url ? (
                <div className="aspect-video bg-foreground/5">
                  <iframe
                    src={getVideoEmbed(selectedChapter.video_url, selectedChapter.video_type)}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-secondary flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">No video for this chapter</p>
                </div>
              )}

              {/* Chapter Info */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">{selectedChapter.title}</h2>
                  <Button
                    size="sm"
                    onClick={markComplete}
                    className={completedChapters.has(selectedChapter.id)
                      ? "bg-success text-success-foreground"
                      : "bg-accent text-accent-foreground hover:bg-accent/90"
                    }
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {completedChapters.has(selectedChapter.id) ? "Completed" : "Mark Complete"}
                  </Button>
                </div>

                {selectedChapter.content && (
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedChapter.content}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Select a chapter to begin
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
