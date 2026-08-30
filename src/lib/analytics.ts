/**
 * The arithmetic behind the analytics screens.
 *
 * Kept separate from the queries and the charts because this is the part that
 * can be wrong without looking wrong: an off-by-one in a date window, a
 * percentage divided by zero, a chart with a gap where a quiet day should be.
 * All of it is pure, so all of it is tested.
 *
 * Dates are bucketed in the viewer's own timezone. A coach in Chennai looking
 * at "today" means their today, and UTC bucketing would put every evening sale
 * on the wrong day.
 */

export type RangeKey = "7d" | "30d" | "90d" | "12m";

export interface RangeSpec {
  key: RangeKey;
  label: string;
  /** Length of the window in days. */
  days: number;
  bucket: "day" | "month";
}

export const RANGES: Record<RangeKey, RangeSpec> = {
  "7d": { key: "7d", label: "Last 7 days", days: 7, bucket: "day" },
  "30d": { key: "30d", label: "Last 30 days", days: 30, bucket: "day" },
  "90d": { key: "90d", label: "Last 90 days", days: 90, bucket: "day" },
  "12m": { key: "12m", label: "Last 12 months", days: 365, bucket: "month" },
};

export const RANGE_KEYS = Object.keys(RANGES) as RangeKey[];

export const isRangeKey = (value: unknown): value is RangeKey =>
  typeof value === "string" && value in RANGES;

export interface Window {
  /** Inclusive start of the window. */
  from: Date;
  /** Exclusive end — now. */
  to: Date;
  /** The equally long window immediately before it, for a trend. */
  previousFrom: Date;
  previousTo: Date;
}

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

/**
 * The window a range covers, and the one before it.
 *
 * "Last 7 days" includes today, so it starts six days ago — a window that
 * started seven days ago would be eight days long and every trend would be
 * computed against a slightly different span.
 */
export function windowFor(range: RangeSpec, now: Date = new Date()): Window {
  const to = now;
  const from =
    range.bucket === "month"
      ? new Date(now.getFullYear(), now.getMonth() - 11, 1)
      : startOfDay(addDays(now, -(range.days - 1)));

  const span = to.getTime() - from.getTime();
  return {
    from,
    to,
    previousFrom: new Date(from.getTime() - span),
    previousTo: from,
  };
}

/** The bucket a moment falls in: "2026-08-30" by day, "2026-08" by month. */
export function bucketKey(date: Date | string, bucket: "day" | "month"): string {
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "";

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  if (bucket === "month") return `${year}-${month}`;
  return `${year}-${month}-${String(value.getDate()).padStart(2, "0")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A short axis label for a bucket key. */
export function bucketLabel(key: string, bucket: "day" | "month"): string {
  const [year, month, day] = key.split("-");
  const name = MONTHS[Number(month) - 1] ?? "";
  if (bucket === "month") return `${name} ${year.slice(2)}`;
  return `${Number(day)} ${name}`;
}

/**
 * Every bucket in the window, in order, including the empty ones.
 *
 * A chart built only from rows that exist draws a straight line between two
 * sales a fortnight apart and reads as steady trade. The quiet days have to be
 * in the series for the shape to be honest.
 */
export function bucketsIn(range: RangeSpec, now: Date = new Date()): string[] {
  const keys: string[] = [];

  if (range.bucket === "month") {
    let cursor = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    for (let i = 0; i < 12; i++) {
      keys.push(bucketKey(cursor, "month"));
      cursor = addMonths(cursor, 1);
    }
    return keys;
  }

  let cursor = startOfDay(addDays(now, -(range.days - 1)));
  for (let i = 0; i < range.days; i++) {
    keys.push(bucketKey(cursor, "day"));
    cursor = addDays(cursor, 1);
  }
  return keys;
}

export interface SeriesPoint {
  key: string;
  label: string;
  value: number;
}

/**
 * A row set collapsed into one number per bucket.
 *
 * `value` defaults to counting rows; pass one to sum a field instead. Rows
 * outside the window, and rows with an unreadable date, are dropped rather
 * than bucketed into whatever `new Date` made of them.
 */
export function seriesOf<T>(
  rows: T[],
  options: {
    date: (row: T) => string | Date | null | undefined;
    value?: (row: T) => number;
    range: RangeSpec;
    now?: Date;
  },
): SeriesPoint[] {
  const now = options.now ?? new Date();
  const keys = bucketsIn(options.range, now);
  const totals = new Map<string, number>(keys.map((key) => [key, 0]));

  for (const row of rows) {
    const raw = options.date(row);
    if (!raw) continue;

    const key = bucketKey(raw, options.range.bucket);
    if (!totals.has(key)) continue;

    totals.set(key, totals.get(key)! + (options.value ? options.value(row) : 1));
  }

  return keys.map((key) => ({
    key,
    label: bucketLabel(key, options.range.bucket),
    value: totals.get(key) ?? 0,
  }));
}

/** Rows whose date falls inside a half-open window. */
export function within<T>(
  rows: T[],
  date: (row: T) => string | Date | null | undefined,
  from: Date,
  to: Date,
): T[] {
  return rows.filter((row) => {
    const raw = date(row);
    if (!raw) return false;
    const value = typeof raw === "string" ? new Date(raw) : raw;
    if (Number.isNaN(value.getTime())) return false;
    return value >= from && value < to;
  });
}

export function sumBy<T>(rows: T[], value: (row: T) => number): number {
  return rows.reduce((total, row) => total + (Number(value(row)) || 0), 0);
}

export function countUnique<T>(rows: T[], key: (row: T) => string | null | undefined): number {
  const seen = new Set<string>();
  for (const row of rows) {
    const value = key(row);
    if (value) seen.add(value);
  }
  return seen.size;
}

/**
 * How much a number moved, as a percentage of where it was.
 *
 * Returns null when there is nothing to compare against — "up 100%" from zero
 * is not a fact, it is a division that happened to terminate.
 */
export function deltaPercent(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

/** A share of a total, safe at zero and clamped to something sane. */
export function rate(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.min(100, Math.max(0, (part / whole) * 100));
}

export interface RankedItem {
  id: string;
  label: string;
  value: number;
  count: number;
}

/** The biggest few of something, by summed value, with ties broken by count. */
export function topN<T>(
  rows: T[],
  options: {
    id: (row: T) => string | null | undefined;
    label: (row: T) => string;
    value?: (row: T) => number;
    limit?: number;
  },
): RankedItem[] {
  const groups = new Map<string, RankedItem>();

  for (const row of rows) {
    const id = options.id(row);
    if (!id) continue;

    const existing = groups.get(id) ?? { id, label: options.label(row), value: 0, count: 0 };
    existing.value += options.value ? Number(options.value(row)) || 0 : 1;
    existing.count += 1;
    groups.set(id, existing);
  }

  return [...groups.values()]
    .sort((a, b) => b.value - a.value || b.count - a.count)
    .slice(0, options.limit ?? 5);
}

export interface FunnelStep {
  label: string;
  value: number;
  /** Share of the step above it. */
  ofPrevious: number;
  /** Share of the first step. */
  ofFirst: number;
}

/**
 * A funnel, with each step measured against the one above and against the top.
 *
 * Only the first is the "conversion rate" people usually mean, but a step that
 * halves is invisible in the end-to-end number, which is exactly where drop-off
 * hides.
 */
export function funnel(steps: { label: string; value: number }[]): FunnelStep[] {
  const first = steps[0]?.value ?? 0;

  return steps.map((step, index) => ({
    label: step.label,
    value: step.value,
    ofPrevious: index === 0 ? 100 : rate(step.value, steps[index - 1].value),
    ofFirst: rate(step.value, first),
  }));
}

/** The set of days something happened on, in local time. */
export function activeDays<T>(
  rows: T[],
  date: (row: T) => string | Date | null | undefined,
): Set<string> {
  const days = new Set<string>();
  for (const row of rows) {
    const raw = date(row);
    if (!raw) continue;
    const key = bucketKey(raw, "day");
    if (key) days.add(key);
  }
  return days;
}

/**
 * Consecutive days up to today, counting back.
 *
 * Today not being in the set does not break a streak — it is not over until
 * the day is. Yesterday missing does.
 */
export function currentStreak(days: Set<string>, now: Date = new Date()): number {
  let streak = 0;
  let cursor = startOfDay(now);

  if (!days.has(bucketKey(cursor, "day"))) {
    cursor = addDays(cursor, -1);
    if (!days.has(bucketKey(cursor, "day"))) return 0;
  }

  while (days.has(bucketKey(cursor, "day"))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** A whole number for display, with thousands separators. */
export const formatCount = (value: number): string =>
  Math.round(value).toLocaleString();

/** A percentage for display, with one decimal only when it earns one. */
export function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

/** Minutes, as a human would say them. */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 60) return `${Math.max(0, Math.round(seconds))}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
