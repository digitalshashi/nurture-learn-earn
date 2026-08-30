import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Facebook, Instagram, Linkedin, Mail, MessageCircle, QrCode, Send, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BRAND } from "@/lib/brand";
import {
  instagramCaption,
  qrCodeUrl,
  shareTarget,
  withUtm,
  type ShareChannel,
  type ShareSubject,
} from "@/lib/share";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Absolute URL of the thing being shared. */
  url: string;
  title: string;
  /** The line that will sit under the title in the preview. */
  description?: string | null;
  /** The entity's own artwork; the branded card stands in when absent. */
  imageUrl?: string | null;
  /** Dialog heading, e.g. "Share service". */
  heading?: string;
}

const CHANNELS: { channel: ShareChannel; icon: typeof MessageCircle | null; tint: string }[] = [
  { channel: "whatsapp", icon: MessageCircle, tint: "text-[#25D366]" },
  { channel: "x", icon: null, tint: "text-foreground" },
  { channel: "instagram", icon: Instagram, tint: "text-[#E1306C]" },
  { channel: "facebook", icon: Facebook, tint: "text-[#1877F2]" },
  { channel: "linkedin", icon: Linkedin, tint: "text-[#0A66C2]" },
  { channel: "telegram", icon: Send, tint: "text-[#229ED9]" },
  { channel: "email", icon: Mail, tint: "text-muted-foreground" },
];

/** lucide still ships the old bird; X's mark is four strokes, so draw it. */
function XMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/**
 * One share sheet for every kind of link the platform hands out — services,
 * courses, workshops, posts.
 *
 * The preview at the top is not decoration: it renders the same title,
 * description and image that `src/lib/seo.ts` writes into the page's meta tags
 * and that the edge Worker serves to crawlers. What a coach sees here is what
 * lands in the WhatsApp chat, so a missing cover image is visible *before* the
 * link goes out rather than after.
 */
export function ShareDialog({
  open,
  onOpenChange,
  url,
  title,
  description,
  imageUrl,
  heading = "Share",
}: ShareDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const subject: ShareSubject = useMemo(
    () => ({ url, title, text: description?.trim() || undefined }),
    [url, title, description],
  );

  const previewImage = imageUrl?.trim() || BRAND.assets.ogImage;
  const host = useMemo(() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return BRAND.name;
    }
  }, [url]);

  // Reset per-open, so reopening never shows a stale "Copied!" tick.
  useEffect(() => {
    if (!open) {
      setCopied(false);
      setShowQr(false);
    }
  }, [open]);

  const copy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: message });
      return true;
    } catch {
      // Clipboard access is denied outside a secure context and in some
      // in-app browsers; say so rather than silently doing nothing.
      toast({
        title: "Couldn't copy",
        description: "Select the link above and copy it manually.",
        variant: "destructive",
      });
      return false;
    }
  };

  const copyLink = async () => {
    if (await copy(withUtm(url, "copy"), "Link copied")) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const open_ = (channel: ShareChannel) => {
    const target = shareTarget(channel, subject);
    if (target.copyOnly) {
      void copy(
        instagramCaption(subject, withUtm(url, "instagram")),
        "Caption copied — paste it into your story, bio or DM",
      );
      return;
    }
    // noopener: a share window opened with window.open otherwise keeps a
    // handle on this one through window.opener.
    window.open(target.href, "_blank", "noopener,noreferrer");
  };

  const shareNatively = async () => {
    try {
      await navigator.share({ title, text: description ?? undefined, url: withUtm(url, "device") });
    } catch {
      /* the user dismissed the sheet, or the browser refused — nothing to do */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{heading}</DialogTitle>
          <DialogDescription className="sr-only">
            Copy the link or send it to a social network.
          </DialogDescription>
        </DialogHeader>

        {/* What the recipient will see. Mirrors the og: tags exactly. */}
        <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
          <div className="aspect-[1.91/1] w-full bg-muted">
            <img
              src={previewImage}
              alt=""
              className="h-full w-full object-cover"
              onError={(event) => {
                (event.currentTarget as HTMLImageElement).src = BRAND.assets.ogImage;
              }}
            />
          </div>
          <div className="space-y-0.5 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{host}</p>
            <p className="line-clamp-1 text-sm font-semibold">{title}</p>
            {description && (
              <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input readOnly value={url} className="bg-muted text-xs" onFocus={(e) => e.target.select()} />
          <Button variant="outline" size="icon" onClick={copyLink} className="shrink-0" aria-label="Copy link">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {CHANNELS.map(({ channel, icon: Icon, tint }) => {
            const { label } = shareTarget(channel, subject);
            return (
              <button
                key={channel}
                type="button"
                onClick={() => open_(channel)}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-2.5 text-xs transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {Icon ? <Icon className={`h-5 w-5 ${tint}`} /> : <XMark className={`h-4 w-4 ${tint}`} />}
                <span className="text-[11px] font-medium">{label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowQr((shown) => !shown)}
            aria-pressed={showQr}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-2.5 text-xs transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <QrCode className="h-5 w-5 text-muted-foreground" />
            <span className="text-[11px] font-medium">QR</span>
          </button>
        </div>

        {showQr && (
          <div className="flex flex-col items-center gap-2 rounded-lg bg-muted p-4">
            <img
              src={qrCodeUrl(url)}
              alt={`QR code linking to ${title}`}
              width={220}
              height={220}
              className="h-[220px] w-[220px] rounded bg-white p-1"
            />
            <p className="text-xs text-muted-foreground">Point a camera at this to open the link.</p>
          </div>
        )}

        {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
          <Button variant="outline" className="w-full gap-2" onClick={shareNatively}>
            <Share2 className="h-4 w-4" /> More sharing options
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
