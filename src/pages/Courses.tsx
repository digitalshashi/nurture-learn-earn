import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { CourseCard } from "@/components/courses/CourseCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  category: string | null;
}

export default function Courses() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      if (data) setCourses(data as Course[]);
      setLoading(false);
    };
    fetchCourses();
  }, []);

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.category || "").toLowerCase().includes(search.toLowerCase())
  );

  const isCoachOrAdmin = hasRole("coach") || hasRole("admin");

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Courses</h1>
          {isCoachOrAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/ai-course-generator")}>
                <Sparkles className="h-4 w-4 mr-1" /> Create with AI
              </Button>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate("/course-builder")}>
                <Plus className="h-4 w-4 mr-1" /> Create Course
              </Button>
            </div>
          )}
        </div>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading courses...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {courses.length === 0 ? "No courses yet" : "No courses match your search"}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((course) => (
              <div key={course.id} className="relative">
                <CourseCard
                  id={course.id}
                  title={course.title}
                  description={course.description || ""}
                  thumbnail={course.thumbnail_url || "/placeholder.svg"}
                  price={course.price}
                  category={course.category || "General"}
                  onClick={() => navigate(`/course-player/${course.id}`)}
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
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
