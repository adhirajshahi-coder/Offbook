import { describe, expect, it } from "vitest";
import { formatRupees, normaliseCode, quote } from "./pricing";

const annual = { price_paise: 600000, tax_rate: 18, tax_inclusive: true };

describe("quote", () => {
  it("charges the list price with GST included", () => {
    const q = quote(annual);
    expect(q.totalPaise).toBe(600000);
    expect(q.discountPaise).toBe(0);
    expect(q.taxPaise).toBe(91525); // 6000 × 18/118
  });

  it("applies a percent coupon", () => {
    const q = quote(annual, { coupon: { kind: "percent", value: 10 } });
    expect(q.discountPaise).toBe(60000);
    expect(q.totalPaise).toBe(540000);
  });

  it("applies a flat coupon", () => {
    expect(quote(annual, { coupon: { kind: "flat", value: 50000 } }).totalPaise).toBe(550000);
  });

  it("uses the bigger of school discount and coupon, never both", () => {
    const q = quote(annual, { coupon: { kind: "percent", value: 10 }, schoolDiscountPercent: 20 });
    expect(q.discountPaise).toBe(120000);
    expect(q.totalPaise).toBe(480000);
  });

  it("never goes below zero", () => {
    const q = quote(annual, { coupon: { kind: "flat", value: 9_000_000 } });
    expect(q.totalPaise).toBe(0);
    expect(q.taxPaise).toBe(0);
  });

  it("adds tax on top for tax-exclusive plans", () => {
    const q = quote({ price_paise: 500000, tax_rate: 18, tax_inclusive: false });
    expect(q.taxPaise).toBe(90000);
    expect(q.totalPaise).toBe(590000);
  });
});

describe("formatting", () => {
  it("formats rupees the Indian way", () => {
    expect(formatRupees(600000)).toBe("₹6,000");
    expect(formatRupees(10000000)).toBe("₹1,00,000");
    expect(formatRupees(540050)).toBe("₹5,400.50");
  });

  it("normalises codes", () => {
    expect(normaliseCode("  welcome 10 ")).toBe("WELCOME10");
  });
});
