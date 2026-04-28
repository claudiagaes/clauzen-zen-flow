import { createClient } from "@supabase/supabase-js";
const sb = createClient("https://ywzmphlsvfxamjcqwvvs.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3em1waGxzdmZ4YW1qY3F3dnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzE2NzcsImV4cCI6MjA5MjcwNzY3N30.nMSrOLgugu2LptApTVaZYL3Or9y1tHo-jNap8DoCiqQ");
const names = ["nadia","rachel","lillie","lily"];
const { data: splits, error: se } = await sb.from("expense_splits").select("*");
console.log("splits err:", se, "count:", splits?.length);
const matched = splits?.filter(s => names.some(n => s.person_name?.toLowerCase().includes(n))) ?? [];
console.log("matching splits:", JSON.stringify(matched, null, 2));
const ids = [...new Set(matched.map(s => s.expense_id))];
if (ids.length) {
  const { data: exps } = await sb.from("expenses").select("*").in("id", ids);
  console.log("related expenses:", JSON.stringify(exps, null, 2));
}
const { data: recent } = await sb.from("expenses").select("id,date,description,paid_by,total_amount,is_shared,notes,created_at").order("created_at",{ascending:false}).limit(10);
console.log("recent expenses:", JSON.stringify(recent, null, 2));
