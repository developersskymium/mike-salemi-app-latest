import { describe, expect, it } from "vitest";
import { applyDiscount, planRankOk, planRankProblems, resolvePrice, type PlanBenefit } from "./pricing";

const P = "prog-1";
const basePrices = [
  { programId: P, amountCents: 9900, id: "full" },
  { programId: P, amountCents: 7900, id: "launch" },
  { programId: P, amountCents: 1900, id: "monthly", interval: "month" as const },
  { programId: P, amountCents: 100, id: "retired", isActive: false },
  { programId: "other", amountCents: 500, id: "x" },
];
const benefits: PlanBenefit[] = [
  { planId: "pro", programId: P, benefit: "discount", discountPercent: 20 },
  { planId: "pro", programId: P, benefit: "discount", discountPercent: 10, scope: "content" },
  { planId: "max", programId: P, benefit: "included" },
  { planId: "pro", programId: P, benefit: "included", scope: "coaching" },
];

describe("resolvePrice", () => {
  it("no plan: the best active one-time price", () => {
    expect(resolvePrice({ programId: P, basePrices, benefits })).toMatchObject({
      state: "locked",
      amountCents: 7900,
      priceId: "launch",
      discountPercent: null,
      label: "$79",
    });
  });
  it("discount: best single discount on the best price, never stacked", () => {
    const r = resolvePrice({ programId: P, basePrices, benefits, planId: "pro" });
    expect(r).toMatchObject({ state: "locked", amountCents: 6320, baseCents: 7900, discountPercent: 20 });
    expect(r.label).toBe("$63.20 (20% off $79)");
  });
  it("included: no price", () => {
    expect(resolvePrice({ programId: P, basePrices, benefits, planId: "max" })).toMatchObject({ state: "included", amountCents: null });
  });
  it("scope matters: a coaching benefit does not include content", () => {
    expect(resolvePrice({ programId: P, basePrices, benefits, planId: "pro" }).state).toBe("locked");
    expect(resolvePrice({ programId: P, basePrices, benefits, planId: "pro", scope: "coaching" }).state).toBe("included");
  });
  it("owned, org and free win before anything else", () => {
    expect(resolvePrice({ programId: P, basePrices, benefits, planId: "pro", owned: true })).toMatchObject({ state: "owned", amountCents: null });
    expect(resolvePrice({ programId: P, basePrices, benefits, org: true }).state).toBe("org");
    expect(resolvePrice({ programId: P, basePrices, benefits, isFree: true }).state).toBe("free");
  });
  it("no purchasable price", () => {
    expect(resolvePrice({ programId: "none", basePrices, benefits })).toMatchObject({ state: "locked", amountCents: null, label: "Not available" });
  });
  it("rounds discounts to the cent", () => {
    expect(applyDiscount(999, 15)).toBe(849);
    expect(applyDiscount(1000, 100)).toBe(0);
  });
});

describe("planRankOk", () => {
  const free = { planId: "free", rank: 0, benefits: [{ planId: "free", programId: P, benefit: "none" as const }] };
  const pro = { planId: "pro", rank: 1, benefits: [{ planId: "pro", programId: P, benefit: "discount" as const, discountPercent: 20 }] };
  const max = { planId: "max", rank: 2, benefits: [{ planId: "max", programId: P, benefit: "included" as const }] };
  it("accepts monotonic benefits", () => {
    expect(planRankOk([max, free, pro])).toBe(true);
  });
  it("flags a higher plan that gets less", () => {
    const badMax = { ...max, benefits: [{ planId: "max", programId: P, benefit: "discount" as const, discountPercent: 10 }] };
    expect(planRankOk([free, pro, badMax])).toBe(false);
    expect(planRankProblems([free, pro, badMax])).toEqual([`max gets less than pro on ${P}|content`]);
    // Missing row on a higher plan counts as "none".
    expect(planRankOk([free, pro, { planId: "max", rank: 2, benefits: [] }])).toBe(false);
  });
});
