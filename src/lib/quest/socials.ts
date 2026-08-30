import { Instagram, Linkedin, Youtube, Facebook, Globe, Twitter, type LucideIcon } from "lucide-react";

/**
 * The networks a member can attach to their Quest identity.
 *
 * Stored as handles, never as full URLs: the prefix is fixed and shown beside
 * the input, so a member cannot save "https://instagram.com/instagram.com/me"
 * — which is what happens every time a form asks for "your profile link".
 */
export interface SocialPlatform {
  key: string;
  label: string;
  /** Rendered as a static prefix in front of the input. */
  prefix: string;
  placeholder: string;
  icon: LucideIcon;
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { key: "instagram", label: "Instagram", prefix: "instagram.com/", placeholder: "yourhandle", icon: Instagram },
  { key: "linkedin", label: "LinkedIn", prefix: "linkedin.com/in/", placeholder: "your-name", icon: Linkedin },
  { key: "youtube", label: "YouTube", prefix: "youtube.com/@", placeholder: "yourchannel", icon: Youtube },
  { key: "x", label: "X", prefix: "x.com/", placeholder: "yourhandle", icon: Twitter },
  { key: "facebook", label: "Facebook", prefix: "facebook.com/", placeholder: "yourpage", icon: Facebook },
  { key: "website", label: "Website", prefix: "https://", placeholder: "yoursite.com", icon: Globe },
];

/**
 * How many social profiles a member needs before the Story Engine will let
 * them publish. A story carries their name into the community; three links
 * is the cheapest proof that there is a real person behind it.
 */
export const SOCIALS_REQUIRED_TO_PUBLISH = 3;

export type SocialMap = Record<string, string | null | undefined>;

/** The platform keys that actually carry a handle, ignoring blanks. */
export function filledSocials(socials: SocialMap | null | undefined): string[] {
  if (!socials) return [];
  return SOCIAL_PLATFORMS.map((p) => p.key).filter((key) => {
    const value = socials[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

/** A handle turned back into something clickable. */
export function socialUrl(platform: SocialPlatform, handle: string): string {
  const clean = handle.trim().replace(/^@/, "");
  // The website row's prefix is already a scheme, so it does not get another.
  return platform.prefix.startsWith("http")
    ? `${platform.prefix}${clean.replace(/^https?:\/\//, "")}`
    : `https://${platform.prefix}${clean}`;
}
