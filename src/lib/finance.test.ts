import { describe, expect, it } from "vitest";
import { summarize, suggestCuts, SAVINGS_GOAL, type Tx } from "./finance";

const tx = (amount: number, kind: Tx["kind"], category = "Outros"): Tx => ({
  occurred_on: "2026-10-01",
  description: "x",
  amount,
  kind,
  category,
  account: "a",
});

describe("meta de economia", () => {
  it("a meta mensal é de R$ 500", () => {
    expect(SAVINGS_GOAL).toBe(500);
  });

  it("calcula quanto falta para guardar R$ 500", () => {
    const s = summarize([tx(3000, "income"), tx(2800, "expense", "Delivery")]);
    expect(s.leftover).toBe(200);
    expect(s.gap).toBe(300);
  });

  it("sem falta quando já sobra R$ 500 ou mais", () => {
    expect(summarize([tx(3000, "income"), tx(2400, "expense")]).gap).toBe(0);
  });

  it("sugere cortes que cobrem a falta, sem tocar em moradia", () => {
    const s = summarize([
      tx(4000, "income"),
      tx(2000, "expense", "Moradia"),
      tx(1000, "expense", "Delivery"),
      tx(800, "expense", "Lazer"),
    ]);
    const { cuts, covered } = suggestCuts(s);
    expect(covered).toBeGreaterThanOrEqual(s.gap);
    expect(cuts.find((c) => c.category === "Moradia")).toBeUndefined();
  });
});
