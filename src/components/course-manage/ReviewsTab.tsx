import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Search as SearchIcon } from "lucide-react";
import { format } from "date-fns";

export default function ReviewsTab({ courseId }: { courseId: string }) {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => { loadReviews(); }, [courseId]);

  const loadReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*, profiles:user_id(full_name, email)")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });
    if (data) setReviews(data);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("reviews").delete().eq("id", id);
    setReviews(reviews.filter(r => r.id !== id));
    toast({ title: "Deleted" });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Reviews</h2>
        <p className="text-sm text-muted-foreground">List of all the reviews by the students</p>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Date of Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-16">
                  <SearchIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Student reviews will appear here when submitted</p>
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{(r.profiles as any)?.full_name || "—"}</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell className="max-w-[300px] truncate">{r.review_text || "—"}</TableCell>
                  <TableCell className="text-sm">{format(new Date(r.created_at), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
