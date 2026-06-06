import 'server-only';

import { redirect } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export type CurrentAdminUser = {
  id: string;
  email: string;
  role: string;
};

type AuthState =
  | { kind: 'anonymous' }
  | { kind: 'authenticated'; user: CurrentAdminUser | null };

const ADMIN_ROLE = 'admin';

export async function getCurrentUser() {
  const authState = await getCurrentAuthState();

  if (authState.kind !== 'authenticated') {
    return null;
  }

  return authState.user;
}

async function getCurrentAuthState(): Promise<AuthState> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { kind: 'anonymous' };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { kind: 'anonymous' };
  }

  const role = typeof user.app_metadata?.role === 'string' ? user.app_metadata.role : null;

  if (!role) {
    return { kind: 'authenticated', user: null };
  }

  return {
    kind: 'authenticated',
    user: {
      id: user.id,
      email: user.email,
      role
    } satisfies CurrentAdminUser
  };
}

export async function requireAdminUser() {
  const authState = await getCurrentAuthState();

  if (authState.kind === 'anonymous') {
    redirect('/login');
  }

  const user = authState.user;

  if (!user) {
    redirect('/login?reason=admin-access');
  }

  if (user.role !== ADMIN_ROLE) {
    redirect('/login?reason=admin-access');
  }

  return user;
}

export async function getApiAdminUser() {
  const user = await getCurrentUser();

  if (!user || user.role !== ADMIN_ROLE) {
    return null;
  }

  return user;
}