import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopNav } from "./TopNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { SearchProvider } from "@/contexts/SearchContext";
import { isSettingsPath } from "@/lib/settingsNav";

interface AppLayoutProps {
  children: React.ReactNode;
  /**
   * Starting state of the main sidebar. Defaults to the app-wide remembered
   * choice; pass false for a page that should open with the icon rail.
   */
  sidebarDefaultOpen?: boolean;
  /**
   * Whether toggling the sidebar on this page updates the app-wide remembered
   * choice. Pass false to keep a page's sidebar state local to that page.
   */
  persistSidebarState?: boolean;
}

export function AppLayout({
  children,
  sidebarDefaultOpen,
  persistSidebarState,
}: AppLayoutProps) {
  const location = useLocation();
  // Settings screens all render their own AppLayout, so wrapping here gives
  // every one of them the same header and section nav without touching the
  // pages themselves.
  const inSettings = isSettingsPath(location.pathname);

  return (
    <SidebarProvider defaultOpen={sidebarDefaultOpen} persistState={persistSidebarState}>
      {/* Wraps the shell, not a page, so the header and the sidebar open the
          same palette and ⌘K works from anywhere inside the app. */}
      <SearchProvider>
        <div className="min-h-screen flex w-full bg-background text-foreground">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1 w-full min-w-0 bg-background overflow-hidden">
            <TopNav />
            {/* The header is fixed, so it takes no room in the flow — this
                stands in for its 60px, matching --nav-height. */}
            <div className="h-[60px] shrink-0" aria-hidden />
            <div className="flex-1 overflow-auto pb-16 md:pb-0">
              {inSettings ? <SettingsShell>{children}</SettingsShell> : children}
            </div>
            <MobileBottomNav />
          </SidebarInset>
        </div>
      </SearchProvider>
    </SidebarProvider>
  );
}
