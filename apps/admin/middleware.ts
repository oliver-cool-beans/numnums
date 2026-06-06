import { NextResponse, type NextRequest } from 'next/server';

import { getSupabasePublicEnv } from '@/lib/env';
import { createMiddlewareSupabaseClient } from '@/lib/supabase/middleware';

const publicRoutes = ['/login'];

function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  if (!getSupabasePublicEnv()) {
    return NextResponse.next();
  }

  const middlewareClient = createMiddlewareSupabaseClient(request);

  if (!middlewareClient) {
    return NextResponse.next();
  }

  const { response, supabase } = middlewareClient;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
