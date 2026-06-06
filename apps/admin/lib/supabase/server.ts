import 'server-only';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getSupabasePublicEnv } from '@/lib/env';

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function createServerSupabaseClient() {
  const env = getSupabasePublicEnv();

  if (!env) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can read cookies but cannot persist refreshed auth cookies.
          // Middleware handles the writable refresh path for normal requests.
        }
      }
    }
  });
}