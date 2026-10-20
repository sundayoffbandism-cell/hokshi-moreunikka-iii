import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// NEXT_PUBLIC_ 변수는 빌드 시점에 치환되므로 이렇게 직접 참조해야 합니다.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
