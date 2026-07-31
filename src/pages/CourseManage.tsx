import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, Info, Clock, BarChart3, MessageCircle, 
  HelpCircle, ClipboardList, Star, Bot, ChevronRight, Eye, Rocket 
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

const sidebarItems = [
  { key: "curriculum", label: "Curriculum", icon: BookOpen },
  { key: "information", label: "Information", icon: Info },
  { key: "drip", label: "Drip", icon: Clock, badge: "BETA" },
  { key: "reports", label: "Report", icon: BarChart3 },
  { key: "comments", label: "Comments", icon: MessageCircle },
  { key: "qna", label: "QnA", icon: HelpCircle },
  { key: "assignments", label: "Assignment Responses", icon: ClipboardList },
  { key: "reviews", label: "Reviews", icon: Star },
  { key: "chatbot", label: "QnA Chatbot", icon: Bot, badge: "EXPERIMENTAL" },
];

export default function CourseManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("curriculum");
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadCourse();
  }, [id]);

  const loadCourse = async () => {
    const { data } = await supabase.from("courses").select("*").eq("id", id).single();
    setCourse(data);
    setLoading(false);
  };

  const handlePublish = async () => {
    if (!id) return;
    await supabase.from("courses").update({ is_published: true }).eq("id", id);
    toast({ title: "Published!", description: "Course is now live" });
    loadCourse();
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Course not found</p>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case "curriculum": return <CurriculumTab courseId={id!} />;
      case "information": return <InformationTab courseId={id!} course={course} onUpdate={loadCourse} />;
      case "drip": return <DripTab courseId={id!} course={course} onUpdate={loadCourse} />;
      case "reports": return <ReportsTab courseId={id!} />;
      case "comments": return <CommentsTab courseId={id!} />;
      case "qna": return <QnATab courseId={id!} />;
      case "assignments": return <AssignmentsTab courseId={id!} />;
      case "reviews": return <ReviewsTab courseId={id!} />;
      case "chatbot": return <ChatbotTab courseId={id!} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <button 
            onClick={() => navigate("/courses")} 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Courses
          </button>
          <h2 className="font-semibold text-sm mt-2 truncate">{course.title}</h2>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {sidebarItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                activeTab === item.key 
                  ? "bg-accent/10 text-accent font-medium border-l-2 border-accent" 
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground border-l-2 border-transparent"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-foreground text-background">
                  {item.badge}
                </span>
              )}
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
          <h1 className="font-semibold text-sm truncate">{course.title}</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/course-player/${id}`)}>
              <Eye className="h-4 w-4 mr-1" /> Preview changes
            </Button>
            <Button 
              size="sm" 
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handlePublish}
            >
              <Rocket className="h-4 w-4 mr-1" /> Publish
            </Button>
          </div>
        </header>

        {/* Tab content */}
        <main className="flex-1 overflow-y-auto p-6">
          {renderTab()}
        </main>
      </div>
    </div>
  );
}
