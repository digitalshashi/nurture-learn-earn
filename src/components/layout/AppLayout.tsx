import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopNav } from "./TopNav";
import { MobileBottomNav } from "./MobileBottomNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 w-full min-w-0 bg-background overflow-hidden">
          <TopNav />
          <div className="flex-1 overflow-auto pb-16 md:pb-0">
            {children}
          </div>
          <MobileBottomNav />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
