import { Users, BookOpen, Gamepad2, Video, Sparkles, BarChart3, Award, Bell, Grid3X3, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "FEED", url: "/feed", icon: Users },
  { title: "COURSES", url: "/courses", icon: BookOpen },
  { title: "CHANNELS", url: "/channels", icon: BarChart3 },
  { title: "EVENTS", url: "/events", icon: Video },
  { title: "DASHBOARD", url: "/dashboard", icon: Sparkles },
];

export function TopNav() {
  const { user, signOut, roles } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 justify-between sticky top-0 z-50">
      <div className="flex items-center gap-1">
        <div className="h-8 w-8 bg-primary rounded-lg mr-4 flex items-center justify-center cursor-pointer" onClick={() => navigate("/feed")}>
          <span className="text-primary-foreground text-sm font-bold">L</span>
        </div>
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
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarImage src="" />
              <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-sm font-medium truncate">{user?.user_metadata?.full_name || user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{roles.join(", ") || "student"}</p>
            </div>
            <Button variant="ghost" className="w-full justify-start text-sm text-destructive" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
