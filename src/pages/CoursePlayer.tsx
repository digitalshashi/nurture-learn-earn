import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChevronDown, ChevronRight, ArrowLeft, CheckCircle2, Circle,
  BookmarkPlus, Video, FileText, Download, Send, ThumbsUp, Link as LinkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

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
}

interface Section {
  id: string;
  title: string;
  sort_order: number;
  chapters: Chapter[];
}

interface Question {
  id: string;
  question: string;
  answer: string | null;
  user_id: string;
  created_at: string;
  is_resolved: boolean;
  profile?: { full_name: string; avatar_url: string | null };
}

export default function CoursePlayer() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState("");

  useEffect(() => {
    loadCourse();
    loadProgress();
  }, [id]);

  useEffect(() => {
    if (selectedChapter) loadQuestions();
  }, [selectedChapter]);

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

  const loadQuestions = async () => {
    if (!selectedChapter) return;
    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("chapter_id", selectedChapter.id)
      .order("created_at", { ascending: false });
    if (data) {
      const userIds = [...new Set(data.map((q) => q.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
      setQuestions(
        data.map((q) => ({
          ...q,
          profile: profiles?.find((p) => p.id === q.user_id) || { full_name: "User", avatar_url: null },
        }))
      );
    }
  };

  const toggleSection = (sectionId: string) => {
    const next = new Set(expandedSections);
    next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId);
    setExpandedSections(next);
  };

  const markComplete = async () => {
    if (!selectedChapter || !user) return;
    await supabase.from("chapter_progress").upsert(
      { user_id: user.id, chapter_id: selectedChapter.id, completed: true, progress_percent: 100 },
      { onConflict: "user_id,chapter_id" }
    );
    const newCompleted = new Set([...completedChapters, selectedChapter.id]);
    setCompletedChapters(newCompleted);
    toast({ title: "Lesson marked as complete!" });

    // Auto-advance to next lesson
    const allChapters = sections.flatMap((s) => s.chapters);
    const currentIdx = allChapters.findIndex((c) => c.id === selectedChapter.id);
    if (currentIdx >= 0 && currentIdx < allChapters.length - 1) {
      const nextChapter = allChapters[currentIdx + 1];
      setSelectedChapter(nextChapter);
      // Expand the section containing the next chapter
      const nextSection = sections.find((s) => s.chapters.some((c) => c.id === nextChapter.id));
      if (nextSection) setExpandedSections((prev) => new Set([...prev, nextSection.id]));
    }
  };

  const submitQuestion = async () => {
    if (!user || !selectedChapter || !newQuestion.trim()) return;
    await supabase.from("questions").insert({
      chapter_id: selectedChapter.id,
      user_id: user.id,
      question: newQuestion.trim(),
    });
    setNewQuestion("");
    loadQuestions();
    toast({ title: "Question posted" });
  };

  const selectChapter = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    const section = sections.find((s) => s.chapters.some((c) => c.id === chapter.id));
    if (section) setExpandedSections((prev) => new Set([...prev, section.id]));
  };

  const getVideoEmbed = (url: string, type: string) => {
    if (type === "youtube" || url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.includes("youtu.be")
        ? url.split("/").pop()?.split("?")[0]
        : new URL(url).searchParams.get("v");
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
    }
    if (type === "loom" || url.includes("loom.com")) return url.replace("/share/", "/embed/");
    if (type === "vimeo" || url.includes("vimeo.com")) {
      const vimeoId = url.split("/").pop();
      return `https://player.vimeo.com/video/${vimeoId}`;
    }
    if (url.includes("drive.google.com")) {
      const fileId = url.match(/\/d\/([^/]+)/)?.[1];
      return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;
    }
    return url;
  };

  const totalChapters = sections.reduce((sum, s) => sum + s.chapters.length, 0);
  const completedCount = completedChapters.size;

  // Determine chapter numbering within each section
  const getChapterNumber = (section: Section, chapter: Chapter) => {
    return String(section.chapters.indexOf(chapter) + 1).padStart(2, "0");
  };

  const isNewChapter = (ch: Chapter) => {
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 3);
    return new Date(ch.created_at) > dayAgo;
  };

  // Parse resources
  const getResources = (ch: Chapter) => {
    if (!ch.resources) return [];
    try {
      return Array.isArray(ch.resources) ? ch.resources : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="font-bold text-sm truncate max-w-[300px]">{course?.title || "Loading..."}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Video className="h-4 w-4" />
            <span className="font-medium">
              {completedCount} of {totalChapters} complete
            </span>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-secondary text-xs font-semibold">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Video + Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedChapter ? (
            <>
              {/* Video Player */}
              {selectedChapter.video_url ? (
                <div className="relative bg-foreground/95 w-full" style={{ aspectRatio: "16/9", maxHeight: "65vh" }}>
                  <iframe
                    src={getVideoEmbed(selectedChapter.video_url, selectedChapter.video_type)}
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              ) : (
                <div
                  className="bg-secondary flex items-center justify-center"
                  style={{ aspectRatio: "16/9", maxHeight: "65vh" }}
                >
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Text lesson</p>
                  </div>
                </div>
              )}

              {/* Lesson title + tabs */}
              <div className="flex-1 overflow-auto">
                <div className="border-b border-border px-6 py-4 flex items-center justify-between">
                  <h2 className="text-base font-bold">{selectedChapter.title}</h2>
                  <Tabs defaultValue="description" className="w-auto">
                    <TabsList className="bg-transparent border-none gap-4 p-0 h-auto">
                      <TabsTrigger
                        value="description"
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 pb-1 bg-transparent text-sm"
                      >
                        Description
                      </TabsTrigger>
                      <TabsTrigger
                        value="resources"
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 pb-1 bg-transparent text-sm"
                      >
                        Resources
                      </TabsTrigger>
                      <TabsTrigger
                        value="qna"
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 pb-1 bg-transparent text-sm"
                      >
                        QnA
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Tab content using controlled state */}
                <TabsWrapper
                  chapter={selectedChapter}
                  questions={questions}
                  newQuestion={newQuestion}
                  setNewQuestion={setNewQuestion}
                  submitQuestion={submitQuestion}
                  getResources={getResources}
                  completedChapters={completedChapters}
                  markComplete={markComplete}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Select a lesson to begin
            </div>
          )}
        </div>

        {/* Right Sidebar - Content Navigation */}
        <aside className="w-80 border-l border-border bg-card shrink-0 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-bold">Content</h3>
          </div>
          <ScrollArea className="flex-1">
            {sections.map((section) => {
              const sectionCompleted = section.chapters.filter((c) => completedChapters.has(c.id)).length;
              return (
                <div key={section.id}>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/50"
                  >
                    <div className="text-left">
                      <p className="text-sm font-semibold">{section.title}</p>
                      <p className="text-xs text-muted-foreground">{sectionCompleted} of {section.chapters.length}</p>
                    </div>
                    {expandedSections.has(section.id) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  {expandedSections.has(section.id) &&
                    section.chapters.map((ch) => {
                      const isActive = selectedChapter?.id === ch.id;
                      const isComplete = completedChapters.has(ch.id);
                      const isNew = isNewChapter(ch);

                      return (
                        <button
                          key={ch.id}
                          onClick={() => selectChapter(ch)}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border/30 ${
                            isActive ? "bg-primary/5" : "hover:bg-secondary/30"
                          }`}
                        >
                          <span className="text-xs text-muted-foreground font-mono mt-0.5 shrink-0">
                            {getChapterNumber(section, ch)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-tight ${isActive ? "font-semibold text-foreground" : "text-foreground"}`}>
                              {ch.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                              {ch.content_type || "Video"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                            {isNew && !isComplete && (
                              <Badge className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 h-5">
                                NEW
                              </Badge>
                            )}
                            {isComplete ? (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground/40" />
                            )}
                            <BookmarkPlus className="h-3.5 w-3.5 text-muted-foreground/40 hover:text-primary cursor-pointer" />
                          </div>
                        </button>
                      );
                    })}
                </div>
              );
            })}
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}

/* Separate component to handle tabs content properly */
function TabsWrapper({
  chapter,
  questions,
  newQuestion,
  setNewQuestion,
  submitQuestion,
  getResources,
  completedChapters,
  markComplete,
}: {
  chapter: Chapter;
  questions: Question[];
  newQuestion: string;
  setNewQuestion: (v: string) => void;
  submitQuestion: () => void;
  getResources: (ch: Chapter) => any[];
  completedChapters: Set<string>;
  markComplete: () => void;
}) {
  const [activeTab, setActiveTab] = useState("description");
  const resources = getResources(chapter);
  const isComplete = completedChapters.has(chapter.id);

  return (
    <div className="px-6 py-4">
      {/* Inline tab selector */}
      <div className="flex gap-6 border-b border-border mb-4">
        {["description", "resources", "qna"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "qna" ? "QnA" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Mark Complete Button */}
      <div className="flex justify-end mb-4">
        <Button
          size="sm"
          onClick={markComplete}
          className={
            isComplete
              ? "bg-success text-success-foreground hover:bg-success/90"
              : "bg-accent text-accent-foreground hover:bg-accent/90"
          }
        >
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
          {isComplete ? "Completed" : "Mark as Complete"}
        </Button>
      </div>

      {activeTab === "description" && (
        <div className="prose prose-sm max-w-none">
          {chapter.content ? (
            <div
              className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: chapter.content
                  .replace(/\n/g, "<br/>")
                  .replace(
                    /(https?:\/\/[^\s<]+)/g,
                    '<a href="$1" target="_blank" rel="noopener" class="text-primary hover:underline">Click Here</a>'
                  ),
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No description available for this lesson.</p>
          )}
        </div>
      )}

      {activeTab === "resources" && (
        <div className="space-y-2">
          {resources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No resources attached to this lesson.</p>
          ) : (
            resources.map((res: any, i: number) => {
              const isLink = res.type === "link";
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                  {isLink ? <LinkIcon className="h-5 w-5 text-primary shrink-0" /> : <FileText className="h-5 w-5 text-primary shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{res.name || `Resource ${i + 1}`}</p>
                    <p className="text-xs text-muted-foreground">{(res.type || "File").toUpperCase()} {res.size ? `• ${res.size}` : ""}</p>
                  </div>
                  {res.url && (
                    <a href={res.url} target="_blank" rel="noopener noreferrer" download={!isLink}>
                      <Button size="sm" variant="ghost"><Download className="h-4 w-4" /></Button>
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "qna" && (
        <div className="space-y-4">
          {/* Ask question */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask a question about this lesson..."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            <Button
              size="sm"
              onClick={submitQuestion}
              disabled={!newQuestion.trim()}
              className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0 self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Questions list */}
          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No questions yet. Be the first to ask!</p>
          ) : (
            questions.map((q) => (
              <div key={q.id} className="border border-border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-secondary text-xs">
                      {q.profile?.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{q.profile?.full_name || "User"}</p>
                      <span className="text-xs text-muted-foreground">{format(new Date(q.created_at), "MMM d, yyyy")}</span>
                      {q.is_resolved && <Badge variant="outline" className="text-[10px] text-success">Resolved</Badge>}
                    </div>
                    <p className="text-sm mt-1">{q.question}</p>
                    {q.answer && (
                      <div className="mt-3 pl-3 border-l-2 border-primary/30">
                        <p className="text-xs font-semibold text-primary mb-0.5">Coach Answer</p>
                        <p className="text-sm text-foreground/80">{q.answer}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
