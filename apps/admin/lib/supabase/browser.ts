'use client';

import { createBrowserClient } from '@supabase/ssr';

import { getSupabasePublicEnv } from '@/lib/env';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabaseClient() {
  if (browserClient) {
    return browserClient;
  }

  const env = getSupabasePublicEnv();

  if (!env) {
    throw new Error('Supabase public environment variables are not configured.');
  }

  browserClient = createBrowserClient(env.url, env.publishableKey);
  return browserClient;
}