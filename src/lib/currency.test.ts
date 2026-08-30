import { describe, it, expect } from "vitest";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  currencyOf,
  formatCompact,
  formatCurrency,
  isCurrencyCode,
  symbolFor,
} from "./currency";

describe("currency set", () => {
  it("defaults to the Indian rupee", () => {
    expect(DEFAULT_CURRENCY).toBe("INR");
    expect(CURRENCIES[DEFAULT_CURRENCY].symbol).toBe("₹");
  });

  it("supports rupee, euro and dollar", () => {
    expect(SUPPORTED_CURRENCIES).toEqual(["INR", "EUR", "USD"]);
    expect(symbolFor("INR")).toBe("₹");
    expect(symbolFor("EUR")).toBe("€");
    expect(symbolFor("USD")).toBe("$");
  });

  it("recognises only supported codes", () => {
    expect(isCurrencyCode("INR")).toBe(true);
    expect(isCurrencyCode("GBP")).toBe(false);
    expect(isCurrencyCode(null)).toBe(false);
  });

  it("falls back to the default rather than showing an unknown code", () => {
    // A stale row saying "GBP" must not render a broken symbol.
    expect(currencyOf("GBP").code).toBe("INR");
    expect(symbolFor(undefined)).toBe("₹");
  });
});

describe("formatCurrency", () => {
  it("uses the right symbol per currency", () => {
    expect(formatCurrency(1500, "INR")).toContain("₹");
    expect(formatCurrency(1500, "EUR")).toContain("€");
    expect(formatCurrency(1500, "USD")).toContain("$");
  });

  it("groups rupees the Indian way", () => {
    // 1,23,456 not 123,456 — the grouping people actually read.
    expect(formatCurrency(123456, "INR")).toBe("₹1,23,456");
  });

  it("groups dollars the western way", () => {
    expect(formatCurrency(123456, "USD")).toBe("$123,456");
  });

  it("keeps decimals only when they carry information", () => {
    expect(formatCurrency(1500, "USD")).toBe("$1,500");
    expect(formatCurrency(1499.5, "USD")).toBe("$1,499.50");
  });

  it("can drop the symbol or the decimals", () => {
    expect(formatCurrency(1499.5, "USD", { bare: true })).toBe("1,499.50");
    expect(formatCurrency(1499.5, "USD", { compact: true })).toBe("$1,500");
  });

  it("never prints NaN", () => {
    expect(formatCurrency(Number.NaN, "INR")).toBe("₹0");
    expect(formatCurrency(null, "INR")).toBe("₹0");
    expect(formatCurrency(undefined, "INR")).toBe("₹0");
  });
});

describe("formatCompact", () => {
  it("uses lakh and crore for rupees", () => {
    // K/M is not how Indian figures are read aloud.
    expect(formatCompact(250000, "INR")).toBe("₹2.5L");
    expect(formatCompact(15000000, "INR")).toBe("₹1.5Cr");
    expect(formatCompact(4500, "INR")).toBe("₹4.5K");
  });

  it("uses K and M elsewhere", () => {
    expect(formatCompact(4500, "USD")).toBe("$4.5K");
    expect(formatCompact(2500000, "USD")).toBe("$2.5M");
    expect(formatCompact(4500, "EUR")).toBe("€4.5K");
  });

  it("keeps small amounts whole", () => {
    expect(formatCompact(750, "INR")).toBe("₹750");
  });

  it("keeps the sign on negatives", () => {
    expect(formatCompact(-250000, "INR")).toBe("-₹2.5L");
  });
});
