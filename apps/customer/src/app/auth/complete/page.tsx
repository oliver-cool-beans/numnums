"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

type CallbackState =
  | { status: "working"; message: string }
  | { status: "error"; message: string };

function AuthCompleteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<CallbackState>({
    status: "working",
    message: "Completing login...",
  });

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

    const next = searchParams.get("next") || "/dashboard";
    const code = searchParams.get("code");
    const authError = searchParams.get("error");
    const authErrorDescription = searchParams.get("error_description");

    const redirectToNext = (reason: string, userId: string | null) => {
      if (cancelled) {
        return;
      }

      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }

      console.info("[customer-auth-callback] Redirecting after callback", {
        reason,
        next,
        userId,
      });

      router.replace(next);
    };

    const checkCurrentSession = async (reason: string) => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("[customer-auth-callback] Session lookup failed", {
          reason,
          sessionError,
        });
        return false;
      }

      console.info("[customer-auth-callback] Session lookup completed", {
        reason,
        hasSession: Boolean(session),
        userId: session?.user?.id ?? null,
        next,
      });

      if (session?.user) {
        redirectToNext(reason, session.user.id);
        return true;
      }

      return false;
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.info("[customer-auth-callback] Auth event observed on callback page", {
        event,
        hasSession: Boolean(session),
        userId: session?.user?.id ?? null,
        pathname: globalThis.window.location.pathname,
      });

      if (session?.user) {
        redirectToNext(`auth event: ${event}`, session.user.id);
      }
    });

    const finishLogin = async () => {
      console.info("[customer-auth-callback] Callback page loaded", {
        href: globalThis.window.location.href,
        next,
        hasCode: Boolean(code),
        authError,
        authErrorDescription,
      });

      if (authError) {
        console.error("[customer-auth-callback] OAuth provider returned an error", {
          authError,
          authErrorDescription,
        });

        if (!cancelled) {
          setState({
            status: "error",
            message: authErrorDescription || authError,
          });
        }
        return;
      }

      if (await checkCurrentSession("initial callback load")) {
        return;
      }

      if (!code) {
        console.warn("[customer-auth-callback] Missing code in callback URL and no session was found");

        if (!cancelled) {
          setState({
            status: "error",
            message: "Missing OAuth code in callback URL.",
          });
        }
        return;
      }

      console.info("[customer-auth-callback] Waiting for browser PKCE session detection", {
        next,
        codeLength: code.length,
      });

      timeoutId = globalThis.setTimeout(() => {
        void (async () => {
          console.warn("[customer-auth-callback] Session was not ready after waiting, rechecking");

          if (await checkCurrentSession("timeout recheck")) {
          return;
        }

          if (!cancelled) {
            console.error("[customer-auth-callback] Timed out waiting for browser PKCE session detection");
            setState({
              status: "error",
              message: "Login completed with the provider, but the app session was not established.",
            });
          }
        })();
      }, 5000);
    };

    void finishLogin();

    return () => {
      cancelled = true;

      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }

      subscription?.unsubscribe();
    };
  }, [router, searchParams]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col overflow-hidden bg-white px-4 pb-4 pt-3 text-[#3A2A1F] md:max-w-[480px]">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-[28px] font-semibold leading-none tracking-[-0.02em]">numnums</p>
        <div className="space-y-2">
          <h1 className="text-[32px] font-semibold leading-[1] tracking-[-0.03em]">
            {state.status === "working" ? "Signing you in" : "Login failed"}
          </h1>
          <p className="max-w-[280px] text-[18px] leading-[1.2] text-[#6F5B4B]">{state.message}</p>
        </div>
      </div>
    </main>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense>
      <AuthCompleteInner />
    </Suspense>
  );
}