export type NotionProperty = { type?: string; number?: number | null; checkbox?: boolean; date?: { start: string } | null; title?: { plain_text: string }[]; rich_text?: { plain_text: string }[]; select?: { name: string } | null; status?: { name: string } | null };
export type NotionRow = { id: string; url?: string; properties: Record<string, NotionProperty> };
const text = (p?: NotionProperty) => (p?.title ?? p?.rich_text ?? []).map(t => t.plain_text).join('').trim().replace(/\s+/g, ' ');
export function money(value: string): number | null {
  const clean = value.replace(/R\$/g, '').trim();
  if (!/^\d[\d.,]*$/.test(clean)) return null;
  const amount = Number(clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
export function mapNotionBill(row: NotionRow, month: string) {
  const p = row.properties;
  const description = text(p['Descrição']) || text(p['Nome']) || 'Sem descrição';
  if (isOrganizerSummary(description)) return null;
  const expense = p['Valor Saída']?.number ?? money(text(p['Saída']));
  const income = p['Valor Entrada']?.number ?? money(text(p['Entrada']));
  if (expense && income) return null;
  const amount = expense || income;
  if (!amount || amount <= 0) return null;
  const date = p['Vencimento']?.date?.start ?? p['Data']?.date?.start;
  return { description, amount, kind: /^entrada$/i.test(description) || !expense ? 'income' : 'expense', due_on: date?.slice(0, 10) ?? null, reference_month: month.trim(), paid: p['Pago']?.checkbox === true, account: text(p['Conta']) || p['Conta']?.select?.name || 'Não informada', source: 'notion', external_id: row.id, source_url: row.url ?? null };
}
export const isOrganizerSummary = (description: string) => /^(total(?:\s+(?:sa[ií]da|entrada))?|restante|saldo)$/i.test(description.trim());
export type BillSummaryRow = { amount: number; kind: string; paid: boolean; status_override: boolean | null; due_on: string | null };
export const isBillPaid = (bill: BillSummaryRow) => bill.status_override ?? bill.paid;
type MonthlyBill = BillSummaryRow & { reference_month: string; created_at: string; description: string };
const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export function billReferenceMonth(bill: MonthlyBill): string {
  const reference = bill.reference_month.trim().toLowerCase();
  const iso = reference.match(/^(\d{4})-(0[1-9]|1[0-2])(?:$|-)/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const month = MONTH_NAMES.findIndex(name => reference.startsWith(name));
  if (month >= 0) {
    const year = reference.match(/\b(\d{4})\b/)?.[1] ?? bill.created_at.slice(0, 4);
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  }
  return (bill.due_on ?? bill.created_at).slice(0, 7);
}
export function openBillsForMonth<T extends MonthlyBill>(rows: T[], today: string): T[] {
  const currentMonth = today.slice(0, 7);
  return rows.filter(bill => bill.kind === 'expense' && !isBillPaid(bill) && !isOrganizerSummary(bill.description) && billReferenceMonth(bill) <= currentMonth);
}
export function billDisplayDescription(description: string): string {
  return description.replace(/\b\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?\b/g, '').replace(/\b\d{4}-\d{2}-\d{2}\b/g, '').replace(/\s+/g, ' ').trim() || 'Conta';
}
export function billSummary(rows: BillSummaryRow[], today: string) {
  return rows.reduce((s, bill) => {
    if (bill.kind !== 'expense') return s;
    if (isBillPaid(bill)) s.paid += bill.amount;
    else { s.pending += bill.amount; if (bill.due_on && bill.due_on < today) s.overdue += bill.amount; }
    return s;
  }, { paid: 0, pending: 0, overdue: 0 });
}