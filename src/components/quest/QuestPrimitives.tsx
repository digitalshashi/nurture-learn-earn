import { Check, Lock, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * The three shapes every Quest screen is built from.
 *
 * Rituals, guidelines, power tools, awards and missions are all the same
 * list: an icon on the left, a title and one line of description in the
 * middle, and a status or an action on the right. Writing that anatomy once
 * is what keeps the section feeling like one product rather than eleven
 * screens that happen to share a sidebar.
 */

// ------------------------------------------------------------------ status --

export type QuestStatus =
  | "done"
  | "next"
  | "locked"
  | "achieved"
  | "pending"
  | "apply"
  | "live";

const STATUS_STYLES: Record<QuestStatus, { label: string; className: string }> = {
  done: { label: "DONE", className: "bg-success/12 text-success border-success/25" },
  achieved: { label: "ACHIEVED", className: "bg-success/12 text-success border-success/25" },
  next: { label: "NEXT", className: "bg-accent/12 text-accent border-accent/30" },
  apply: { label: "APPLY NOW", className: "bg-accent/12 text-accent border-accent/30" },
  live: { label: "LIVE", className: "bg-accent text-accent-foreground border-accent" },
  pending: { label: "IN REVIEW", className: "bg-info/12 text-info border-info/25" },
  locked: { label: "LOCKED", className: "bg-muted text-muted-foreground border-border" },
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status: QuestStatus;
  /** Overrides the default word, e.g. "0/7" instead of "NEXT". */
  label?: string;
  className?: string;
}) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide whitespace-nowrap",
        style.className,
        className,
      )}
    >
      {label ?? style.label}
    </span>
  );
}

// -------------------------------------------------------------------- rows --

/**
 * One item in any Quest list.
 *
 * A locked row is dimmed and shown, never removed: the ladder has to stay
 * visible for the rungs above to mean anything.
 */
export function QuestRow({
  icon: Icon,
  iconHue,
  index,
  title,
  description,
  status,
  statusLabel,
  action,
  onClick,
  className,
  children,
}: {
  icon: LucideIcon;
  /** HSL triplet, e.g. "25 95% 53%". Falls back to the accent colour. */
  iconHue?: string;
  /** Step number for ordered chains. */
  index?: number;
  title: string;
  description?: ReactNode;
  status?: QuestStatus;
  statusLabel?: string;
  action?: ReactNode;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}) {
  const locked = status === "locked";
  // The accent token is itself an HSL triplet, so an explicit hue and the
  // default go through exactly the same `hsl(... / alpha)` expression.
  const hue = iconHue ?? "var(--accent)";
  const interactive = !!onClick && !locked;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3 sm:p-4 transition-colors",
        locked ? "opacity-60 border-border" : "border-border",
        interactive && "cursor-pointer hover:border-accent/40 hover:bg-secondary/40",
        className,
      )}
      onClick={interactive ? onClick : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start gap-3">
        {index !== undefined && (
          <span className="mt-0.5 w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground tabular-nums">
            {index}
          </span>
        )}
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
          style={{
            backgroundColor: `hsl(${hue} / 0.12)`,
            color: `hsl(${hue})`,
          }}
        >
          {locked ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold leading-tight">{title}</p>
            {status && <StatusPill status={status} label={statusLabel} />}
          </div>
          {description && (
            <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</div>
          )}
          {children}
        </div>

        {action && <div className="shrink-0 self-center">{action}</div>}
      </div>
    </div>
  );
}

/** A checklist row — the same anatomy, with a tick instead of a status pill. */
export function QuestCheckRow({
  icon: Icon,
  title,
  description,
  done,
  onToggle,
  disabled,
  children,
  meta,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  done: boolean;
  onToggle: () => void;
  disabled?: boolean;
  children?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        done ? "border-success/25 bg-success/5" : "border-border bg-card hover:bg-secondary/40",
      )}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <span
            className={cn(
              "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
              done ? "bg-success/12 text-success" : "bg-secondary text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium leading-tight", done && "text-muted-foreground line-through")}>
            {title}
          </p>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          {children}
        </div>
        <div className="flex shrink-0 items-center gap-2 self-center">
          {meta}
          <button
            type="button"
            onClick={onToggle}
            disabled={disabled || done}
            aria-pressed={done}
            aria-label={done ? `${title} — done` : `Mark ${title} as done`}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-full border-2 transition-colors",
              done
                ? "border-success bg-success text-success-foreground"
                : "border-border hover:border-accent hover:text-accent",
              (disabled || done) && "cursor-default",
            )}
          >
            <Check className={cn("h-3.5 w-3.5", !done && "opacity-0")} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------- rings --

/** The circular percentage ring used on every score card. */
export function ProgressRing({
  value,
  size = 96,
  stroke = 8,
  hue,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  hue?: string;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const colour = hue ? `hsl(${hue})` : "hsl(var(--accent))";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

// ------------------------------------------------------------------ header --

export function QuestPageHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold leading-tight sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}

/** The "what to do next" strip that sits under a hero. */
export function DoThisNext({
  title,
  description,
  onClick,
  cta = "Open",
}: {
  title: string;
  description: string;
  onClick: () => void;
  cta?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-accent/25 bg-accent/[0.06] p-3 text-left transition-colors hover:bg-accent/10"
    >
      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent-foreground">
        DO THIS NEXT
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent">
        {cta}
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

/** Shown in place of a gated screen's contents before the gate is cleared. */
export function LockedPanel({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Lock className="h-5 w-5" />
      </span>
      <p className="font-display text-base font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
