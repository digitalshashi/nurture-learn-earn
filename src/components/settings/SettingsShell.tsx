import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { SETTINGS_GROUPS, matchSettingsItem, type SettingsItem } from "@/lib/settingsNav";
import { cn } from "@/lib/utils";

/**
 * Chrome shared by every settings screen: one page title plus the section list.
 *
 * Rendered by AppLayout for settings routes, so the individual pages did not
 * have to change — they keep rendering their own content and inherit this.
 */
export function SettingsShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { hasPermission } = usePermissions();

  const visible = (item: SettingsItem) => {
    if (item.role === "super_admin") return hasRole("super_admin");
    if (item.role === "admin") return hasRole("admin") || hasRole("super_admin");
    return item.feature ? hasPermission(item.feature) : true;
  };

  const groups = SETTINGS_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter(visible),
  })).filter((g) => g.items.length > 0);

  const active = matchSettingsItem(location.pathname, location.search);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold font-display">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {active?.description ?? "Manage your account and workspace."}
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Section list. A scrolling strip on small screens, a rail on desktop. */}
        <nav
          aria-label="Settings sections"
          className={cn(
            "lg:w-56 shrink-0",
            "flex lg:block gap-1 overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0 lg:overflow-visible",
          )}
        >
          {groups.map((group) => (
            <div key={group.label} className="lg:mb-5 shrink-0">
              <p className="hidden lg:block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-2">
                {group.label}
              </p>
              <div className="flex lg:flex-col gap-1">
                {group.items.map((item) => {
                  const isActive = active?.to === item.to;
                  return (
                    <button
                      key={item.to}
                      onClick={() => navigate(item.to)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "bg-accent/10 text-accent font-medium"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

export default SettingsShell;
