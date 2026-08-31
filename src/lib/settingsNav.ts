import {
  User,
  Receipt,
  CreditCard,
  Sparkles,
  Video,
  Puzzle,
  Phone,
  Image,
  Navigation,
  Mail,
  Users,
  Shield,
  Lock,
  HardDrive,
  type LucideIcon,
} from "lucide-react";
import type { FeatureKey } from "@/hooks/usePermissions";

export interface SettingsItem {
  label: string;
  /** Full destination including any query string. */
  to: string;
  icon: LucideIcon;
  /** Permission gate; omitted for items every signed-in user may open. */
  feature?: FeatureKey;
  /** Restricts the item to admins / super admins. */
  role?: "admin" | "super_admin";
  /** Hard-hidden for these roles regardless of `feature` permission. */
  hideForRoles?: Array<"student">;
  description: string;
}

export interface SettingsGroup {
  label: string;
  items: SettingsItem[];
}

/**
 * Everything under Settings, grouped by what the screen actually does.
 *
 * Named from each page's real contents rather than its route: /settings is a
 * tabbed page holding payments, AI keys and Zoom, so it appears here as three
 * separate deep links rather than one vague "My Profile" entry. The genuine
 * account screen is /my-account.
 */
export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    label: "Account",
    items: [
      {
        label: "My account",
        to: "/my-account",
        icon: User,
        description: "Your name, bio and account actions",
      },
      {
        label: "Billing & plans",
        to: "/billing",
        icon: Receipt,
        feature: "billing",
        description: "Subscription, invoices and plan changes",
      },
    ],
  },
  {
    label: "Payments",
    items: [
      {
        label: "Payment gateways",
        to: "/settings?tab=payments",
        icon: CreditCard,
        feature: "my_settings",
        hideForRoles: ["student"],
        description: "Razorpay and Instamojo keys, and your default currency",
      },
    ],
  },
  {
    label: "Integrations",
    items: [
      {
        label: "AI providers",
        to: "/settings?tab=ai",
        icon: Sparkles,
        feature: "my_settings",
        hideForRoles: ["student"],
        description: "Connect OpenAI, Anthropic, Gemini and more, and pick the text, image and video models",
      },
      {
        label: "Zoom",
        to: "/settings?tab=zoom",
        icon: Video,
        feature: "my_settings",
        hideForRoles: ["student"],
        description: "Connect Zoom for live sessions",
      },
      {
        label: "Other integrations",
        to: "/automation/integrations",
        icon: Puzzle,
        feature: "automation",
        description: "Third-party tools connected to your workspace",
      },
      {
        label: "WhatsApp numbers",
        to: "/automation/account-management",
        icon: Phone,
        feature: "automation",
        description: "Numbers used to send automated messages",
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        label: "Branding & domain",
        to: "/settings/platform",
        icon: Image,
        feature: "platform_settings",
        description: "Logo, colours, help links and custom domain",
      },
      {
        label: "Member navigation",
        to: "/navigation-settings",
        icon: Navigation,
        feature: "navigation_settings",
        description: "Which menu items your members see",
      },
      {
        label: "Email sending",
        to: "/settings/email",
        icon: Mail,
        feature: "marketing",
        description: "Sender accounts and email templates",
      },
    ],
  },
  {
    label: "Team & access",
    items: [
      {
        label: "Team",
        to: "/settings/team",
        icon: Users,
        feature: "team_management",
        description: "Invite teammates and manage seats",
      },
      {
        label: "Roles & permissions",
        to: "/settings/roles",
        icon: Shield,
        feature: "platform_settings",
        description: "What each role can open, plus the change log",
      },
      {
        label: "Security",
        to: "/settings/security",
        icon: Lock,
        feature: "security_settings",
        description: "Active sessions, blocked users and reports",
      },
      {
        label: "Cloud storage",
        to: "/settings/cloud",
        icon: HardDrive,
        feature: "cloud_storage",
        description: "Where uploaded files are kept",
      },
    ],
  },
];

/** Every destination, including query strings. */
export const SETTINGS_LINKS = SETTINGS_GROUPS.flatMap((g) => g.items.map((i) => i.to));

/** Just the pathnames, deduped — what route matching cares about. */
export const SETTINGS_PATHS = Array.from(
  new Set(SETTINGS_LINKS.map((to) => to.split("?")[0])),
);

/**
 * True when a path should render inside the settings shell.
 *
 * Exact matches only: a deeper detail view should opt in deliberately rather
 * than inherit the settings chrome by accident of prefix matching.
 */
export const isSettingsPath = (pathname: string): boolean =>
  SETTINGS_PATHS.includes(pathname);

/**
 * Which nav entry a location corresponds to. Compares the query string too, so
 * the three tabs of /settings highlight independently.
 */
export function matchSettingsItem(
  pathname: string,
  search: string,
): SettingsItem | undefined {
  const current = pathname + (search || "");
  const items = SETTINGS_GROUPS.flatMap((g) => g.items);

  const exact = items.find((i) => i.to === current);
  if (exact) return exact;

  // Landing on /settings with no tab shows the first tab, so highlight it.
  const samePath = items.filter((i) => i.to.split("?")[0] === pathname);
  return samePath[0];
}
