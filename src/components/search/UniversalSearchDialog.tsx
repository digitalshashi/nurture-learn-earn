import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  Contact,
  Crown,
  Hash,
  Megaphone,
  Shield,
  Sword,
  User,
  Video,
  type LucideIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions, type FeatureKey } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { APP_NAV_SECTIONS } from "@/lib/appNav";
import { SETTINGS_GROUPS } from "@/lib/settingsNav";

interface Destination {
  label: string;
  to: string;
  icon: LucideIcon;
  group: string;
  /** Extra words that should match this destination but are not in its label. */
  keywords?: string;
  feature?: FeatureKey;
  role?: "coach" | "admin" | "super_admin";
}

/**
 * Destinations the top bar owns, plus the two role-gated admin screens. The
 * rest of the index comes from the shared nav and settings lists, so ordinary
 * pages never have to be registered here twice.
 */
const EXTRA_DESTINATIONS: Destination[] = [
  { label: "Quest", to: "/quest", icon: Sword, group: "Navigation", feature: "quest" },
  {
    label: "Admin panel",
    to: "/admin",
    icon: Shield,
    group: "Administration",
    role: "coach",
    keywords: "users roles moderation",
  },
  {
    label: "Super admin",
    to: "/super-admin",
    icon: Crown,
    group: "Administration",
    role: "admin",
    keywords: "platform owner",
  },
];

interface EntityResult {
  id: string;
  label: string;
  sublabel?: string;
  to: string;
  icon: LucideIcon;
  group: string;
}

/**
 * One searchable table. `feature` gates it on the user's permissions, and RLS
 * gates the rows themselves — a query the database refuses simply contributes
 * nothing, so the palette degrades to whatever this user may actually see.
 */
interface EntitySource {
  key: string;
  group: string;
  table: string;
  columns: string;
  /** Columns matched with a case-insensitive OR, in PostgREST syntax. */
  match: string[];
  icon: LucideIcon;
  feature?: FeatureKey;
  toResult: (row: Record<string, unknown>) => Omit<EntityResult, "icon" | "group">;
}

const ENTITY_SOURCES: EntitySource[] = [
  {
    key: "courses",
    group: "Courses",
    table: "courses",
    columns: "id, title, category",
    match: ["title", "description"],
    icon: BookOpen,
    feature: "courses",
    toResult: (r) => ({
      id: String(r.id),
      label: String(r.title ?? "Untitled course"),
      sublabel: (r.category as string) || undefined,
      to: `/course-player/${r.id}`,
    }),
  },
  {
    key: "services",
    group: "Services",
    table: "services",
    columns: "id, title, service_type, slug",
    match: ["title", "description"],
    icon: Megaphone,
    feature: "services",
    toResult: (r) => ({
      id: String(r.id),
      label: String(r.title ?? "Untitled service"),
      sublabel: (r.service_type as string) || undefined,
      to: `/service-builder/${r.id}`,
    }),
  },
  {
    key: "workshops",
    group: "Workshops",
    table: "workshops",
    columns: "id, title, start_date",
    match: ["title", "description"],
    icon: Video,
    feature: "workshops",
    toResult: (r) => ({
      id: String(r.id),
      label: String(r.title ?? "Untitled workshop"),
      sublabel: (r.start_date as string) || undefined,
      to: "/workshops",
    }),
  },
  {
    key: "events",
    group: "Events",
    table: "events",
    columns: "id, title, start_time",
    match: ["title", "description"],
    icon: Calendar,
    feature: "events",
    toResult: (r) => ({
      id: String(r.id),
      label: String(r.title ?? "Untitled event"),
      sublabel: r.start_time ? new Date(String(r.start_time)).toLocaleDateString() : undefined,
      to: "/student-events",
    }),
  },
  {
    key: "channels",
    group: "Channels",
    table: "channels",
    columns: "id, name, channel_type",
    match: ["name", "description"],
    icon: Hash,
    feature: "channels",
    toResult: (r) => ({
      id: String(r.id),
      label: String(r.name ?? "Untitled channel"),
      sublabel: (r.channel_type as string) || undefined,
      to: "/channels",
    }),
  },
  {
    key: "people",
    group: "People",
    table: "profiles",
    columns: "id, full_name, email",
    match: ["full_name", "email"],
    icon: User,
    feature: "messages",
    toResult: (r) => ({
      id: String(r.id),
      label: String(r.full_name || r.email || "Member"),
      sublabel: (r.email as string) || undefined,
      to: `/messages/${r.id}`,
    }),
  },
  {
    key: "leads",
    group: "Leads",
    table: "crm_leads",
    columns: "id, name, email",
    match: ["name", "email", "phone"],
    icon: Contact,
    feature: "crm",
    toResult: (r) => ({
      id: String(r.id),
      label: String(r.name || r.email || "Lead"),
      sublabel: (r.email as string) || undefined,
      to: `/crm/leads/${r.id}`,
    }),
  },
];

/**
 * `role` is a floor, not an exact match — the same reading SettingsShell and
 * the sidebar use, where an admin reaches everything a coach reaches.
 */
function meetsRole(required: NonNullable<Destination["role"]>, roles: string[]) {
  if (required === "super_admin") return roles.includes("super_admin");
  if (required === "admin") return roles.includes("admin") || roles.includes("super_admin");
  return roles.includes("coach") || roles.includes("admin") || roles.includes("super_admin");
}

/** PostgREST `or` filters treat these as syntax, so they cannot reach the API raw. */
function sanitize(term: string) {
  return term.replace(/[,()*\\]/g, " ").trim();
}

/**
 * The table name is data here, not a literal, so the generated per-table types
 * cannot apply. This is the narrowest shape that covers the one query we run.
 */
type LooseTableQuery = {
  select: (columns: string) => {
    or: (filter: string) => {
      limit: (count: number) => PromiseLike<{ data: unknown; error: unknown }>;
    };
  };
};

const looseFrom = supabase.from as unknown as (table: string) => LooseTableQuery;

export function UniversalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  // roles rather than hasRole: the array is state and keeps its identity
  // between renders, so the memo below is not rebuilt on every keystroke.
  const { roles } = useAuth();
  const { hasPermission } = usePermissions();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EntityResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Destinations are the part that must work for everyone: no network, no
  // table permissions, just this user's feature flags and role.
  const destinations = useMemo<Destination[]>(() => {
    const fromNav: Destination[] = APP_NAV_SECTIONS.flatMap((section) =>
      section.items.map((item) => ({
        label: item.title,
        to: item.url,
        icon: item.icon,
        group: section.label ?? "Navigation",
        feature: item.permissionKey,
        role: item.role,
      })),
    );

    const fromSettings: Destination[] = SETTINGS_GROUPS.flatMap((group) =>
      group.items.map((item) => ({
        label: item.label,
        to: item.to,
        icon: item.icon,
        group: `Settings · ${group.label}`,
        keywords: item.description,
        feature: item.feature,
        role: item.role,
      })),
    );

    const all = [...fromNav, ...EXTRA_DESTINATIONS, ...fromSettings];

    // Deduplicate on the destination itself: several routes are reachable from
    // both the nav and settings lists, and a palette that lists the same page
    // twice looks broken.
    const seen = new Set<string>();
    return all.filter((d) => {
      if (d.role && !meetsRole(d.role, roles)) return false;
      if (d.feature && !hasPermission(d.feature)) return false;
      const key = `${d.to}::${d.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [hasPermission, roles]);

  // Clear between openings so the palette never opens onto a stale answer.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults((prev) => (prev.length ? [] : prev));
      setSearching((prev) => (prev ? false : prev));
    }
  }, [open]);

  // Debounced content search. The ref lets a slow response from an earlier
  // keystroke be discarded instead of overwriting a newer one.
  const requestId = useRef(0);
  useEffect(() => {
    const term = sanitize(query);
    if (!open || term.length < 2) {
      // Written through a callback so an unchanged empty state is not a new
      // array: this effect would otherwise re-render its way back into itself.
      setResults((prev) => (prev.length ? [] : prev));
      setSearching((prev) => (prev ? false : prev));
      return;
    }

    const id = ++requestId.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      const sources = ENTITY_SOURCES.filter((s) => !s.feature || hasPermission(s.feature));

      const settled = await Promise.all(
        sources.map(async (source) => {
          const filter = source.match.map((col) => `${col}.ilike.%${term}%`).join(",");
          const { data, error } = await looseFrom(source.table)
            .select(source.columns)
            .or(filter)
            .limit(5);
          // A table this user may not read returns an error rather than rows;
          // that is a valid outcome, not a failure worth surfacing.
          if (error || !data) return [] as EntityResult[];
          return (data as unknown as Record<string, unknown>[]).map((row) => ({
            ...source.toResult(row),
            icon: source.icon,
            group: source.group,
          }));
        }),
      );

      if (id !== requestId.current) return;
      setResults(settled.flat());
      setSearching(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, open, hasPermission]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  const groupedResults = useMemo(() => {
    const byGroup = new Map<string, EntityResult[]>();
    for (const r of results) {
      const list = byGroup.get(r.group) ?? [];
      list.push(r);
      byGroup.set(r.group, list);
    }
    return Array.from(byGroup.entries());
  }, [results]);

  const groupedDestinations = useMemo(() => {
    const byGroup = new Map<string, Destination[]>();
    for (const d of destinations) {
      const list = byGroup.get(d.group) ?? [];
      list.push(d);
      byGroup.set(d.group, list);
    }
    return Array.from(byGroup.entries());
  }, [destinations]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search pages, courses, people…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>
          {searching ? "Searching…" : "No matches. Try a page name, course or person."}
        </CommandEmpty>

        {groupedResults.map(([group, items]) => (
          <CommandGroup key={`result-${group}`} heading={group}>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={`${group}-${item.id}`}
                  // cmdk filters on this, and the server already matched the
                  // term — keeping it in the value stops it filtering the row
                  // back out on a match that lives in a column we do not show.
                  value={`${item.label} ${item.sublabel ?? ""} ${query}`}
                  onSelect={() => go(item.to)}
                >
                  <Icon className="mr-2 shrink-0 opacity-60" />
                  <span className="truncate">{item.label}</span>
                  {item.sublabel && (
                    <span className="ml-2 truncate text-xs text-muted-foreground">
                      {item.sublabel}
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}

        {groupedResults.length > 0 && <CommandSeparator />}

        {groupedDestinations.map(([group, items]) => (
          <CommandGroup key={`nav-${group}`} heading={group}>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={`${group}-${item.to}-${item.label}`}
                  value={`${item.label} ${item.keywords ?? ""} ${item.to}`}
                  onSelect={() => go(item.to)}
                >
                  <Icon className="mr-2 shrink-0 opacity-60" />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
