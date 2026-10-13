import { Link } from "@tanstack/react-router";
import { Layers, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Tab = "orcamento" | "contas" | "cartoes" | "patrimonio";

export function AppHeader({ active, onSignOut, children }: { active: Tab; onSignOut?: () => void; children?: ReactNode }) {
  const pill = (on: boolean) => `rounded-md px-3 py-1.5 text-sm transition-colors ${on ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"}`;
  return (
    <header className="bg-hero">
      <div className="mx-auto max-w-6xl px-6 pt-6">
        <div className="flex items-center justify-between gap-4">
          <Link to="/painel" className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Layers className="h-6 w-6" /></span>
            <span className="leading-tight">
              <span className="block text-lg font-bold uppercase tracking-wide">Meu Organizador</span>
              <span className="block text-xs uppercase tracking-wider text-muted-foreground">Personal Finance</span>
            </span>
          </Link>
          {onSignOut && <Button variant="ghost" onClick={onSignOut}><LogOut className="h-4 w-4" /> Sair</Button>}
        </div>
        <div className="mt-5 border-t pt-5 pb-6">
          <h1 className="text-2xl font-bold">Sua vida financeira. Sob controle.</h1>
          <p className="mt-2 text-muted-foreground">Receitas, despesas, contas, cartões e planejamento reunidos em uma única plataforma inteligente.</p>
          <nav className="mt-4 flex flex-wrap gap-2" aria-label="Seções">
            <Link to="/painel" className={pill(active === "orcamento")}>Orçamento</Link>
            <Link to="/contas-a-pagar" className={pill(active === "contas")}>Contas a pagar</Link>
            <Link to="/painel" hash="cartoes" className={pill(active === "cartoes")}>Cartões</Link>
            <Link to="/painel" hash="patrimonio" className={pill(active === "patrimonio")}>Patrimônio</Link>
          </nav>
          {children}
        </div>
      </div>
    </header>
  );
}
