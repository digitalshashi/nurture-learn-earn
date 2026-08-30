import { Outlet } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuestProvider, useQuest } from "@/contexts/QuestContext";
import { QuestTopNav } from "./QuestTopNav";

/**
 * The chrome every Quest screen sits inside.
 *
 * Mounted once as the parent route rather than by each page, so the data
 * loads a single time and the nav does not flash back to zero on every
 * navigation within the section.
 */
export function QuestShell() {
  return (
    <AppLayout>
      <QuestProvider>
        <QuestFrame />
      </QuestProvider>
    </AppLayout>
  );
}

function QuestFrame() {
  const { loading, degraded } = useQuest();

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6">
      {degraded && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[hsl(25_95%_53%/0.3)] bg-[hsl(25_95%_53%/0.08)] p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(25_95%_43%)]" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Quest storage is not set up yet.</span>{" "}
            Screens still work, but nothing you do here will be saved until the{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">20260902000000_quest_module</code>{" "}
            migration has been applied to the database.
          </p>
        </div>
      )}

      <QuestTopNav />
      <main className="min-w-0">{loading ? <QuestSkeleton /> : <Outlet />}</main>
    </div>
  );
}

function QuestSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
      <div className="h-28 animate-pulse rounded-2xl bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
