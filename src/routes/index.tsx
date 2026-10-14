import { createFileRoute, Link } from "@tanstack/react-router";
import { ChartNoAxesCombined, PieChart, BellRing, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import planningImage from "@/assets/financial-planning.jpg";

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
      <nav className="mx-auto flex max-w-[1160px] items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <span className="flex items-center gap-3 text-base font-bold"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><ChartNoAxesCombined className="h-5 w-5" /></span>Meu Organizador</span>
        <Button asChild variant="outline"><Link to="/auth">Entrar <ArrowRight /></Link></Button>
      </nav>
      <section className="finance-cover">
        <img src={planningImage} width={1536} height={1024} alt="Caderno de planejamento financeiro, calculadora e notas de reais" fetchPriority="high" />
        <div className="finance-cover-content mx-auto max-w-[1160px] px-6 py-12 sm:py-16">
          <div className="max-w-lg py-4">
            <p className="mb-4 text-sm font-semibold">Seu dinheiro, com direção.</p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
              Meu Organizador
            </h1>
            <p className="mt-5 text-xl leading-relaxed">Sua vida financeira.<br />Sob controle.</p>
            <Button asChild size="lg" className="mt-8 h-12 bg-card text-primary hover:bg-secondary">
              <Link to="/auth">Acessar meu organizador <ArrowRight /></Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-[1160px] gap-8 px-6 py-9 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary"><f.icon className="h-5 w-5" /></span>
            <h2 className="text-base font-semibold">{f.title}</h2>
          </div>
        ))}
      </section>
      <blockquote className="finance-statement mx-auto mb-8 max-w-[1112px] px-6">VOCÊ NÃO É RICO PELO TANTO QUE VOCÊ GANHA, VOCÊ FICA RICO NO TANTO QUE VOCÊ GASTA</blockquote>
    </main>
  );
}
