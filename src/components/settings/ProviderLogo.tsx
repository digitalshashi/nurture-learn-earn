import { SiAnthropic, SiDeepseek, SiGooglegemini, SiXiaomi } from "react-icons/si";
import { RiOpenaiFill } from "react-icons/ri";
import { Plug } from "lucide-react";
import type { IconType } from "react-icons";
import { AI_PROVIDERS, type AiProviderId } from "@/lib/aiProviders";
import { cn } from "@/lib/utils";

/**
 * Brand marks, so a provider is recognised before its name is read.
 *
 * Simple Icons carries most of these; OpenAI's mark was withdrawn from that
 * set, so it comes from Remix Icon, which draws in the same filled style. The
 * custom provider is not a brand and gets a neutral plug.
 */
const MARKS: Record<AiProviderId, IconType> = {
  openai: RiOpenaiFill,
  anthropic: SiAnthropic,
  gemini: SiGooglegemini,
  deepseek: SiDeepseek,
  xiaomi: SiXiaomi,
  custom: Plug as IconType,
};

/**
 * A provider's mark on a tinted badge of its own brand colour.
 *
 * The badge is what makes the row scannable — the tint comes from the mark's
 * own colour at low opacity rather than a fixed palette, so it sits correctly
 * on both the light and dark theme without a second set of values.
 */
export function ProviderLogo({
  provider,
  className,
}: {
  provider: AiProviderId;
  className?: string;
}) {
  const Mark = MARKS[provider];
  const accent = AI_PROVIDERS[provider]?.accent;

  return (
    <span
      className={cn(
        "relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
        !accent && "text-muted-foreground",
        className,
      )}
      style={accent ? { color: accent } : undefined}
      aria-hidden
    >
      <span className="absolute inset-0 rounded-md bg-current opacity-10" />
      <Mark className="relative h-[18px] w-[18px]" />
    </span>
  );
}
