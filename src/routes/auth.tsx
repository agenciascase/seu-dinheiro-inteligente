import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PiggyBank } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Meu Organizador" },
      { name: "description", content: "Entre ou crie sua conta no Meu Organizador." },
      { property: "og:title", content: "Entrar — Meu Organizador" },
      { property: "og:description", content: "Acesse seu organizador financeiro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/painel", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/painel" },
        });
        if (error) throw error;
        toast.success("Conta criada! Confira seu e-mail para confirmar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Algo deu errado");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) toast.error("Não foi possível entrar com Google");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-8 shadow-soft">
        <Link to="/" className="flex items-center gap-2 font-display text-xl text-primary">
          <PiggyBank className="h-6 w-6" /> Meu Organizador
        </Link>
        <h1 className="mt-6 text-3xl font-bold">{mode === "in" ? "Bem-vindo de volta" : "Crie sua conta"}</h1>
        <Button variant="outline" className="mt-6 w-full" onClick={google}>
          Continuar com Google
        </Button>
        <div className="my-5 text-center text-xs uppercase tracking-wider text-muted-foreground">ou</div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw">Senha</Label>
            <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {mode === "in" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        <button
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>
      </div>
    </main>
  );
}
