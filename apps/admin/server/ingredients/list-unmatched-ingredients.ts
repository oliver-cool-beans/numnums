import 'server-only';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSetupErrorMessage, isSetupBlockingError, type DataListResult } from '@/server/db/runtime';
import type { IngredientReviewGroupItem } from '@/server/db/types';

type UnmatchedIngredientRow = {
  id: string;
  source: string;
  handle: string;
  updated_at: string;
  is_pantry: boolean;
  recipe_ingredient_links: Array<{ id: string }> | null;
  ingredient_product_links: Array<Record<string, never>> | null;
};

type UnmatchedIngredientQueryOptions = {
  page: number;
  pageSize: number;
};

export type IngredientReviewQueueSnapshot = {
  status: 'ready' | 'env-missing' | 'schema-pending';
  errorMessage: string | null;
  items: IngredientReviewGroupItem[];
  outstandingCount: number;
  pendingRowCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

const DEFAULT_UNMATCHED_INGREDIENTS_PAGE_SIZE = 25;

function resolvePageNumber(value: number | null | undefined) {
  if (!Number.isFinite(value) || !value || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

function mapQueueGroup(row: UnmatchedIngredientRow): IngredientReviewGroupItem {
  return {
    source: row.source,
    handle: row.handle,
    rawName: row.handle,
    rawNames: [row.handle],
    pendingCount: row.recipe_ingredient_links?.length ?? 0,
    updatedAt: row.updated_at
  };
}

async function getRecentUnmatchedIngredientGroups(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  options: UnmatchedIngredientQueryOptions
) {
  const from = (options.page - 1) * options.pageSize;
  const to = from + options.pageSize;
  const { data, error } = await supabase
    .from('ingredients')
    .select('id, source, handle, updated_at, is_pantry, recipe_ingredient_links(id), ingredient_product_links()')
    .eq('is_pantry', false)
    .is('ingredient_product_links', null)
    .order('updated_at', { ascending: false })
    .range(from, to)
    .returns<UnmatchedIngredientRow[]>();

  if (error) {
    throw error;
  }

  const rows = Array.isArray(data) ? data : [];

  return rows.map(mapQueueGroup);
}

export async function listUnmatchedIngredients(
  page = 1,
  pageSize = DEFAULT_UNMATCHED_INGREDIENTS_PAGE_SIZE
): Promise<DataListResult<IngredientReviewGroupItem>> {
  const snapshot = await getIngredientReviewQueueSnapshot(page, pageSize);

  return {
    status: snapshot.status,
    items: snapshot.items,
    errorMessage: snapshot.errorMessage
  };
}

export async function getDerivedUnmatchedIngredientGroups(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  options: UnmatchedIngredientQueryOptions
) {
  return getRecentUnmatchedIngredientGroups(supabase, options);
}

export async function getIngredientReviewQueueCount() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return 0;
  }

  const { count, error } = await supabase
    .from('ingredients')
    .select('id, is_pantry, ingredient_product_links()', {
      count: 'exact',
      head: true
    })
    .eq('is_pantry', false)
    .is('ingredient_product_links', null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getIngredientReviewQueueSnapshot(
  page = 1,
  pageSize = DEFAULT_UNMATCHED_INGREDIENTS_PAGE_SIZE
): Promise<IngredientReviewQueueSnapshot> {
  const supabase = await createServerSupabaseClient();
  const resolvedPage = resolvePageNumber(page);
  const resolvedPageSize = resolvePageNumber(pageSize);

  if (!supabase) {
    return {
      status: 'env-missing',
      errorMessage: null,
      items: [],
      outstandingCount: 0,
      pendingRowCount: 0,
      page: resolvedPage,
      pageSize: resolvedPageSize,
      hasNextPage: false,
      hasPreviousPage: resolvedPage > 1
    };
  }

  try {
    const groupedItems = await getDerivedUnmatchedIngredientGroups(supabase, {
      page: resolvedPage,
      pageSize: resolvedPageSize
    });
    const visibleItems = groupedItems.slice(0, resolvedPageSize);
    const pendingRowCount = groupedItems.reduce<number>(
      (total, item) => total + item.pendingCount,
      0
    );

    return {
      status: 'ready',
      errorMessage: null,
      items: visibleItems,
      outstandingCount: visibleItems.length,
      pendingRowCount,
      page: resolvedPage,
      pageSize: resolvedPageSize,
      hasNextPage: groupedItems.length > resolvedPageSize,
      hasPreviousPage: resolvedPage > 1
    };
  } catch (error) {
    if (!isSetupBlockingError(error)) {
      throw error;
    }

    return {
      status: 'schema-pending',
      errorMessage: getSetupErrorMessage(error),
      items: [],
      outstandingCount: 0,
      pendingRowCount: 0,
      page: resolvedPage,
      pageSize: resolvedPageSize,
      hasNextPage: false,
      hasPreviousPage: resolvedPage > 1
    };
  }
}