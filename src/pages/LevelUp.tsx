import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Repeat,
  ListTodo,
  Trophy,
  Database,
  Stethoscope,
  Heart,
} from "lucide-react";
import { LevelUpDashboard } from "@/components/levelup/LevelUpDashboard";
import { LevelUpHabits } from "@/components/levelup/LevelUpHabits";
import { LevelUpTasks } from "@/components/levelup/LevelUpTasks";
import { LevelUpChallenges } from "@/components/levelup/LevelUpChallenges";
import { LevelUpData } from "@/components/levelup/LevelUpData";
import { LevelUpCheckup } from "@/components/levelup/LevelUpCheckup";
import { LevelUpCharity } from "@/components/levelup/LevelUpCharity";

const VIEWS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "habits", label: "Habits", icon: Repeat },
  { key: "tasks", label: "Tasks", icon: ListTodo },
  { key: "challenges", label: "Challenges", icon: Trophy },
  { key: "data", label: "Data", icon: Database },
  { key: "checkup", label: "Checkup", icon: Stethoscope },
  { key: "charity", label: "Charity", icon: Heart },
] as const;

type View = (typeof VIEWS)[number]["key"];

const isView = (v: string | null): v is View => VIEWS.some((x) => x.key === v);

export default function LevelUp() {
  // The active section lives in the URL so it survives a refresh and can be
  // linked to directly, instead of resetting to Dashboard every visit.
  const [searchParams, setSearchParams] = useSearchParams();
  const param = searchParams.get("view");
  const view: View = isView(param) ? param : "dashboard";

  const setView = (next: View) => {
    setSearchParams(next === "dashboard" ? {} : { view: next }, { replace: true });
  };

  const renderView = () => {
    switch (view) {
      case "dashboard":
        return <LevelUpDashboard />;
      case "habits":
        return <LevelUpHabits />;
      case "tasks":
        return <LevelUpTasks />;
      case "challenges":
        return <LevelUpChallenges />;
      case "data":
        return <LevelUpData />;
      case "checkup":
        return <LevelUpCheckup />;
      case "charity":
        return <LevelUpCharity />;
    }
  };

  return (
    // No sidebar override: this page used to force the collapsed icon rail,
    // which made the whole shell — sidebar width and the gap beside it — jump
    // on the way in and back out again on the way out. Level Up gets the same
    // sidebar as every other page, in whatever state the user left it.
    <AppLayout>
      {/*
        This page used to render its own 240px sidebar next to the app's, which
        stacked two navs side by side and left no room on small screens. The
        sections are now a single horizontal tab strip that scrolls instead of
        squeezing the content.
      */}
      <div className="border-b bg-card">
        <div className="px-4 sm:px-6 pt-5">
          <h1 className="text-xl font-bold">Level Up</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track habits, tasks and challenges to grow your streak.
          </p>

          <nav
            aria-label="Level Up sections"
            className="mt-4 flex gap-1 overflow-x-auto scrollbar-none -mx-4 px-4 sm:-mx-6 sm:px-6"
          >
            {VIEWS.map(({ key, label, icon: Icon }) => {
              const active = view === key;
              return (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 shrink-0 px-3 py-2.5 text-sm font-medium",
                    "border-b-2 -mb-px transition-colors whitespace-nowrap",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-t",
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <main>{renderView()}</main>
    </AppLayout>
  );
}
