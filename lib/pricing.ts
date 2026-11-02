/**
 * Checkout price maths. Pure, so it can be tested and reused on the server
 * when creating a Razorpay order. Everything is integer paise.
 */

export type Plan = {
  price_paise: number;
  tax_rate: number;
  tax_inclusive: boolean;
};

export type Coupon = {
  kind: "percent" | "flat";
  value: number;
};

export type Quote = {
  listPricePaise: number;
  discountPaise: number;
  /** Price after discounts, before tax is added (equals total when tax-inclusive). */
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  taxInclusive: boolean;
  taxRate: number;
};

/**
 * School discount and coupon don't stack: the family gets whichever is
 * bigger. Simple to explain, and it can't drop the price below zero.
 */
export function quote(plan: Plan, opts: { coupon?: Coupon | null; schoolDiscountPercent?: number } = {}): Quote {
  const list = plan.price_paise;
  const fromSchool = Math.round((list * (opts.schoolDiscountPercent ?? 0)) / 100);
  const fromCoupon = opts.coupon
    ? opts.coupon.kind === "percent"
      ? Math.round((list * opts.coupon.value) / 100)
      : opts.coupon.value
    : 0;
  const discount = Math.min(list, Math.max(fromSchool, fromCoupon));
  const subtotal = list - discount;

  const rate = Number(plan.tax_rate);
  if (plan.tax_inclusive) {
    const tax = Math.round((subtotal * rate) / (100 + rate));
    return {
      listPricePaise: list,
      discountPaise: discount,
      subtotalPaise: subtotal,
      taxPaise: tax,
      totalPaise: subtotal,
      taxInclusive: true,
      taxRate: rate,
    };
  }
  const tax = Math.round((subtotal * rate) / 100);
  return {
    listPricePaise: list,
    discountPaise: discount,
    subtotalPaise: subtotal,
    taxPaise: tax,
    totalPaise: subtotal + tax,
    taxInclusive: false,
    taxRate: rate,
  };
}

/** "₹6,000" or "₹5,400.50", Indian digit grouping. */
export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function normaliseCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}
