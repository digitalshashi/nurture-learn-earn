import { describe, it, expect } from "vitest";
import {
  availableBalance,
  buildSeries,
  computeTotals,
  formatMoney,
  parseCsv,
  parseCsvLine,
  toCsv,
  topProducts,
  type Transaction,
  type Withdrawal,
} from "./sales";

const txn = (over: Partial<Transaction> = {}): Transaction => ({
  id: crypto.randomUUID(),
  coach_id: "c1",
  user_id: "u1",
  service_id: "s1",
  type: "sale",
  status: "completed",
  amount: 1000,
  currency: "INR",
  gateway: "razorpay",
  gateway_txn_id: "pay_1",
  customer_name: "Alex",
  customer_email: "alex@example.com",
  item_name: "Course A",
  notes: null,
  occurred_at: new Date().toISOString(),
  ...over,
});

const wd = (over: Partial<Withdrawal> = {}): Withdrawal => ({
  id: crypto.randomUUID(),
  coach_id: "c1",
  amount: 500,
  currency: "INR",
  status: "requested",
  method: "bank",
  destination: null,
  reference: null,
  notes: null,
  requested_at: new Date().toISOString(),
  processed_at: null,
  ...over,
});

describe("formatMoney", () => {
  it("uses the right symbol and two decimals", () => {
    expect(formatMoney(1499, "INR")).toBe("₹1,499.00");
    expect(formatMoney(20, "USD")).toBe("$20.00");
  });

  it("does not print NaN for junk", () => {
    expect(formatMoney(Number.NaN)).toBe("₹0.00");
  });
});

describe("computeTotals", () => {
  it("adds completed sales and subtracts refunds", () => {
    const totals = computeTotals([
      txn({ amount: 1000 }),
      txn({ amount: 500 }),
      txn({ amount: 300, type: "refund" }),
    ]);
    expect(totals.gross).toBe(1500);
    expect(totals.refunded).toBe(300);
    expect(totals.net).toBe(1200);
    expect(totals.saleCount).toBe(2);
    expect(totals.refundCount).toBe(1);
  });

  it("ignores pending and failed charges", () => {
    // Counting money that never arrived is the classic way these pages lie.
    const totals = computeTotals([
      txn({ amount: 1000 }),
      txn({ amount: 999, status: "pending" }),
      txn({ amount: 999, status: "failed" }),
    ]);
    expect(totals.gross).toBe(1000);
    expect(totals.saleCount).toBe(1);
  });

  it("computes average order value and refund rate", () => {
    const totals = computeTotals([
      txn({ amount: 1000 }),
      txn({ amount: 3000 }),
      txn({ amount: 400, type: "refund" }),
    ]);
    expect(totals.averageOrderValue).toBe(2000);
    expect(totals.refundRate).toBeCloseTo(10);
  });

  it("does not divide by zero when there are no sales", () => {
    const totals = computeTotals([]);
    expect(totals.averageOrderValue).toBe(0);
    expect(totals.refundRate).toBe(0);
    expect(totals.net).toBe(0);
  });
});

describe("availableBalance", () => {
  it("is net earnings when nothing has been withdrawn", () => {
    expect(availableBalance([txn({ amount: 1000 })], [])).toBe(1000);
  });

  it("holds back requests already in flight", () => {
    // Otherwise the same money could be requested twice.
    expect(availableBalance([txn({ amount: 1000 })], [wd({ amount: 400 })])).toBe(600);
  });

  it("counts paid and processing payouts as spent", () => {
    const balance = availableBalance(
      [txn({ amount: 1000 })],
      [wd({ amount: 300, status: "paid" }), wd({ amount: 200, status: "processing" })],
    );
    expect(balance).toBe(500);
  });

  it("ignores rejected requests", () => {
    expect(availableBalance([txn({ amount: 1000 })], [wd({ amount: 900, status: "rejected" })])).toBe(1000);
  });

  it("never goes negative", () => {
    expect(availableBalance([txn({ amount: 100 })], [wd({ amount: 900, status: "paid" })])).toBe(0);
  });

  it("subtracts refunds before paying out", () => {
    const balance = availableBalance(
      [txn({ amount: 1000 }), txn({ amount: 600, type: "refund" })],
      [],
    );
    expect(balance).toBe(400);
  });
});

describe("buildSeries", () => {
  const now = new Date(2026, 7, 15); // August 2026

  it("returns one bucket per month, oldest first", () => {
    const series = buildSeries([], 6, now);
    expect(series).toHaveLength(6);
    expect(series[0].label).toBe("Mar");
    expect(series[5].label).toBe("Aug");
  });

  it("places transactions in the right month", () => {
    const series = buildSeries(
      [
        txn({ amount: 500, occurred_at: new Date(2026, 7, 3).toISOString() }),
        txn({ amount: 200, occurred_at: new Date(2026, 6, 3).toISOString() }),
      ],
      6,
      now,
    );
    expect(series[5].sales).toBe(500);
    expect(series[4].sales).toBe(200);
  });

  it("nets refunds against the same month", () => {
    const series = buildSeries(
      [
        txn({ amount: 500, occurred_at: new Date(2026, 7, 3).toISOString() }),
        txn({ amount: 100, type: "refund", occurred_at: new Date(2026, 7, 9).toISOString() }),
      ],
      6,
      now,
    );
    expect(series[5]).toMatchObject({ sales: 500, refunds: 100, net: 400 });
  });

  it("drops anything outside the window rather than misplacing it", () => {
    const series = buildSeries(
      [txn({ amount: 900, occurred_at: new Date(2024, 0, 1).toISOString() })],
      6,
      now,
    );
    expect(series.reduce((s, p) => s + p.sales, 0)).toBe(0);
  });
});

describe("topProducts", () => {
  it("ranks by revenue and counts units", () => {
    const top = topProducts([
      txn({ item_name: "A", amount: 100 }),
      txn({ item_name: "B", amount: 500 }),
      txn({ item_name: "A", amount: 100 }),
    ]);
    expect(top[0]).toMatchObject({ name: "B", revenue: 500, count: 1 });
    expect(top[1]).toMatchObject({ name: "A", revenue: 200, count: 2 });
  });

  it("excludes refunds and unpaid rows", () => {
    const top = topProducts([
      txn({ item_name: "A", amount: 100 }),
      txn({ item_name: "A", amount: 50, type: "refund" }),
      txn({ item_name: "A", amount: 50, status: "pending" }),
    ]);
    expect(top[0].revenue).toBe(100);
  });
});

describe("CSV export", () => {
  it("writes a header and one row per transaction", () => {
    const csv = toCsv([txn({ amount: 1000 })]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toContain("amount");
    expect(lines).toHaveLength(2);
  });

  it("quotes values containing commas or quotes", () => {
    const csv = toCsv([txn({ customer_name: 'Doe, John "JD"' })]);
    expect(csv).toContain('"Doe, John ""JD"""');
  });

  it("survives a round trip", () => {
    const original = txn({ amount: 1234.5, item_name: "Course, Advanced" });
    const { rows, errors } = parseCsv(toCsv([original]));
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({
      amount: 1234.5,
      item_name: "Course, Advanced",
      type: "sale",
    });
  });
});

describe("parseCsvLine", () => {
  it("splits plain values", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("keeps commas inside quotes", () => {
    expect(parseCsvLine('a,"b,c",d')).toEqual(["a", "b,c", "d"]);
  });

  it("unescapes doubled quotes", () => {
    expect(parseCsvLine('"say ""hi""",x')).toEqual(['say "hi"', "x"]);
  });

  it("keeps empty trailing cells", () => {
    expect(parseCsvLine("a,,")).toEqual(["a", "", ""]);
  });
});

describe("CSV import", () => {
  it("rejects a file with no data rows", () => {
    expect(parseCsv("amount\n").errors[0]).toMatch(/no data rows/i);
  });

  it("requires an amount column", () => {
    const { errors } = parseCsv("customer_name\nAlex");
    expect(errors[0]).toMatch(/amount/i);
  });

  it("reports a bad amount instead of importing zero", () => {
    // Silently coercing "abc" to 0 would quietly corrupt every total.
    const { rows, errors } = parseCsv("amount\nabc");
    expect(rows).toHaveLength(0);
    expect(errors[0]).toMatch(/not a valid amount/i);
  });

  it("rejects an unknown type", () => {
    const { errors } = parseCsv("amount,type\n100,chargeback");
    expect(errors[0]).toMatch(/sale or refund/i);
  });

  it("rejects an unreadable date", () => {
    const { errors } = parseCsv("amount,occurred_at\n100,not-a-date");
    expect(errors[0]).toMatch(/not a date/i);
  });

  it("defaults the optional columns", () => {
    const { rows, errors } = parseCsv("amount\n250");
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ type: "sale", status: "completed", currency: "INR", amount: 250 });
    expect(rows[0].gateway).toBe("imported");
  });

  it("stores refunds as a positive amount", () => {
    // The sign lives in the type; a negative here would double-subtract.
    const { rows } = parseCsv("amount,type\n-300,refund");
    expect(rows[0]).toMatchObject({ type: "refund", amount: 300 });
  });

  it("keeps good rows and reports only the bad ones", () => {
    const { rows, errors } = parseCsv("amount\n100\nbad\n200");
    expect(rows).toHaveLength(2);
    expect(errors).toHaveLength(1);
  });
});
