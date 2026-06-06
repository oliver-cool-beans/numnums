'use client';

import { useMemo, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isSupabasePublicEnvConfigured } from '@/lib/env';
import { getBrowserSupabaseClient } from '@/lib/supabase/browser';

type LoginFormProps = {
  nextPath: string;
  reason: string | null;
};

export function LoginForm({ nextPath, reason }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isConfigured = isSupabasePublicEnvConfigured();
  const accessMessage = useMemo(() => {
    if (reason === 'unauthorized' || reason === 'admin-access') {
      return 'Your account is signed in, but it does not have access to the admin workspace.';
    }

    if (!isConfigured) {
      return 'Login is not available until the authentication configuration is complete.';
    }

    return null;
  }, [isConfigured, reason]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfigured) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const supabase = getBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      globalThis.location.assign(nextPath);
    });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2.5">
        <label className="text-sm font-medium text-slate-800" htmlFor="email">
          Email
        </label>
        <Input
          autoComplete="email"
          className="h-12 rounded-2xl border-slate-200 bg-white px-4 text-base shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-slate-300/30"
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          type="email"
          value={email}
        />
      </div>
      <div className="space-y-2.5">
        <label className="text-sm font-medium text-slate-800" htmlFor="password">
          Password
        </label>
        <Input
          autoComplete="current-password"
          className="h-12 rounded-2xl border-slate-200 bg-white px-4 text-base shadow-sm transition-colors focus-visible:border-slate-300 focus-visible:ring-slate-300/30"
          id="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          type="password"
          value={password}
        />
      </div>
      {accessMessage ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 shadow-sm">
          {accessMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700 shadow-sm">
          {errorMessage}
        </p>
      ) : null}
      <Button
        className="h-12 w-full rounded-2xl bg-slate-900 text-sm font-medium text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition-colors hover:bg-slate-800"
        disabled={!isConfigured || isPending}
        loading={isPending}
        loadingText="Signing in..."
        type="submit"
      >
        Sign in
      </Button>
    </form>
  );
}