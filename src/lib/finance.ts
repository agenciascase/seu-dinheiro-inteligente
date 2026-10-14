export const SAVINGS_GOAL = 500;

export type Tx = {
  id?: string;
  occurred_on: string;
  description: string;
  amount: number;
  kind: "expense" | "income";
  category: string;
  account: string;
  payment_method?: string;
  necessity?: string;
  is_transfer?: boolean;
};

export const CATEGORIES = [
  "Moradia",
  "Mercado",
  "Transporte",
  "Delivery",
  "Restaurantes",
  "Assinaturas",
  "Lazer",
  "Compras",
  "Saúde",
  "Educação",
  "Outros",
] as const;

/** Categories where cutting back is realistic. Ceiling = max % of the category we suggest cutting. */
export const CUTTABLE: Record<string, number> = {
  Delivery: 0.5,
  Restaurantes: 0.4,
  Assinaturas: 0.5,
  Lazer: 0.35,
  Compras: 0.4,
  Transporte: 0.15,
  Mercado: 0.1,
  Outros: 0.2,
};

export type Summary = {
  income: number;
  expenses: number;
  leftover: number;
  gap: number;
  byCategory: { category: string; total: number; share: number }[];
};

const round = (n: number) => Math.round(n * 100) / 100;

export function summarize(txs: Tx[]): Summary {
  let income = 0;
  let expenses = 0;
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.is_transfer) continue;
    const v = Number(t.amount);
    if (t.kind === "income") income += v;
    else {
      expenses += v;
      map.set(t.category, (map.get(t.category) ?? 0) + v);
    }
  }
  const leftover = income - expenses;
  const byCategory = [...map.entries()]
    .map(([category, total]) => ({
      category,
      total: round(total),
      share: expenses ? total / expenses : 0,
    }))
    .sort((a, b) => b.total - a.total);
  return {
    income: round(income),
    expenses: round(expenses),
    leftover: round(leftover),
    gap: round(Math.max(0, SAVINGS_GOAL - leftover)),
    byCategory,
  };
}

export type Cut = { category: string; current: number; cut: number };

/** Suggest cuts from flexible categories (biggest first) until the R$ 500 goal is covered. */
export function suggestCuts(summary: Summary): { cuts: Cut[]; covered: number } {
  let remaining = summary.gap;
  const cuts: Cut[] = [];
  const candidates = summary.byCategory
    .filter((c) => CUTTABLE[c.category] !== undefined)
    .map((c) => ({ ...c, max: c.total * (CUTTABLE[c.category] ?? 0) }))
    .sort((a, b) => b.max - a.max);
  for (const c of candidates) {
    const cut = round(c.max);
    if (cut <= 0) continue;
    cuts.push({ category: c.category, current: c.total, cut });
    remaining -= cut;
  }
  return { cuts, covered: round(cuts.reduce((s, c) => s + c.cut, 0)) };
}

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type Period = "weekly" | "fortnightly" | "monthly";
export const PERIOD_LABELS: Record<Period, string> = { monthly: "Mensal", fortnightly: "Quinzenal", weekly: "Semanal" };
export function periodRange(period: Period, anchor = new Date()): { from: string; to: string } {
  const to = anchor.toISOString().slice(0, 10);
  const start = new Date(`${to}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - ({ weekly: 7, fortnightly: 15, monthly: 30 }[period] - 1));
  return { from: start.toISOString().slice(0, 10), to };
}
export function filterTransactions(txs: Tx[], period: Period, account = "all", anchor = new Date()): Tx[] {
  const { from, to } = periodRange(period, anchor);
  return txs.filter(t => t.occurred_on >= from && t.occurred_on <= to && (account === "all" || t.account === account));
}
export type CashFlow = "all" | "income" | "expense";
export function filterCashFlow<T extends Tx>(txs: T[], flow: CashFlow): T[] {
  return flow === "all" ? txs : txs.filter(tx => tx.kind === flow);
}
export function categorize(description: string): string {
  const text = description.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const rules: [string, RegExp][] = [
    ["Delivery", /ifood|rappi|delivery/], ["Moradia", /aluguel|energia|conta de luz|internet|condominio|agua/],
    ["Mercado", /mercado|atacadao|hortifruti|pao de acucar/], ["Transporte", /uber|\b99\b|posto|combustivel|gasolina/],
    ["Assinaturas", /netflix|spotify|disney|amazon prime|assinatura/], ["Saúde", /farmacia|hospital|medic|academia|smart fit/],
    ["Educação", /curso|escola|faculdade/], ["Restaurantes", /restaurante|padaria|lanchonete/],
    ["Lazer", /cinema|show|bar com amigos/], ["Compras", /shopee|renner|amazon|magalu/],
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] ?? "Outros";
}
export function cardSummary(txs: Tx[]) {
  const rows = txs.filter(t => t.payment_method === "credit" && t.kind === "expense" && !t.is_transfer);
  return { total: round(rows.reduce((sum, t) => sum + t.amount, 0)),
    unnecessary: round(rows.filter(t => t.necessity === "unnecessary").reduce((sum, t) => sum + t.amount, 0)),
    pending: rows.filter(t => !t.necessity || t.necessity === "review").length, rows };
}
export function goalProgress(target: number, contributions: number[]) {
  const saved = round(contributions.reduce((sum, value) => sum + value, 0));
  return { saved, remaining: round(Math.max(0, target - saved)), percent: target > 0 ? Math.min(100, saved / target * 100) : 0 };
}

/** Example data spread over the last 30 days. */
export function sampleTransactions(today = new Date()): Tx[] {
  const d = (daysAgo: number) => {
    const x = new Date(today);
    x.setDate(x.getDate() - daysAgo);
    return x.toISOString().slice(0, 10);
  };
  const nu = "Nubank";
  const it = "Itaú";
  const rows: [number, string, number, Tx["kind"], string, string][] = [
    [28, "Salário", 5200, "income", "Outros", it],
    [15, "Freela design", 600, "income", "Outros", nu],
    [27, "Aluguel", 1650, "expense", "Moradia", it],
    [26, "Conta de luz", 189.9, "expense", "Moradia", it],
    [25, "Internet", 119.9, "expense", "Moradia", it],
    [24, "Supermercado Pão de Açúcar", 412.35, "expense", "Mercado", nu],
    [10, "Atacadão", 298.7, "expense", "Mercado", nu],
    [3, "Hortifruti", 86.4, "expense", "Mercado", nu],
    [23, "iFood", 62.9, "expense", "Delivery", nu],
    [21, "iFood", 48.5, "expense", "Delivery", nu],
    [18, "Rappi", 74.0, "expense", "Delivery", nu],
    [14, "iFood", 55.3, "expense", "Delivery", nu],
    [11, "iFood", 89.9, "expense", "Delivery", nu],
    [7, "iFood", 41.8, "expense", "Delivery", nu],
    [4, "Rappi", 67.2, "expense", "Delivery", nu],
    [1, "iFood", 58.0, "expense", "Delivery", nu],
    [22, "Uber", 32.5, "expense", "Transporte", nu],
    [19, "Uber", 28.9, "expense", "Transporte", nu],
    [16, "Posto Shell", 220.0, "expense", "Transporte", it],
    [9, "Uber", 45.7, "expense", "Transporte", nu],
    [5, "99", 22.4, "expense", "Transporte", nu],
    [20, "Netflix", 55.9, "expense", "Assinaturas", nu],
    [20, "Spotify", 21.9, "expense", "Assinaturas", nu],
    [17, "Amazon Prime", 19.9, "expense", "Assinaturas", nu],
    [17, "Disney+", 43.9, "expense", "Assinaturas", nu],
    [12, "Academia Smart Fit", 129.9, "expense", "Saúde", it],
    [13, "Farmácia", 74.6, "expense", "Saúde", nu],
    [13, "Bar com amigos", 145.0, "expense", "Lazer", nu],
    [6, "Cinema", 68.0, "expense", "Lazer", nu],
    [2, "Show", 180.0, "expense", "Lazer", nu],
    [12, "Restaurante japonês", 156.0, "expense", "Restaurantes", nu],
    [8, "Padaria", 38.5, "expense", "Restaurantes", nu],
    [8, "Shopee", 129.9, "expense", "Compras", nu],
    [3, "Renner", 239.9, "expense", "Compras", nu],
    [15, "Curso online", 97.0, "expense", "Educação", nu],
  ];
  return rows.map(([ago, description, amount, kind, category, account]) => ({
    occurred_on: d(ago),
    description,
    amount,
    kind,
    category,
    account,
  }));
}
