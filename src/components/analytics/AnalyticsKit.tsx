import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatCount,
  formatPercent,
  type FunnelStep,
  type RankedItem,
  type SeriesPoint,
} from "@/lib/analytics";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** The pieces every analytics view is built from, so all three read alike. */

export function Kpi({
  title,
  value,
  delta,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  /** Percentage change against the previous window; null when incomparable. */
  delta?: number | null;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  // A trend against zero is not a trend, so it renders as a dash rather than
  // an exciting number nobody can act on.
  const direction = delta === null || delta === undefined ? null : delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  return (
    <Card className="card-shadow">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <span className="text-xs text-muted-foreground">{title}</span>
        </div>
        <p className="text-xl font-bold tabular-nums">{value}</p>

        <div className="flex items-center gap-1.5 mt-1 min-h-[16px]">
          {direction && (
            <span
              className={cn(
                "text-[11px] font-medium flex items-center gap-0.5",
                direction === "up" && "text-emerald-600",
                direction === "down" && "text-destructive",
                direction === "flat" && "text-muted-foreground",
              )}
            >
              {direction === "up" && <ArrowUpRight className="h-3 w-3" />}
              {direction === "down" && <ArrowDownRight className="h-3 w-3" />}
              {direction === "flat" && <Minus className="h-3 w-3" />}
              {formatPercent(Math.abs(delta as number))}
            </span>
          )}
          {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="card-shadow">
      <CardHeader className="pb-2 flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Shown instead of an axis-less chart when a window genuinely has no data. */
export function Empty({ message }: { message: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-center px-6">
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
    </div>
  );
}

const axis = { fontSize: 11, tickLine: false, axisLine: false } as const;

/** Enough points to draw a shape, rather than one dot and a lot of grid. */
const hasShape = (series: SeriesPoint[]) => series.some((point) => point.value > 0);

export function TrendChart({
  series,
  label,
  format,
  empty,
}: {
  series: SeriesPoint[];
  label: string;
  format?: (value: number) => string;
  empty: string;
}) {
  if (!hasShape(series)) return <Empty message={empty} />;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" {...axis} minTickGap={24} />
        <YAxis {...axis} width={56} tickFormatter={(v) => (format ? format(v) : formatCount(v))} />
        <Tooltip
          formatter={(value: number) => [format ? format(value) : formatCount(value), label]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          name={label}
          stroke="hsl(var(--accent))"
          strokeWidth={2}
          fill="hsl(var(--accent) / 0.15)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ComparisonChart({
  series,
  empty,
}: {
  series: { label: string; a: number; b: number }[];
  /** Names for the two bars. */
  empty: string;
}) {
  if (!series.some((point) => point.a > 0 || point.b > 0)) return <Empty message={empty} />;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" {...axis} minTickGap={24} />
        <YAxis {...axis} width={40} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar dataKey="a" name="Visits" fill="hsl(var(--info))" radius={[3, 3, 0, 0]} />
        <Bar dataKey="b" name="Purchases" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RateChart({ series, empty }: { series: SeriesPoint[]; empty: string }) {
  if (!hasShape(series)) return <Empty message={empty} />;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" {...axis} minTickGap={24} />
        <YAxis {...axis} width={44} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          formatter={(value: number) => [formatPercent(value), "Conversion"]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Line type="monotone" dataKey="value" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** A funnel as bars, because the drop between steps is the whole point. */
export function Funnel({ steps, empty }: { steps: FunnelStep[]; empty: string }) {
  if (!steps.length || steps[0].value === 0) return <Empty message={empty} />;

  return (
    <div className="space-y-4 py-1">
      {steps.map((step, index) => (
        <div key={step.label}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="text-xs font-medium">{step.label}</span>
            <span className="text-xs tabular-nums">
              {formatCount(step.value)}
              {index > 0 && (
                <span className="text-muted-foreground ml-2">
                  {formatPercent(step.ofPrevious)} of previous
                </span>
              )}
            </span>
          </div>
          <Progress value={step.ofFirst} className="h-2" />
        </div>
      ))}
    </div>
  );
}

/** A ranked list, used wherever "which of these is doing best" is the question. */
export function Ranking({
  items,
  format,
  empty,
  unit,
}: {
  items: RankedItem[];
  format?: (value: number) => string;
  empty: string;
  unit?: string;
}) {
  if (!items.length) return <Empty message={empty} />;

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="text-xs truncate">{item.label}</span>
            <span className="text-xs tabular-nums shrink-0">
              {format ? format(item.value) : formatCount(item.value)}
              {unit && <span className="text-muted-foreground ml-1">{unit}</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-accent rounded-full"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
