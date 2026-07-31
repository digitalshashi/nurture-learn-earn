import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { GripVertical, Save, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  display_order: number;
  thumbnail_url?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
  onReordered: () => void;
}

export function CourseReorderPanel({ open, onOpenChange, courses, onReordered }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<Course[]>([]);
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setItems([...courses].sort((a, b) => a.display_order - b.display_order));
    }
    onOpenChange(v);
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = items.map((item, idx) =>
        supabase.from("courses").update({ display_order: idx + 1 }).eq("id", item.id)
      );
      await Promise.all(updates);
      toast({ title: "Course order updated successfully" });
      onReordered();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error saving order", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="flex-row items-center justify-between space-y-0 pr-8">
          <SheetTitle>Reorder Courses</SheetTitle>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
        </SheetHeader>
        <p className="text-xs text-muted-foreground mb-4">Use the arrows to reorder courses.</p>

        <div className="flex-1 overflow-auto space-y-2">
          {items.map((course, idx) => (
            <div
              key={course.id}
              className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">
                {String(idx + 1).padStart(2, "0")}
              </span>
              {course.thumbnail_url && (
                <img src={course.thumbnail_url} alt="" className="w-10 h-7 rounded object-cover bg-secondary shrink-0" />
              )}
              <span className="text-sm font-medium flex-1 truncate">{course.title}</span>
              <div className="flex flex-col gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={idx === 0}
                  onClick={() => moveItem(idx, "up")}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={idx === items.length - 1}
                  onClick={() => moveItem(idx, "down")}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
