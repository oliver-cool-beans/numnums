"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const buildFallbackUser = (sessionUser: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    }): CurrentUser => ({
      id: sessionUser.id,
      email: sessionUser.email || "",
      name:
        typeof sessionUser.user_metadata?.name === "string"
          ? sessionUser.user_metadata.name
          : null,
    });

    const hydrateFromProfile = async (sessionUser: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    }) => {
      const fallbackUser = buildFallbackUser(sessionUser);

      try {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id, name")
          .eq("id", sessionUser.id)
          .maybeSingle();

        if (userError) throw userError;

        if (isMounted) {
          setUser(
            userData
              ? {
                  ...fallbackUser,
                  name: userData.name ?? fallbackUser.name,
                }
              : fallbackUser,
          );
        }
      } catch {
        if (isMounted) {
          setUser(fallbackUser);
        }
      }
    };

    const fetchUser = async () => {
      try {
        // First try getUser which requires a valid session
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError && authError.status !== 400) {
          // 400 means no session, which is fine - user is not logged in
          throw authError;
        }

        if (!authUser) {
          if (isMounted) setUser(null);
          return;
        }

        // Fetch additional user data from public.users table if needed
        await hydrateFromProfile(authUser);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    // Subscribe to auth state changes to update user when session changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        if (isMounted) {
          setUser(buildFallbackUser(session.user));
        }

        void hydrateFromProfile(session.user);
      } else if (event === "SIGNED_OUT") {
        if (isMounted) {
          setUser(null);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return { user, loading, error };
}
