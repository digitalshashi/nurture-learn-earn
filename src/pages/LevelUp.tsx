import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { LayoutDashboard, BarChart3, Database, Stethoscope, Heart, ChevronDown, ChevronRight } from "lucide-react";
import { LevelUpDashboard } from "@/components/levelup/LevelUpDashboard";
import { LevelUpHabits } from "@/components/levelup/LevelUpHabits";
import { LevelUpTasks } from "@/components/levelup/LevelUpTasks";
import { LevelUpChallenges } from "@/components/levelup/LevelUpChallenges";
import { LevelUpData } from "@/components/levelup/LevelUpData";
import { LevelUpCheckup } from "@/components/levelup/LevelUpCheckup";
import { LevelUpCharity } from "@/components/levelup/LevelUpCharity";

type View = "dashboard" | "habits" | "tasks" | "challenges" | "data" | "checkup" | "charity";

const productivityItems: { key: View; label: string }[] = [
  { key: "habits", label: "Habits" },
  { key: "tasks", label: "Tasks" },
  { key: "challenges", label: "Challenges" },
];

export default function LevelUp() {
  const [view, setView] = useState<View>("dashboard");
  const [prodOpen, setProdOpen] = useState(true);

  const isProductivity = ["habits", "tasks", "challenges"].includes(view);

  const renderView = () => {
    switch (view) {
      case "dashboard": return <LevelUpDashboard />;
      case "habits": return <LevelUpHabits />;
      case "tasks": return <LevelUpTasks />;
      case "challenges": return <LevelUpChallenges />;
      case "data": return <LevelUpData />;
      case "checkup": return <LevelUpCheckup />;
      case "charity": return <LevelUpCharity />;
    }
  };

  return (
    <AppLayout>
      <div className="flex min-h-[calc(100vh-var(--nav-height))]">
        {/* Left sidebar */}
        <aside className="w-60 border-r bg-card shrink-0 p-3 space-y-1">
          <button
            onClick={() => setView("dashboard")}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              view === "dashboard" ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground"
            )}
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </button>

          {/* Productivity collapsible */}
          <div>
            <button
              onClick={() => setProdOpen(!prodOpen)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isProductivity ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="flex-1 text-left">Productivity</span>
              {prodOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {prodOpen && (
              <div className="ml-4 mt-1 space-y-0.5">
                {productivityItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setView(item.key)}
                    className={cn(
                      "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors",
                      view === item.key
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", view === item.key ? "bg-primary" : "bg-muted-foreground/40")} />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setView("data")}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              view === "data" ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground"
            )}
          >
            <Database className="h-4 w-4" /> Data
          </button>

          <button
            onClick={() => setView("checkup")}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              view === "checkup" ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground"
            )}
          >
            <Stethoscope className="h-4 w-4" /> Checkup
          </button>

          <button
            onClick={() => setView("charity")}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              view === "charity" ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground"
            )}
          >
            <Heart className="h-4 w-4" /> Charity
          </button>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {renderView()}
        </main>
      </div>
    </AppLayout>
  );
}
