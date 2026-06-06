import 'server-only';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSetupErrorMessage, isSetupBlockingError, type DataListResult } from '@/server/db/runtime';
import type { AdminUserSummary, UserRow } from '@/server/db/types';

function mapUser(row: UserRow, authRole: string | null): AdminUserSummary {
  return {
    id: row.id,
    name: row.name,
    authRole,
    plan: row.plan,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at
  };
}

export async function listUsers(limit = 25): Promise<DataListResult<AdminUserSummary>> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { status: 'env-missing', items: [], errorMessage: null };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'ready', items: [], errorMessage: null };
  }

  const authRole = typeof user.app_metadata?.role === 'string' ? user.app_metadata.role : null;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, plan, created_at, updated_at, last_seen_at')
      .eq('id', user.id)
      .limit(limit)
      .returns<UserRow[]>();

    if (error) {
      throw error;
    }

    return {
      status: 'ready',
      items: (data ?? []).map((row) => mapUser(row, authRole)),
      errorMessage: null
    };
  } catch (error) {
    if (!isSetupBlockingError(error)) {
      throw error;
    }

    return {
      status: 'schema-pending',
      items: [],
      errorMessage: getSetupErrorMessage(error)
    };
  }
}