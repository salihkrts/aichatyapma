import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

const isValidUrl = (url?: string) => url && (url.startsWith("https://") || url.startsWith("http://"));

export function createClient() {
  const supabaseUrl = isValidUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
    ? process.env.NEXT_PUBLIC_SUPABASE_URL!
    : "https://placeholder-nexus.supabase.co";

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "your_supabase_anon_key_here"
      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
