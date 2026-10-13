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
export function billSummary(rows: BillSummaryRow[], today: string) {
  return rows.reduce((s, bill) => {
    if (bill.kind !== 'expense') return s;
    if (isBillPaid(bill)) s.paid += bill.amount;
    else { s.pending += bill.amount; if (bill.due_on && bill.due_on < today) s.overdue += bill.amount; }
    return s;
  }, { paid: 0, pending: 0, overdue: 0 });
}