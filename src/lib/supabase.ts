import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ywzmphlsvfxamjcqwvvs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3em1waGxzdmZ4YW1qY3F3dnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzE2NzcsImV4cCI6MjA5MjcwNzY3N30.nMSrOLgugu2LptApTVaZYL3Or9y1tHo-jNap8DoCiqQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
