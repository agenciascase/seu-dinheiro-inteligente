import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { mapNotionBill, isOrganizerSummary, type NotionRow } from './bills';

export const importNotionFinance = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: access, error } = await context.supabase.from('notion_finance_access').select('organizer_page_id').eq('user_id', context.userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!access) throw new Error('Seu organizador do Notion ainda não foi autorizado para esta conta.');
  const key = process.env['NOTION_API_KEY']; const gatewayKey = process.env['LOVABLE_API_KEY'];
  if (!key || !gatewayKey) throw new Error('Conecte o Notion ao Meu Organizador para importar suas contas.');
  const request = async <T,>(path: string, body?: object): Promise<T> => {
    const response = await fetch(`https://connector-gateway.lovable.dev/notion/v1${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': key, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) { const detail = await response.text(); console.error(`Notion [${response.status}]: ${detail}`); throw new Error(`Notion [${response.status}]: ${detail}`); }
    return response.json() as Promise<T>;
  };
  type List<T> = { results: T[]; has_more: boolean; next_cursor: string | null };
  const databases: { id: string; child_database: { title: string } }[] = [];
  let cursor: string | null = null;
  do {
    const blocks: List<{ id: string; type: string; child_database: { title: string } }> = await request(`/blocks/${access.organizer_page_id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`);
    databases.push(...blocks.results.filter(b => b.type === 'child_database')); cursor = blocks.has_more ? blocks.next_cursor : null;
  } while (cursor);
  let imported = 0; let skipped = 0;
  const previous = await context.supabase.from('bills').select('id,description').eq('source', 'notion');
  if (previous.error) throw new Error(previous.error.message);
  const summaries = previous.data.filter(b => isOrganizerSummary(b.description)).map(b => b.id);
  if (summaries.length) { const removed = await context.supabase.from('bills').delete().in('id', summaries); if (removed.error) throw new Error(removed.error.message); }
  for (const db of databases) {
    const database = await request<{ data_sources: { id: string }[] }>(`/databases/${db.id}`);
    for (const source of database.data_sources) {
      cursor = null;
      do {
        const rows: List<NotionRow> = await request(`/data_sources/${source.id}/query`, { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) });
        const bills = rows.results.map(row => mapNotionBill(row, db.child_database.title));
        skipped += bills.filter(b => !b).length;
        const valid = bills.filter(b => b !== null).map(b => ({ ...b, user_id: context.userId }));
        if (valid.length) { const result = await context.supabase.from('bills').upsert(valid, { onConflict: 'user_id,external_id' }); if (result.error) throw new Error(result.error.message); imported += valid.length; }
        cursor = rows.has_more ? rows.next_cursor : null;
      } while (cursor);
    }
  }
  return { imported, skipped };
});