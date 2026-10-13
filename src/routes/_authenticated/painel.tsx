import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient, queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PiggyBank, LogOut, Sparkles, TrendingDown, Plus, Trash2, Landmark, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { summarize, suggestCuts, brl, sampleTransactions, CATEGORIES, SAVINGS_GOAL, type Tx } from "@/lib/finance";
import { getAiTips } from "@/lib/insights.functions";

const txQuery = queryOptions({
  queryKey: ["transactions"],
  queryFn: async () => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .gte("occurred_on", since.toISOString().slice(0, 10))
      .order("occurred_on", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as (Tx & { id: string })[];
  },
});

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Meu painel — Cofrinho" },
      { name: "description", content: "Seus gastos por categoria e quanto falta para guardar R$ 500." },
      { property: "og:title", content: "Meu painel — Cofrinho" },
      { property: "og:description", content: "Resumo financeiro dos últimos 30 dias." },
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
  const { data: txs } = useSuspenseQuery(txQuery);
  const summary = useMemo(() => summarize(txs), [txs]);
  const { cuts, covered } = useMemo(() => suggestCuts(summary), [summary]);
  const saved = Math.max(0, Math.min(SAVINGS_GOAL, summary.leftover));

  const seed = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transactions").insert(sampleTransactions());
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const accounts = [...new Set(txs.map((t) => t.account))];

  return (
    <div className="min-h-screen">
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="flex items-center gap-2 font-display text-xl">
            <PiggyBank className="h-6 w-6" /> Cofrinho
          </span>
          <button onClick={signOut} className="flex items-center gap-1.5 text-sm opacity-85 hover:opacity-100">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-4">
          <p className="text-sm opacity-75">Últimos 30 dias</p>
          <div className="mt-2 grid gap-6 md:grid-cols-3">
            <Stat label="Entrou" value={brl(summary.income)} />
            <Stat label="Saiu" value={brl(summary.expenses)} />
            <Stat label="Sobrou" value={brl(summary.leftover)} highlight />
          </div>
          <div className="mt-8 max-w-xl">
            <div className="mb-2 flex justify-between text-sm">
              <span>Meta de guardar {brl(SAVINGS_GOAL)}</span>
              <span className="font-semibold">{Math.round((saved / SAVINGS_GOAL) * 100)}%</span>
            </div>
            <Progress value={(saved / SAVINGS_GOAL) * 100} className="h-3 bg-primary-foreground/20 [&>div]:bg-accent" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        {txs.length === 0 ? (
          <div className="rounded-3xl border bg-card p-10 text-center shadow-soft">
            <Landmark className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 text-2xl font-bold">Nenhum lançamento ainda</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              A conexão automática com bancos vem em breve. Por enquanto, carregue um mês de exemplo ou adicione gastos manualmente.
            </p>
            <Button className="mt-6" onClick={() => seed.mutate()} disabled={seed.isPending}>
              Carregar dados de exemplo
            </Button>
          </div>
        ) : (
          <>
            <section className="grid gap-6 lg:grid-cols-5">
              <div className="rounded-3xl border bg-card p-6 shadow-soft lg:col-span-3">
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

              <div className="rounded-3xl border bg-card p-6 shadow-soft lg:col-span-2">
                <h2 className="flex items-center gap-2 text-2xl font-bold">
                  <TrendingDown className="h-5 w-5 text-warning" /> Onde cortar
                </h2>
                {summary.gap === 0 ? (
                  <p className="mt-4 text-muted-foreground">
                    Parabéns! Você já está guardando {brl(summary.leftover)} — acima da meta.
                  </p>
                ) : (
                  <>
                    <p className="mt-3 flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-sm">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                      Faltam <strong className="mx-1">{brl(summary.gap)}</strong> para guardar {brl(SAVINGS_GOAL)} este mês.
                    </p>
                    <ul className="mt-4 space-y-3">
                      {cuts.map((c) => (
                        <li key={c.category} className="flex items-center justify-between border-b pb-3 text-sm last:border-0">
                          <div>
                            <p className="font-semibold">{c.category}</p>
                            <p className="text-muted-foreground">
                              de {brl(c.current)} para {brl(c.current - c.cut)}
                            </p>
                          </div>
                          <span className="font-semibold text-success">−{brl(c.cut)}</span>
                        </li>
                      ))}
                    </ul>
                    {covered < summary.gap && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Só com cortes não fecha a meta — vale buscar uma renda extra de {brl(summary.gap - covered)}.
                      </p>
                    )}
                  </>
                )}
              </div>
            </section>

            <AiTips />

            <section className="rounded-3xl border bg-card p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold">Lançamentos</h2>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {accounts.map((a) => (
                    <span key={a} className="rounded-full bg-muted px-3 py-1">{a}</span>
                  ))}
                </div>
              </div>
              <AddTx />
              <ul className="mt-4 divide-y">
                {txs.map((t) => (
                  <li key={t.id} className="group flex items-center gap-4 py-3 text-sm">
                    <span className="w-14 text-muted-foreground">{t.occurred_on.slice(8, 10)}/{t.occurred_on.slice(5, 7)}</span>
                    <span className="flex-1 font-medium">{t.description}</span>
                    <span className="hidden rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground sm:inline">{t.category}</span>
                    <span className={`w-28 text-right font-semibold ${t.kind === "income" ? "text-success" : ""}`}>
                      {t.kind === "income" ? "+" : "−"}{brl(t.amount)}
                    </span>
                    <button
                      aria-label="Excluir"
                      onClick={() => remove.mutate(t.id)}
                      className="text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-sm opacity-75">{label}</p>
      <p className={`font-display text-4xl font-bold ${highlight ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}

function AiTips() {
  const tips = useQuery({ queryKey: ["ai-tips"], queryFn: () => getAiTips(), enabled: false, retry: false, staleTime: Infinity });
  return (
    <section className="rounded-3xl border bg-secondary/60 p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="h-5 w-5 text-primary" /> Assessor com IA
        </h2>
        <Button onClick={() => tips.refetch()} disabled={tips.isFetching}>
          {tips.isFetching ? "Analisando seus gastos…" : tips.data ? "Analisar de novo" : "Gerar dicas personalizadas"}
        </Button>
      </div>
      {tips.error && <p className="mt-4 text-sm text-destructive">{tips.error.message}</p>}
      {tips.data && (
        <div className="mt-5 space-y-2 leading-relaxed">
          {tips.data.tips.split("\n").filter(Boolean).map((line, i) => {
            const clean = line.replace(/\*\*/g, "");
            return clean.startsWith("- ") ? (
              <p key={i} className="flex gap-2"><span className="text-primary">•</span>{clean.slice(2)}</p>
            ) : (
              <p key={i} className="font-medium">{clean.replace(/^#+\s*/, "")}</p>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AddTx() {
  const qc = useQueryClient();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Outros");
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transactions").insert({
        description,
        amount: Number(amount.replace(",", ".")),
        category,
        kind,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDescription("");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["transactions"] });
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
        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="expense">Gasto</SelectItem>
          <SelectItem value="income">Entrada</SelectItem>
        </SelectContent>
      </Select>
      <Input className="min-w-40 flex-1" placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
      <Input className="w-28" placeholder="Valor" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button type="submit" disabled={add.isPending}><Plus className="h-4 w-4" /> Adicionar</Button>
    </form>
  );
}
