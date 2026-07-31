import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Video,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Settings,
  HelpCircle,
  Download,
  FileText,
  CheckCircle2,
  Share2,
  ChevronDown,
  ExternalLink,
  Minimize2
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
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
  video_description: string | null;
}

interface Section {
  id: string;
  title: string;
  sort_order: number;
  chapters: Chapter[];
}

export default function CoursePlayer() {
  const { id, chapterId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem(`sidebar-collapsed-${id}`) === "true";
  });

  // Video playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState<"description" | "resources" | "qna">("description");

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(`sidebar-collapsed-${id}`, String(isSidebarCollapsed));
  }, [isSidebarCollapsed, id]);

  useEffect(() => {
    loadCourseData();
    loadProgress();
  }, [id]);

  useEffect(() => {
    if (sections.length > 0) {
      let targetChapter: Chapter | null = null;
      if (chapterId) {
        targetChapter = sections.flatMap((s) => s.chapters).find((c) => c.id === chapterId) || null;
      }
      if (!targetChapter && sections[0].chapters.length > 0) {
        targetChapter = sections[0].chapters[0];
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
  }, [sections, chapterId]);

  useEffect(() => {
    // Reset video state when chapter changes
    setIsPlaying(false);
    setHasStarted(false);
    setCurrentTime(0);
    setDuration(0);
  }, [selectedChapter]);

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
    const { data } = await supabase
      .from("chapter_progress")
      .select("chapter_id")
      .eq("user_id", user.id)
      .eq("completed", true);
    if (data) setCompletedChapters(new Set(data.map((p: any) => p.chapter_id)));
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
    }
    setCompletedChapters(nextCompleted);
  };

  const allChapters = sections.flatMap((s) => s.chapters);
  const currentChapterIndex = selectedChapter ? allChapters.findIndex((c) => c.id === selectedChapter.id) : -1;
  const totalChapters = allChapters.length;
  const completedCount = completedChapters.size;

  const navigateToChapter = (chapter: Chapter) => {
    navigate(`/course-player/${id}/watch/${chapter.id}`);
  };

  const nextChapter = () => {
    if (currentChapterIndex >= 0 && currentChapterIndex < totalChapters - 1) {
      navigateToChapter(allChapters[currentChapterIndex + 1]);
    }
  };

  const prevChapter = () => {
    if (currentChapterIndex > 0) {
      navigateToChapter(allChapters[currentChapterIndex - 1]);
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setHasStarted(true);
    }
  };

  const handleFastForward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
  };

  const handleRewind = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setIsMuted(v === 0);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    videoRef.current.muted = nextMute;
    if (!nextMute && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handlePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "0:00";
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
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

  const getVideoEmbed = (url: string, type: string) => {
    if (type === "youtube" || url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.includes("youtu.be")
        ? url.split("/").pop()?.split("?")[0]
        : new URL(url).searchParams.get("v");
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;
    }
    if (type === "loom" || url.includes("loom.com")) return url.replace("/share/", "/embed/");
    if (type === "vimeo" || url.includes("vimeo.com")) {
      const vimeoId = url.split("/").pop();
      return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
    }
    if (url.includes("drive.google.com")) {
      const fileId = url.match(/\/d\/([^/]+)/)?.[1];
      return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;
    }
    return url;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-400">
        <span className="animate-pulse">Loading lecture watch room...</span>
      </div>
    );
  }

  const isThirdPartyVideo = selectedChapter?.video_url && 
    (selectedChapter.video_type !== "upload" && !selectedChapter.video_url.includes("course-videos"));

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white overflow-hidden select-none">
      
      {/* Minimal Top Bar */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/course-player/${id}`)}
            className="h-9 w-9 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors text-white"
            title="Back to course detail"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-[35px] w-[35px] bg-primary rounded-lg flex items-center justify-center font-extrabold text-white text-base">
            L
          </div>
          <span className="text-sm font-semibold tracking-wide text-zinc-300 truncate max-w-[280px]">
            {course?.title}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200">
            <Video className="h-4 w-4 text-indigo-400" />
            <span>{completedCount} of {totalChapters} complete</span>
          </div>
          <Avatar className="h-8 w-8 border border-zinc-700">
            <AvatarFallback className="bg-zinc-800 text-xs font-bold text-zinc-300">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Body Columns */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Column: Video player & Tabs (approx 75% width on large screens) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-black relative">
          
          {/* Video Canvas Container */}
          <div 
            ref={containerRef}
            className="relative w-full aspect-video bg-black flex items-center justify-center group overflow-hidden"
            style={{ maxHeight: "65vh" }}
          >
            {/* Previous Lecture Arrow Overlay */}
            {currentChapterIndex > 0 && (
              <button
                onClick={prevChapter}
                className="absolute left-4 z-20 h-12 w-12 rounded-full bg-black/60 hover:bg-black/85 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border border-zinc-700 text-white"
                title="Previous lecture"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Next Lecture Arrow Overlay */}
            {currentChapterIndex < totalChapters - 1 && (
              <button
                onClick={nextChapter}
                className="absolute right-4 z-20 h-12 w-12 rounded-full bg-black/60 hover:bg-black/85 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border border-zinc-700 text-white"
                title="Next lecture"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            {/* Collapse/Expand Sidebar Trigger inside Player */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="absolute top-4 right-4 z-20 h-9 w-9 rounded-lg bg-black/60 hover:bg-black/80 flex items-center justify-center border border-zinc-700 text-zinc-300 transition-colors"
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isSidebarCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>

            {/* Main Video element / Iframe */}
            {selectedChapter?.video_url ? (
              isThirdPartyVideo ? (
                // Third party iframe
                <iframe
                  src={getVideoEmbed(selectedChapter.video_url, selectedChapter.video_type)}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              ) : (
                // Direct video upload with custom controls
                <>
                  {!hasStarted && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/80">
                      {selectedChapter.thumbnail_url ? (
                        <img
                          src={selectedChapter.thumbnail_url}
                          alt="Video Cover"
                          className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-tr from-zinc-900 to-zinc-950 opacity-55" />
                      )}
                      
                      {/* Play Button Overlay */}
                      <button
                        onClick={handlePlayPause}
                        className="h-16 w-16 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center transition-all scale-100 hover:scale-105 active:scale-95 z-20 shadow-xl"
                      >
                        <Play className="h-7 w-7 text-white fill-white ml-1" />
                      </button>
                      <span className="mt-3 text-sm text-zinc-300 font-semibold z-20">Branded Cover Preview</span>
                    </div>
                  )}

                  <video
                    ref={videoRef}
                    key={selectedChapter.id}
                    src={selectedChapter.video_url}
                    className="w-full h-full object-contain"
                    onTimeUpdate={() => {
                      if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                    }}
                    onLoadedMetadata={() => {
                      if (videoRef.current) setDuration(videoRef.current.duration);
                    }}
                    onEnded={() => {
                      setIsPlaying(false);
                      toggleComplete(selectedChapter.id);
                      nextChapter();
                    }}
                    onClick={handlePlayPause}
                  />

                  {/* Custom Controls Bar Overlay */}
                  {hasStarted && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                      
                      {/* Scrubber row */}
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-semibold text-zinc-300 tabular-nums">
                          {formatTime(currentTime)}
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={duration || 100}
                          value={currentTime}
                          onChange={handleScrubberChange}
                          className="flex-1 h-1.5 rounded-full bg-zinc-700 accent-blue-500 cursor-pointer appearance-none outline-none"
                        />
                        <span className="text-[11px] font-semibold text-zinc-300 tabular-nums">
                          {formatTime(duration)}
                        </span>
                      </div>

                      {/* Control buttons strip */}
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-4">
                          <button onClick={handleRewind} className="text-zinc-300 hover:text-white" title="Rewind 10s">
                            <RotateCcw className="h-4.5 w-4.5" />
                          </button>
                          <button onClick={handlePlayPause} className="text-zinc-300 hover:text-white" title={isPlaying ? "Pause" : "Play"}>
                            {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white" />}
                          </button>
                          <button onClick={handleFastForward} className="text-zinc-300 hover:text-white" title="Forward 10s">
                            <RotateCw className="h-4.5 w-4.5" />
                          </button>
                          
                          {/* Volume block */}
                          <div className="flex items-center gap-2">
                            <button onClick={toggleMute} className="text-zinc-300 hover:text-white">
                              {isMuted || volume === 0 ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
                            </button>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={isMuted ? 0 : volume}
                              onChange={handleVolumeChange}
                              className="w-16 h-1 rounded-full bg-zinc-700 accent-white cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4 relative">
                          {/* PiP */}
                          <button onClick={handlePiP} className="text-zinc-300 hover:text-white" title="Picture in Picture">
                            <ExternalLink className="h-4 w-4" />
                          </button>

                          {/* Speed Settings */}
                          <button 
                            onClick={() => setShowSpeedMenu(!showSpeedMenu)} 
                            className="text-zinc-300 hover:text-white flex items-center gap-1"
                            title="Playback Speed"
                          >
                            <Settings className="h-4 w-4" />
                            <span className="text-[10px] font-semibold">{playbackSpeed}x</span>
                          </button>

                          {showSpeedMenu && (
                            <div className="absolute bottom-8 right-8 bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 flex flex-col gap-1 w-24 z-30 shadow-xl">
                              {[0.5, 1, 1.25, 1.5, 2].map((sp) => (
                                <button
                                  key={sp}
                                  onClick={() => {
                                    setPlaybackSpeed(sp);
                                    if (videoRef.current) videoRef.current.playbackRate = sp;
                                    setShowSpeedMenu(false);
                                  }}
                                  className={cn(
                                    "text-left px-2 py-1 text-xs rounded-md hover:bg-zinc-800 text-zinc-300",
                                    playbackSpeed === sp && "bg-zinc-800 text-white font-bold"
                                  )}
                                >
                                  {sp}x
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Fullscreen */}
                          <button onClick={toggleFullscreen} className="text-zinc-300 hover:text-white">
                            <Maximize2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-zinc-500">
                <FileText className="h-12 w-12 mb-3 text-zinc-650" />
                <p className="text-sm font-semibold">Text or document lesson content below</p>
              </div>
            )}
          </div>

          {/* Lecture Info Panel (Bottom 35%) */}
          <div className="flex-1 overflow-auto bg-zinc-900 p-6 flex flex-col border-t border-zinc-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4 mb-5">
              <h2 className="text-xl font-extrabold text-white">
                {selectedChapter?.title}
              </h2>
              
              {/* Tab Header Row */}
              <div className="flex gap-4 border-b border-transparent">
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
                          "pb-2 text-sm font-semibold transition-colors focus:outline-none",
                          activeTab === tab.id
                            ? "text-blue-400 border-b-2 border-blue-400"
                            : "text-zinc-400 hover:text-zinc-200",
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
            <div className="flex-1 text-zinc-300 text-sm leading-relaxed">
              {activeTab === "description" && (
                <div>
                  <p>{selectedChapter?.video_description || "No description provided for this lecture."}</p>
                  {selectedChapter?.content && (
                    <div className="mt-4 p-4 rounded-xl bg-zinc-950 border border-zinc-850">
                      <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Lesson Notes</p>
                      <div className="prose prose-invert max-w-none text-zinc-300">
                        {selectedChapter.content}
                      </div>
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
                          className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950 border border-zinc-850 hover:border-zinc-750 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-450 border border-zinc-800">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-bold text-zinc-100">{name}</p>
                              <p className="text-xs text-zinc-500 font-semibold">{ext}</p>
                            </div>
                          </div>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-9 w-9 rounded-full bg-red-100/10 hover:bg-red-155/20 text-red-400 flex items-center justify-center transition-colors border border-red-500/20"
                            title="Download resource"
                          >
                            <Download className="h-4 w-4" />
                          </a>
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
                  <p className="text-zinc-400 text-xs font-semibold">Discuss the lecture topic below.</p>
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 text-center text-zinc-500 text-xs">
                    QnA section is ready. Submit queries or discuss lessons directly inside Course Detail.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar (Collapsible) */}
        <aside 
          className={cn(
            "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 border-l border-zinc-200 dark:border-zinc-850 flex flex-col transition-all duration-300",
            isSidebarCollapsed ? "w-[60px]" : "w-[340px]"
          )}
        >
          {isSidebarCollapsed ? (
            // Collapsed View: Thin strip with section indicators and re-expand trigger
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
              {/* Sidebar Header */}
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-850 flex items-center justify-between shrink-0">
                <span className="font-extrabold text-base text-zinc-900 dark:text-zinc-50">
                  Content
                </span>
                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="h-8 w-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-center text-zinc-500"
                  title="Collapse sidebar"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Sections & Chapters List */}
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-850">
                {sections.map((section) => {
                  const isSecExpanded = expandedSections.has(section.id);
                  const totalLecturesCount = section.chapters.length;
                  const completedLecturesCount = section.chapters.filter((ch) => completedChapters.has(ch.id)).length;

                  return (
                    <div key={section.id} className="flex flex-col">
                      
                      {/* Section Accordion Trigger */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full p-4 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/10 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          {isSecExpanded ? (
                            <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                          )}
                          <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 truncate">
                            {section.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-semibold shrink-0">
                          {completedLecturesCount}/{totalLecturesCount} complete
                        </span>
                      </button>

                      {/* Section Lectures */}
                      {isSecExpanded && (
                        <div className="bg-white dark:bg-zinc-950 divide-y divide-zinc-100 dark:divide-zinc-900">
                          {section.chapters.map((chapter, chapterIndex) => {
                            const isActive = selectedChapter?.id === chapter.id;
                            const isCompleted = completedChapters.has(chapter.id);
                            const num = String(chapterIndex + 1).padStart(2, "0");
                            const resCount = getResources(chapter).length;

                            return (
                              <div
                                key={chapter.id}
                                onClick={() => navigateToChapter(chapter)}
                                className={cn(
                                  "p-3.5 flex items-start justify-between cursor-pointer transition-colors gap-3",
                                  isActive
                                    ? "bg-zinc-100/80 dark:bg-zinc-900/40"
                                    : "hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10"
                                )}
                              >
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  <span className="text-xs font-bold text-zinc-400 tabular-nums pt-0.5">
                                    {num}
                                  </span>
                                  <div className="flex flex-col min-w-0">
                                    <span className={cn(
                                      "text-xs font-bold truncate",
                                      isActive 
                                        ? "text-zinc-900 dark:text-white" 
                                        : "text-zinc-700 dark:text-zinc-300"
                                    )}>
                                      {chapter.title}
                                    </span>
                                    <span className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                                      {resCount > 0 ? `Video • Resources (${resCount})` : "Video"}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => toggleComplete(chapter.id)}
                                    className="focus:outline-none"
                                  >
                                    {isCompleted ? (
                                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 fill-emerald-500/10" />
                                    ) : (
                                      <div className="h-4.5 w-4.5 rounded-full border border-zinc-300 dark:border-zinc-700" />
                                    )}
                                  </button>
                                  <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                                    <Share2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </aside>

      </div>
    </div>
  );
}
