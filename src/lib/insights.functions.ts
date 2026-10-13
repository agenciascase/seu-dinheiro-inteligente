import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { summarize, suggestCuts, brl, SAVINGS_GOAL, type Tx } from "./finance";

export const getAiTips = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data, error } = await context.supabase
      .from("transactions")
      .select("occurred_on,description,amount,kind,category,account")
      .gte("occurred_on", since.toISOString().slice(0, 10));
    if (error) throw new Error(error.message);
    const txs = (data ?? []) as Tx[];
    if (!txs.length) return { tips: "Ainda não há lançamentos nos últimos 30 dias para analisar." };

    const s = summarize(txs);
    const { cuts } = suggestCuts(s);
    const topItems = txs
      .filter((t) => t.kind === "expense")
      .map((t) => `${t.occurred_on} | ${t.description} | ${t.category} | ${brl(Number(t.amount))}`)
      .slice(0, 80)
      .join("\n");

    const prompt = `Resumo dos últimos 30 dias:
Receitas: ${brl(s.income)} | Gastos: ${brl(s.expenses)} | Sobra: ${brl(s.leftover)}
Meta: guardar ${brl(SAVINGS_GOAL)} por mês. Falta: ${brl(s.gap)}
Gastos por categoria: ${s.byCategory.map((c) => `${c.category} ${brl(c.total)}`).join(", ")}
Cortes sugeridos pelas regras: ${cuts.map((c) => `${c.category} -${brl(c.cut)}`).join(", ") || "nenhum"}

Lançamentos:
${topItems}`;

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("IA não configurada.");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      instructions:
        "Você é um assessor financeiro brasileiro, direto e gentil. Com base nos dados, dê de 4 a 6 dicas práticas e específicas (citando estabelecimentos e valores reais dos lançamentos) para a pessoa guardar pelo menos R$ 500 por mês. Use markdown simples: uma frase de diagnóstico e depois uma lista com '- '. Termine com o total estimado de economia. Português do Brasil, sem jargão.",
      prompt,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    try {
      const tips = await result.text;
      return { tips };
    } catch (e: unknown) {
      const status = (e as { statusCode?: number })?.statusCode;
      if (status === 429) throw new Error("Muitas análises seguidas. Tente de novo em instantes.");
      if (status === 402) throw new Error("Os créditos de IA acabaram. Adicione créditos para continuar.");
      throw new Error("Não foi possível gerar as dicas agora.");
    }
  });
