import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  editId?: string | null;
}

const TEMPLATES = ["classic", "modern", "elegant", "minimal"];
const TRIGGERS = [
  { value: "course_completed", label: "Course Completed" },
  { value: "section_completed", label: "Section Completed" },
  { value: "service_completed", label: "Service Completed" },
  { value: "manual", label: "Manual Approval" },
];

export function CreateCertificateDialog({ open, onOpenChange, onSaved, editId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [templateStyle, setTemplateStyle] = useState("classic");
  const [triggerType, setTriggerType] = useState("course_completed");
  const [linkedCourseId, setLinkedCourseId] = useState<string>("");
  const [linkedSectionId, setLinkedSectionId] = useState<string>("");
  const [linkedServiceId, setLinkedServiceId] = useState<string>("");
  const [certificateText, setCertificateText] = useState(
    "This certificate is awarded to {student_name} for successfully completing {course_name}"
  );

  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; title: string; course_id: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (open) {
      fetchOptions();
      if (editId) fetchTemplate();
      else resetForm();
    }
  }, [open, editId]);

  const fetchOptions = async () => {
    const [c, sec, svc] = await Promise.all([
      supabase.from("courses").select("id, title").order("title"),
      supabase.from("sections").select("id, title, course_id").order("title"),
      supabase.from("services").select("id, name").order("name"),
    ]);
    if (c.data) setCourses(c.data);
    if (sec.data) setSections(sec.data);
    if (svc.data) setServices(svc.data);
  };

  const fetchTemplate = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("id", editId!)
      .single();
    if (data) {
      setName(data.name);
      setTemplateStyle(data.template_style);
      setTriggerType(data.trigger_type);
      setLinkedCourseId(data.linked_course_id || "");
      setLinkedSectionId(data.linked_section_id || "");
      setLinkedServiceId(data.linked_service_id || "");
      setCertificateText(data.certificate_text || "");
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName("");
    setTemplateStyle("classic");
    setTriggerType("course_completed");
    setLinkedCourseId("");
    setLinkedSectionId("");
    setLinkedServiceId("");
    setCertificateText("This certificate is awarded to {student_name} for successfully completing {course_name}");
  };

  const handleSave = async () => {
    if (!user || !name.trim()) {
      toast({ title: "Certificate name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      coach_id: user.id,
      name: name.trim(),
      template_style: templateStyle,
      trigger_type: triggerType,
      linked_course_id: triggerType === "course_completed" && linkedCourseId ? linkedCourseId : null,
      linked_section_id: triggerType === "section_completed" && linkedSectionId ? linkedSectionId : null,
      linked_service_id: triggerType === "service_completed" && linkedServiceId ? linkedServiceId : null,
      certificate_text: certificateText,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from("certificate_templates").update(payload).eq("id", editId));
    } else {
      ({ error } = await supabase.from("certificate_templates").insert(payload));
    }

    if (error) {
      toast({ title: "Error saving certificate", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editId ? "Certificate updated" : "Certificate created" });
      onSaved();
      onOpenChange(false);
    }
    setSaving(false);
  };

  const showCourse = triggerType === "course_completed";
  const showSection = triggerType === "section_completed";
  const showService = triggerType === "service_completed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? "Edit Certificate" : "Create Certificate"}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Certificate Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AI Video Mastery Completion" />
            </div>

            <div>
              <Label>Template Style</Label>
              <Select value={templateStyle} onValueChange={setTemplateStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)} Template</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Trigger Condition</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showCourse && (
              <div>
                <Label>Linked Course</Label>
                <Select value={linkedCourseId} onValueChange={setLinkedCourseId}>
                  <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showSection && (
              <div>
                <Label>Linked Section</Label>
                <Select value={linkedSectionId} onValueChange={setLinkedSectionId}>
                  <SelectTrigger><SelectValue placeholder="Select a section" /></SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showService && (
              <div>
                <Label>Linked Service</Label>
                <Select value={linkedServiceId} onValueChange={setLinkedServiceId}>
                  <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Certificate Text</Label>
              <Textarea
                rows={3}
                value={certificateText}
                onChange={(e) => setCertificateText(e.target.value)}
                placeholder="Use {student_name} and {course_name} as placeholders"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variables: {"{student_name}"}, {"{course_name}"}, {"{date}"}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {editId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
