import 'server-only';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSetupErrorMessage, isSetupBlockingError, type DataStatus } from '@/server/db/runtime';
import type {
  IngredientRow,
  IngredientLinkSummary,
  IngredientProductLinkRow,
  ProductRow
} from '@/server/db/types';
import { mapProduct, PRODUCT_SUMMARY_SELECT } from '@/server/products/list-products';

type IngredientLinkFilters = {
  page?: number | null;
  pageSize?: number | null;
};

type IngredientLinkCounts = {
  total: number;
  live: number;
  unavailable: number;
};

export type IngredientLinksResult = {
  status: DataStatus;
  items: IngredientLinkSummary[];
  counts: IngredientLinkCounts;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  errorMessage: string | null;
};

type LinkUserRow = {
  id: string;
  name: string | null;
};

type ProductAvailabilityRow = Pick<ProductRow, 'id' | 'available' | 'discontinued' | 'name'>;

type IngredientLinkIngredientRow = Pick<IngredientRow, 'id' | 'source' | 'handle'>;

type IngredientLinkQueryRow = IngredientProductLinkRow & {
  ingredients: IngredientLinkIngredientRow | null;
  products: ProductRow | null;
  users: LinkUserRow | null;
};

type RequiredIngredientLinkRow = IngredientProductLinkRow & {
  ingredients: Pick<IngredientRow, 'source' | 'handle'> | null;
};

function buildOrFilter(column: string, values: string[]) {
  return values.map((value) => `${column}.eq.${value}`).join(',');
}

const DEFAULT_INGREDIENT_LINKS_PAGE_SIZE = 25;

function isProductLinkable(row: ProductAvailabilityRow) {
  return Boolean(row.available) && row.discontinued !== true;
}

function buildCounts(items: IngredientLinkSummary[]): IngredientLinkCounts {
  return items.reduce<IngredientLinkCounts>(
    (counts, item) => {
      counts.total += 1;

      counts.live += 1;

      if (!item.productLinkable) {
        counts.unavailable += 1;
      }

      return counts;
    },
    { total: 0, live: 0, unavailable: 0 }
  );
}

function resolvePageNumber(value: number | null | undefined) {
  if (!Number.isFinite(value) || !value || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

function mapIngredientLinkSummary(row: IngredientLinkQueryRow, recipeCounts: Map<string, number>) {
  const ingredient = row.ingredients;
  const productRow = row.products;

  if (!ingredient || !productRow) {
    return null;
  }

  const product = mapProduct(productRow);

  return {
    linkId: row.id,
    ingredientSource: ingredient.source,
    ingredientHandle: ingredient.handle,
    productId: product.id,
    productName: product.name,
    productBrand: product.brand,
    productSource: product.source,
    productImageUrl: product.imageUrl,
    productWebsiteUrl: product.websiteUrl,
    productAvailable: product.available,
    productLinkable: isProductLinkable(productRow),
    priority: row.priority,
    recipeCount: recipeCounts.get(ingredient.id) ?? 0,
    notes: row.notes,
    createdByUserId: row.created_by_user_id,
    createdByName: row.users?.name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  } satisfies IngredientLinkSummary;
}

async function getProductAvailability(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  productId: string
) {
  const { data, error } = await supabase
    .from('products')
    .select('id, available, discontinued, name')
    .eq('id', productId)
    .single<ProductAvailabilityRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function assertProductIsAvailable(productId: string) {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase environment variables are missing for this admin action.');
  }

  const product = await getProductAvailability(supabase, productId);

  if (!isProductLinkable(product)) {
    if (product.discontinued === true) {
      throw new Error(`Cannot link discontinued product: ${product.name}.`);
    }

    throw new Error(`Cannot link unavailable product: ${product.name}.`);
  }

  return product;
}

export async function listIngredientLinks(filters: IngredientLinkFilters = {}): Promise<IngredientLinksResult> {
  const supabase = await createServerSupabaseClient();
  const pageSize = resolvePageNumber(filters.pageSize ?? DEFAULT_INGREDIENT_LINKS_PAGE_SIZE);
  const page = resolvePageNumber(filters.page);
  const from = (page - 1) * pageSize;
  const to = from + pageSize;

  if (!supabase) {
    return {
      status: 'env-missing',
      items: [],
      counts: { total: 0, live: 0, unavailable: 0 },
      page,
      pageSize,
      hasNextPage: false,
      hasPreviousPage: page > 1,
      errorMessage: null
    };
  }

  try {
    const { data: linkRows, error: linkError } = await supabase
      .from('ingredient_product_links')
      .select(
        `id, ingredient_id, product_id, priority, notes, created_by_user_id, created_at, updated_at, ingredients(id, source, handle), products(${PRODUCT_SUMMARY_SELECT}), users(id, name)`
      )
      .order('updated_at', { ascending: false })
      .range(from, to)
      .returns<IngredientLinkQueryRow[]>();

    if (linkError) {
      throw linkError;
    }

    const rawRows = linkRows ?? [];
    const ingredientIds = rawRows
      .map((r) => r.ingredients?.id)
      .filter((id): id is string => Boolean(id));

    const { data: countRows, error: countError } = await supabase
      .rpc('ingredient_recipe_counts', { p_ingredient_ids: ingredientIds });

    if (countError) {
      throw countError;
    }

    const recipeCounts = new Map<string, number>(
      (countRows ?? []).map((r: { ingredient_id: string; recipe_count: number }) => [r.ingredient_id, Number(r.recipe_count)])
    );

    const items = rawRows
      .slice(0, pageSize)
      .map((row) => mapIngredientLinkSummary(row, recipeCounts))
      .filter((value): value is IngredientLinkSummary => value !== null);

    return {
      status: 'ready',
      items,
      counts: buildCounts(items),
      page,
      pageSize,
      hasNextPage: rawRows.length > pageSize,
      hasPreviousPage: page > 1,
      errorMessage: null
    };
  } catch (error) {
    if (!isSetupBlockingError(error)) {
      throw error;
    }

    return {
      status: 'schema-pending',
      items: [],
      counts: { total: 0, live: 0, unavailable: 0 },
      page,
      pageSize,
      hasNextPage: false,
      hasPreviousPage: page > 1,
      errorMessage: getSetupErrorMessage(error)
    };
  }
}

async function getRequiredLinkRow(linkId: string) {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase environment variables are missing for this admin action.');
  }

  const { data, error } = await supabase
    .from('ingredient_product_links')
    .select('id, ingredient_id, product_id, priority, notes, created_by_user_id, created_at, updated_at, ingredients(source, handle)')
    .eq('id', linkId)
    .single<RequiredIngredientLinkRow>();

  if (error) {
    throw error;
  }

  return { supabase, row: data };
}

export async function updateIngredientProductLinkPriority(input: { linkId: string; priority: number }) {
  const { supabase, row } = await getRequiredLinkRow(input.linkId);

  const { error } = await supabase
    .from('ingredient_product_links')
    .update({ priority: input.priority })
    .eq('id', row.id);

  if (error) {
    throw error;
  }

  if (!row.ingredients) {
    throw new Error('Ingredient link is missing its ingredient relationship.');
  }

  return {
    source: row.ingredients.source,
    handle: row.ingredients.handle
  };
}

export async function deleteIngredientProductLink(linkId: string) {
  const { supabase, row } = await getRequiredLinkRow(linkId);

  const { error } = await supabase.from('ingredient_product_links').delete().eq('id', row.id);

  if (error) {
    throw error;
  }

  if (!row.ingredients) {
    throw new Error('Ingredient link is missing its ingredient relationship.');
  }

  return {
    source: row.ingredients.source,
    handle: row.ingredients.handle
  };
}

export async function bulkDeleteIngredientProductLinks(linkIds: string[]) {
  const uniqueLinkIds = [...new Set(linkIds.filter(Boolean))];

  if (uniqueLinkIds.length === 0) {
    return [] as Array<{ source: string; handle: string }>;
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase environment variables are missing for this admin action.');
  }

  const linkFilter = buildOrFilter('id', uniqueLinkIds);
  const { data: rows, error: rowsError } = await supabase
    .from('ingredient_product_links')
    .select('id, ingredients(source, handle)')
    .or(linkFilter)
    .returns<Array<{ id: string; ingredients: Pick<IngredientRow, 'source' | 'handle'> | null }>>();

  if (rowsError) {
    throw rowsError;
  }

  const { error: deleteError } = await supabase
    .from('ingredient_product_links')
    .delete()
    .or(linkFilter);

  if (deleteError) {
    throw deleteError;
  }

  return (rows ?? []).flatMap((row) => {
    if (!row.ingredients) {
      return [];
    }

    return [{ source: row.ingredients.source, handle: row.ingredients.handle }];
  });
}