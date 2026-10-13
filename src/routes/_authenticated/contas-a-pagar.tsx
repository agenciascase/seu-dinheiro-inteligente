import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AppHeader } from '@/components/finance/app-header';
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useState } from 'react';
import { RefreshCw, Plus, Check, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { brl } from '@/lib/finance';
import { openBillsForMonth, billDisplayDescription } from '@/lib/bills';
import { importNotionFinance } from '@/lib/notion.functions';

const billsQuery = queryOptions({ queryKey: ['bills'], queryFn: async () => { const result = await supabase.from('bills').select('*').order('due_on', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }); if (result.error) throw result.error; return result.data.map(b => ({ ...b, amount: Number(b.amount) })); } });
export const Route = createFileRoute('/_authenticated/contas-a-pagar')({
  head: () => ({ meta: [{ title: 'Contas a pagar — Meu Organizador' }, { name: 'description', content: 'Suas contas em aberto, com pendências anteriores reunidas no mês atual.' }, { property: 'og:title', content: 'Contas a pagar — Meu Organizador' }, { property: 'og:description', content: 'Acompanhe e quite suas contas em aberto.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(billsQuery), component: BillsPage,
});
const currentDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
function BillsPage() {
  const { data } = useSuspenseQuery(billsQuery);
  const qc = useQueryClient(); const navigate = useNavigate(); const importFinance = useServerFn(importNotionFinance);
  const [today, setToday] = useState(currentDay);
  useEffect(() => { const timer = window.setInterval(() => setToday(currentDay()), 60_000); return () => window.clearInterval(timer); }, []);
  const rows = openBillsForMonth(data, today);
  const total = rows.reduce((sum, bill) => sum + bill.amount, 0);
  const importer = useMutation({ mutationFn: () => importFinance(), onSuccess: () => { qc.invalidateQueries({ queryKey: ['bills'] }); toast.success('Contas atualizadas.'); }, onError: e => toast.error(e.message) });
  const update = useMutation({ mutationFn: async (id: string) => { const r = await supabase.from('bills').update({ status_override: true }).eq('id', id); if (r.error) throw r.error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['bills'] }); toast.success('Conta marcada como paga.'); }, onError: e => toast.error(e.message) });
  const add = useMutation({ mutationFn: async (form: FormData) => { const amount = Number(String(form.get('amount')).replace(',', '.')); const description = String(form.get('description')).trim(); if (!description) throw new Error('Informe a descrição da conta.'); if (!Number.isFinite(amount) || amount <= 0) throw new Error('Informe um valor maior que zero.'); const r = await supabase.from('bills').insert({ description, amount, due_on: null, reference_month: today.slice(0, 7), kind: 'expense' }); if (r.error) throw r.error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ['bills'] }), onError: e => toast.error(e.message) });
  async function signOut() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({ to: '/auth', replace: true }); }
  return <div className="min-h-screen">
    <AppHeader active="contas" onSignOut={signOut} />
    <main className="mx-auto max-w-4xl px-6 py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl">Contas a pagar</h1>
        <Button variant="ghost" size="sm" disabled={importer.isPending} onClick={() => importer.mutate()}><RefreshCw className={`h-4 w-4 ${importer.isPending ? 'animate-spin motion-reduce:animate-none' : ''}`} />{importer.isPending ? 'Atualizando…' : 'Atualizar do Notion'}</Button>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b py-7">
        <div><p className="text-sm text-muted-foreground">Total em aberto</p><p className="mt-2 font-display text-4xl text-primary">{brl(total)}</p></div>
        <p className="text-sm text-muted-foreground">{rows.length} {rows.length === 1 ? 'conta pendente' : 'contas pendentes'}</p>
      </div>
      <ul className="divide-y">{rows.map(b => { const description = billDisplayDescription(b.description); return <li key={b.id} className="flex items-center gap-3 py-5 sm:gap-5">
        <div className="min-w-0 flex-1"><p className="break-words font-medium">{description}</p>{b.account !== 'Não informada' && <p className="mt-1 text-xs text-muted-foreground">{b.account}</p>}</div>
        <strong className="shrink-0 text-sm tabular-nums sm:text-base">{brl(b.amount)}</strong>
        <Button variant="outline" size="icon" title="Marcar como paga" aria-label={`Marcar como paga: ${description}`} disabled={update.isPending} onClick={() => update.mutate(b.id)}><Check className="h-4 w-4" /></Button>
      </li>; })}</ul>
      {rows.length === 0 && <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground"><CheckCircle2 className="h-8 w-8 text-primary" /><p>Nenhuma conta em aberto.</p></div>}
      <form className="mt-6 grid grid-cols-[minmax(0,1fr)_7rem_auto] gap-2 border-t pt-6" onSubmit={e => { e.preventDefault(); const form = e.currentTarget; add.mutate(new FormData(form), { onSuccess: () => form.reset() }); }}>
        <Input name="description" required maxLength={300} aria-label="Descrição da conta" placeholder="Nova conta" />
        <Input name="amount" required aria-label="Valor da conta" placeholder="Valor R$" inputMode="decimal" />
        <Button size="icon" title="Adicionar conta" aria-label="Adicionar conta" disabled={add.isPending}><Plus className="h-4 w-4" /></Button>
      </form>
    </main>
  </div>;
}