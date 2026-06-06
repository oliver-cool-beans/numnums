import 'server-only';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSetupErrorMessage, isSetupBlockingError, type DataListResult, type DataStatus } from '@/server/db/runtime';
import type {
  IngredientRow,
  IngredientProductLinkRow,
  ProductRow,
  ProductSummary,
  RecipeIngredientLinkRow
} from '@/server/db/types';

export const PRODUCT_SUMMARY_SELECT =
  'id, source, external_id, name, brand, category, price_cents, selling_size, selling_unit, image_url, website_url, available, discontinued, created_at, updated_at';
const PRODUCT_LIST_SELECT = `${PRODUCT_SUMMARY_SELECT}, ingredient_product_links(id)`;

type ProductListRow = ProductRow & {
  ingredient_product_links: Array<Pick<IngredientProductLinkRow, 'id'>> | null;
};

type ProductDetailIngredientRow = Pick<IngredientRow, 'id' | 'source' | 'handle'> & {
  recipe_ingredient_links: Array<Pick<RecipeIngredientLinkRow, 'recipe_id'>> | null;
};

type ProductDetailLinkRow = IngredientProductLinkRow & {
  ingredients: ProductDetailIngredientRow | null;
};

type ProductDetailQueryRow = ProductRow & {
  ingredient_product_links: ProductDetailLinkRow[] | null;
};

export function mapProduct(row: ProductRow): ProductSummary {
  return {
    id: row.id,
    source: row.source,
    externalId: row.external_id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    priceCents: row.price_cents,
    sellingSize: row.selling_size,
    sellingUnit: row.selling_unit,
    imageUrl: row.image_url,
    websiteUrl: row.website_url,
    available: Boolean(row.available),
    linkCount: 0,
    updatedAt: row.updated_at
  };
}

export type ProductDetail = ProductSummary & {
  createdAt: string;
  usage: {
    totalLinks: number;
    liveLinks: number;
    linkedHandles: number;
    recipesCovered: number;
  };
  linkedIngredients: Array<{
    linkId: string;
    ingredientSource: string;
    ingredientHandle: string;
    priority: number;
    recipeCount: number;
  }>;
};

export type ProductDetailResult = {
  status: DataStatus;
  data: ProductDetail | null;
  errorMessage: string | null;
};

type ProductListFilters = {
  limit?: number;
  page?: number | null;
  pageSize?: number | null;
  source?: string | null;
  availability?: 'available' | 'unavailable' | null;
  query?: string | null;
};

export type ProductListResult = DataListResult<ProductSummary> & {
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

const DEFAULT_PRODUCT_PAGE_SIZE = 25;

function resolvePageNumber(value: number | null | undefined) {
  if (!Number.isFinite(value) || !value || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

function mapProductDetail(row: ProductDetailQueryRow): ProductDetail {
  const links = row.ingredient_product_links ?? [];
  const linkedIngredients = links.flatMap((link) => {
    const ingredient = link.ingredients;

    if (!ingredient) {
      return [];
    }

    const recipeCount = new Set((ingredient.recipe_ingredient_links ?? []).map((recipeLink) => recipeLink.recipe_id)).size;

    return {
      linkId: link.id,
      ingredientSource: ingredient.source,
      ingredientHandle: ingredient.handle,
      priority: link.priority,
      recipeCount
    };
  });
  linkedIngredients.sort((left, right) => right.priority - left.priority);
  const uniqueRecipeIds = new Set(
    links.flatMap((link) => (link.ingredients?.recipe_ingredient_links ?? []).map((recipeLink) => recipeLink.recipe_id))
  );

  return {
    ...mapProduct(row),
    createdAt: row.created_at,
    usage: {
      totalLinks: links.length,
      liveLinks: links.length,
      linkedHandles: new Set(links.map((link) => link.ingredient_id)).size,
      recipesCovered: uniqueRecipeIds.size
    },
    linkedIngredients
  };
}

export async function listProducts(filters: ProductListFilters = {}): Promise<ProductListResult> {
  const supabase = await createServerSupabaseClient();
  const pageSize = resolvePageNumber(filters.pageSize ?? filters.limit ?? DEFAULT_PRODUCT_PAGE_SIZE);
  const page = resolvePageNumber(filters.page);
  const from = (page - 1) * pageSize;
  const to = from + pageSize;

  if (!supabase) {
    return {
      status: 'env-missing',
      items: [],
      page,
      pageSize,
      hasNextPage: false,
      hasPreviousPage: page > 1,
      errorMessage: null
    };
  }

  try {
    let query = supabase
      .from('products')
      .select(PRODUCT_LIST_SELECT)
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (filters.source?.trim()) {
      query = query.eq('source', filters.source.trim());
    }

    if (filters.availability === 'available') {
      query = query.eq('available', true);
    }

    if (filters.availability === 'unavailable') {
      query = query.eq('available', false);
    }

    if (filters.query?.trim()) {
      const escapedQuery = filters.query.trim();
      query = query.or(`name.ilike.%${escapedQuery}%,brand.ilike.%${escapedQuery}%,category.ilike.%${escapedQuery}%`);
    }

    const { data, error } = await query.returns<ProductListRow[]>();

    if (error) {
      throw error;
    }

    const rawRows = data ?? [];
    const visibleRows = rawRows.slice(0, pageSize);

    return {
      status: 'ready',
      items: visibleRows.map((row) => ({
        ...mapProduct(row),
        linkCount: row.ingredient_product_links?.length ?? 0
      })),
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
      page,
      pageSize,
      hasNextPage: false,
      hasPreviousPage: page > 1,
      errorMessage: getSetupErrorMessage(error)
    };
  }
}

export async function getProductDetail(productId: string): Promise<ProductDetailResult> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { status: 'env-missing', data: null, errorMessage: null };
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select(
        `${PRODUCT_SUMMARY_SELECT}, ingredient_product_links(id, ingredient_id, product_id, priority, notes, created_by_user_id, created_at, updated_at, ingredients(id, source, handle, recipe_ingredient_links(recipe_id)))`
      )
      .eq('id', productId)
      .maybeSingle<ProductDetailQueryRow>();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        status: 'ready',
        data: null,
        errorMessage: null
      };
    }

    return {
      status: 'ready',
      data: mapProductDetail(data),
      errorMessage: null
    };
  } catch (error) {
    if (!isSetupBlockingError(error)) {
      throw error;
    }

    return {
      status: 'schema-pending',
      data: null,
      errorMessage: getSetupErrorMessage(error)
    };
  }
}