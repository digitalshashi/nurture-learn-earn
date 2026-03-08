import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Edit2, RotateCcw, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Lesson {
  lesson_title: string;
  description: string;
}

interface Module {
  module_title: string;
  lessons: Lesson[];
}

interface GeneratedCourse {
  course_title: string;
  description: string;
  learning_outcomes: string[];
  modules: Module[];
}

export default function AICourseGenerator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Input form
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [duration, setDuration] = useState("4 weeks");
  const [language, setLanguage] = useState("English");
  const [instructions, setInstructions] = useState("");

  // State
  const [generating, setGenerating] = useState(false);
  const [course, setCourse] = useState<GeneratedCourse | null>(null);
  const [publishing, setPublishing] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: "Enter a topic", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setCourse(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-course", {
        body: { action: "generate", topic, audience, level, duration, language, instructions },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.course) {
        setCourse(data.course);
        toast({ title: "Course generated!", description: `Used ${data.tokens_used || 0} tokens` });
      }
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const handlePublish = async () => {
    if (!course || !user) return;
    setPublishing(true);
    try {
      // 1. Create course
      const { data: courseData, error: courseErr } = await supabase
        .from("courses")
        .insert({
          title: course.course_title,
          description: course.description,
          coach_id: user.id,
          is_published: false,
          price: 0,
        })
        .select("id")
        .single();
      if (courseErr) throw courseErr;
      const courseId = courseData.id;

      // 2. Create sections (modules) and chapters (lessons)
      for (let mi = 0; mi < course.modules.length; mi++) {
        const mod = course.modules[mi];
        const { data: sectionData, error: secErr } = await supabase
          .from("sections")
          .insert({
            course_id: courseId,
            title: mod.module_title,
            sort_order: mi,
          })
          .select("id")
          .single();
        if (secErr) throw secErr;

        const lessons = mod.lessons.map((l, li) => ({
          section_id: sectionData.id,
          title: l.lesson_title || (typeof l === "string" ? l : `Lesson ${li + 1}`),
          content: l.description || "",
          content_type: "text" as const,
          sort_order: li,
        }));

        const { error: chapErr } = await supabase.from("chapters").insert(lessons);
        if (chapErr) throw chapErr;
      }

      toast({ title: "Course created!", description: "Redirecting to course builder..." });
      navigate(`/course-builder/${courseId}`);
    } catch (e: any) {
      toast({ title: "Error creating course", description: e.message, variant: "destructive" });
    }
    setPublishing(false);
  };

  // Editable course title/description
  const updateField = (field: keyof GeneratedCourse, value: any) => {
    if (course) setCourse({ ...course, [field]: value });
  };

  const updateModuleTitle = (idx: number, title: string) => {
    if (!course) return;
    const modules = [...course.modules];
    modules[idx] = { ...modules[idx], module_title: title };
    setCourse({ ...course, modules });
  };

  const updateLessonTitle = (mi: number, li: number, title: string) => {
    if (!course) return;
    const modules = [...course.modules];
    const lessons = [...modules[mi].lessons];
    lessons[li] = { ...lessons[li], lesson_title: title };
    modules[mi] = { ...modules[mi], lessons };
    setCourse({ ...course, modules });
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" /> AI Course Generator
        </h1>

        {!course ? (
          /* ── INPUT FORM ── */
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="text-sm">Describe your course</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Course Topic *</Label>
                <Input placeholder="e.g. AI for Content Creators" value={topic} onChange={(e) => setTopic(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Target Audience</Label>
                  <Input placeholder="e.g. Beginners, Marketers" value={audience} onChange={(e) => setAudience(e.target.value)} />
                </div>
                <div>
                  <Label>Skill Level</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Course Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1 week">1 Week</SelectItem>
                      <SelectItem value="2 weeks">2 Weeks</SelectItem>
                      <SelectItem value="4 weeks">4 Weeks</SelectItem>
                      <SelectItem value="8 weeks">8 Weeks</SelectItem>
                      <SelectItem value="12 weeks">12 Weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Hindi">Hindi</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Additional Instructions (optional)</Label>
                <Textarea
                  placeholder="Any specific requirements, focus areas, or preferences..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating Course...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Generate Course</>
                )}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center">
                Uses your OpenAI API key configured in Settings → AI Settings
              </p>
            </CardContent>
          </Card>
        ) : (
          /* ── PREVIEW / EDIT ── */
          <div className="space-y-4">
            {/* Course Header */}
            <Card className="card-shadow">
              <CardContent className="p-6 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Course Title</Label>
                  <Input
                    value={course.course_title}
                    onChange={(e) => updateField("course_title", e.target.value)}
                    className="text-lg font-bold border-dashed"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Textarea
                    value={course.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={3}
                    className="border-dashed"
                  />
                </div>
                {course.learning_outcomes?.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Learning Outcomes</Label>
                    <ul className="mt-1 space-y-1">
                      {course.learning_outcomes.map((o, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Modules */}
            {course.modules.map((mod, mi) => (
              <Card key={mi} className="card-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-accent/20 text-accent rounded-full h-6 w-6 flex items-center justify-center">{mi + 1}</span>
                    <Input
                      value={mod.module_title}
                      onChange={(e) => updateModuleTitle(mi, e.target.value)}
                      className="border-dashed text-sm font-semibold"
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mod.lessons.map((lesson, li) => (
                    <div key={li} className="flex items-center gap-2 pl-8">
                      <span className="text-xs text-muted-foreground w-5">{li + 1}.</span>
                      <Input
                        value={lesson.lesson_title || (typeof lesson === "string" ? lesson : "")}
                        onChange={(e) => updateLessonTitle(mi, li, e.target.value)}
                        className="border-dashed text-xs h-8"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}

            {/* Action Buttons */}
            <div className="flex gap-3 sticky bottom-4">
              <Button
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={handlePublish}
                disabled={publishing}
              >
                {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Create Course
              </Button>
              <Button variant="outline" onClick={() => setCourse(null)}>
                <RotateCcw className="h-4 w-4 mr-1" /> Start Over
              </Button>
              <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Regenerate
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
