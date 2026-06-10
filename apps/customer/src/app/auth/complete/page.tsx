"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

type CallbackState =
  | { status: "working"; message: string }
  | { status: "error"; message: string }
  | { status: "open-in-app"; next: string };

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

    const isStandalone =
      globalThis.window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in globalThis.window.navigator &&
        (globalThis.window.navigator as { standalone?: boolean }).standalone === true);

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
        isStandalone,
      });

      if (isStandalone) {
        router.replace(next);
      } else {
        setState({ status: "open-in-app", next });
      }
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

  if (state.status === "open-in-app") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-white px-6 text-center text-[#3A2A1F]">
        <p className="text-[24px] font-semibold leading-none tracking-[-0.02em]">numnums</p>
        <div className="space-y-2">
          <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.02em]">You&apos;re signed in</h1>
          <p className="text-[16px] leading-[1.3] text-[#6F5B4B]">Open the app from your home screen to continue.</p>
        </div>
        <a
          href={state.next}
          className="mt-2 inline-flex h-14 items-center rounded-full bg-[#7CB342] px-8 text-[18px] font-semibold text-white shadow-[0_4px_0_rgba(58,42,31,0.08)] active:bg-[#558B2F]"
        >
          Open the app
        </a>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-white px-6 text-center text-[#3A2A1F]">
        <p className="text-[24px] font-semibold leading-none tracking-[-0.02em]">numnums</p>
        <div className="space-y-2">
          <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.02em]">Sign in failed</h1>
          <p className="text-[16px] leading-[1.3] text-[#6F5B4B]">{state.message}</p>
        </div>
        <a
          href="/"
          className="mt-2 inline-flex h-14 items-center rounded-full bg-[#3A2A1F] px-8 text-[18px] font-semibold text-white shadow-[0_4px_0_rgba(58,42,31,0.08)] active:bg-[#5C4A3A]"
        >
          Back to sign in
        </a>
      </main>
    );
  }

  return <LoadingScreen title="Signing you in" message={state.message} />;
}

export default function AuthCompletePage() {
  return (
    <Suspense>
      <AuthCompleteInner />
    </Suspense>
  );
}