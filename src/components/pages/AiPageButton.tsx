import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAutoGrow } from "@/hooks/useAutoGrow";
import { PAGE_TYPES, slugify, type PageType } from "@/lib/pageBuilder";

/** What a generated page belongs to, and therefore where it is served. */
export type PageAttachment =
  | { kind: "service"; serviceId: string }
  | { kind: "tenant_home"; ownerId: string };

interface Props {
  pageType: PageType;
  attachment: PageAttachment;
  /** Real details handed to the model instead of invented ones. */
  context?: Record<string, string>;
  defaultTitle?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
  /** Lets the caller refresh once a page exists. */
  onCreated?: () => void;
}

/**
 * One-step "design this with AI" for a page attached to something that already
 * exists — a service's checkout, its confirmation page, or a tenant's home.
 *
 * Creates the page with the real title and price already in the brief, then
 * hands off to the editor, so nothing has to be retyped.
 */
export function AiPageButton({
  pageType,
  attachment,
  context,
  defaultTitle,
  label,
  variant = "outline",
  size = "sm",
  onCreated,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);

  const briefRef = useAutoGrow(brief, 320);

  const spec = PAGE_TYPES[pageType];

  const create = async () => {
    if (!user) return;
    setBusy(true);

    const title = defaultTitle || spec.label;
    const slug = `${slugify(title)}-${Date.now().toString(36).slice(-4)}`;
    const prompt = brief.trim() || spec.samplePrompt;

    // Redesigning must replace the page that is already attached here, not
    // leave an orphan behind that no one can reach.
    const lookup = supabase.from("builder_pages").select("id").eq("page_type", pageType);
    const { data: existing } = await (attachment.kind === "service"
      ? lookup.eq("service_id", attachment.serviceId)
      : lookup.eq("coach_id", attachment.ownerId).eq("is_tenant_home", true)
    ).maybeSingle();

    const existingId = (existing as { id: string } | null)?.id ?? null;

    const { data, error } = existingId
      ? await supabase
          .from("builder_pages")
          .update({ prompt })
          .eq("id", existingId)
          .select("id")
          .single()
      : await supabase
          .from("builder_pages")
          .insert({
            coach_id: user.id,
            title,
            slug,
            html: "",
            css: "",
            prompt,
            page_type: pageType,
            service_id: attachment.kind === "service" ? attachment.serviceId : null,
            is_tenant_home: attachment.kind === "tenant_home",
          })
          .select("id")
          .single();

    setBusy(false);

    if (error || !data) {
      toast({ title: "Couldn't start", description: error?.message, variant: "destructive" });
      return;
    }

    onCreated?.();

    // Context travels in the URL so the editor can pass it to the generator.
    const params = new URLSearchParams({ generate: "1" });
    if (context) params.set("context", JSON.stringify(context));

    setOpen(false);
    navigate(`/page-builder/${(data as { id: string }).id}?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Sparkles className="h-4 w-4 mr-1.5" /> {label ?? `Design ${spec.label} with AI`}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Design your {spec.label.toLowerCase()} with AI</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">{spec.description}</p>

          <div>
            <Label className="text-xs">Anything specific? (optional)</Label>
            <Textarea
              ref={briefRef}
              rows={4}
              className="resize-none"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder={spec.samplePrompt}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              {context
                ? "Your product name and price are already included — describe the look and tone."
                : "Describe the look, tone and anything that must appear."}
            </p>
          </div>

          <Button
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={create}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AiPageButton;
