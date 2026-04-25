// Edge function: ask natural-language questions about the user's expenses.
// The client sends the (already-filtered) expense rows + chat history.
// We send them, plus a tight system prompt, to Lovable AI Gateway and stream the answer back.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExpenseLite {
  date: string;
  description: string;
  my_amount: number;
  total_amount: number;
  currency: string;
  category: string;
  event_tag: string | null;
  paid_by: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, expenses, currency, truncated } = body as {
      messages: { role: "user" | "assistant"; content: string }[];
      expenses: ExpenseLite[];
      currency: string;
      truncated?: boolean;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY missing in edge function env");
      return new Response(JSON.stringify({ error: "AI not configured (missing key)" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[expense-chat] msgs=${messages.length} expenses=${expenses?.length ?? 0} currency=${currency}`);

    // Compress: send a compact CSV-ish ledger to keep context small.
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    const ledger = safeExpenses
      .map((e) => {
        const my = Number(e.my_amount ?? e.total_amount);
        const tot = Number(e.total_amount);
        const shared = Math.abs(my - tot) > 0.005;
        const amountField = shared
          ? `${e.currency} ${my.toFixed(2)} (of ${tot.toFixed(2)} total)`
          : `${e.currency} ${my.toFixed(2)}`;
        return `${(e.date ?? "").slice(0, 10)} | ${amountField} | ${e.category} | ${e.event_tag ?? "Daily Life"} | paid_by=${e.paid_by} | ${e.description}`;
      })
      .join("\n");

    const totalRows = safeExpenses.length;
    const totalAmount = safeExpenses.reduce(
      (a, e) => a + Number(e.my_amount ?? e.total_amount ?? 0),
      0,
    );

    const systemPrompt = `You are a friendly personal-finance assistant analyzing the user's expense ledger.

CURRENT FILTER: currency = ${currency}. ${totalRows} expenses${truncated ? " (truncated to most recent 250)" : ""}, the user's share totals ${currency} ${totalAmount.toFixed(2)}.

Each line of the ledger below is one expense. The amount shown is the USER'S PERSONAL SHARE; for shared expenses, the full bill is in parentheses for context:
DATE | CURRENCY MY_SHARE [(of FULL_TOTAL)] | CATEGORY | EVENT_TAG | paid_by=PERSON | DESCRIPTION

LEDGER:
${ledger || "(no expenses match the current filter)"}

Rules:
- Answer the user's question using ONLY the ledger above. Don't invent numbers.
- All totals, sums, and averages must use the user's personal share — NOT the full bill.
- Always show amounts in ${currency} with the symbol or code.
- When the user asks about a month/period, list the relevant expenses (date + description + their share) and the total share.
- Keep answers short and use markdown (lists, **bold**) for clarity. Use emojis sparingly.
- If the ledger has no matching data, say so plainly.`;

    let response: Response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
        }),
      });
    } catch (fetchErr) {
      console.error("[expense-chat] gateway fetch threw:", fetchErr);
      return new Response(
        JSON.stringify({ error: `Couldn't reach AI gateway: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!response.ok) {
      const t = await response.text().catch(() => "");
      console.error(`[expense-chat] gateway ${response.status}:`, t);
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
      return new Response(
        JSON.stringify({ error: `AI gateway error (${response.status}): ${t.slice(0, 300)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content ?? "I couldn't come up with an answer.";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("expense-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
