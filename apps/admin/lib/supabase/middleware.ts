import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { getSupabasePublicEnv } from '@/lib/env';

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export function createMiddlewareSupabaseClient(request: NextRequest) {
  const env = getSupabasePublicEnv();

  if (!env) {
    return null;
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        response = NextResponse.next({
          request: {
            headers: request.headers
          }
        });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      }
    }
  });

  return { response, supabase };
}