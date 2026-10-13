import { Link } from "@tanstack/react-router";
import { Layers, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Tab = "orcamento" | "contas" | "cartoes" | "patrimonio";

export function AppHeader({ active, onSignOut, children }: { active: Tab; onSignOut?: () => void; children?: ReactNode }) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto max-w-4xl px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <Link to="/contas-a-pagar" className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Layers className="h-6 w-6" /></span>
            <span className="leading-tight">
              <span className="block text-lg font-semibold">Meu Organizador</span>
            </span>
          </Link>
          {onSignOut && <Button variant="ghost" onClick={onSignOut}><LogOut className="h-4 w-4" /> Sair</Button>}
        </div>
        <nav className="mt-5" aria-label="Seções"><Link to="/contas-a-pagar" className="inline-block border-b-2 border-primary pb-2 text-sm font-semibold text-primary" aria-current="page">Contas a pagar</Link></nav>
      </div>
    </header>
  );
}
