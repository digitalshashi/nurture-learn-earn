import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { GripVertical, Save, Loader2 } from "lucide-react";
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

function SortableItem({ course, index }: { course: Course; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: course.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border border-border bg-card ${isDragging ? "shadow-lg opacity-90" : ""}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-xs font-mono text-muted-foreground w-6">{String(index + 1).padStart(2, "0")}</span>
      {course.thumbnail_url && (
        <img src={course.thumbnail_url} alt="" className="w-10 h-7 rounded object-cover bg-secondary" />
      )}
      <span className="text-sm font-medium flex-1 truncate">{course.title}</span>
    </div>
  );
}

export function CourseReorderPanel({ open, onOpenChange, courses, onReordered }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<Course[]>([]);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Sync when opening
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setItems([...courses].sort((a, b) => a.display_order - b.display_order));
    }
    onOpenChange(v);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
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
        <p className="text-xs text-muted-foreground mb-4">Drag courses to set the order students see them.</p>

        <div className="flex-1 overflow-auto space-y-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((course, idx) => (
                <SortableItem key={course.id} course={course} index={idx} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </SheetContent>
    </Sheet>
  );
}
