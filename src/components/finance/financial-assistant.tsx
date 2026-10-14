import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Send, X, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getAiTips } from "@/lib/insights.functions";
import { PERIOD_LABELS, type Period } from "@/lib/finance";

type Message = { role: "user" | "assistant"; text: string };

export function FinancialAssistant({ period, account }: { period: Period; account: string }) {
  const consult = useServerFn(getAiTips);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const conversation = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = conversation.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, pending, error, open]);

  async function ask() {
    const text = question.trim();
    if (!text || pending) return;
    setMessages(previous => [...previous, { role: "user", text }]);
    setQuestion("");
    setError("");
    setPending(true);
    try {
      const result = await consult({ data: { period, account, question: text } });
      setMessages(previous => [...previous, { role: "assistant", text: result.tips }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não consegui responder agora. Tente novamente.");
      setQuestion(text);
    } finally {
      setPending(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full shadow-md" aria-label="Abrir assessor financeiro" title="Meu assessor financeiro">
          <MessageCircle className="h-6 w-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={12} aria-label="Meu assessor financeiro" className="flex h-[min(560px,calc(100dvh-110px))] w-[min(400px,calc(100vw-40px))] flex-col overflow-hidden p-0">
        <header className="flex shrink-0 items-center gap-3 border-b p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"><MessageCircle className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><h2 className="font-semibold">Meu assessor financeiro</h2><p className="text-xs text-muted-foreground break-words">{PERIOD_LABELS[period]} · {account === "all" ? "Todas as contas" : account}</p></div>
          <Button variant="ghost" size="icon" aria-label="Fechar assessor" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
        </header>
        <div ref={conversation} role="log" aria-label="Conversa com o assessor" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">Olá! O que você gostaria de avaliar nas suas finanças hoje?</p>
          {messages.map((message, index) => (
            <div key={index} className={message.role === "user" ? "ml-6 rounded-md bg-primary p-3 text-primary-foreground" : "mr-2 border-l-2 border-primary pl-3"}>
              <p className="mb-1 text-xs font-semibold">{message.role === "user" ? "Você" : "Assessor"}</p>
              <div className="space-y-2 text-sm leading-relaxed break-words whitespace-pre-wrap">{message.text.split("\n").map((line, i) => <p key={i}>{line.replace(/\*\*/g, "").replace(/^#+\s*/, "")}</p>)}</div>
            </div>
          ))}
          {pending && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> Analisando suas finanças…</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <form className="flex shrink-0 items-end gap-2 border-t p-3" onSubmit={event => { event.preventDefault(); void ask(); }}>
          <Textarea aria-label="Pergunta ao assessor financeiro" placeholder="Escreva sua pergunta…" maxLength={2000} value={question} onChange={event => setQuestion(event.target.value)} className="min-h-20 max-h-32 flex-1 resize-none" />
          <Button type="submit" size="icon" disabled={pending || !question.trim()} aria-label="Enviar pergunta" title="Enviar pergunta"><Send className="h-4 w-4" /></Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}