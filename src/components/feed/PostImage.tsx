import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { safeUrl } from "@/lib/safeUrl";

interface PostImageProps {
  src: string;
  alt?: string;
  /** Classes for the thumbnail in the card. The full view is always contained. */
  className?: string;
}

/**
 * A feed image that opens full size in the platform rather than in a new tab.
 *
 * Each image owns its own dialog: nothing here has to be lifted into the post,
 * so an image pasted into the body works the same as the post's own attachment.
 */
export function PostImage({ src, alt = "", className }: PostImageProps) {
  const [open, setOpen] = useState(false);
  const safe = safeUrl(src);
  if (!safe) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open image full size"
        className="group relative block w-full cursor-zoom-in"
      >
        <img src={safe} alt={alt} loading="lazy" className={className} />
        <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-black/55 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Maximize2 className="h-3.5 w-3.5" />
        </span>
      </button>

      {/* Transparent shell so the image is the dialog; the stock close button
          is recoloured because it would otherwise sit invisible on the photo. */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="max-w-5xl border-0 bg-transparent p-0 shadow-none [&>button]:right-2 [&>button]:top-2 [&>button]:rounded-full [&>button]:bg-black/55 [&>button]:p-1.5 [&>button]:text-white [&>button]:opacity-100 [&>button:hover]:bg-black/75"
        >
          <DialogTitle className="sr-only">{alt || "Image"}</DialogTitle>
          <img src={safe} alt={alt} className="max-h-[85vh] w-full rounded-lg object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}
