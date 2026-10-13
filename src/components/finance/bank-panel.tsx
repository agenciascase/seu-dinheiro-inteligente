import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { financeDataQuery } from '@/lib/finance-data';
import { Banks } from './banks';
import { FinanceSelect } from './account-select';
import { brl, filterTransactions, summarize, type Tx } from '@/lib/finance';

export const bankDataQuery = financeDataQuery;
export function BankPanel() {
  const { data } = useSuspenseQuery(bankDataQuery);
  const [account, setAccount] = useState('all');
  const movements = data.txs.filter(row => row.external_id);
  const rows = filterTransactions(movements as Tx[], 'monthly', account);
  const totals = summarize(rows);
  return <details className="mt-8 border-t pt-5">
    <summary className="cursor-pointer text-sm font-medium">Contas bancárias e movimentações</summary>
    <div className="mt-6"><Banks connections={data.connections} /></div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl">Entradas e despesas</h2><FinanceSelect label="Conta bancária" value={account} onChange={setAccount} options={[{ value: 'all', label: 'Todas as contas' }, ...Array.from(new Set(movements.map(row => row.account))).map(name => ({ value: name, label: name }))]} /></div>
    <div className="grid grid-cols-2 gap-5 border-b py-5"><div><p className="text-sm text-muted-foreground">Entradas</p><p className="mt-1 text-xl font-semibold">{brl(totals.income)}</p></div><div><p className="text-sm text-muted-foreground">Despesas</p><p className="mt-1 text-xl font-semibold">{brl(totals.expenses)}</p></div></div>
    {!rows.length && <p className="py-5 text-sm text-muted-foreground">Nenhuma movimentação bancária sincronizada neste período.</p>}
    <ul className="divide-y">{rows.map((row, index) => <li key={`${row.description}-${index}`} className="flex items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="break-words text-sm">{row.description}</p><p className="mt-1 text-xs text-muted-foreground">{row.account} · {row.is_transfer ? 'Transferência' : row.kind === 'income' ? 'Entrada' : 'Despesa'}</p></div><span className="shrink-0 text-sm font-medium">{brl(row.amount)}</span></li>)}</ul>
  </details>;
}