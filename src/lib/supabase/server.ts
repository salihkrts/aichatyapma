import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

const isValidUrl = (url?: string) => url && (url.startsWith("https://") || url.startsWith("http://"));

const getSafeUrl = () =>
  isValidUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
    ? process.env.NEXT_PUBLIC_SUPABASE_URL!
    : "https://placeholder-nexus.supabase.co";

const getSafeAnonKey = () =>
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "your_supabase_anon_key_here"
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

const getSafeServiceRoleKey = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY !== "your_supabase_service_role_key_here"
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSafeUrl(), getSafeAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignored in Server Component context
        }
      },
    },
  });
}

export async function createServiceRoleClient() {
  const { createClient } = await import("@supabase/supabase-js");

  return createClient<Database>(getSafeUrl(), getSafeServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
