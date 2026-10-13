import { expect, it } from 'vitest';
import { availableBillMonths, billSummary, mapNotionBill, money, monthLabel, openBillsForMonth } from './bills';
it('imports BRL values from organizer text', () => { expect(money('R$ 1.330,00')).toBe(1330); expect(money('Curso 330')).toBeNull(); });
it('uses the Pago checkbox and does not invent dates from installment descriptions', () => {
  expect(mapNotionBill({ id: 'a', properties: { 'Saída': { title: [{ plain_text: 'R$ 330,00' }] }, 'Descrição': { rich_text: [{ plain_text: 'Ana Mara 01/01' }] }, 'Pago': { checkbox: true } } }, 'Outubro')).toMatchObject({ amount: 330, paid: true, due_on: null, kind: 'expense' });
});
it('separates paid, pending and overdue expenses without counting income', () => {
  const base = { kind: 'expense', paid: false, status_override: null, due_on: null };
  expect(billSummary([{ ...base, amount: 100, due_on: '2026-10-12' }, { ...base, amount: 50, paid: true }, { ...base, amount: 30 }, { ...base, amount: 500, kind: 'income' }], '2026-10-13')).toEqual({ paid: 50, pending: 130, overdue: 100 });
});
it('preserves local payment review over imported checkbox', () => { expect(billSummary([{ amount: 330, kind: 'expense', paid: false, status_override: true, due_on: null }], '2026-10-13').paid).toBe(330); });
it('does not count total or remaining balance rows as bills', () => { for (const description of ['Total Saída', 'Restante']) expect(mapNotionBill({ id: 'a', properties: { 'Saída': { title: [{ plain_text: 'R$ 3.632,06' }] }, 'Descrição': { rich_text: [{ plain_text: description }] } } }, 'Outubro')).toBeNull(); });
it('recognizes organizer Entrada rows even when their value is in the title column', () => { expect(mapNotionBill({ id: 'a', properties: { 'Saída': { title: [{ plain_text: 'R$ 3.200,00' }] }, 'Descrição': { rich_text: [{ plain_text: 'Entrada' }] } } }, 'Outubro')?.kind).toBe('income'); });
const monthlyBill = { description: 'Aluguel', amount: 900, kind: 'expense', paid: false, status_override: null, due_on: null, reference_month: '2026-10', created_at: '2026-10-01T12:00:00Z' };
it('shows only unpaid expenses of the current month, not future bills or income', () => {
  expect(openBillsForMonth([monthlyBill, { ...monthlyBill, paid: true }, { ...monthlyBill, kind: 'income' }, { ...monthlyBill, reference_month: '2026-11' }], '2026-10-13')).toEqual([monthlyBill]);
});
it('carries an unpaid October bill into November and December without changing its original month', () => {
  expect(openBillsForMonth([monthlyBill], '2026-11-01')).toEqual([monthlyBill]);
  expect(openBillsForMonth([monthlyBill], '2026-12-01')).toEqual([monthlyBill]);
  expect(monthlyBill.reference_month).toBe('2026-10');
});
it('does not carry paid or locally marked paid bills into the following month', () => {
  expect(openBillsForMonth([{ ...monthlyBill, paid: true }, { ...monthlyBill, status_override: true }], '2026-11-01')).toEqual([]);
});
it('handles Notion month names with or without a year and excludes future months', () => {
  const october = { ...monthlyBill, reference_month: 'Outubro' };
  expect(openBillsForMonth([october, { ...monthlyBill, reference_month: 'Novembro' }, { ...monthlyBill, reference_month: 'Dezembro 2025' }], '2026-10-13')).toEqual([october, { ...monthlyBill, reference_month: 'Dezembro 2025' }]);
});