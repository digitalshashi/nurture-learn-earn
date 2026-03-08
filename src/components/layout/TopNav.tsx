import { Users, BookOpen, Gamepad2, Video, Sparkles, BarChart3, Award, Bell, Grid3X3 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "FEED", url: "/feed", icon: Users },
  { title: "COURSES", url: "/courses", icon: BookOpen },
  { title: "QUEST", url: "/quest", icon: Gamepad2 },
  { title: "EVENTS", url: "/events", icon: Video },
  { title: "SIDZ AI", url: "/ai", icon: Sparkles },
  { title: "TOOLS", url: "/tools", icon: BarChart3 },
  { title: "FBR 2026", url: "/fbr", icon: Award },
];

export function TopNav() {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 justify-between sticky top-0 z-50">
      <div className="flex items-center gap-1">
        <img src="/placeholder.svg" alt="Logo" className="h-8 w-8 mr-4" />
        <nav className="hidden md:flex items-center gap-0">
          {navItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end
              className="flex flex-col items-center px-3 py-1 text-muted-foreground hover:text-accent transition-colors text-xs gap-0.5"
              activeClassName="text-accent border-b-2 border-accent"
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.title}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <Grid3X3 className="h-5 w-5 text-muted-foreground" />
        </button>
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center bg-accent text-accent-foreground text-[10px] p-0 border-0">
            99+
          </Badge>
        </button>
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarImage src="" />
          <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">U</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
