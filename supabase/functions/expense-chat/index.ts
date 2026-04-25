// Edge function: ask natural-language questions about the user's expenses.
// The client sends the (already-filtered) expense rows + chat history.
// We send them, plus a tight system prompt, to Lovable AI Gateway and stream the answer back.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExpenseLite {
  date: string;
  description: string;
  total_amount: number;
  currency: string;
  category: string;
  event_tag: string | null;
  paid_by: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, expenses, currency } = await req.json() as {
      messages: { role: "user" | "assistant"; content: string }[];
      expenses: ExpenseLite[];
      currency: string;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Compress: send a compact CSV-ish ledger to keep context small.
    const ledger = expenses
      .map(
        (e) =>
          `${e.date.slice(0, 10)} | ${e.currency} ${e.total_amount.toFixed(2)} | ${e.category} | ${e.event_tag ?? "Daily Life"} | paid_by=${e.paid_by} | ${e.description}`,
      )
      .join("\n");

    const totalRows = expenses.length;
    const totalAmount = expenses.reduce((a, e) => a + e.total_amount, 0);

    const systemPrompt = `You are a friendly personal-finance assistant analyzing the user's expense ledger.

CURRENT FILTER: currency = ${currency}. ${totalRows} expenses, total ${currency} ${totalAmount.toFixed(2)}.

Each line of the ledger below is one expense:
DATE | CURRENCY AMOUNT | CATEGORY | EVENT_TAG | paid_by=PERSON | DESCRIPTION

LEDGER:
${ledger || "(no expenses match the current filter)"}

Rules:
- Answer the user's question using ONLY the ledger above. Don't invent numbers.
- Always show amounts in ${currency} with the symbol or code.
- When the user asks about a month/period, list the relevant expenses (date + description + amount) and the total.
- Keep answers short and use markdown (lists, **bold**) for clarity. Use emojis sparingly.
- If the ledger has no matching data, say so plainly.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit hit — try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Lovable AI workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("expense-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
