import { FinanceSelect } from "./account-select";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Target, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { brl, goalProgress } from "@/lib/finance";

type Goal = { id: string; name: string; target: number; account: string };
type Contribution = { id: string; goal_id: string; amount: number; created_at: string };
export function Goals({ goals = [], contributions = [], accounts = [] }: { goals?: Goal[]; contributions?: Contribution[]; accounts?: string[] }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [account, setAccount] = useState("Mercado Pago");
  const create = useMutation({ mutationFn: async () => {
    const { error } = await supabase.from("savings_goals").insert({ name: name.trim(), target: Number(target.replace(",", ".")), account });
    if (error) throw error;
  }, onSuccess: () => { setName(""); setTarget(""); qc.invalidateQueries({ queryKey: ["finance-data"] }); }, onError: error => toast.error(error.message) });
  const remove = useMutation({ mutationFn: async (id: string) => {
    const { error } = await supabase.from("savings_goals").delete().eq("id", id); if (error) throw error;
  }, onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-data"] }), onError: error => toast.error(error.message) });
  return <section>
    <h2 className="flex items-center gap-2 text-2xl font-bold"><Target className="h-5 w-5" /> Metas pessoais</h2>
    <form className="mt-4 flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); if (name.trim() && Number(target.replace(",", ".")) > 0) create.mutate(); }}>
      <Input aria-label="Nome da meta" placeholder="Ex.: Viagem para os EUA" required value={name} onChange={e => setName(e.target.value)} className="min-w-48 flex-1" />
      <Input aria-label="Valor da meta" placeholder="Ex.: 10000" required inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} className="w-36" />
      <FinanceSelect label="Conta da meta" value={account} onChange={setAccount} options={accounts.map(a => ({ value: a, label: a }))} />
      <Button type="submit" disabled={create.isPending}><Plus className="h-4 w-4" /> Criar meta</Button>
    </form>
    <div className="mt-5 grid gap-4 md:grid-cols-2">{goals.map(goal => <div key={goal.id} className="rounded-lg border bg-card p-5"><div className="flex items-start justify-between gap-2"><div><h3 className="text-xl font-semibold break-words">{goal.name}</h3><p className="text-sm text-muted-foreground">{goal.account}</p></div><Button size="icon" variant="ghost" aria-label={`Excluir meta ${goal.name}`} onClick={() => { if (window.confirm("Excluir esta meta e seus valores registrados?")) remove.mutate(goal.id); }}><Trash2 className="h-4 w-4" /></Button></div><GoalBalance goal={goal} contributions={contributions.filter(c => c.goal_id === goal.id)} /></div>)}</div>
    {!goals.length && <p className="mt-5 text-muted-foreground">Nenhuma meta criada ainda.</p>}
  </section>;
}
function GoalBalance({ goal, contributions }: { goal: Goal; contributions: Contribution[] }) {
  const [amount, setAmount] = useState("");
  const qc = useQueryClient();
  const progress = goalProgress(Number(goal.target), contributions.map(c => Number(c.amount)));
  const add = useMutation({ mutationFn: async () => {
    const { error } = await supabase.from("goal_contributions").insert({ goal_id: goal.id, amount: Number(amount.replace(",", ".")) });
    if (error) throw error;
  }, onSuccess: () => { setAmount(""); qc.invalidateQueries({ queryKey: ["finance-data"] }); toast.success("Valor registrado. Este registro não transfere dinheiro entre bancos."); }, onError: error => toast.error(error.message) });
  return <><p className="mt-5 text-sm"><strong>{brl(progress.saved)}</strong> de {brl(Number(goal.target))}</p><Progress value={progress.percent} className="mt-2" /><p className="mt-2 text-xs text-muted-foreground">{progress.remaining ? `Faltam ${brl(progress.remaining)}` : "Meta alcançada!"}</p>
    <form className="mt-4 flex gap-2" onSubmit={e => { e.preventDefault(); if (Number(amount.replace(",", ".")) > 0) add.mutate(); }}><Input aria-label={`Valor reservado para ${goal.name}`} placeholder="Valor reservado" inputMode="decimal" required value={amount} onChange={e => setAmount(e.target.value)} className="min-w-0 flex-1" /><Button type="submit" disabled={add.isPending}>Registrar</Button></form>
    {contributions.length > 0 && <details className="mt-3 text-xs text-muted-foreground"><summary>Reservas registradas ({contributions.length})</summary><ul className="mt-2 space-y-1">{contributions.map(c => <li key={c.id} className="flex justify-between"><span>{new Date(c.created_at).toLocaleDateString("pt-BR")}</span><span>{brl(Number(c.amount))}</span></li>)}</ul></details>}
  </>;
}