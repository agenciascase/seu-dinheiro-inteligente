import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Goals } from "./goals";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn() } }));
afterEach(cleanup);

describe("goals with incomplete cached data", () => {
  it("does not crash when the old bank-only cache has no goals or contributions", () => {
    const client = new QueryClient();
    expect(() => render(<QueryClientProvider client={client}><Goals accounts={["Caixa"]} /></QueryClientProvider>)).not.toThrow();
    client.clear();
  });

  it("does not crash when a goal is present before its contributions arrive", () => {
    const client = new QueryClient();
    expect(() => render(<QueryClientProvider client={client}><Goals goals={[{ id: "goal-1", name: "Viagem", target: 10000, account: "Caixa" }]} /></QueryClientProvider>)).not.toThrow();
    client.clear();
  });
});