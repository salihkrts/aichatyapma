"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores";
import type { Profile } from "@/types/database";

/**
 * Hook to sync Supabase auth state with Zustand store.
 * Place in a client component that wraps authenticated pages.
 */
export function useAuthSync() {
  const { setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    const initAuth = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        setProfile(profile as Profile | null);
      } else {
        setProfile(null);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        setProfile(profile as Profile | null);
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setProfile, setLoading]);
}

/**
 * Hook to get the current authenticated user profile.
 */
export function useProfile() {
  const { profile, isLoading } = useAuthStore();
  return { profile, isLoading };
}

/**
 * Hook to require authentication. Redirects to login if not authenticated.
 */
export function useRequireAuth() {
  const { profile, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !profile) {
      window.location.href = "/login";
    }
  }, [profile, isLoading]);

  return { profile, isLoading };
}
