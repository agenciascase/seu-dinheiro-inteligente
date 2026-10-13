import { summarize, type Tx } from "./finance";
import { billReferenceMonth, isBillPaid } from "./bills";

export const INCOME_CATEGORIES = ["Salário", "Renda Extra", "Outros"];
export const FIXED_CATEGORIES = [
  "Moradia",
  "Energia",
  "Água",
  "Internet",
  "Telefone",
  "Mercado",
  "Escola",
  "Saúde",
  "Transporte",
  "Financiamentos",
  "Cartão",
  "Outros",
];
export const VARIABLE_CATEGORIES = [
  "Restaurante",
  "Mercado",
  "Lanche",
  "Combustível",
  "Farmácia",
  "Compras",
  "Lazer",
  "Presentes",
  "Assinaturas",
  "Outros",
];
export function currentMonth() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}
export function parseAmount(value: string) {
  const clean = value.replace(/R\$|\s/g, "");
  const number = Number(clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean);
  if (!Number.isFinite(number)) throw new Error("Valor inválido.");
  return Math.round(number * 100) / 100;
}
export function allocatedAmount(income: number, percent: number) {
  return Math.round(income * percent) / 100;
}
export function budgetState(spent: number, limit: number) {
  return spent > limit ? "exceeded" : spent >= limit * 0.8 ? "warning" : "normal";
}
export function nextMonth(month: string) {
  const d = new Date(`${month}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 7);
}
type AmountRow = { amount: number; occurred_on?: string; created_at?: string; goal_id?: string };
type PlanningBill = {
  description: string;
  amount: number;
  kind: string;
  paid: boolean;
  status_override?: boolean | null;
  due_on?: string | null;
  reference_month: string;
  created_at?: string;
  transaction_id?: string | null;
  paid_on?: string | null;
  recurring?: boolean;
  category?: string;
};
const reference = (b: PlanningBill) =>
  billReferenceMonth({
    ...b,
    created_at: b.created_at ?? `${b.reference_month}-01`,
    due_on: b.due_on ?? null,
    status_override: b.status_override ?? null,
  });
const paid = (b: PlanningBill) =>
  isBillPaid({ ...b, due_on: b.due_on ?? null, status_override: b.status_override ?? null });
export function monthlyPlan(
  txs: Tx[],
  bills: PlanningBill[],
  contributions: AmountRow[],
  withdrawals: AmountRow[],
  month: string,
) {
  const rows = txs.filter((t) => t.occurred_on.startsWith(month));
  const summary = summarize(rows);
  const monthBills = bills.filter((b) => b.kind === "expense" && reference(b) === month);
  const paidUnlinked = monthBills
    .filter((b) => paid(b) && !b.transaction_id)
    .reduce((s, b) => s + b.amount, 0);
  const linkedIds = new Set(bills.filter((b) => b.transaction_id).map((b) => b.transaction_id));
  const fixedPaid =
    rows.filter((t) => linkedIds.has(t.id) && !t.is_transfer).reduce((s, t) => s + t.amount, 0) +
    paidUnlinked;
  const expenses = summary.expenses + paidUnlinked;
  const variable = Math.max(0, summary.expenses - (fixedPaid - paidUnlinked));
  const belongs = (r: AmountRow) => (r.occurred_on ?? r.created_at ?? "").startsWith(month);
  const saved =
    contributions.filter(belongs).reduce((s, r) => s + Number(r.amount), 0) -
    withdrawals.filter(belongs).reduce((s, r) => s + Number(r.amount), 0);
  const allSaved =
    contributions.reduce((s, r) => s + Number(r.amount), 0) -
    withdrawals.reduce((s, r) => s + Number(r.amount), 0);
  const pending = bills
    .filter((b) => b.kind === "expense" && !paid(b) && (!reference(b) || reference(b) <= month))
    .reduce((s, b) => s + b.amount, 0);
  const available = summary.income - expenses - saved;
  return {
    income: summary.income,
    expenses,
    fixed: monthBills.reduce((s, b) => s + b.amount, 0),
    variable,
    saved,
    allSaved,
    available,
    pending,
    forecast: available - pending,
    rows,
  };
}
