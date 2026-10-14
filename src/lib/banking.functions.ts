import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { categorize } from "./finance";

export const findBankConnections = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const clientId = process.env['PLUGGY_CLIENT_ID']; const clientSecret = process.env['PLUGGY_CLIENT_SECRET'];
  if (!clientId || !clientSecret) throw new Error('Configure as credenciais Pluggy.');
  const auth = await fetch('https://api.pluggy.ai/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, clientSecret }) });
  if (!auth.ok) throw new Error(`Pluggy: autenticação indisponível (${auth.status}).`);
  const { apiKey } = await auth.json() as { apiKey: string };
  let after: string | null = null; const ids: string[] = [];
  do {
    const url = new URL('https://api.pluggy.ai/v2/items'); url.searchParams.set('clientUserId', context.userId); if (after) url.searchParams.set('after', after);
    const response = await fetch(url, { headers: { 'X-API-KEY': apiKey } });
    if (!response.ok) if (response.status === 403) throw new Error("Pluggy: Acesso negado (403). Verifique se o seu plano permite busca por clientUserId ou se a chave de API tem as permissões necessárias."); throw new Error(`Pluggy: falha na busca (${response.status}).`);
    const page = await response.json() as { results: { id: string; clientUserId?: string; connector: { name: string } }[]; next?: string | null };
    const owned = page.results.filter(item => item.clientUserId === context.userId);
    if (owned.length) {
      const result = await supabaseAdmin.from('bank_connections').upsert(owned.map(item => ({ user_id: context.userId, item_id: item.id, bank_name: item.connector.name })), { onConflict: 'item_id' });
      if (result.error) throw new Error(result.error.message);
      ids.push(...owned.map(item => item.id));
    }
    after = page.next ? new URL(page.next, 'https://api.pluggy.ai/v2/items').searchParams.get('after') : null;
  } while (after);
  return { ids };
});

export const getBankToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientId = process.env["PLUGGY_CLIENT_ID"];
    const clientSecret = process.env["PLUGGY_CLIENT_SECRET"];
    if (!clientId || !clientSecret) return { configured: false, token: "" };
    const auth = await fetch("https://api.pluggy.ai/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, clientSecret }) });
    if (!auth.ok) throw new Error(`Pluggy: autenticação indisponível (${auth.status}). Confira as credenciais e o plano contratado.`);
    const { apiKey } = await auth.json() as { apiKey: string };
    const response = await fetch("https://api.pluggy.ai/connect_token", { method: "POST", headers: { "Content-Type": "application/json", "X-API-KEY": apiKey }, body: JSON.stringify({ options: { clientUserId: context.userId } }) });
    if (!response.ok) throw new Error(`Pluggy: autorização indisponível (${response.status}).`);
    const { accessToken } = await response.json() as { accessToken: string };
    return { configured: true, token: accessToken };
  });

export const syncBank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ itemId: z.string().min(1).max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    const clientId = process.env["PLUGGY_CLIENT_ID"];
    const clientSecret = process.env["PLUGGY_CLIENT_SECRET"];
    if (!clientId || !clientSecret) throw new Error("Configure as credenciais Pluggy para conectar seus bancos.");
    const auth = await fetch("https://api.pluggy.ai/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, clientSecret }) });
    if (!auth.ok) throw new Error(`Pluggy: falha na autenticação (${auth.status}).`);
    const { apiKey } = await auth.json() as { apiKey: string };
    const get = async <T,>(path: string): Promise<T> => {
      const response = await fetch(`https://api.pluggy.ai${path}`, { headers: { "X-API-KEY": apiKey } });
      if (!response.ok) throw new Error(`Pluggy: não foi possível obter os movimentos (${response.status}).`);
      return response.json() as Promise<T>;
    };
    const item = await get<{ clientUserId?: string; connector: { name: string }; status: string }>(`/items/${encodeURIComponent(data.itemId)}`);
    if (item.clientUserId !== context.userId) throw new Error("Esta autorização bancária não pertence à sua conta.");
    // Privileged persistence only after server-verified provider ownership.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: connectionError } = await supabaseAdmin.from("bank_connections").upsert({ user_id: context.userId, item_id: data.itemId, bank_name: item.connector.name }, { onConflict: "item_id" });
    if (connectionError) throw new Error(connectionError.message);
    const accounts = await get<{ results: { id: string; type: string; name: string }[] }>(`/accounts?itemId=${encodeURIComponent(data.itemId)}`);
    let imported = 0;
    for (const account of accounts.results) {
      let page = 1;
      let totalPages = 1;
      do {
        const movements = await get<{ results: { id: string; date: string; description: string; amount: number; type: string; category?: string; status?: string }[]; totalPages: number }>(`/transactions?accountId=${encodeURIComponent(account.id)}&pageSize=500&page=${page}`);
        totalPages = movements.totalPages ?? 1;
        const rows = movements.results.filter(t => t.status !== "PENDING" && t.amount !== 0).map(t => {
          const card = account.type === "CREDIT";
          const transfer = /credit card payment|same person transfer|internal transfer/i.test(t.category ?? "");
          return { user_id: context.userId, external_id: t.id, occurred_on: t.date.slice(0, 10), description: t.description, amount: Math.abs(t.amount), kind: t.type === "DEBIT" ? "expense" : "income", category: categorize(t.description), account: item.connector.name, payment_method: card ? "credit" : "debit", is_transfer: transfer };
        });
        // Existing reviews remain intact; update source fields without overwriting necessity.
        for (const row of rows) {
          const { data: existing, error: readError } = await context.supabase.from("transactions").select("id").eq("external_id", row.external_id).maybeSingle();
          if (readError) throw new Error(readError.message);
          const result = existing ? await context.supabase.from("transactions").update(row).eq("id", existing.id) : await context.supabase.from("transactions").insert(row);
          if (result.error) throw new Error(result.error.message);
        }
        imported += rows.length;
        page++;
      } while (page <= totalPages);
    }
    const { error } = await supabaseAdmin.from("bank_connections").update({ synced_at: new Date().toISOString() }).eq("item_id", data.itemId).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { imported, status: item.status };
  });