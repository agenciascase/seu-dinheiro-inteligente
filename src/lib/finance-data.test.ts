import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { financeDataQuery } from "./finance-data";

type Table = "transactions" | "savings_goals" | "goal_contributions" | "bank_connections";
type Result = { data: unknown[] | null; error: Error | null };
const { from, results } = vi.hoisted(() => ({
  from: vi.fn(),
  results: {} as Record<Table, Result>,
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));

describe("shared finance data", () => {
  beforeEach(() => {
    from.mockReset();
    for (const table of ["transactions", "savings_goals", "goal_contributions", "bank_connections"] as const) {
      results[table] = { data: [], error: null };
    }
    from.mockImplementation((table: Table) => ({
      select: () => ({
        ...results[table],
        order: () => Promise.resolve(results[table]),
      }),
    }));
  });

  it("retains goals and contributions when reusing data loaded by the bills screen", async () => {
    results.savings_goals.data = [{ id: "goal-1", name: "Viagem", target: 10000, account: "Caixa" }];
    results.goal_contributions.data = [{ id: "reservation-1", goal_id: "goal-1", amount: 250 }];
    results.transactions.data = [{ id: "tx-1", amount: "123.45" }];
    const client = new QueryClient();
    await client.ensureQueryData(financeDataQuery);
    const overview = await client.ensureQueryData(financeDataQuery);
    expect(overview.goals.map(goal => goal.id)).toEqual(["goal-1"]);
    expect(overview.contributions.filter(row => row.goal_id === "goal-1").map(row => row.amount)).toEqual([250]);
    expect(overview.txs[0]?.amount).toBe(123.45);
    expect(from).toHaveBeenCalledTimes(4);
    client.clear();
  });

  it("returns all four arrays when reads contain no rows", async () => {
    for (const result of Object.values(results)) result.data = null;
    const client = new QueryClient();
    expect(await client.ensureQueryData(financeDataQuery)).toEqual({ txs: [], goals: [], contributions: [], connections: [] });
    client.clear();
  });

  it("ignores the legacy bank-only cache and still supports shared invalidation", async () => {
    const client = new QueryClient();
    client.setQueryData(["finance-data"], { txs: [], connections: [] });
    const data = await client.ensureQueryData(financeDataQuery);
    expect(data.goals).toEqual([]);
    expect(data.contributions).toEqual([]);
    expect(from).toHaveBeenCalledTimes(4);
    await client.invalidateQueries({ queryKey: ["finance-data"] });
    expect(client.getQueryState(financeDataQuery.queryKey)?.isInvalidated).toBe(true);
    client.clear();
  });

  it("does not cache an incomplete result when a goals read fails", async () => {
    results.savings_goals.error = new Error("Goals read failed");
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await expect(client.ensureQueryData(financeDataQuery)).rejects.toThrow("Goals read failed");
    expect(client.getQueryData(financeDataQuery.queryKey)).toBeUndefined();
    client.clear();
  });
});