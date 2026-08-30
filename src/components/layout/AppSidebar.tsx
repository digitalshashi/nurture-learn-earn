import {
  Settings,
  ChevronDown,
  Shield,
  Crown,
  Users,
  KeyRound,
  ShieldCheck,
  Palette,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { APP_NAV_SECTIONS } from "@/lib/appNav";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useNavigate, useLocation } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { usePermissions, type FeatureKey } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";


/**
 * A coach's own administration screens.
 *
 * A coach runs an academy, so these are their admin settings — but scoped to
 * their workspace, not the platform. They already existed under Settings,
 * which meant the person who uses them most had to go looking for them.
 *
 * Each carries the same permissionKey its route is guarded by, so a link can
 * only appear when the page behind it will actually open. Offering one that
 * refuses on arrival reads as the page being broken rather than as it not
 * being yours — the exact mistake that put the platform Admin panel in front
 * of coaches before.
 */
const WORKSPACE_ADMIN: {
  title: string;
  url: string;
  icon: LucideIcon;
  permissionKey: FeatureKey;
}[] = [
  { title: "Team", url: "/settings/team", icon: Users, permissionKey: "team_management" },
  {
    title: "Roles & permissions",
    url: "/settings/roles",
    icon: KeyRound,
    permissionKey: "platform_settings",
  },
  {
    title: "Security",
    url: "/settings/security",
    icon: ShieldCheck,
    permissionKey: "security_settings",
  },
  {
    title: "Branding & domain",
    url: "/settings/platform",
    icon: Palette,
    permissionKey: "platform_settings",
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { hasPermission } = usePermissions();
  const { hasRole } = useAuth();
  // These have to match the guards on the pages themselves. Offering a coach
  // the admin panel only sent them to "Admin access required", which reads as
  // the page being broken rather than as not being theirs.
  const canSeeAdmin = hasRole("admin") || hasRole("super_admin");
  // Super admin is the higher tier, so an admin does not get it. This has to
  // stay in step with the guard on the page itself: hiding the entry while the
  // route still admits an admin only means the tier holds until somebody types
  // the URL.
  const canSeeSuperAdmin = hasRole("super_admin");
  // Gated on the permission rather than the role, so this tracks whatever the
  // role_permissions table says instead of a second copy of the rules.
  const workspaceAdmin = WORKSPACE_ADMIN.filter((item) =>
    hasPermission(item.permissionKey),
  );
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const filteredSections = APP_NAV_SECTIONS
    .filter((section) => {
      if (!section.permissionKey) return true;
      return hasPermission(section.permissionKey);
    })
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          hasPermission(item.permissionKey) &&
          // An item may also name a role, for authoring screens that the
          // feature flag alone would hand to every student who can read them.
          (!item.role || hasRole(item.role) || canSeeAdmin),
      ),
    }))
    .filter((section) => section.items.length > 0);

  // The top bar is fixed and full width, so the sidebar starts below it rather
  // than at the viewport top, and stays under the header's z-[1000].
  return (
    <Sidebar
      collapsible="icon"
      className="top-[60px] z-[60] h-[calc(100svh-60px)] border-r border-border"
    >
      {/* Nothing floats at the top of this column any more: the brand mark, the
          collapse control and search all live in the header, where they cannot
          land on top of the first nav row. */}
      <SidebarContent className="pt-2 gap-0">
        {filteredSections.map((section, si) => {
          // Collapsed, every group flattens into its items so the rail carries
          // the same destinations as the open sidebar — one icon each, named by
          // its tooltip — rather than standing in for them with a group icon.
          if (section.label && !collapsed) {
            return (
              <CollapsibleGroup
                key={si}
                label={section.label}
                items={section.items}
                currentPath={location.pathname}
              />
            );
          }
          return (
            <SidebarGroup key={si} className="py-0.5">
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end={item.url === "/dashboard"}
                          className="hover:bg-secondary/80 text-sm rounded-[6px]"
                          activeClassName="bg-accent-tint text-accent font-medium"
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        {/* Administration sits in the sidebar rather than behind Settings:
            for whoever runs the place these are everyday destinations, and
            reaching them via Settings meant three clicks for a screen they open
            constantly.

            One group, not two: a coach sees their workspace screens, a platform
            admin sees the panels, and somebody who is both sees one section
            containing both rather than two headings with the same name. */}
        {(canSeeAdmin || canSeeSuperAdmin || workspaceAdmin.length > 0) && (
          <SidebarGroup className="py-0.5 mt-1 border-t border-sidebar-border pt-2">
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider group-data-[collapsible=icon]:hidden">
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {workspaceAdmin.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        className="hover:bg-secondary/80 text-sm rounded-[6px]"
                        activeClassName="bg-accent-tint text-accent font-medium"
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {canSeeAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Admin panel">
                      <NavLink
                        to="/admin"
                        className="hover:bg-secondary/80 text-sm rounded-[6px]"
                        activeClassName="bg-accent-tint text-accent font-medium"
                      >
                        <Shield className="h-5 w-5 shrink-0" />
                        <span className="truncate">Admin panel</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {canSeeSuperAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Super admin">
                      <NavLink
                        to="/super-admin"
                        className="hover:bg-secondary/80 text-sm rounded-[6px]"
                        activeClassName="bg-accent-tint text-accent font-medium"
                      >
                        <Crown className="h-5 w-5 shrink-0" />
                        <span className="truncate">Super admin</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* One entry for everything configuration-shaped. */}
        <SidebarGroup className="py-0.5">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings">
                  <NavLink
                    to="/settings"
                    className="hover:bg-secondary/80 text-sm rounded-[6px]"
                    activeClassName="bg-accent-tint text-accent font-medium"
                  >
                    <Settings className="h-5 w-5 shrink-0" />
                    <span className="truncate">Settings</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <div className="mt-auto p-3">
            {/* This card's own words are the Refer & Earn page. /referral is
                now the affiliates dashboard — the separate per-product
                commission screen — so the invite bonus lives one level down. */}
            <button
              onClick={() => navigate("/referral/invite")}
              className="w-full text-left rounded-lg bg-[#3D1B16] p-4 hover:bg-[#4A211B] transition-colors"
            >
              <p className="text-white font-semibold text-base">Refer & Earn</p>
              <p className="text-gray-300 text-xs mt-1">
                Invite others and earn rewards for every referral that joins.
              </p>
            </button>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

function CollapsibleGroup({
  label,
  items,
  currentPath,
}: {
  label: string;
  items: { title: string; url: string; icon: LucideIcon }[];
  currentPath: string;
}) {
  const isActive = items.some((i) => currentPath.startsWith(i.url));
  const [open, setOpen] = useState(isActive);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarGroup className="py-0.5">
        <CollapsibleTrigger className="w-full group/trigger">
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer flex items-center justify-between pr-2 hover:text-foreground transition-colors group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:pointer-events-none">
            {label}
            <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="hover:bg-secondary/80 text-sm rounded-[6px]"
                      activeClassName="bg-accent-tint text-accent font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
