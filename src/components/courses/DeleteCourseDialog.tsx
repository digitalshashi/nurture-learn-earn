/**
 * One confirmation for deleting a course, shared by every surface that offers
 * it — the course grid, the manage picker and the course editor — so the guard
 * cannot be strong in one place and absent in another.
 */
import { useEffect, useState } from "react";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  confirmationMatches, courseDeleteWarnings, deleteCourse, readCourseImpact,
  requiresTypedConfirmation, type CourseImpact,
} from "@/lib/courseDelete";
import { AlertTriangle, Loader2 } from "lucide-react";

export function DeleteCourseDialog({
  course,
  onOpenChange,
  onDeleted,
}: {
  /** The course to delete, or null when the dialog is closed. */
  course: { id: string; title: string; is_published?: boolean } | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (courseId: string) => void;
}) {
  const { toast } = useToast();
  const [impact, setImpact] = useState<CourseImpact | null>(null);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!course) return;
    setImpact(null);
    setTyped("");
    let cancelled = false;
    readCourseImpact(course.id).then((result) => {
      if (!cancelled) setImpact(result);
    });
    return () => {
      cancelled = true;
    };
  }, [course]);

  if (!course) return null;

  const loading = impact === null;
  const needsTyping = impact ? requiresTypedConfirmation(impact) : false;
  const canDelete =
    !loading && !deleting && (!needsTyping || confirmationMatches(typed, course.title));

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteCourse(course.id);
      toast({ title: `“${course.title}” deleted` });
      onDeleted(course.id);
      onOpenChange(false);
    } catch (err) {
      // Stays open on failure: the reason is worth reading, and a dialog that
      // vanishes leaves the coach staring at a course that is still there.
      toast({
        title: "Course not deleted",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={(open) => !open && !deleting && onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </span>
            Delete “{course.title}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the course. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking what this affects…
          </div>
        ) : (
          <ul className="space-y-1.5 rounded-lg border border-border bg-secondary/40 p-3 text-xs">
            {courseDeleteWarnings(impact, course.is_published ?? false).map((warning) => (
              <li key={warning} className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        )}

        {needsTyping && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium">
              Students are enrolled. Type <span className="font-semibold">{course.title}</span> to
              confirm.
            </p>
            <Input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={course.title}
              className="h-9"
            />
          </div>
        )}

        <AlertDialogFooter>
          <Button variant="ghost" disabled={deleting} onClick={() => onOpenChange(false)}>
            Keep the course
          </Button>
          <Button
            variant="destructive"
            disabled={!canDelete}
            onClick={remove}
          >
            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete permanently
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
