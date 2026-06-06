import 'server-only';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ImportRunRow, ImportRunSummary } from '@/server/db/types';
import { getSetupErrorMessage, isSetupBlockingError, type DataStatus } from '@/server/db/runtime';
import { getIngredientReviewQueueCount } from '@/server/ingredients/list-unmatched-ingredients';

export type DashboardOverviewStats = {
  status: DataStatus;
  errorMessage: string | null;
  counts: {
    products: number;
    recipes: number;
    users: number;
    activeUsers: number;
    ingredientsNeedingMatching: number;
    pendingReviewRows: number;
  };
  latestImportsByType: {
    products: ImportRunSummary | null;
    recipes: ImportRunSummary | null;
  };
};

export type ImportsPageData = {
  status: DataStatus;
  errorMessage: string | null;
  latestImports: ImportRunSummary[];
  latestImportsByType: {
    products: ImportRunSummary | null;
    recipes: ImportRunSummary | null;
  };
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

const DEFAULT_IMPORT_RUNS_PAGE_SIZE = 8;

function resolvePageNumber(value: number | null | undefined) {
  if (!Number.isFinite(value) || !value || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

async function getTableCount(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  table: string
) {
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

function mapImportRun(row: ImportRunRow): ImportRunSummary {
  return {
    id: row.id,
    importType: row.import_type,
    status: row.status,
    recordsSeen: row.records_seen,
    recordsInserted: row.records_inserted,
    recordsUpdated: row.records_updated,
    errorMessage: row.error_message,
    completedAt: row.completed_at
  };
}

async function getLatestImportRunsByType(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>
) {
  const [latestProductImport, latestRecipeImport] = await Promise.all([
    supabase
      .from('import_runs')
      .select('id, import_type, status, records_seen, records_inserted, records_updated, error_message, started_at, completed_at')
      .eq('import_type', 'aldi_products')
      .order('started_at', { ascending: false })
      .limit(1)
      .returns<ImportRunRow[]>(),
    supabase
      .from('import_runs')
      .select('id, import_type, status, records_seen, records_inserted, records_updated, error_message, started_at, completed_at')
      .eq('import_type', 'everyplate_recipes')
      .order('started_at', { ascending: false })
      .limit(1)
      .returns<ImportRunRow[]>()
  ]);

  if (latestProductImport.error) {
    throw latestProductImport.error;
  }

  if (latestRecipeImport.error) {
    throw latestRecipeImport.error;
  }

  return {
    products: latestProductImport.data?.[0] ? mapImportRun(latestProductImport.data[0]) : null,
    recipes: latestRecipeImport.data?.[0] ? mapImportRun(latestRecipeImport.data[0]) : null
  };
}

export async function getDashboardOverviewStats(): Promise<DashboardOverviewStats> {
  const supabase = await createServerSupabaseClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  if (!supabase) {
    return {
      status: 'env-missing',
      errorMessage: null,
      counts: {
        products: 0,
        recipes: 0,
        users: 0,
        activeUsers: 0,
        ingredientsNeedingMatching: 0,
        pendingReviewRows: 0
      },
      latestImportsByType: {
        products: null,
        recipes: null
      }
    };
  }

  try {
    const [products, recipes, users, ingredientsNeedingMatching, activeUsersResult, latestImportsByType] = await Promise.all([
      getTableCount(supabase, 'products'),
      getTableCount(supabase, 'recipes'),
      getTableCount(supabase, 'users'),
      getIngredientReviewQueueCount(),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('last_seen_at', thirtyDaysAgo),
      getLatestImportRunsByType(supabase)
    ]);

    if (activeUsersResult.error) {
      throw activeUsersResult.error;
    }

    return {
      status: 'ready',
      errorMessage: null,
      counts: {
        products: products ?? 0,
        recipes: recipes ?? 0,
        users: users ?? 0,
        activeUsers: activeUsersResult.count ?? 0,
        ingredientsNeedingMatching: ingredientsNeedingMatching ?? 0,
        pendingReviewRows: 0
      },
      latestImportsByType
    };
  } catch (error) {
    if (!isSetupBlockingError(error)) {
      throw error;
    }

    return {
      status: 'schema-pending',
      errorMessage: getSetupErrorMessage(error),
      counts: {
        products: 0,
        recipes: 0,
        users: 0,
        activeUsers: 0,
        ingredientsNeedingMatching: 0,
        pendingReviewRows: 0
      },
      latestImportsByType: {
        products: null,
        recipes: null
      }
    };
  }
}

export async function getImportsPageData(page?: number | null): Promise<ImportsPageData> {
  const supabase = await createServerSupabaseClient();
  const resolvedPage = resolvePageNumber(page);
  const from = (resolvedPage - 1) * DEFAULT_IMPORT_RUNS_PAGE_SIZE;
  const to = from + DEFAULT_IMPORT_RUNS_PAGE_SIZE;

  if (!supabase) {
    return {
      status: 'env-missing',
      errorMessage: null,
      latestImports: [],
      latestImportsByType: {
        products: null,
        recipes: null
      },
      page: resolvedPage,
      pageSize: DEFAULT_IMPORT_RUNS_PAGE_SIZE,
      hasNextPage: false,
      hasPreviousPage: resolvedPage > 1
    };
  }

  try {
    const [latestImportsByType, importRunsResult] = await Promise.all([
      getLatestImportRunsByType(supabase),
      supabase
        .from('import_runs')
        .select(
          'id, import_type, status, records_seen, records_inserted, records_updated, error_message, started_at, completed_at'
        )
        .order('started_at', { ascending: false })
        .range(from, to)
        .returns<ImportRunRow[]>()
    ]);

    if (importRunsResult.error) {
      throw importRunsResult.error;
    }

    const rawRows = importRunsResult.data ?? [];

    return {
      status: 'ready',
      errorMessage: null,
      latestImports: rawRows.slice(0, DEFAULT_IMPORT_RUNS_PAGE_SIZE).map(mapImportRun),
      latestImportsByType,
      page: resolvedPage,
      pageSize: DEFAULT_IMPORT_RUNS_PAGE_SIZE,
      hasNextPage: rawRows.length > DEFAULT_IMPORT_RUNS_PAGE_SIZE,
      hasPreviousPage: resolvedPage > 1
    };
  } catch (error) {
    if (!isSetupBlockingError(error)) {
      throw error;
    }

    return {
      status: 'schema-pending',
      errorMessage: getSetupErrorMessage(error),
      latestImports: [],
      latestImportsByType: {
        products: null,
        recipes: null
      },
      page: resolvedPage,
      pageSize: DEFAULT_IMPORT_RUNS_PAGE_SIZE,
      hasNextPage: false,
      hasPreviousPage: resolvedPage > 1
    };
  }
}