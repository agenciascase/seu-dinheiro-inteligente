import { Link } from "@tanstack/react-router";
import { Layers, LogOut, Sun, Moon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Tab = "orcamento" | "contas" | "cartoes" | "patrimonio" | "receitas" | "despesas" | "contas-fixas" | "metas" | "planejamento" | "calendario" | "relatorios";

export function AppHeader({ active, onSignOut, children }: { active: Tab; onSignOut?: () => void; children?: ReactNode }) {
  const [light,setLight]=useState(false);
  useEffect(()=>{const selected=localStorage.getItem('organizer-theme')==='light';setLight(selected);document.documentElement.classList.toggle('light',selected);},[]);
  function toggleTheme(){const selected=!light;setLight(selected);document.documentElement.classList.toggle('light',selected);localStorage.setItem('organizer-theme',selected?'light':'dark');}
  return (
    <header className="border-b bg-background">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link to="/contas-a-pagar" className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Layers className="h-6 w-6" /></span>
            <span className="leading-tight">
              <span className="block text-lg font-semibold">Meu Organizador</span>
            </span>
          </Link>
          <div className="flex items-center gap-1"><Button variant="ghost" size="icon" title={light?'Modo escuro':'Modo claro'} aria-label={light?'Modo escuro':'Modo claro'} onClick={toggleTheme}>{light?<Moon className="h-4 w-4"/>:<Sun className="h-4 w-4"/>}</Button>{onSignOut && <Button variant="ghost" onClick={onSignOut}><LogOut className="h-4 w-4" /> Sair</Button>}</div>
        </div>
        <nav className="mt-5 flex flex-wrap gap-x-5 gap-y-3" aria-label="Seções">
          {([["/painel", "Visão geral", active === "orcamento"], ["/contas-a-pagar", "Contas a pagar", active === "contas"],['/receitas','Receitas',active==='receitas'],['/despesas','Despesas',active==='despesas'],['/contas-fixas','Contas fixas',active==='contas-fixas'],['/metas','Cofrinhos',active==='metas'],['/planejamento','Planejamento',active==='planejamento'],['/calendario','Calendário',active==='calendario'],['/relatorios','Relatórios',active==='relatorios']] as const).map(([to, label, on]) => (
            <Link key={to} to={to} aria-current={on ? "page" : undefined} className={`inline-block border-b-2 pb-2 text-sm font-semibold ${on ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{label}</Link>
          ))}
        </nav>
        {children}
      </div>
    </header>
  );
}
