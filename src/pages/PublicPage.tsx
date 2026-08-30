import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toPreviewDocument } from "@/lib/pageBuilder";
import { track } from "@/lib/track";

/**
 * Serves a published builder page at /p/:slug.
 *
 * Rendered inside a sandboxed iframe rather than injected into this document:
 * the markup is authored content, and a page that could reach the app's own
 * scope would have access to the visitor's session.
 */
export default function PublicPage() {
  const { slug } = useParams();
  const [html, setHtml] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("builder_pages")
        .select("coach_id, title, html, meta_title, meta_description")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      const row = data as
        | { coach_id: string; title: string; html: string; meta_title: string | null }
        | null;
      setHtml(row?.html ?? null);
      setTitle(row ? row.meta_title || row.title : null);
      setLoading(false);

      // A published page is marketing; its owner should be able to see whether
      // anyone read it.
      if (row) {
        void track({ coachId: row.coach_id, event: "page_view", subjectType: "page" });
      }
    };
    load();
  }, [slug]);

  useEffect(() => {
    if (title) document.title = title;
  }, [title]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!html) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
        <h1 className="text-xl font-bold">Page not found</h1>
        <p className="text-sm text-muted-foreground mt-1">
          This page doesn't exist, or it hasn't been published yet.
        </p>
      </div>
    );
  }

  return (
    <iframe
      title={title ?? "Page"}
      // allow-forms so a signup form on the page can submit; scripts stay off
      // unless the page needs them, which keeps the default safe.
      sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox"
      srcDoc={toPreviewDocument(html)}
      className="w-screen h-screen border-0 block"
    />
  );
}
