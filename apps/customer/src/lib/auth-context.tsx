"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { supabase } from "./supabase-client";

const AUTH_LOG_PREFIX = "[customer-auth]";

function logAuth(message: string, details?: Record<string, unknown>) {
  if (details) {
    console.info(`${AUTH_LOG_PREFIX} ${message}`, details);
    return;
  }

  console.info(`${AUTH_LOG_PREFIX} ${message}`);
}

function logAuthError(message: string, error: unknown) {
  console.error(`${AUTH_LOG_PREFIX} ${message}`, error);
}

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const syncUserProfile = async (
    sessionUser: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    },
    source: "initialization" | "auth change"
  ) => {
    const fallbackName =
      typeof sessionUser.user_metadata?.name === "string"
        ? sessionUser.user_metadata.name
        : null;

    try {
      const { data: userData, error: profileError } = await supabase
        .from("users")
        .select("id, name")
        .eq("id", sessionUser.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      logAuth(`Loaded user profile after ${source}`, {
        userId: sessionUser.id,
        foundProfile: Boolean(userData),
      });

      setUser(
        userData
          ? {
              id: userData.id,
              email: sessionUser.email || "",
              name: userData.name ?? fallbackName,
            }
          : {
              id: sessionUser.id,
              email: sessionUser.email || "",
              name: fallbackName,
            }
      );
    } catch (profileError) {
      logAuthError(`Profile lookup failed during ${source}, using auth user fallback`, profileError);
      setUser({
        id: sessionUser.id,
        email: sessionUser.email || "",
        name: fallbackName,
      });
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        logAuth("Initializing auth state", {
          pathname: globalThis.window?.location.pathname ?? null,
          href: globalThis.window?.location.href ?? null,
        });

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        logAuth("Initial session lookup finished", {
          hasSession: Boolean(session),
          userId: session?.user?.id ?? null,
          userEmail: session?.user?.email ?? null,
        });

        if (session?.user && isMounted) {
          await syncUserProfile(session.user, "initialization");
        } else if (isMounted) {
          logAuth("No authenticated user found during initialization");
          setUser(null);
        }
      } catch (err) {
        if (isMounted) {
          logAuthError("Initial auth state load failed", err);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          logAuth("Initial auth load complete");
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      logAuth("Auth state change received", {
        event,
        hasSession: Boolean(session),
        userId: session?.user?.id ?? null,
        userEmail: session?.user?.email ?? null,
        pathname: globalThis.window?.location.pathname ?? null,
      });

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          name:
            typeof session.user.user_metadata?.name === "string"
              ? session.user.user_metadata.name
              : null,
        });

        logAuth("Applied immediate auth user fallback while profile sync runs", {
          userId: session.user.id,
          event,
        });

        void syncUserProfile(session.user, "auth change");
      } else if (event === "SIGNED_OUT") {
        logAuth("Clearing user after sign out event");
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    logAuth("Sign out requested");
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      logAuthError("Sign out failed", signOutError);
    }
  };

  const value = useMemo(
    () => ({ user, loading, error, signOut }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading, error]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
