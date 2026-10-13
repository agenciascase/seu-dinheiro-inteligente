import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tx } from "@/lib/finance";
import type { Database } from "@/integrations/supabase/types";

type FinanceTransaction = Omit<Database["public"]["Tables"]["transactions"]["Row"], keyof Tx> & Tx;

// Every consumer of this cache key must receive the same complete data shape.
export const financeDataQuery = queryOptions({
  queryKey: ["finance-data"],
  queryFn: async () => {
    const [transactions, goals, contributions, connections] = await Promise.all([
      supabase.from("transactions").select("*").order("occurred_on", { ascending: false }),
      supabase.from("savings_goals").select("*").order("created_at", { ascending: false }),
      supabase.from("goal_contributions").select("*").order("created_at", { ascending: false }),
      supabase.from("bank_connections").select("*"),
    ]);
    for (const result of [transactions, goals, contributions, connections]) {
      if (result.error) throw result.error;
    }
    return {
      txs: (transactions.data ?? []).map(row => ({ ...row, amount: Number(row.amount) })) as FinanceTransaction[],
      goals: goals.data ?? [],
      contributions: contributions.data ?? [],
      connections: connections.data ?? [],
    };
  },
});