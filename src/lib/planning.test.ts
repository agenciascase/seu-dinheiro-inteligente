import { describe, it, expect } from "vitest";
import { allocatedAmount, budgetState, monthlyPlan, nextMonth, parseAmount } from "./planning";
describe("planning rules", () => {
  it("allocates 800 reais for 10 percent of an 8000 income", () =>
    expect(allocatedAmount(8000, 10)).toBe(800));
  it("warns in yellow at 80 percent of 400", () => {
    expect(budgetState(320, 400)).toBe("warning");
    expect(budgetState(319, 400)).toBe("normal");
  });
  it("warns in red only above a 400 budget", () => {
    expect(budgetState(401, 400)).toBe("exceeded");
    expect(budgetState(400, 400)).toBe("warning");
  });
  it("rolls December to January", () => expect(nextMonth("2026-12")).toBe("2027-01"));
  it("parses Brazilian amounts", () => expect(parseAmount("R$ 8.000,00")).toBe(8000));
  it("subtracts pending bills and savings once for forecast", () => {
    const result = monthlyPlan(
      [
        {
          id: "income",
          occurred_on: "2026-10-01",
          description: "Salário",
          kind: "income",
          amount: 1000,
          category: "Salário",
          account: "Caixa",
        },
        {
          id: "paid-tx",
          occurred_on: "2026-10-02",
          description: "Luz",
          kind: "expense",
          amount: 200,
          category: "Energia",
          account: "Caixa",
        },
      ],
      [
        {
          description: "Luz",
          amount: 200,
          kind: "expense",
          paid: true,
          reference_month: "2026-10",
          transaction_id: "paid-tx",
        },
        {
          description: "Aluguel",
          amount: 700,
          kind: "expense",
          paid: false,
          reference_month: "2026-10",
        },
      ],
      [{ amount: 200, occurred_on: "2026-10-01" }],
      [],
      "2026-10",
    );
    expect(result.expenses).toBe(200);
    expect(result.available).toBe(600);
    expect(result.forecast).toBe(-100);
  });
});
