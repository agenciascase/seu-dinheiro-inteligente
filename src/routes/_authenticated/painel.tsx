import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { AppHeader } from "@/components/finance/app-header";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FinanceSelect } from "@/components/finance/account-select";
import { Banks } from "@/components/finance/banks";
import { Goals } from "@/components/finance/goals";
import { FinancialAssistant } from "@/components/finance/financial-assistant";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowDownLeft, ArrowUpRight, Wallet, Sprout, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { summarize, suggestCuts, suggestNamedCuts, brl, categorize, filterTransactions, filterCashFlow, PERIOD_LABELS, SAVINGS_GOAL, type CashFlow, type Period, type Tx } from "@/lib/finance";
import { financeDataQuery as txQuery } from "@/lib/finance-data";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Meu painel — Meu Organizador" },
      { name: "description", content: "Entradas, saídas, metas pessoais e seu assessor financeiro para guardar mais." },
      { property: "og:title", content: "Meu painel — Meu Organizador" },
      { property: "og:description", content: "Análise semanal, quinzenal e mensal das suas contas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(txQuery),
  component: Painel,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"];

function Painel() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(txQuery);
  const [period, setPeriod] = useState<Period>("monthly");
  const [account, setAccount] = useState("all");
  const [flow, setFlow] = useState<CashFlow>("all");
  const txs = useMemo(() => filterTransactions(data.txs, period, account) as (Tx & { id: string })[], [data.txs, period, account]);
  const flowRows = useMemo(() => filterCashFlow(txs, flow), [txs, flow]);
  const summary = useMemo(() => summarize(txs), [txs]);
  const { cuts, covered } = useMemo(() => suggestCuts(summary), [summary]);
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-data"] }),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const accounts = [...new Set(["Mercado Pago", "Caixa", ...data.txs.map(t => t.account), ...data.connections.map(c => c.bank_name)])];

  return (
    <div className="min-h-screen">
      <AppHeader active="orcamento" onSignOut={signOut} />
      <main className="finance-main space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-medium text-primary">Meu dinheiro</p><h1 className="mt-1 text-3xl font-bold">Visão geral</h1></div><p className="text-sm text-muted-foreground">{PERIOD_LABELS[period]} · {account === "all" ? "Todas as contas" : account}</p></div>
        <div>
          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="Entrou" value={brl(summary.income)} />
            <Stat label="Saiu" value={brl(summary.expenses)} />
            <Stat label="Sobrou" value={brl(summary.leftover)} highlight />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Referência inicial: pelo menos {brl(SAVINGS_GOAL)} por mês — quanto mais sobrar, melhor.</p>
        </div>
        <blockquote className="finance-statement max-w-3xl">VOCÊ NÃO É RICO PELO TANTO QUE VOCÊ GANHA, VOCÊ FICA RICO NO TANTO QUE VOCÊ GASTA</blockquote>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Período de análise">{(Object.keys(PERIOD_LABELS) as Period[]).map(p => <Button key={p} variant={period === p ? "default" : "outline"} aria-pressed={period === p} onClick={() => setPeriod(p)}>{PERIOD_LABELS[p]}</Button>)}</div>
          <div className="space-y-1"><label htmlFor="account-filter" className="block text-xs text-muted-foreground">Conta</label><FinanceSelect label="Filtrar conta" value={account} onChange={setAccount} options={[{ value: "all", label: "Todas as contas juntas" }, ...accounts.map(a => ({ value: a, label: a }))]} /></div>
        </div>
        <Banks connections={data.connections} />
        {txs.length === 0 && <p className="text-muted-foreground">Nenhum lançamento neste período e conta.</p>}
            <section className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <h2 className="text-2xl font-bold">Para onde foi o dinheiro</h2>
                <div className="mt-4 grid items-center gap-6 md:grid-cols-2">
                  <div className="h-56">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={summary.byCategory} dataKey="total" nameKey="category" innerRadius={55} outerRadius={95} paddingAngle={2}>
                          {summary.byCategory.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => brl(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="space-y-2.5">
                    {summary.byCategory.map((c, i) => (
                      <li key={c.category} className="flex items-center gap-3 text-sm">
                        <span className="h-3 w-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="flex-1">{c.category}</span>
                        <span className="text-muted-foreground">{Math.round(c.share * 100)}%</span>
                        <span className="w-24 text-right font-semibold">{brl(c.total)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="lg:col-span-2">
                <h2 className="flex items-center gap-2 text-2xl font-bold">
                  <Sprout className="h-5 w-5 text-primary" /> Oportunidades de economia
                </h2>
                <>
                    <p className="mt-3 text-sm text-muted-foreground">Economia estimada no período</p>
                    <p className="mt-1 text-3xl font-bold text-primary tabular-nums">{brl(covered)}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Possibilidades para guardar mais, preservando seus gastos essenciais.</p>
                    <ul className="mt-4 space-y-3">
                      {cuts.map((c) => (
                        <li key={c.category} className="flex items-center justify-between gap-3 border-b pb-3 text-sm last:border-0">
                          <div className="min-w-0">
                            <p className="font-semibold">{c.category}</p>
                            <p className="text-muted-foreground">
                              Gasto atual: {brl(c.current)} · Sugestão: {brl(c.current - c.cut)}
                            </p>
                          </div>
                          <div className="shrink-0 text-right"><p className="text-xs text-muted-foreground">Economia possível</p><p className="font-semibold text-success">{brl(c.cut)}</p></div>
                        </li>
                      ))}
                    </ul>
                    {cuts.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Nenhuma oportunidade estimada em gastos flexíveis neste período.</p>}
                  </>
              </div>
            </section>

            <div id="patrimonio" className="scroll-mt-6"><Goals goals={data.goals} contributions={data.contributions} accounts={accounts} /></div>

            <section className="border-t pt-6" aria-label="Lançamentos">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold">Lançamentos</h2>
                <FinanceSelect label="Fluxo de caixa" value={flow} onChange={value => { if (value === "all" || value === "income" || value === "expense") setFlow(value); }} options={[{ value: "all", label: "Entradas e saídas" }, { value: "income", label: "Entradas" }, { value: "expense", label: "Saídas" }]} />
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-b pb-4 text-sm"><p className="text-muted-foreground">Entradas <strong className="ml-2 text-success">{brl(summary.income)}</strong></p><p className="text-muted-foreground">Saídas <strong className="ml-2 text-foreground">{brl(summary.expenses)}</strong></p><p className="text-muted-foreground">Saldo <strong className={`ml-2 ${summary.leftover < 0 ? "text-destructive" : "text-primary"}`}>{brl(summary.leftover)}</strong></p></div>
              <AddTx accounts={accounts} />
              <ul className="mt-4 divide-y">
                {flowRows.map((t) => (
                  <li key={t.id} className="group flex items-center gap-2 py-3 text-sm sm:gap-4">
                    <span className="w-12 shrink-0 text-muted-foreground">{t.occurred_on.slice(8, 10)}/{t.occurred_on.slice(5, 7)}</span>
                    <span className="min-w-0 flex-1 font-medium break-words">{t.description}<span className="block text-xs font-normal text-muted-foreground">{t.account} · {t.payment_method === "credit" ? "Crédito" : "Débito"}{t.is_transfer ? " · Transferência" : ""}</span></span>
                    <span className="hidden rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground sm:inline">{t.category}</span>
                    <span className={`w-28 text-right font-semibold ${t.kind === "income" ? "text-success" : ""}`}>
                      {t.kind === "income" ? "+" : "−"}{brl(t.amount)}
                    </span>
                    <Button variant="ghost" size="icon"
                      aria-label="Excluir"
                      onClick={() => remove.mutate(t.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
              {flowRows.length === 0 && <p className="py-6 text-sm text-muted-foreground">{flow === "income" ? "Nenhuma entrada" : flow === "expense" ? "Nenhuma saída" : "Nenhum lançamento"} neste período e conta.</p>}
            </section>

      </main>
      <FinancialAssistant period={period} account={account} />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="finance-stat">
      <div className="flex items-center justify-between gap-2"><p className="text-sm text-muted-foreground">{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-md ${highlight ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>{highlight ? <Wallet className="h-4 w-4" /> : label === "Entrou" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}</span></div>
      <p className={`mt-3 text-3xl font-bold break-words tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function AddTx({ accounts }: { accounts: string[] }) {
  const qc = useQueryClient();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState("Mercado Pago");
  const [paymentMethod, setPaymentMethod] = useState("debit");
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transactions").insert({
        description,
        amount: Number(amount.replace(",", ".")),
        category: categorize(description),
        account,
        payment_method: paymentMethod,
        kind,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDescription("");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["finance-data"] });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (description && Number(amount.replace(",", ".")) > 0) add.mutate();
      }}
      className="mt-4 flex flex-wrap gap-2"
    >
      <Select value={kind} onValueChange={(v) => setKind(v as "expense" | "income")}>
        <SelectTrigger aria-label="Tipo do lançamento" className="w-28"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="expense">Saída</SelectItem>
          <SelectItem value="income">Entrada</SelectItem>
        </SelectContent>
      </Select>
      <Input aria-label="Descrição do lançamento" required className="min-w-40 flex-1" placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
      <Input aria-label="Valor do lançamento" required className="w-28" placeholder="Valor" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <FinanceSelect label="Conta do lançamento" value={account} onChange={setAccount} options={accounts.map(a => ({ value: a, label: a }))} />
      <FinanceSelect label="Forma de pagamento" value={paymentMethod} onChange={setPaymentMethod} options={[{ value: "debit", label: "Débito" }, { value: "credit", label: "Crédito" }]} />
      <Button type="submit" disabled={add.isPending}><Plus className="h-4 w-4" /> Adicionar</Button>
    </form>
  );
}
