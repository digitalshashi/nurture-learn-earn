import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  /** Show the wordmark beside the icon. Off in collapsed rails and tight rows. */
  withWordmark?: boolean;
  /** Size of the square mark in pixels. */
  size?: number;
}

/**
 * The 1corehub mark, in the one place that decides what it looks like.
 *
 * It renders the same SVG that `scripts/generate-brand-assets.mjs` rasterises
 * into the favicon, the PWA icons and the social share card, so the icon in the
 * sidebar, the icon in the browser tab and the icon on a shared link are
 * literally the same artwork.
 */
export function BrandMark({ className, withWordmark = false, size = 36 }: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src={BRAND.assets.icon}
        alt={withWordmark ? "" : BRAND.name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-[22%]"
      />
      {withWordmark && (
        <span className="font-display text-lg font-bold leading-none tracking-tight">
          {BRAND.name}
        </span>
      )}
    </span>
  );
}
