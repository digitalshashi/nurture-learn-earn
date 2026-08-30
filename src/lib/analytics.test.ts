import { describe, it, expect } from "vitest";
import {
  RANGES,
  activeDays,
  bucketKey,
  bucketLabel,
  bucketsIn,
  countUnique,
  currentStreak,
  deltaPercent,
  formatCount,
  formatDuration,
  formatPercent,
  funnel,
  isRangeKey,
  rate,
  seriesOf,
  sumBy,
  topN,
  windowFor,
  within,
} from "./analytics";

/** A fixed "now" so nothing here depends on when the suite runs. */
const NOW = new Date(2026, 7, 30, 14, 30); // 30 Aug 2026, local time

describe("windowFor", () => {
  it("counts today as one of the seven days", () => {
    // A window starting seven days ago would be eight days long, and every
    // trend would compare unequal spans.
    const { from } = windowFor(RANGES["7d"], NOW);
    expect(bucketKey(from, "day")).toBe("2026-08-24");
  });

  it("starts a monthly range eleven months back, at the first", () => {
    const { from } = windowFor(RANGES["12m"], NOW);
    expect(bucketKey(from, "month")).toBe("2025-09");
    expect(from.getDate()).toBe(1);
  });

  it("makes the previous window exactly as long as the current one", () => {
    const { from, to, previousFrom, previousTo } = windowFor(RANGES["30d"], NOW);
    expect(previousTo).toEqual(from);
    expect(to.getTime() - from.getTime()).toBe(previousTo.getTime() - previousFrom.getTime());
  });
});

describe("bucketKey", () => {
  it("buckets by local day, not UTC", () => {
    // An evening sale in Chennai is UTC the next morning; bucketing in UTC
    // would file it under tomorrow.
    expect(bucketKey(new Date(2026, 7, 30, 23, 45), "day")).toBe("2026-08-30");
  });

  it("buckets by month when asked", () => {
    expect(bucketKey(new Date(2026, 7, 30), "month")).toBe("2026-08");
  });

  it("returns nothing for an unreadable date", () => {
    expect(bucketKey("not a date", "day")).toBe("");
  });
});

describe("bucketLabel", () => {
  it("reads as a date, not a key", () => {
    expect(bucketLabel("2026-08-30", "day")).toBe("30 Aug");
    expect(bucketLabel("2026-08", "month")).toBe("Aug 26");
  });

  it("drops the leading zero from a day", () => {
    expect(bucketLabel("2026-08-05", "day")).toBe("5 Aug");
  });
});

describe("bucketsIn", () => {
  it("returns one bucket per day, oldest first", () => {
    const keys = bucketsIn(RANGES["7d"], NOW);
    expect(keys).toHaveLength(7);
    expect(keys[0]).toBe("2026-08-24");
    expect(keys[6]).toBe("2026-08-30");
  });

  it("returns twelve months for the yearly range", () => {
    const keys = bucketsIn(RANGES["12m"], NOW);
    expect(keys).toHaveLength(12);
    expect(keys[0]).toBe("2025-09");
    expect(keys[11]).toBe("2026-08");
  });

  it("crosses a year boundary correctly", () => {
    const keys = bucketsIn(RANGES["7d"], new Date(2027, 0, 2));
    expect(keys[0]).toBe("2026-12-27");
    expect(keys[6]).toBe("2027-01-02");
  });
});

describe("seriesOf", () => {
  const rows = [
    { at: new Date(2026, 7, 30, 9).toISOString(), amount: 100 },
    { at: new Date(2026, 7, 30, 18).toISOString(), amount: 50 },
    { at: new Date(2026, 7, 28).toISOString(), amount: 200 },
  ];

  it("counts rows per bucket by default", () => {
    const points = seriesOf(rows, { date: (r) => r.at, range: RANGES["7d"], now: NOW });
    expect(points.find((p) => p.key === "2026-08-30")?.value).toBe(2);
    expect(points.find((p) => p.key === "2026-08-28")?.value).toBe(1);
  });

  it("sums a field when given one", () => {
    const points = seriesOf(rows, {
      date: (r) => r.at,
      value: (r) => r.amount,
      range: RANGES["7d"],
      now: NOW,
    });
    expect(points.find((p) => p.key === "2026-08-30")?.value).toBe(150);
  });

  it("keeps the quiet days in the series", () => {
    // Without them a chart draws a straight line between two distant sales
    // and reads as steady trade.
    const points = seriesOf(rows, { date: (r) => r.at, range: RANGES["7d"], now: NOW });
    expect(points).toHaveLength(7);
    expect(points.find((p) => p.key === "2026-08-29")?.value).toBe(0);
  });

  it("drops rows outside the window instead of folding them into the edge", () => {
    const stale = [{ at: new Date(2026, 0, 1).toISOString(), amount: 999 }];
    const points = seriesOf(stale, {
      date: (r) => r.at,
      value: (r) => r.amount,
      range: RANGES["7d"],
      now: NOW,
    });
    expect(points.every((p) => p.value === 0)).toBe(true);
  });

  it("ignores rows with a missing or unreadable date", () => {
    const messy = [{ at: null }, { at: "" }, { at: "banana" }];
    const points = seriesOf(messy, { date: (r) => r.at, range: RANGES["7d"], now: NOW });
    expect(points.every((p) => p.value === 0)).toBe(true);
  });
});

describe("within", () => {
  it("includes the start and excludes the end", () => {
    // Half-open, so a row cannot land in two adjacent windows and be counted
    // twice in a trend.
    const from = new Date(2026, 7, 1);
    const to = new Date(2026, 7, 31);
    const rows = [{ at: from.toISOString() }, { at: to.toISOString() }];

    const kept = within(rows, (r) => r.at, from, to);
    expect(kept).toHaveLength(1);
  });
});

describe("sumBy and countUnique", () => {
  it("sums, treating rubbish as zero", () => {
    expect(sumBy([{ n: 1 }, { n: 2 }, { n: NaN }], (r) => r.n)).toBe(3);
  });

  it("counts distinct non-empty values", () => {
    const rows = [{ id: "a" }, { id: "a" }, { id: "b" }, { id: null }, { id: "" }];
    expect(countUnique(rows, (r) => r.id)).toBe(2);
  });
});

describe("deltaPercent", () => {
  it("reports a rise and a fall", () => {
    expect(deltaPercent(150, 100)).toBe(50);
    expect(deltaPercent(50, 100)).toBe(-50);
  });

  it("refuses to compare against nothing", () => {
    // "Up 100%" from zero is not a fact about the business.
    expect(deltaPercent(10, 0)).toBeNull();
    expect(deltaPercent(0, 0)).toBeNull();
  });
});

describe("rate", () => {
  it("is a percentage of the whole", () => {
    expect(rate(25, 200)).toBe(12.5);
  });

  it("is zero rather than infinity when the whole is zero", () => {
    expect(rate(5, 0)).toBe(0);
  });

  it("never exceeds 100", () => {
    expect(rate(300, 200)).toBe(100);
  });
});

describe("topN", () => {
  const rows = [
    { id: "a", name: "Course A", amount: 100 },
    { id: "b", name: "Course B", amount: 300 },
    { id: "a", name: "Course A", amount: 150 },
    { id: null, name: "Orphan", amount: 999 },
  ];

  it("groups and ranks by summed value", () => {
    const top = topN(rows, { id: (r) => r.id, label: (r) => r.name, value: (r) => r.amount });
    expect(top[0]).toMatchObject({ id: "b", value: 300, count: 1 });
    expect(top[1]).toMatchObject({ id: "a", value: 250, count: 2 });
  });

  it("skips rows with no id rather than lumping them together", () => {
    const top = topN(rows, { id: (r) => r.id, label: (r) => r.name, value: (r) => r.amount });
    expect(top.some((t) => t.label === "Orphan")).toBe(false);
  });

  it("counts rows when no value is given", () => {
    const top = topN(rows, { id: (r) => r.id, label: (r) => r.name });
    expect(top[0]).toMatchObject({ id: "a", value: 2 });
  });

  it("respects the limit", () => {
    expect(topN(rows, { id: (r) => r.id, label: (r) => r.name, limit: 1 })).toHaveLength(1);
  });
});

describe("funnel", () => {
  it("measures each step against the one above and against the top", () => {
    const steps = funnel([
      { label: "Viewed", value: 200 },
      { label: "Started", value: 50 },
      { label: "Paid", value: 25 },
    ]);

    expect(steps[0]).toMatchObject({ ofPrevious: 100, ofFirst: 100 });
    // A step that halves is invisible end to end, which is where drop-off hides.
    expect(steps[1]).toMatchObject({ ofPrevious: 25, ofFirst: 25 });
    expect(steps[2]).toMatchObject({ ofPrevious: 50, ofFirst: 12.5 });
  });

  it("survives an empty funnel", () => {
    expect(funnel([])).toEqual([]);
    expect(funnel([{ label: "Viewed", value: 0 }])[0].ofFirst).toBe(0);
  });
});

describe("activeDays and currentStreak", () => {
  it("collapses many events into the days they happened on", () => {
    const rows = [
      { at: new Date(2026, 7, 30, 9).toISOString() },
      { at: new Date(2026, 7, 30, 21).toISOString() },
      { at: new Date(2026, 7, 29).toISOString() },
    ];
    expect(activeDays(rows, (r) => r.at).size).toBe(2);
  });

  it("counts back from today", () => {
    const days = new Set(["2026-08-30", "2026-08-29", "2026-08-28"]);
    expect(currentStreak(days, NOW)).toBe(3);
  });

  it("does not break a streak just because today is not over", () => {
    const days = new Set(["2026-08-29", "2026-08-28"]);
    expect(currentStreak(days, NOW)).toBe(2);
  });

  it("breaks when yesterday is missing too", () => {
    const days = new Set(["2026-08-28", "2026-08-27"]);
    expect(currentStreak(days, NOW)).toBe(0);
  });

  it("is zero with nothing recorded", () => {
    expect(currentStreak(new Set(), NOW)).toBe(0);
  });
});

describe("formatting", () => {
  it("separates thousands", () => {
    expect(formatCount(12485)).toBe((12485).toLocaleString());
  });

  it("shows a decimal only when it earns one", () => {
    expect(formatPercent(8)).toBe("8%");
    expect(formatPercent(8.42)).toBe("8.4%");
  });

  it("shows an em dash rather than a made-up percentage", () => {
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(Infinity)).toBe("—");
  });

  it("says durations the way a person would", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(600)).toBe("10m");
    expect(formatDuration(5400)).toBe("1h 30m");
  });
});

describe("isRangeKey", () => {
  it("accepts only the ranges that exist", () => {
    // The range comes from the URL, so anything can arrive.
    expect(isRangeKey("30d")).toBe(true);
    expect(isRangeKey("all-time")).toBe(false);
    expect(isRangeKey(null)).toBe(false);
  });
});
