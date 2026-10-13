import { expect, it } from 'vitest';
import { billSummary, mapNotionBill, money } from './bills';
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