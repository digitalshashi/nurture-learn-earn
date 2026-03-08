import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plus, GripVertical, Trash2, ChevronDown, ChevronRight, Save, Video, FileText,
  Upload, Image, File, X, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import LessonRecorder from "@/components/course-manage/LessonRecorder";

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
  thumbnail_url: string;
  video_description: string;
  resources: any[];
}

const VIDEO_ACCEPT = ".mp4,.mov,.webm,.avi,.mkv";
const THUMB_ACCEPT = ".jpg,.jpeg,.png,.webp";
const RESOURCE_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.zip,.jpg,.jpeg,.png,.webp";

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
  const [uploadingVideo, setUploadingVideo] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

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
          video_type: c.video_type || "upload",
          content: c.content || "",
          sort_order: c.sort_order,
          thumbnail_url: c.thumbnail_url || "",
          video_description: c.video_description || "",
          resources: Array.isArray(c.resources) ? c.resources : [],
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
      title: "", video_url: "", video_type: "upload", content: "",
      sort_order: updated[sectionIdx].chapters.length,
      thumbnail_url: "", video_description: "", resources: [],
    });
    setSections(updated);
  };

  const updateSection = (idx: number, field: string, value: string) => {
    const updated = [...sections];
    (updated[idx] as any)[field] = value;
    setSections(updated);
  };

  const updateChapter = (sIdx: number, cIdx: number, field: string, value: any) => {
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

  // Upload video file
  const uploadVideoFile = async (sIdx: number, cIdx: number, file: File) => {
    const key = `${sIdx}-${cIdx}`;
    setUploadingVideo(key);
    setUploadProgress(0);
    try {
      const ext = file.name.split(".").pop();
      const path = `videos/${user!.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("course-videos").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("course-videos").getPublicUrl(path);
      updateChapter(sIdx, cIdx, "video_url", urlData.publicUrl);
      updateChapter(sIdx, cIdx, "video_type", "upload");
      toast({ title: "Video uploaded successfully" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingVideo(null);
      setUploadProgress(0);
    }
  };

  // Upload thumbnail
  const uploadThumbnail = async (sIdx: number, cIdx: number, file: File) => {
    const key = `${sIdx}-${cIdx}`;
    setUploadingThumb(key);
    try {
      const ext = file.name.split(".").pop();
      const path = `thumbnails/${user!.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("course-videos").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("course-videos").getPublicUrl(path);
      updateChapter(sIdx, cIdx, "thumbnail_url", urlData.publicUrl);
      toast({ title: "Thumbnail uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingThumb(null);
    }
  };

  // Upload resource file
  const uploadResource = async (sIdx: number, cIdx: number, file: File) => {
    try {
      const ext = file.name.split(".").pop();
      const path = `resources/${user!.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("course-videos").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("course-videos").getPublicUrl(path);
      const ch = sections[sIdx].chapters[cIdx];
      const newResources = [...(ch.resources || []), { name: file.name, url: urlData.publicUrl, type: ext }];
      updateChapter(sIdx, cIdx, "resources", newResources);
      toast({ title: "Resource uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    }
  };

  const removeResource = (sIdx: number, cIdx: number, rIdx: number) => {
    const ch = sections[sIdx].chapters[cIdx];
    const newResources = ch.resources.filter((_: any, i: number) => i !== rIdx);
    updateChapter(sIdx, cIdx, "resources", newResources);
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
          title, description, price: parseFloat(price), category,
          thumbnail_url: thumbnailUrl || null, updated_at: new Date().toISOString(),
        }).eq("id", id);
      } else {
        const { data, error } = await supabase.from("courses").insert({
          title, description, price: parseFloat(price), category,
          thumbnail_url: thumbnailUrl || null, coach_id: user!.id, is_published: false,
        }).select("id").single();
        if (error) throw error;
        courseId = data.id;
      }

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
          const chapterData = {
            title: ch.title, video_url: ch.video_url || null, video_type: ch.video_type,
            content: ch.content || null, sort_order: j,
            thumbnail_url: ch.thumbnail_url || null,
            video_description: ch.video_description || null,
            resources: ch.resources?.length > 0 ? ch.resources : null,
          };
          if (ch.id) {
            await supabase.from("chapters").update(chapterData).eq("id", ch.id);
          } else {
            await supabase.from("chapters").insert({ section_id: sectionId, ...chapterData });
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
            {isEditing && <Button variant="outline" onClick={handlePublish}>Publish</Button>}
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
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. AI Business Mastery" className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What will students learn?" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (₹)</Label>
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Business, Tech" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Thumbnail URL</Label>
              <Input value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} placeholder="https://..." className="mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Sections & Chapters */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base">Sections & Chapters</h2>
          <Button variant="outline" size="sm" onClick={addSection}><Plus className="h-4 w-4 mr-1" /> Add Section</Button>
        </div>

        <div className="space-y-3">
          {sections.map((section, sIdx) => (
            <Card key={sIdx} className="card-shadow">
              <div className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => toggleSection(sIdx)}>
                {expandedSections.has(sIdx) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Section {sIdx + 1}</span>
                <Input value={section.title} onChange={e => { e.stopPropagation(); updateSection(sIdx, "title", e.target.value); }} onClick={e => e.stopPropagation()} placeholder="Section title" className="flex-1 h-8 text-sm font-medium" />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); removeSection(sIdx); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>

              {expandedSections.has(sIdx) && (
                <CardContent className="pt-0 pb-3 space-y-3">
                  {section.chapters.map((ch, cIdx) => (
                    <ChapterEditor
                      key={cIdx}
                      chapter={ch}
                      sIdx={sIdx}
                      cIdx={cIdx}
                      uploadingVideo={uploadingVideo}
                      uploadingThumb={uploadingThumb}
                      uploadProgress={uploadProgress}
                      onUpdate={updateChapter}
                      onRemove={removeChapter}
                      onUploadVideo={uploadVideoFile}
                      onUploadThumb={uploadThumbnail}
                      onUploadResource={uploadResource}
                      onRemoveResource={removeResource}
                    />
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

// Chapter Editor Component
function ChapterEditor({
  chapter, sIdx, cIdx,
  uploadingVideo, uploadingThumb, uploadProgress,
  onUpdate, onRemove, onUploadVideo, onUploadThumb, onUploadResource, onRemoveResource,
}: {
  chapter: Chapter; sIdx: number; cIdx: number;
  uploadingVideo: string | null; uploadingThumb: string | null; uploadProgress: number;
  onUpdate: (s: number, c: number, f: string, v: any) => void;
  onRemove: (s: number, c: number) => void;
  onUploadVideo: (s: number, c: number, f: File) => void;
  onUploadThumb: (s: number, c: number, f: File) => void;
  onUploadResource: (s: number, c: number, f: File) => void;
  onRemoveResource: (s: number, c: number, r: number) => void;
}) {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const resourceInputRef = useRef<HTMLInputElement>(null);
  const key = `${sIdx}-${cIdx}`;
  const isUploadingVid = uploadingVideo === key;
  const isUploadingThb = uploadingThumb === key;

  return (
    <div className="ml-6 border border-border rounded-lg p-4 space-y-3">
      {/* Title Row */}
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input value={chapter.title} onChange={e => onUpdate(sIdx, cIdx, "title", e.target.value)} placeholder="Chapter title" className="h-8 text-sm" />
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => onRemove(sIdx, cIdx)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Video Source */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Video Source</Label>
        <Select value={chapter.video_type} onValueChange={v => onUpdate(sIdx, cIdx, "video_type", v)}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="upload">📤 Upload Video File</SelectItem>
            <SelectItem value="youtube">▶️ YouTube Link</SelectItem>
            <SelectItem value="vimeo">🎬 Vimeo Link</SelectItem>
            <SelectItem value="loom">🔴 Loom Link</SelectItem>
            <SelectItem value="drive">📁 Google Drive</SelectItem>
            <SelectItem value="iframe">🌐 Custom Iframe</SelectItem>
          </SelectContent>
        </Select>

        {chapter.video_type === "upload" ? (
          <div className="space-y-2">
            {chapter.video_url ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border">
                <Video className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs truncate flex-1">{chapter.video_url.split("/").pop()}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdate(sIdx, cIdx, "video_url", "")}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                onClick={() => videoInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={e => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f) onUploadVideo(sIdx, cIdx, f); }}
              >
                {isUploadingVid ? (
                  <div className="space-y-2">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Uploading video...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-xs font-medium">Drag & Drop Video Here</p>
                    <p className="text-xs text-muted-foreground">or click to select · MP4, MOV, WEBM, AVI, MKV (max 2GB)</p>
                  </>
                )}
              </div>
            )}
            <input ref={videoInputRef} type="file" accept={VIDEO_ACCEPT} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUploadVideo(sIdx, cIdx, f); e.target.value = ""; }} />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input value={chapter.video_url} onChange={e => onUpdate(sIdx, cIdx, "video_url", e.target.value)} placeholder="Paste video URL..." className="h-8 text-sm" />
          </div>
        )}
      </div>

      {/* Thumbnail */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Video Thumbnail</Label>
        {chapter.thumbnail_url ? (
          <div className="flex items-center gap-2">
            <img src={chapter.thumbnail_url} alt="Thumb" className="h-16 w-28 object-cover rounded border" />
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdate(sIdx, cIdx, "thumbnail_url", "")}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div
            className="border border-dashed border-border rounded-md p-3 flex items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => thumbInputRef.current?.click()}
          >
            {isUploadingThb ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Image className="h-4 w-4 text-muted-foreground" />}
            <span className="text-xs text-muted-foreground">{isUploadingThb ? "Uploading..." : "Upload thumbnail (JPG, PNG, WEBP)"}</span>
          </div>
        )}
        <input ref={thumbInputRef} type="file" accept={THUMB_ACCEPT} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUploadThumb(sIdx, cIdx, f); e.target.value = ""; }} />
      </div>

      {/* Video Description */}
      <div className="space-y-1">
        <Label className="text-xs font-medium text-muted-foreground">Video Description</Label>
        <Textarea value={chapter.video_description} onChange={e => onUpdate(sIdx, cIdx, "video_description", e.target.value)} placeholder="Describe what students will learn in this lesson..." className="text-sm min-h-[50px]" />
      </div>

      {/* Lesson Notes */}
      <div className="space-y-1">
        <Label className="text-xs font-medium text-muted-foreground">Lesson Notes</Label>
        <Textarea value={chapter.content} onChange={e => onUpdate(sIdx, cIdx, "content", e.target.value)} placeholder="Additional notes or text content..." className="text-sm min-h-[50px]" />
      </div>

      {/* Resources */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground">Resources</Label>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => resourceInputRef.current?.click()}>
            <Upload className="h-3 w-3 mr-1" />Add File
          </Button>
        </div>
        {(chapter.resources || []).length > 0 && (
          <div className="space-y-1">
            {chapter.resources.map((r: any, rIdx: number) => (
              <div key={rIdx} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/50 border text-xs">
                <File className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{r.name}</span>
                <Badge variant="secondary" className="text-[10px]">{r.type}</Badge>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onRemoveResource(sIdx, cIdx, rIdx)}>
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <input ref={resourceInputRef} type="file" accept={RESOURCE_ACCEPT} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUploadResource(sIdx, cIdx, f); e.target.value = ""; }} />
      </div>
    </div>
  );
}
