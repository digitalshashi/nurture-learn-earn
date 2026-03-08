import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Save } from "lucide-react";

interface Props {
  courseId: string;
  course: any;
  onUpdate: () => void;
}

const dripOptions = [
  { value: "enrollment", label: "Student enrolment date", description: "Content unlocks X days after the student enrolls" },
  { value: "date", label: "On a specific date", description: "Content unlocks on a set calendar date" },
  { value: "completion", label: "By completion", description: "Content unlocks after completing previous sections" },
  { value: "none", label: "No drip", description: "Customers can access all the sections and chapters" },
];

export default function DripTab({ courseId, course, onUpdate }: Props) {
  const { toast } = useToast();
  const [dripType, setDripType] = useState(course.drip_type || "none");
  const [sections, setSections] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSections();
  }, [courseId]);

  const loadSections = async () => {
    const { data } = await supabase.from("sections").select("id, title, sort_order, drip_delay_days, drip_date").eq("course_id", courseId).order("sort_order");
    if (data) setSections(data);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from("courses").update({ drip_type: dripType }).eq("id", courseId);
      for (const sec of sections) {
        await supabase.from("sections").update({
          drip_delay_days: sec.drip_delay_days || 0,
          drip_date: sec.drip_date || null,
        }).eq("id", sec.id);
      }
      toast({ title: "Saved!", description: "Drip schedule updated" });
      onUpdate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Drip schedule</h2>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="mb-6">
        <h3 className="font-medium text-sm mb-1">Drip type</h3>
        <p className="text-sm text-muted-foreground mb-4">Select when the content will be unlocked.</p>
        <div className="grid grid-cols-4 gap-3">
          {dripOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDripType(opt.value)}
              className={`p-3 rounded-lg border text-sm text-center transition-all ${
                dripType === opt.value 
                  ? "border-accent bg-accent/5 text-accent font-medium" 
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <div className={`w-3 h-3 rounded-full border-2 ${dripType === opt.value ? "border-accent bg-accent" : "border-muted-foreground/40"}`} />
                {opt.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {dripType === "none" ? (
        <Card>
          <CardContent className="py-6">
            <p className="font-medium text-sm">No drip action</p>
            <p className="text-sm text-muted-foreground">Customers can access all the sections and chapters</p>
          </CardContent>
        </Card>
      ) : dripType === "enrollment" && sections.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Set delay per section</h3>
          {sections.map((sec, i) => (
            <div key={sec.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
              <span className="text-sm font-medium flex-1">{sec.title || `Section ${i + 1}`}</span>
              <Input
                type="number"
                value={sec.drip_delay_days || 0}
                onChange={(e) => {
                  const updated = [...sections];
                  updated[i].drip_delay_days = parseInt(e.target.value) || 0;
                  setSections(updated);
                }}
                className="w-20 h-8 text-sm"
              />
              <span className="text-xs text-muted-foreground">days after enrollment</span>
            </div>
          ))}
        </div>
      ) : dripType === "date" && sections.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Set unlock date per section</h3>
          {sections.map((sec, i) => (
            <div key={sec.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
              <span className="text-sm font-medium flex-1">{sec.title || `Section ${i + 1}`}</span>
              <Input
                type="date"
                value={sec.drip_date || ""}
                onChange={(e) => {
                  const updated = [...sections];
                  updated[i].drip_date = e.target.value;
                  setSections(updated);
                }}
                className="w-40 h-8 text-sm"
              />
            </div>
          ))}
        </div>
      ) : dripType === "completion" ? (
        <Card>
          <CardContent className="py-6">
            <p className="font-medium text-sm">Sequential completion</p>
            <p className="text-sm text-muted-foreground">Each section unlocks only after the previous section is completed.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
