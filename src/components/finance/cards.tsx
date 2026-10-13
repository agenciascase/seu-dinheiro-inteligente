import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { brl, cardSummary, type Tx } from "@/lib/finance";

export function Cards({ txs }: { txs: (Tx & { id: string })[] }) {
  const qc = useQueryClient();
  const summary = cardSummary(txs);
  const review = useMutation({ mutationFn: async ({ id, necessity }: { id: string; necessity: string }) => {
    const { error } = await supabase.from("transactions").update({ necessity }).eq("id", id); if (error) throw error;
  }, onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-data"] }), onError: error => toast.error(error.message) });
  return <section className="border-t pt-6"><h2 className="flex items-center gap-2 text-2xl font-bold"><CreditCard className="h-5 w-5" /> Cartão de crédito</h2>
    <div className="mt-4 grid gap-4 sm:grid-cols-3"><div><p className="text-sm text-muted-foreground">Compras no período</p><p className="text-2xl font-bold">{brl(summary.total)}</p></div><div><p className="text-sm text-muted-foreground">Marcado como desnecessário</p><p className="text-2xl font-bold text-warning">{brl(summary.unnecessary)}</p></div><div><p className="text-sm text-muted-foreground">A avaliar</p><p className="text-2xl font-bold">{summary.pending}</p></div></div>
    {!summary.rows.length && <p className="mt-4 text-sm text-muted-foreground">Nenhuma compra no cartão neste período.</p>}
    <ul className="mt-4 divide-y">{summary.rows.map(t => <li key={t.id} className="flex flex-wrap items-center gap-3 py-3 text-sm"><div className="min-w-32 flex-1"><p className="font-medium">{t.description}</p><p className="text-xs text-muted-foreground">{t.account} · {t.category}</p></div><span className="font-semibold">{brl(t.amount)}</span><select aria-label={`Avaliar ${t.description}`} value={t.necessity ?? "review"} disabled={review.isPending} onChange={e => { if (t.id) review.mutate({ id: t.id, necessity: e.target.value }); }} className="h-9 rounded-md border bg-card px-2"><option value="review">A avaliar</option><option value="necessary">Necessário</option><option value="unnecessary">Desnecessário</option></select></li>)}</ul>
  </section>;
}