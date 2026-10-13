import { createFileRoute, Link } from "@tanstack/react-router";
import { PiggyBank, PieChart, BellRing, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meu Organizador — organize seu dinheiro e guarde mais" },
      {
        name: "description",
        content: "Suas contas, cartões, metas pessoais e consultoria financeira em um só lugar.",
      },
      { property: "og:title", content: "Meu Organizador — organize seu dinheiro e guarde mais" },
      { property: "og:description", content: "Análise financeira, cartões e metas para guardar cada vez mais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: PieChart, title: "Gastos separados", text: "Mercado, delivery, assinaturas, lazer — tudo organizado por categoria." },
  { icon: BellRing, title: "Alertas de corte", text: "Mostramos exatamente onde diminuir para fechar o mês no azul." },
  { icon: Sparkles, title: "Consultoria financeira", text: "Um plano de ação para suas contas, cartões e metas pessoais." },
];

function Index() {
  return (
    <main className="min-h-screen">
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <nav className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-display text-xl">
              <PiggyBank className="h-6 w-6" /> Meu Organizador
            </span>
            <Link to="/auth" className="text-sm font-medium opacity-90 hover:opacity-100">
              Entrar
            </Link>
          </nav>
          <div className="py-12 md:py-16">
            <p className="mb-4 text-sm font-semibold text-accent">Seu dinheiro, com direção.</p>
            <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] md:text-7xl">
              Meu Organizador
            </h1>
            <p className="mt-6 max-w-xl text-lg opacity-85">
              O Meu Organizador junta seus gastos, separa por categoria e te avisa o que dá para cortar.
            </p>
            <blockquote className="mt-6 max-w-2xl border-l-2 border-accent pl-4 font-display text-lg text-accent">VOCÊ NÃO É RICO PELO TANTO QUE VOCÊ GANHA, VOCÊ FICA RICO NO TANTO QUE VOCÊ GASTA</blockquote>
            <Button asChild variant="hero" size="lg" className="mt-10 h-12 px-8 text-base">
              <Link to="/auth">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl gap-6 px-6 py-10 md:grid-cols-3">
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
