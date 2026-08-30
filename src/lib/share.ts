/**
 * Builds the outbound links behind every share button in the app.
 *
 * Pure and isomorphic so it can be unit-tested without a DOM. The UI lives in
 * `src/components/share/ShareDialog.tsx`; what a link *looks like* once it
 * lands in a chat is decided in `src/lib/seo.ts`.
 */
import { BRAND } from "./brand";

export type ShareChannel =
  | "whatsapp"
  | "x"
  | "facebook"
  | "linkedin"
  | "telegram"
  | "instagram"
  | "email";

export interface ShareSubject {
  /** Absolute URL of the thing being shared. */
  url: string;
  /** Its name — the service, course or workshop title. */
  title: string;
  /** One line of context. Optional; several networks ignore it anyway. */
  text?: string;
}

/**
 * Tags a shared link so the coach can see in analytics which channel a buyer
 * arrived from — the same reason every retail share button does it. The
 * canonical tag on the page keeps search engines from treating the tagged and
 * untagged URLs as two pages.
 */
export function withUtm(url: string, source: string, campaign = "share"): string {
  try {
    const tagged = new URL(url);
    tagged.searchParams.set("utm_source", source);
    tagged.searchParams.set("utm_medium", "social");
    tagged.searchParams.set("utm_campaign", campaign);
    return tagged.toString();
  } catch {
    return url;
  }
}

/** The sentence that goes into the message body, above the link. */
export function shareMessage(subject: ShareSubject): string {
  const lead = subject.text?.trim();
  return lead ? `${subject.title}\n\n${lead}` : subject.title;
}

export interface ShareTarget {
  channel: ShareChannel;
  label: string;
  /** Where to send the browser. Empty for channels with no web share URL. */
  href: string;
  /**
   * True when the network has no share endpoint and the user has to paste the
   * link themselves — Instagram allows no outbound web share at all.
   */
  copyOnly: boolean;
}

/**
 * Instagram has no public web share endpoint: every "share to Instagram" flow
 * is either the native mobile share sheet or a manual paste into a story or
 * bio. Rather than pretending otherwise with a link that 404s, the dialog
 * copies the caption and link and says so.
 */
export function instagramCaption(subject: ShareSubject, url: string): string {
  return `${shareMessage(subject)}\n\n${url}`;
}

export function shareTarget(channel: ShareChannel, subject: ShareSubject): ShareTarget {
  const url = withUtm(subject.url, channel);
  const message = shareMessage(subject);
  const encodedUrl = encodeURIComponent(url);

  switch (channel) {
    case "whatsapp":
      return {
        channel,
        label: "WhatsApp",
        // wa.me takes one `text` blob; the link has to be inside it, last, so
        // WhatsApp's own preview attaches to it.
        href: `https://wa.me/?text=${encodeURIComponent(`${message}\n\n${url}`)}`,
        copyOnly: false,
      };
    case "x":
      return {
        channel,
        label: "X",
        href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodedUrl}`,
        copyOnly: false,
      };
    case "facebook":
      return {
        channel,
        label: "Facebook",
        // Facebook takes only the URL and reads the rest off the page's tags.
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        copyOnly: false,
      };
    case "linkedin":
      return {
        channel,
        label: "LinkedIn",
        href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        copyOnly: false,
      };
    case "telegram":
      return {
        channel,
        label: "Telegram",
        href: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(message)}`,
        copyOnly: false,
      };
    case "email":
      return {
        channel,
        label: "Email",
        href: `mailto:?subject=${encodeURIComponent(subject.title)}&body=${encodeURIComponent(`${message}\n\n${url}`)}`,
        copyOnly: false,
      };
    case "instagram":
      return { channel, label: "Instagram", href: "", copyOnly: true };
  }
}

/** A QR image for the link, for decks, posters and in-person selling. */
export function qrCodeUrl(url: string, size = 220): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(
    withUtm(url, "qr"),
  )}`;
}

/** Absolute share URL for a service, preferring its slug over its id. */
export function serviceShareUrl(
  origin: string,
  service: { id: string; slug?: string | null },
): string {
  return `${origin}/checkout/${service.slug || service.id}`;
}

export function courseShareUrl(origin: string, courseId: string): string {
  return `${origin}/course-player/${courseId}`;
}

export function workshopShareUrl(origin: string, slug: string): string {
  return `${origin}/workshop/${slug}`;
}

/** Used as the dialog's default blurb when the caller supplies none. */
export function defaultShareText(): string {
  return `On ${BRAND.name} — ${BRAND.tagline.toLowerCase()}.`;
}
