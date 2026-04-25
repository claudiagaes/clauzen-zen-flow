import { useRef, useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import type { Expense } from "@/lib/data";
import { cn } from "@/lib/utils";

type ChatMsg = { role: "user" | "assistant"; content: string };

interface Props {
  expenses: Expense[];
  currency: string;
}

const SUGGESTIONS = [
  "Why did I spend so much in October?",
  "What were my top 3 expenses last month?",
  "How much did I spend on food this year?",
  "Break down my Vietnam trip costs",
];

export function ExpenseChat({ expenses, currency }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const lite = expenses.map((e) => ({
        date: e.date,
        description: e.description,
        total_amount: e.total_amount,
        currency: e.currency,
        category: e.category,
        event_tag: e.event_tag,
        paid_by: e.paid_by,
      }));

      const { data, error } = await supabase.functions.invoke("expense-chat", {
        body: { messages: next, expenses: lite, currency },
      });

      if (error) {
        const status = (error as { context?: { status?: number } }).context?.status;
        let msg = "Something went wrong. Try again?";
        if (status === 429) msg = "Too many questions in a row — give it a moment 🌿";
        if (status === 402) msg = "AI credits ran out. Add funds in your Lovable AI workspace.";
        setMessages([...next, { role: "assistant", content: msg }]);
      } else {
        setMessages([...next, { role: "assistant", content: data?.reply ?? "..." }]);
      }
    } catch (e) {
      setMessages([
        ...next,
        { role: "assistant", content: "Network hiccup — please try that again." },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  };

  return (
    <Card className="rounded-3xl border-0 shadow-soft p-6 bg-card">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl">Ask about your spending</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Questions answered using only the {currency} expenses currently in scope ({expenses.length} rows).
      </p>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs px-3 py-1.5 rounded-2xl bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div
          ref={scrollRef}
          className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-1"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "rounded-2xl px-4 py-3 text-sm",
                m.role === "user"
                  ? "bg-primary text-primary-foreground ml-8"
                  : "bg-secondary text-foreground mr-8",
              )}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-foreground">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          ))}
          {loading && (
            <div className="bg-secondary rounded-2xl px-4 py-3 mr-8 text-sm text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              thinking…
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Why did I have $5,443 in October?"
          disabled={loading}
          className="rounded-2xl"
        />
        <Button
          type="submit"
          size="icon"
          disabled={loading || !input.trim()}
          className="rounded-2xl shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </Card>
  );
}
