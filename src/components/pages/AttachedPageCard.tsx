import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PAGE_TYPES, type PageType } from "@/lib/pageBuilder";
import { AiPageButton, type PageAttachment } from "./AiPageButton";

interface Props {
  pageType: PageType;
  /** What the page belongs to. Null while the owner has no id to attach to. */
  attachment: PageAttachment | null;
  /** Names the page, so a coach with many can tell them apart in the builder. */
  ownerName: string;
  /** Real details handed to the model instead of invented ones. */
  context?: Record<string, string>;
  /** Shown when there is nothing to attach to yet. */
  emptyHint?: string;
  /** What a visitor sees while no design is published. */
  defaultLabel?: string;
}

interface AttachedPage {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  html: string;
}

/**
 * The AI-designed page attached to one thing — a service's checkout, its
 * confirmation page, or a white-label domain's home page.
 *
 * Shows what a visitor sees right now: the platform's default, a draft that is
 * not live yet, or a published design. Never leaves the owner guessing which.
 */
export function AttachedPageCard({
  pageType,
  attachment,
  ownerName,
  context,
  emptyHint,
  defaultLabel,
}: Props) {
  const { toast } = useToast();
  const spec = PAGE_TYPES[pageType];

  const [page, setPage] = useState<AttachedPage | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!attachment) {
      setLoading(false);
      return;
    }
    const base = supabase
      .from("builder_pages")
      .select("id, title, slug, status, html")
      .eq("page_type", pageType);

    const { data } = await (attachment.kind === "service"
      ? base.eq("service_id", attachment.serviceId)
      : base.eq("coach_id", attachment.ownerId).eq("is_tenant_home", true)
    ).maybeSingle();

    setPage((data as AttachedPage | null) ?? null);
    setLoading(false);
  }, [attachment, pageType]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async () => {
    if (!page) return;
    const { error } = await supabase.from("builder_pages").delete().eq("id", page.id);
    if (error) {
      toast({ title: "Couldn't remove", description: error.message, variant: "destructive" });
      return;
    }
    setPage(null);
    toast({ title: `Back to the ${defaultLabel ?? "default page"}` });
  };

  const live = page?.status === "published" && page.html.trim().length > 0;

  return (
    <Card className="border border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Label className="font-semibold">{spec.label}</Label>
          {!loading &&
            (live ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 text-[10px]">Live</Badge>
            ) : page ? (
              <Badge variant="outline" className="text-[10px]">Draft</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">Default</Badge>
            ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {live
            ? "Visitors see your design. Publish again in the editor to update it."
            : page
              ? `Your design isn't published yet, so visitors still see the ${defaultLabel ?? "default page"}.`
              : spec.description}
        </p>

        {!attachment ? (
          <p className="text-xs text-muted-foreground">{emptyHint}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <AiPageButton
              pageType={pageType}
              attachment={attachment}
              context={context}
              defaultTitle={`${ownerName || spec.label} — ${spec.label.toLowerCase()}`}
              label={page ? "Redesign with AI" : "Design with AI"}
              onCreated={load}
            />

            {page && (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/page-builder/${page.id}`}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Link>
                </Button>
                {live && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`/p/${page.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Preview
                    </a>
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-destructive" onClick={remove}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Use default
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AttachedPageCard;
