import 'server-only';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSetupErrorMessage, isSetupBlockingError, type DataListResult, type DataStatus } from '@/server/db/runtime';
import type {
  IngredientRow,
  IngredientProductLinkRow,
  ProductRow,
  ProductSummary,
  RecipeIngredientLinkRow,
  RecipeRow,
  RecipeStepRow,
  RecipeSummary
} from '@/server/db/types';
import { mapProduct, PRODUCT_SUMMARY_SELECT } from '@/server/products/list-products';

const RECIPE_SELECT =
  'id, source, external_id, name, slug, headline, description, image_url, website_url, servings, prep_minutes, total_minutes, difficulty, serving_size, created_at, updated_at';
const RECIPE_LIST_SELECT = RECIPE_SELECT;

type RecipeListQueryRow = RecipeRow;

type RecipeListCoverageRow = Pick<RecipeIngredientLinkRow, 'ingredient_id' | 'recipe_id'> & {
  ingredients:
    | {
        id: string;
        is_pantry: boolean;
        ingredient_product_links: Array<Pick<IngredientProductLinkRow, 'id'>> | null;
      }
    | null;
};

const EVERYPLATE_IMAGE_BASE_URL =
  'https://media.everyplate.com/w_1920,q_auto,f_auto,c_limit,fl_lossy/everyplate_s3';
const EVERYPLATE_CLOUDFRONT_HOSTNAME = 'd3hvwccx09j84u.cloudfront.net';

function buildEveryPlateImageUrl(imagePath: string) {
  if (!imagePath.startsWith('/image/')) {
    return null;
  }

  return `${EVERYPLATE_IMAGE_BASE_URL}${imagePath}`;
}

function normalizeLegacyEveryPlateImageUrl(imageUrl: string) {
  if (!/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  try {
    const url = new URL(imageUrl);

    if (url.hostname !== EVERYPLATE_CLOUDFRONT_HOSTNAME) {
      return imageUrl;
    }

    const legacyPathMatch = /^\/0,0(\/image\/.+)$/.exec(url.pathname);

    if (!legacyPathMatch) {
      return imageUrl;
    }

    return buildEveryPlateImageUrl(legacyPathMatch[1]) ?? imageUrl;
  } catch {
    return imageUrl;
  }
}

function normalizeEveryPlateAssetUrl(assetUrl: string | null, assetPath: string | null) {
  const normalizedPath = typeof assetPath === 'string' && assetPath.trim() ? assetPath.trim() : null;
  const normalizedUrl = typeof assetUrl === 'string' && assetUrl.trim() ? assetUrl.trim() : null;

  if (normalizedPath) {
    const imagePathUrl = buildEveryPlateImageUrl(normalizedPath);

    if (imagePathUrl) {
      return imagePathUrl;
    }
  }

  if (!normalizedUrl) {
    return null;
  }

  const imagePathUrl = buildEveryPlateImageUrl(normalizedUrl);

  if (imagePathUrl) {
    return imagePathUrl;
  }

  return normalizeLegacyEveryPlateImageUrl(normalizedUrl);
}

function normalizeRecipeImageUrl(source: string, imageUrl: string | null) {
  if (!imageUrl) {
    return null;
  }

  if (source === 'everyplate') {
    const imagePathUrl = buildEveryPlateImageUrl(imageUrl);

    if (imagePathUrl) {
      return imagePathUrl;
    }

    return normalizeLegacyEveryPlateImageUrl(imageUrl);
  }

  return imageUrl;
}

function normalizeRecipeStepAssets(
  source: string,
  assets: RecipeStepRow['image_assets'] | RecipeStepRow['video_assets']
) {
  if (!Array.isArray(assets)) {
    return [];
  }

  const seen = new Set<string>();

  return assets.flatMap((asset) => {
    if (!asset || typeof asset !== 'object') {
      return [];
    }

    const path = typeof asset.path === 'string' && asset.path.trim() ? asset.path.trim() : null;
    const caption = typeof asset.caption === 'string' && asset.caption.trim() ? asset.caption.trim() : null;
    const rawUrl = typeof asset.url === 'string' && asset.url.trim() ? asset.url.trim() : null;
    const url =
      source === 'everyplate'
        ? normalizeEveryPlateAssetUrl(rawUrl, path)
        : rawUrl;

    if (!url) {
      return [];
    }

    const dedupeKey = `${url}::${caption ?? ''}`;

    if (seen.has(dedupeKey)) {
      return [];
    }

    seen.add(dedupeKey);

    return [
      {
        url,
        path,
        caption
      }
    ];
  });
}

function mapRecipe(row: RecipeRow): RecipeSummary {
  return {
    id: row.id,
    source: row.source,
    externalId: row.external_id,
    name: row.name,
    slug: row.slug,
    headline: row.headline,
    description: row.description,
    servings: row.servings,
    prepMinutes: row.prep_minutes,
    totalMinutes: row.total_minutes,
    difficulty: row.difficulty,
    servingSize: row.serving_size,
    createdAt: row.created_at,
    ingredientCount: 0,
    linkedIngredients: 0,
    unlinkedIngredients: 0,
    updatedAt: row.updated_at
  };
}

export type RecipeDetailIngredient = {
  id: string;
  externalId: string | null;
  rawName: string;
  handle: string;
  ingredientType: string | null;
  ingredientSlug: string | null;
  ingredientCountry: string | null;
  shipped: boolean;
  familyName: string | null;
  quantity: number | null;
  unit: string | null;
  updatedAt: string;
  status: 'linked' | 'pantry' | 'unlinked';
  linkedProducts: Array<Pick<ProductSummary, 'id' | 'name' | 'brand' | 'source'>>;
};

export type RecipeCoverageSummary = {
  ingredientCount: number;
  linkedIngredients: number;
  unlinkedIngredients: number;
};

export type RecipeDetail = RecipeSummary & {
  imageUrl: string | null;
  websiteUrl: string | null;
  createdAt: string;
  steps: Array<{
    stepNumber: number;
    instructions: string;
    imageAssets: Array<{
      url: string;
      path: string | null;
      caption: string | null;
    }>;
    videoAssets: Array<{
      url: string;
      path: string | null;
      caption: string | null;
    }>;
  }>;
  facets: {
    allergens: string[];
    cuisines: string[];
    tags: string[];
  };
  ingredients: RecipeDetailIngredient[];
  coverage: RecipeCoverageSummary;
};

export type RecipeDetailResult = {
  status: DataStatus;
  data: RecipeDetail | null;
  errorMessage: string | null;
};

type RecipeListFilters = {
  limit?: number;
  page?: number | null;
  pageSize?: number | null;
  source?: string | null;
  query?: string | null;
  coverage?: 'linked' | 'unlinked' | null;
  sort?: 'newest';
};

export type RecipeListResult = DataListResult<RecipeSummary> & {
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

const DEFAULT_RECIPE_PAGE_SIZE = 25;

function resolvePageNumber(value: number | null | undefined) {
  if (!Number.isFinite(value) || !value || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

type RecipeListFilterQuery = {
  eq(column: string, value: boolean | number | string): unknown;
  or(filters: string): unknown;
  ilike(column: string, pattern: string): unknown;
};

function applyRecipeListFilters<Q extends RecipeListFilterQuery>(query: Q, filters: RecipeListFilters): Q {
  let nextQuery = query;

  if (filters.source?.trim()) {
    nextQuery = nextQuery.eq('source', filters.source.trim()) as Q;
  }

  if (filters.query?.trim()) {
    const escapedQuery = filters.query.trim();
    nextQuery = nextQuery.or(`name.ilike.%${escapedQuery}%,headline.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%`) as Q;
  }

  return nextQuery;
}

function getRecipeSortConfig(sort: RecipeListFilters['sort']) {
  return { ascending: false, column: 'updated_at' };
}

function matchesCoverageFilter(item: RecipeSummary, coverage: RecipeListFilters['coverage']) {
  if (coverage === 'linked') {
    return item.ingredientCount > 0 && item.unlinkedIngredients === 0;
  }

  if (coverage === 'unlinked') {
    return item.unlinkedIngredients > 0;
  }

  return true;
}

function pickProductSummary(product: ProductSummary) {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    source: product.source
  };
}

function buildCoverageSummary(ingredients: RecipeDetailIngredient[]): RecipeCoverageSummary {
  return ingredients.reduce(
    (summary, ingredient) => {
      summary.ingredientCount += 1;

      if (ingredient.status === 'linked' || ingredient.status === 'pantry') {
        summary.linkedIngredients += 1;
      } else {
        summary.unlinkedIngredients += 1;
      }

      return summary;
    },
    {
      ingredientCount: 0,
      linkedIngredients: 0,
      unlinkedIngredients: 0
    }
  );
}

function isIngredientCovered(ingredient: RecipeListCoverageRow['ingredients']) {
  if (!ingredient) {
    return false;
  }

  if (ingredient.is_pantry) {
    return true;
  }

  return (ingredient.ingredient_product_links?.length ?? 0) > 0;
}

function buildRecipeListCoverage(row: RecipeListQueryRow): RecipeCoverageSummary {
  return {
    ingredientCount: 0,
    linkedIngredients: 0,
    unlinkedIngredients: 0
  };
}

function buildOrFilter(column: string, values: string[]) {
  return values.map((value) => `${column}.eq.${value}`).join(',');
}

function buildRecipeCoverageMap(rows: RecipeListCoverageRow[]) {
  return rows.reduce<Map<string, RecipeCoverageSummary>>(
    (coverageByRecipeId, ingredientLink) => {
      const current = coverageByRecipeId.get(ingredientLink.recipe_id) ?? {
        ingredientCount: 0,
        linkedIngredients: 0,
        unlinkedIngredients: 0
      };

      current.ingredientCount += 1;

      if (isIngredientCovered(ingredientLink.ingredients)) {
        current.linkedIngredients += 1;
      } else {
        current.unlinkedIngredients += 1;
      }

      coverageByRecipeId.set(ingredientLink.recipe_id, current);

      return coverageByRecipeId;
    },
    new Map<string, RecipeCoverageSummary>()
  );
}

function getRecipeCoverage(coverageByRecipeId: Map<string, RecipeCoverageSummary>, recipeId: string) {
  return coverageByRecipeId.get(recipeId) ??
    {
      ingredientCount: 0,
      linkedIngredients: 0,
      unlinkedIngredients: 0
    };
}

async function getRecipeListCoverageRows(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  recipeIds: string[]
) {
  if (recipeIds.length === 0) {
    return [] as RecipeListCoverageRow[];
  }

  const { data, error } = await supabase
    .from('recipe_ingredient_links')
    .select('recipe_id, ingredient_id, ingredients(id, is_pantry, ingredient_product_links(id))')
    .or(buildOrFilter('recipe_id', recipeIds))
    .returns<RecipeListCoverageRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

function buildRecipeListCoverageFromRows(rows: RecipeListCoverageRow[]): RecipeCoverageSummary {
  return rows.reduce<RecipeCoverageSummary>(
    (summary, ingredientLink) => {
      summary.ingredientCount += 1;

      if (isIngredientCovered(ingredientLink.ingredients)) {
        summary.linkedIngredients += 1;
      } else {
        summary.unlinkedIngredients += 1;
      }

      return summary;
    },
    {
      ingredientCount: 0,
      linkedIngredients: 0,
      unlinkedIngredients: 0
    }
  );
}

async function getIngredientById(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  ingredientId: string
) {
  const { data, error } = await supabase
    .from('ingredients')
    .select('id, source, handle, image_url, is_pantry, created_at, updated_at')
    .eq('id', ingredientId)
    .maybeSingle<IngredientRow>();

  if (error) {
    throw error;
  }

  return data;
}

type RecipeDetailIngredientLinkRow = RecipeIngredientLinkRow & {
  ingredients:
    | (IngredientRow & {
        ingredient_product_links:
          | Array<
              Pick<IngredientProductLinkRow, 'id' | 'ingredient_id' | 'product_id'> & {
                products: ProductRow | null;
              }
            >
          | null;
      })
    | null;
};

type RecipeDetailQueryRow = RecipeRow & {
  recipe_ingredient_links: RecipeDetailIngredientLinkRow[] | null;
  recipe_steps: RecipeStepRow[] | null;
};

function mapRecipeDetail(
  row: RecipeDetailQueryRow
): RecipeDetail {
  const ingredientLinks = row.recipe_ingredient_links ?? [];
  const steps = row.recipe_steps ?? [];
  const mappedIngredients = ingredientLinks.flatMap((ingredientLink) => {
    const ingredient = ingredientLink.ingredients;

    if (!ingredient) {
      return [];
    }

    const linkedProducts = (ingredient.ingredient_product_links ?? [])
      .flatMap((link) => {
        if (!link.products) {
          return [];
        }

        return [pickProductSummary(mapProduct(link.products))];
      });

    return {
      id: ingredientLink.id,
      externalId: null,
      rawName: ingredient.handle,
      handle: ingredient.handle,
      ingredientType: null,
      ingredientSlug: null,
      ingredientCountry: null,
      shipped: false,
      familyName: null,
      quantity: ingredientLink.quantity,
      unit: ingredientLink.unit,
      updatedAt: ingredientLink.updated_at,
      status: ingredient.is_pantry ? 'pantry' : linkedProducts.length > 0 ? 'linked' : 'unlinked',
      linkedProducts
    } satisfies RecipeDetailIngredient;
  });

  return {
    ...mapRecipe(row),
    imageUrl: normalizeRecipeImageUrl(row.source, row.image_url),
    websiteUrl: row.website_url,
    createdAt: row.created_at,
    steps: steps.map((step) => ({
      stepNumber: step.step_number,
      instructions: step.instructions,
      imageAssets: normalizeRecipeStepAssets(row.source, step.image_assets),
      videoAssets: normalizeRecipeStepAssets(row.source, step.video_assets)
    })),
    facets: {
      allergens: [],
      cuisines: [],
      tags: []
    },
    ingredients: mappedIngredients,
    coverage: buildCoverageSummary(mappedIngredients)
  };
}

export async function listRecipes(filters: RecipeListFilters = {}): Promise<RecipeListResult> {
  const supabase = await createServerSupabaseClient();
  const pageSize = resolvePageNumber(filters.pageSize ?? filters.limit ?? DEFAULT_RECIPE_PAGE_SIZE);
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
    const sortConfig = getRecipeSortConfig(filters.sort);
    const baseQuery = supabase
      .from('recipes')
      .select(RECIPE_LIST_SELECT)
      .order(sortConfig.column, { ascending: sortConfig.ascending, nullsFirst: false })
      .range(from, to);
    const query = applyRecipeListFilters(baseQuery, filters);
    const { data, error } = await query.returns<RecipeListQueryRow[]>();

    if (error) {
      throw error;
    }

    const rawRows = data ?? [];
    const visibleRows = rawRows.slice(0, pageSize);
    const coverageRows = await getRecipeListCoverageRows(
      supabase,
      visibleRows.map((row) => row.id)
    );
    const coverageByRecipeId = buildRecipeCoverageMap(coverageRows);
    const items = visibleRows.map((row) => ({
      ...mapRecipe(row),
      ...getRecipeCoverage(coverageByRecipeId, row.id)
    }));

    return {
      status: 'ready',
      items: items.filter((item) => matchesCoverageFilter(item, filters.coverage)),
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

export async function getRecipeDetail(recipeId: string): Promise<RecipeDetailResult> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { status: 'env-missing', data: null, errorMessage: null };
  }

  try {
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select(
        `${RECIPE_SELECT}, recipe_steps(id, recipe_id, step_number, instructions, image_assets, video_assets, created_at, updated_at), recipe_ingredient_links(id, recipe_id, ingredient_id, quantity, unit, created_at, updated_at, ingredients(id, source, handle, image_url, is_pantry, created_at, updated_at, ingredient_product_links(id, ingredient_id, product_id, products(${PRODUCT_SUMMARY_SELECT}))))`
      )
      .eq('id', recipeId)
      .maybeSingle<RecipeDetailQueryRow>();

    if (recipeError) {
      throw recipeError;
    }

    if (!recipe) {
      return {
        status: 'ready',
        data: null,
        errorMessage: null
      };
    }

    return {
      status: 'ready',
      data: mapRecipeDetail(recipe),
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