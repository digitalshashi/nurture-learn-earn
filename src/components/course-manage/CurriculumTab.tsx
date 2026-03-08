import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { 
  Plus, GripVertical, Trash2, ChevronDown, ChevronRight, Save, 
  Video, FileText, Music, Image, Link, File, Play
} from "lucide-react";
import ChapterResources, { type Resource } from "./ChapterResources";

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
  content_type: string;
  sort_order: number;
  resources: Resource[];
}

const contentTypeIcons: Record<string, any> = {
  video: Video,
  youtube: Play,
  audio: Music,
  pdf: File,
  image: Image,
  link: Link,
  text: FileText,
  loom: Video,
  vimeo: Video,
  drive: Video,
  iframe: Video,
};

export default function CurriculumTab({ courseId }: { courseId: string }) {
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSections(); }, [courseId]);

  const loadSections = async () => {
    const { data: secs } = await supabase
      .from("sections")
      .select("*, chapters(*)")
      .eq("course_id", courseId)
      .order("sort_order");
    if (secs) {
      setSections(secs.map((s: any) => ({
        id: s.id,
        title: s.title,
        sort_order: s.sort_order,
        chapters: (s.chapters || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((c: any) => ({
            id: c.id,
            title: c.title,
            video_url: c.video_url || "",
            video_type: c.video_type || "direct",
            content: c.content || "",
            content_type: c.content_type || "video",
            sort_order: c.sort_order,
            resources: Array.isArray(c.resources) ? c.resources : [],
          })),
      })));
    }
  };

  const addSection = () => {
    setSections([...sections, { title: "", sort_order: sections.length, chapters: [] }]);
    setExpandedSections(new Set([...expandedSections, sections.length]));
  };

  const addChapter = (sIdx: number) => {
    const updated = [...sections];
    updated[sIdx].chapters.push({
      title: "", video_url: "", video_type: "direct", content: "",
      content_type: "video", sort_order: updated[sIdx].chapters.length,
      resources: [],
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

  const removeSection = (idx: number) => setSections(sections.filter((_, i) => i !== idx));
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
    setSaving(true);
    try {
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        let sectionId = sec.id;

        if (sectionId) {
          await supabase.from("sections").update({ title: sec.title, sort_order: i }).eq("id", sectionId);
        } else {
          const { data } = await supabase.from("sections").insert({
            course_id: courseId, title: sec.title, sort_order: i,
          }).select("id").single();
          sectionId = data?.id;
        }
        if (!sectionId) continue;

        for (let j = 0; j < sec.chapters.length; j++) {
          const ch = sec.chapters[j];
          const payload = {
            title: ch.title, video_url: ch.video_url || null,
            video_type: ch.video_type, content: ch.content || null,
            content_type: ch.content_type, sort_order: j,
            resources: ch.resources || [],
          };
          if (ch.id) {
            await supabase.from("chapters").update(payload).eq("id", ch.id);
          } else {
            await supabase.from("chapters").insert({ section_id: sectionId, ...payload });
          }
        }
      }
      toast({ title: "Saved!", description: "Curriculum saved successfully" });
      loadSections();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Curriculum</h2>
          <p className="text-sm text-muted-foreground">Build your course sections and chapters</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addSection}>
            <Plus className="h-4 w-4 mr-1" /> Add new section
          </Button>
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((section, sIdx) => {
          const ContentIcon = contentTypeIcons[section.chapters[0]?.content_type] || FileText;
          return (
            <Card key={sIdx} className="overflow-hidden">
              <div
                className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => toggleSection(sIdx)}
              >
                {expandedSections.has(sIdx) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
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
                <div className="px-4 pb-3 space-y-2">
                  {section.chapters.map((ch, cIdx) => {
                    const ChIcon = contentTypeIcons[ch.content_type] || FileText;
                    return (
                      <div key={cIdx} className="ml-6 border border-border rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <ChIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <Input value={ch.title} onChange={(e) => updateChapter(sIdx, cIdx, "title", e.target.value)} placeholder="Chapter title" className="h-8 text-sm" />
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeChapter(sIdx, cIdx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Select value={ch.content_type} onValueChange={(v) => updateChapter(sIdx, cIdx, "content_type", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Content type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="video">Video Upload</SelectItem>
                              <SelectItem value="youtube">YouTube</SelectItem>
                              <SelectItem value="drive">Google Drive</SelectItem>
                              <SelectItem value="loom">Loom</SelectItem>
                              <SelectItem value="vimeo">Vimeo</SelectItem>
                              <SelectItem value="audio">Audio</SelectItem>
                              <SelectItem value="pdf">PDF</SelectItem>
                              <SelectItem value="image">Image</SelectItem>
                              <SelectItem value="link">External Link</SelectItem>
                              <SelectItem value="text">Text Lesson</SelectItem>
                              <SelectItem value="iframe">Custom Iframe</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input value={ch.video_url} onChange={(e) => updateChapter(sIdx, cIdx, "video_url", e.target.value)} placeholder="Content URL" className="h-8 text-sm col-span-2" />
                        </div>
                        <Textarea value={ch.content} onChange={(e) => updateChapter(sIdx, cIdx, "content", e.target.value)} placeholder="Lesson notes / description" className="text-sm min-h-[50px]" />
                      </div>
                    );
                  })}
                  <Button variant="ghost" size="sm" className="ml-6 text-accent" onClick={() => addChapter(sIdx)}>
                    <Plus className="h-4 w-4 mr-1" /> Add Chapter
                  </Button>
                </div>
              )}
            </Card>
          );
        })}

        {sections.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
            No sections yet. Click "Add new section" to start building your course.
          </div>
        )}
      </div>
    </div>
  );
}
