import { lazy, Suspense, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Landmark, RefreshCw, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getBankToken, syncBank } from "@/lib/banking.functions";

const Connect = lazy(() => import("react-pluggy-connect").then(module => ({ default: module.PluggyConnect })));
export function Banks({ connections }: { connections: { item_id: string; bank_name: string; synced_at: string | null }[] }) {
  const [token, setToken] = useState("");
  const qc = useQueryClient();
  const getToken = useServerFn(getBankToken);
  const sync = useServerFn(syncBank);
  const connect = useMutation({ mutationFn: () => getToken(), onSuccess: result => {
    if (!result.configured) toast.error("A conexão aguarda o Client ID e Client Secret do seu plano Pluggy.");
    else setToken(result.token);
  }, onError: error => toast.error(error.message) });
  const refresh = useMutation({ mutationFn: (itemId: string) => sync({ data: { itemId } }), onSuccess: result => {
    qc.invalidateQueries({ queryKey: ["finance-data"] });
    toast.success(`${result.imported} movimentos sincronizados.`);
  }, onError: error => toast.error(error.message) });
  return <section className="border-b pb-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-2xl font-bold"><Landmark className="h-5 w-5" /> Minhas contas</h2><Button onClick={() => connect.mutate()} disabled={connect.isPending}><Link2 className="h-4 w-4" />{connect.isPending ? "Preparando…" : "Conectar banco"}</Button></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{["Mercado Pago", "Caixa"].map(name => {
      const linked = connections.filter(c => c.bank_name.toLowerCase().includes(name.toLowerCase()));
      return <div key={name} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4"><div><p className="font-semibold">{name}</p><p className="mt-1 text-xs text-muted-foreground">{linked.length ? "Autorizada no Pluggy" : "Aguardando sua autorização"}</p></div>{linked.map(c => <Button key={c.item_id} variant="outline" size="icon" title="Sincronizar movimentos" aria-label={`Sincronizar ${name}`} disabled={refresh.isPending} onClick={() => refresh.mutate(c.item_id)}><RefreshCw className="h-4 w-4" /></Button>)}</div>;
    })}</div>
    {connections.filter(c => !/mercado pago|caixa/i.test(c.bank_name)).map(c => <div key={c.item_id} className="mt-3 flex items-center justify-between border-t pt-3"><span>{c.bank_name}</span><Button variant="outline" disabled={refresh.isPending} onClick={() => refresh.mutate(c.item_id)}><RefreshCw className="h-4 w-4" /> Sincronizar</Button></div>)}
    {token && <Suspense fallback={<p className="mt-3">Abrindo autorização…</p>}><Connect connectToken={token} includeSandbox={false} onClose={() => setToken("")} onSuccess={result => { setToken(""); refresh.mutate(result.item.id); }} onError={() => { toast.error("O banco não concluiu a autorização. Tente novamente."); }} /></Suspense>}
  </section>;
}