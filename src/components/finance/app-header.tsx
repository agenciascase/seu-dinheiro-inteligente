import { Link } from "@tanstack/react-router";
import { ChartNoAxesCombined, LayoutDashboard, ReceiptText, LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Tab = "orcamento" | "contas" | "cartoes" | "patrimonio";

export function AppHeader({ active, onSignOut, children }: { active: Tab; onSignOut?: () => void; children?: ReactNode }) {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  function toggleTheme() { const next = !dark; setDark(next); document.documentElement.classList.toggle("dark", next); }
  return (
    <header className="border-b bg-card">
      <div className="mx-auto max-w-[1160px] px-4 pt-5 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link to="/contas-a-pagar" className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><ChartNoAxesCombined className="h-5 w-5" /></span>
            <span className="leading-tight">
              <span className="block text-base font-bold sm:text-lg">Meu Organizador</span>
            </span>
          </Link>
          <div className="flex gap-1"><Button variant="ghost" size="icon" aria-label={dark ? "Modo claro" : "Modo escuro"} title={dark ? "Modo claro" : "Modo escuro"} onClick={toggleTheme}>{dark ? <Sun /> : <Moon />}</Button>{onSignOut && <Button variant="ghost" onClick={onSignOut}><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sair</span></Button>}</div>
        </div>
        <nav className="mt-5 flex gap-6" aria-label="Seções">
          {([["/painel", "Visão geral", active !== "contas"], ["/contas-a-pagar", "Contas a pagar", active === "contas"]] as const).map(([to, label, on]) => (
            <Link key={to} to={to} aria-current={on ? "page" : undefined} className={`flex items-center gap-2 border-b-2 pb-4 text-sm font-semibold ${on ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{to === "/painel" ? <LayoutDashboard className="h-4 w-4" /> : <ReceiptText className="h-4 w-4" />}{label}</Link>
          ))}
        </nav>
        {children}
      </div>
    </header>
  );
}
