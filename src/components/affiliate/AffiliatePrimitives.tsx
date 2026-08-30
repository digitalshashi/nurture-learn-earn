/**
 * The small pieces all three tabs are built from.
 *
 * They live together because their job is consistency: a summary figure has to
 * look identical whether it sits above the sales table or the payments table,
 * and an empty tab has to read as "nothing yet" rather than as a page that
 * failed to load.
 */
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/** One figure above a table. Tabular numerals so a column of them lines up. */
export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "positive" | "pending";
}) {
  return (
    <Card className="card-shadow">
      <CardContent className="pb-3 pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            "text-2xl font-bold tabular-nums",
            tone === "positive" && "text-emerald-600 dark:text-emerald-400",
            tone === "pending" && "text-amber-600 dark:text-amber-400",
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * What a tab shows before anything has happened.
 *
 * Each one names the next action rather than only stating the absence, because
 * "No sales yet" on its own leaves an affiliate with nowhere to go.
 */
export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="py-14 text-center">
      <Icon className="mx-auto h-10 w-10 text-muted-foreground/30" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      {children && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>
      )}
    </div>
  );
}

/** A date and the time under it, which is how the payments table reads. */
export function DateTimeCell({ iso }: { iso: string }) {
  const at = new Date(iso);
  return (
    <div>
      <p className="text-sm">
        {at.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
      </p>
      <p className="text-xs text-muted-foreground">
        {at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
      </p>
    </div>
  );
}
