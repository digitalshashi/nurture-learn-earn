import { useState } from "react";
import { Users, Sword, BookOpen, Calendar, Grid3x3 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { MobileMenuSheet } from "./MobileMenuSheet";
import { cn } from "@/lib/utils";

// Core student tabs (full set is in TopNav desktop)
const TABS = [
  { label: "Feed", link: "/feed", icon: Users },
  { label: "Quest", link: "/quest", icon: Sword },
  { label: "Courses", link: "/courses", icon: BookOpen },
  { label: "Events", link: "/student-events", icon: Calendar },
];

export function MobileBottomNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav
        className={cn(
          "md:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-card border-t border-border",
          "flex items-stretch pb-[env(safe-area-inset-bottom)]",
        )}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.link}
              to={tab.link}
              className="flex-1 flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors"
              activeClassName="text-accent"
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium">{tab.label}</span>
            </NavLink>
          );
        })}
        <button
          onClick={() => setMenuOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors"
        >
          <Grid3x3 className="h-5 w-5" />
          <span className="text-[11px] font-medium">Menu</span>
        </button>
      </nav>

      <MobileMenuSheet open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
