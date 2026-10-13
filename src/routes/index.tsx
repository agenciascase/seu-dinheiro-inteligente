import { createFileRoute, Link } from "@tanstack/react-router";
import { PiggyBank, PieChart, BellRing, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cofrinho — veja seus gastos e guarde R$ 500 por mês" },
      {
        name: "description",
        content: "Organizador financeiro que separa seus gastos por categoria e avisa onde cortar para guardar R$ 500 por mês.",
      },
      { property: "og:title", content: "Cofrinho — guarde R$ 500 por mês" },
      { property: "og:description", content: "Seus gastos separados por categoria e dicas de economia com IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: PieChart, title: "Gastos separados", text: "Mercado, delivery, assinaturas, lazer — tudo organizado por categoria." },
  { icon: BellRing, title: "Alertas de corte", text: "Mostramos exatamente onde diminuir para fechar o mês no azul." },
  { icon: Sparkles, title: "Dicas com IA", text: "Um assessor que lê seus lançamentos e sugere economias reais." },
];

function Index() {
  return (
    <main className="min-h-screen">
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <nav className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-display text-xl">
              <PiggyBank className="h-6 w-6" /> Cofrinho
            </span>
            <Link to="/auth" className="text-sm font-medium opacity-90 hover:opacity-100">
              Entrar
            </Link>
          </nav>
          <div className="py-24 md:py-32">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-accent">Meta: R$ 500/mês</p>
            <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] md:text-7xl">
              Descubra para onde vai seu dinheiro. E guarde mais.
            </h1>
            <p className="mt-6 max-w-xl text-lg opacity-85">
              O Cofrinho junta seus gastos, separa por categoria e te avisa o que dá para cortar.
            </p>
            <Button asChild variant="hero" size="lg" className="mt-10 h-12 px-8 text-base">
              <Link to="/auth">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl gap-6 px-6 py-20 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-soft">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 text-xl font-semibold">{f.title}</h3>
            <p className="mt-2 text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
