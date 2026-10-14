import { describe, expect, it } from "vitest";
import { summarize, suggestCuts, SAVINGS_GOAL, filterTransactions, filterCashFlow, categorize, cardSummary, goalProgress, type Tx } from "./finance";

const tx = (amount: number, kind: Tx["kind"], category = "Outros"): Tx => ({
  occurred_on: "2026-10-01",
  description: "x",
  amount,
  kind,
  category,
  account: "a",
});

describe("consultoria e períodos", () => {
  it("mostra somente entradas quando selecionado no fluxo de caixa", () => {
    const income = tx(3200, "income");
    expect(filterCashFlow([income, tx(150, "expense")], "income")).toEqual([income]);
  });
  it("mostra somente saídas quando selecionado no fluxo de caixa", () => {
    const expense = tx(150, "expense");
    expect(filterCashFlow([tx(3200, "income"), expense], "expense")).toEqual([expense]);
  });
  it("mantém entradas e saídas na visão completa", () => {
    const rows = [tx(3200, "income"), tx(150, "expense")];
    expect(filterCashFlow(rows, "all")).toEqual(rows);
  });
  it("continua sugerindo economia acima do mínimo de 500", () => {
    expect(suggestCuts(summarize([tx(5000, "income"), tx(500, "expense", "Delivery")])).covered).toBe(250);
  });
  for (const [period, boundary] of [["weekly", "2026-10-07"], ["fortnightly", "2026-09-29"], ["monthly", "2026-09-14"]] as const) {
    it(`inclui o intervalo ${period} e exclui datas anteriores e futuras`, () => {
      const dates = [boundary, "2026-09-13", "2026-10-14"].map(occurred_on => ({ ...tx(10, "expense"), occurred_on }));
      expect(filterTransactions(dates, period, "all", new Date("2026-10-13T12:00:00Z"))).toEqual([dates[0]]);
    });
  }
  it("separa contas e combina ambas", () => {
    const rows = [{ ...tx(10, "expense"), account: "Mercado Pago" }, { ...tx(20, "income"), account: "Caixa" }];
    expect(filterTransactions(rows, "monthly", "Mercado Pago", new Date("2026-10-13"))).toHaveLength(1);
    expect(filterTransactions(rows, "monthly", "all", new Date("2026-10-13"))).toHaveLength(2);
  });
  it("categoriza lançamentos conhecidos automaticamente", () => {
    expect(categorize("iFood pedido")).toBe("Delivery");
    expect(categorize("Farmácia")).toBe("Saúde");
    expect(categorize("Loja desconhecida")).toBe("Outros");
  });
  it("apura cartão e gastos desnecessários sem duplicar transferências", () => {
    const rows = [{ ...tx(200, "expense"), payment_method: "credit", necessity: "unnecessary" }, { ...tx(200, "expense"), is_transfer: true }];
    expect(cardSummary(rows).total).toBe(200);
    expect(cardSummary(rows).unnecessary).toBe(200);
    expect(summarize(rows).expenses).toBe(200);
  });
  it("acumula valores para viagem de R$ 10.000 sem limitar o saldo", () => {
    expect(goalProgress(10000, [500, 1000])).toEqual({ saved: 1500, remaining: 8500, percent: 15 });
    expect(goalProgress(10000, [11000]).saved).toBe(11000);
  });
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
