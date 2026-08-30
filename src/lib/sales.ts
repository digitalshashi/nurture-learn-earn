import { DEFAULT_CURRENCY, formatCurrency } from "./currency";

/**
 * Shared sales logic for the four Sales pages.
 *
 * Kept out of the components so Earnings, Transactions, Subscriptions and
 * Withdrawals cannot drift into disagreeing about what "net earnings" or
 * "available balance" mean.
 */

export type TransactionType = "sale" | "refund";
export type TransactionStatus = "completed" | "pending" | "failed" | "refunded";
export type WithdrawalStatus = "requested" | "processing" | "paid" | "rejected";

export interface Transaction {
  id: string;
  coach_id: string;
  user_id: string | null;
  service_id: string | null;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  gateway: string | null;
  gateway_txn_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  item_name: string | null;
  notes: string | null;
  occurred_at: string;
}

export interface Withdrawal {
  id: string;
  coach_id: string;
  amount: number;
  currency: string;
  status: WithdrawalStatus;
  method: string | null;
  destination: string | null;
  reference: string | null;
  notes: string | null;
  requested_at: string;
  processed_at: string | null;
}

// Money formatting lives in one place. This module kept its own symbol map,
// which meant Sales could disagree with the rest of the product about how an
// amount is written.
export const formatMoney = (amount: number, currency: string = DEFAULT_CURRENCY): string =>
  formatCurrency(amount, currency, { precise: true });

/** A completed sale counts toward earnings; pending and failed do not. */
export const isEarning = (t: Transaction) => t.type === "sale" && t.status === "completed";
export const isRefund = (t: Transaction) => t.type === "refund";

export interface SalesTotals {
  gross: number;
  refunded: number;
  net: number;
  saleCount: number;
  refundCount: number;
  averageOrderValue: number;
  /** Refunded value as a share of gross, 0–100. */
  refundRate: number;
}

export function computeTotals(transactions: Transaction[]): SalesTotals {
  let gross = 0;
  let refunded = 0;
  let saleCount = 0;
  let refundCount = 0;

  for (const t of transactions) {
    if (isEarning(t)) {
      gross += Number(t.amount) || 0;
      saleCount += 1;
    } else if (isRefund(t)) {
      // Refunds are stored as positive amounts; the sign is the type's job.
      refunded += Number(t.amount) || 0;
      refundCount += 1;
    }
  }

  return {
    gross,
    refunded,
    net: gross - refunded,
    saleCount,
    refundCount,
    averageOrderValue: saleCount > 0 ? gross / saleCount : 0,
    refundRate: gross > 0 ? (refunded / gross) * 100 : 0,
  };
}

/**
 * What a coach can actually withdraw: net earnings minus anything already paid
 * out or currently in flight. Requests in flight are held back so the same
 * money cannot be requested twice.
 */
export function availableBalance(transactions: Transaction[], withdrawals: Withdrawal[]): number {
  const { net } = computeTotals(transactions);
  const committed = withdrawals
    .filter((w) => w.status !== "rejected")
    .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
  return Math.max(0, net - committed);
}

export interface SeriesPoint {
  label: string;
  sales: number;
  refunds: number;
  net: number;
}

/** Groups into buckets for the revenue chart, oldest first. */
export function buildSeries(
  transactions: Transaction[],
  months = 6,
  now = new Date(),
): SeriesPoint[] {
  const buckets: SeriesPoint[] = [];
  const index = new Map<string, SeriesPoint>();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const point: SeriesPoint = {
      label: d.toLocaleString(undefined, { month: "short" }),
      sales: 0,
      refunds: 0,
      net: 0,
    };
    buckets.push(point);
    index.set(key, point);
  }

  for (const t of transactions) {
    const d = new Date(t.occurred_at);
    const point = index.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (!point) continue; // outside the window
    if (isEarning(t)) point.sales += Number(t.amount) || 0;
    else if (isRefund(t)) point.refunds += Number(t.amount) || 0;
  }

  for (const point of buckets) point.net = point.sales - point.refunds;
  return buckets;
}

/** Revenue per product, biggest first — what actually sells. */
export function topProducts(transactions: Transaction[], limit = 5) {
  const totals = new Map<string, { name: string; revenue: number; count: number }>();

  for (const t of transactions) {
    if (!isEarning(t)) continue;
    const name = t.item_name || "Unnamed";
    const row = totals.get(name) ?? { name, revenue: 0, count: 0 };
    row.revenue += Number(t.amount) || 0;
    row.count += 1;
    totals.set(name, row);
  }

  return [...totals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

// ------------------------------------------------------------------ CSV ----

export const CSV_COLUMNS = [
  "occurred_at",
  "type",
  "status",
  "amount",
  "currency",
  "customer_name",
  "customer_email",
  "item_name",
  "gateway",
  "gateway_txn_id",
  "notes",
] as const;

/** Escapes a value for CSV: quotes, commas and newlines all need handling. */
const csvCell = (value: unknown): string => {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(transactions: Transaction[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = transactions.map((t) =>
    CSV_COLUMNS.map((c) => csvCell((t as unknown as Record<string, unknown>)[c])).join(","),
  );
  return [header, ...rows].join("\r\n");
}

/** Splits one CSV line, respecting quotes and doubled quotes inside them. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cell);
      cell = "";
    } else {
      cell += ch;
    }
  }
  out.push(cell);
  return out;
}

export interface ParsedImport {
  rows: Partial<Transaction>[];
  errors: string[];
}

/**
 * Reads a CSV export back in — the path for migrating sales history off another
 * platform. Rows that cannot be trusted are reported rather than guessed at,
 * because a wrong amount silently corrupts every total on these pages.
 */
export function parseCsv(text: string): ParsedImport {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const errors: string[] = [];
  if (lines.length < 2) return { rows: [], errors: ["The file has no data rows."] };

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const required = ["amount"];
  for (const col of required) {
    if (!header.includes(col)) errors.push(`Missing required column: ${col}`);
  }
  if (errors.length) return { rows: [], errors };

  const rows: Partial<Transaction>[] = [];

  lines.slice(1).forEach((line, i) => {
    const cells = parseCsvLine(line);
    const get = (name: string) => {
      const idx = header.indexOf(name);
      return idx === -1 ? "" : (cells[idx] ?? "").trim();
    };

    const amount = Number(get("amount"));
    if (!Number.isFinite(amount)) {
      errors.push(`Row ${i + 2}: "${get("amount")}" is not a valid amount`);
      return;
    }

    const type = get("type").toLowerCase();
    if (type && type !== "sale" && type !== "refund") {
      errors.push(`Row ${i + 2}: type must be sale or refund, got "${type}"`);
      return;
    }

    const occurred = get("occurred_at");
    if (occurred && Number.isNaN(Date.parse(occurred))) {
      errors.push(`Row ${i + 2}: "${occurred}" is not a date we can read`);
      return;
    }

    rows.push({
      type: (type || "sale") as TransactionType,
      status: (get("status") || "completed") as TransactionStatus,
      amount: Math.abs(amount),
      currency: get("currency") || "INR",
      customer_name: get("customer_name") || null,
      customer_email: get("customer_email") || null,
      item_name: get("item_name") || null,
      gateway: get("gateway") || "imported",
      gateway_txn_id: get("gateway_txn_id") || null,
      notes: get("notes") || null,
      occurred_at: occurred ? new Date(occurred).toISOString() : new Date().toISOString(),
    });
  });

  return { rows, errors };
}
