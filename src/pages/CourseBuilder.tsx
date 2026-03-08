import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, GripVertical, Trash2, ChevronDown, ChevronRight, Save, Video, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Section {
  id?: string;
  title: string;
  sort_order: number;
  chapters: Chapter[];
}

interface Chapter {
  id?: string;
  title: string;
  video_url: string;
  video_type: string;
  content: string;
  sort_order: number;
}

export default function CourseBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditing = !!id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [category, setCategory] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing) loadCourse();
  }, [id]);

  const loadCourse = async () => {
    const { data: course } = await supabase.from("courses").select("*").eq("id", id).single();
    if (!course) return;
    setTitle(course.title);
    setDescription(course.description || "");
    setPrice(String(course.price));
    setCategory(course.category || "");
    setThumbnailUrl(course.thumbnail_url || "");

    const { data: secs } = await supabase.from("sections").select("*, chapters(*)").eq("course_id", id).order("sort_order");
    if (secs) {
      setSections(secs.map((s: any) => ({
        id: s.id,
        title: s.title,
        sort_order: s.sort_order,
        chapters: (s.chapters || []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((c: any) => ({
          id: c.id,
          title: c.title,
          video_url: c.video_url || "",
          video_type: c.video_type || "direct",
          content: c.content || "",
          sort_order: c.sort_order,
        })),
      })));
    }
  };

  const addSection = () => {
    setSections([...sections, { title: "", sort_order: sections.length, chapters: [] }]);
    setExpandedSections(new Set([...expandedSections, sections.length]));
  };

  const addChapter = (sectionIdx: number) => {
    const updated = [...sections];
    updated[sectionIdx].chapters.push({
      title: "",
      video_url: "",
      video_type: "direct",
      content: "",
      sort_order: updated[sectionIdx].chapters.length,
    });
    setSections(updated);
  };

  const updateSection = (idx: number, field: string, value: string) => {
    const updated = [...sections];
    (updated[idx] as any)[field] = value;
    setSections(updated);
  };

  const updateChapter = (sIdx: number, cIdx: number, field: string, value: string) => {
    const updated = [...sections];
    (updated[sIdx].chapters[cIdx] as any)[field] = value;
    setSections(updated);
  };

  const removeSection = (idx: number) => {
    setSections(sections.filter((_, i) => i !== idx));
  };

  const removeChapter = (sIdx: number, cIdx: number) => {
    const updated = [...sections];
    updated[sIdx].chapters = updated[sIdx].chapters.filter((_, i) => i !== cIdx);
    setSections(updated);
  };

  const toggleSection = (idx: number) => {
    const next = new Set(expandedSections);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setExpandedSections(next);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Error", description: "Course title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let courseId = id;

      if (isEditing) {
        await supabase.from("courses").update({
          title, description, price: parseFloat(price), category, thumbnail_url: thumbnailUrl || null, updated_at: new Date().toISOString(),
        }).eq("id", id);
      } else {
        const { data, error } = await supabase.from("courses").insert({
          title, description, price: parseFloat(price), category, thumbnail_url: thumbnailUrl || null, coach_id: user!.id, is_published: false,
        }).select("id").single();
        if (error) throw error;
        courseId = data.id;
      }

      // Save sections and chapters
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        let sectionId = sec.id;

        if (sectionId) {
          await supabase.from("sections").update({ title: sec.title, sort_order: i }).eq("id", sectionId);
        } else {
          const { data } = await supabase.from("sections").insert({
            course_id: courseId!, title: sec.title, sort_order: i,
          }).select("id").single();
          sectionId = data?.id;
        }

        if (!sectionId) continue;

        for (let j = 0; j < sec.chapters.length; j++) {
          const ch = sec.chapters[j];
          if (ch.id) {
            await supabase.from("chapters").update({
              title: ch.title, video_url: ch.video_url || null, video_type: ch.video_type, content: ch.content || null, sort_order: j,
            }).eq("id", ch.id);
          } else {
            await supabase.from("chapters").insert({
              section_id: sectionId, title: ch.title, video_url: ch.video_url || null, video_type: ch.video_type, content: ch.content || null, sort_order: j,
            });
          }
        }
      }

      toast({ title: "Saved!", description: "Course saved successfully" });
      if (!isEditing) navigate(`/course-builder/${courseId}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    await supabase.from("courses").update({ is_published: true }).eq("id", id);
    toast({ title: "Published!", description: "Course is now live" });
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">{isEditing ? "Edit Course" : "Create Course"}</h1>
          <div className="flex gap-2">
            {isEditing && (
              <Button variant="outline" onClick={handlePublish}>Publish</Button>
            )}
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Course Details */}
        <Card className="card-shadow mb-6">
          <CardHeader><CardTitle className="text-base">Course Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. AI Business Mastery" className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will students learn?" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (₹)</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Business, Tech" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Thumbnail URL</Label>
              <Input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..." className="mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Sections & Chapters */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base">Sections & Chapters</h2>
          <Button variant="outline" size="sm" onClick={addSection}>
            <Plus className="h-4 w-4 mr-1" /> Add Section
          </Button>
        </div>

        <div className="space-y-3">
          {sections.map((section, sIdx) => (
            <Card key={sIdx} className="card-shadow">
              <div
                className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => toggleSection(sIdx)}
              >
                {expandedSections.has(sIdx) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Section {sIdx + 1}</span>
                <Input
                  value={section.title}
                  onChange={(e) => { e.stopPropagation(); updateSection(sIdx, "title", e.target.value); }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Section title"
                  className="flex-1 h-8 text-sm font-medium"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); removeSection(sIdx); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {expandedSections.has(sIdx) && (
                <CardContent className="pt-0 pb-3 space-y-2">
                  {section.chapters.map((ch, cIdx) => (
                    <div key={cIdx} className="ml-6 border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Input value={ch.title} onChange={(e) => updateChapter(sIdx, cIdx, "title", e.target.value)} placeholder="Chapter title" className="h-8 text-sm" />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeChapter(sIdx, cIdx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-muted-foreground shrink-0" />
                          <Input value={ch.video_url} onChange={(e) => updateChapter(sIdx, cIdx, "video_url", e.target.value)} placeholder="Video URL" className="h-8 text-sm" />
                        </div>
                        <Select value={ch.video_type} onValueChange={(v) => updateChapter(sIdx, cIdx, "video_type", v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="direct">Direct Upload</SelectItem>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="loom">Loom</SelectItem>
                            <SelectItem value="vimeo">Vimeo</SelectItem>
                            <SelectItem value="drive">Google Drive</SelectItem>
                            <SelectItem value="iframe">Custom Iframe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Textarea value={ch.content} onChange={(e) => updateChapter(sIdx, cIdx, "content", e.target.value)} placeholder="Lesson notes / description" className="text-sm min-h-[50px]" />
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="ml-6 text-accent" onClick={() => addChapter(sIdx)}>
                    <Plus className="h-4 w-4 mr-1" /> Add Chapter
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}

          {sections.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
              No sections yet. Click "Add Section" to start building your course.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
