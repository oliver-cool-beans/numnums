import 'server-only';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSetupErrorMessage, isSetupBlockingError, type DataStatus } from '@/server/db/runtime';
import type {
  IngredientRow,
  IngredientLinkedProduct,
  IngredientProductLinkRow,
  IngredientRecipeExample,
  ProductRow,
  ProductSummary,
  RecipeIngredientLinkRow,
  RecipeRow,
  UserRow
} from '@/server/db/types';
import { assertProductIsAvailable } from '@/server/ingredients/ingredient-links';
import { mapProduct, PRODUCT_SUMMARY_SELECT } from '@/server/products/list-products';
import { getIngredientReviewPath, type IngredientReviewTab } from '@/server/ingredients/review-path';

const INGREDIENT_REVIEW_PRODUCT_PAGE_SIZE = 12;
const INGREDIENT_REVIEW_LINKED_PRODUCT_PAGE_SIZE = 10;
const INGREDIENT_REVIEW_RECIPE_PAGE_SIZE = 10;

type LinkableProductRow = Pick<ProductRow, 'available' | 'discontinued'>;

export function isProductLinkable(row: LinkableProductRow) {
  return Boolean(row.available) && row.discontinued !== true;
}

export type IngredientReviewData = {
  source: string;
  handle: string;
  isPantry: boolean;
  activeTab: IngredientReviewTab;
  deferredKeys: string[];
  recipeCount: number;
  recipeExamples: IngredientRecipeExample[];
  recipeMentionsPage: number;
  hasNextRecipeMentionsPage: boolean;
  hasPreviousRecipeMentionsPage: boolean;
  linkedProductCount: number;
  existingLinkedProductIds: string[];
  linkedProducts: IngredientLinkedProduct[];
  linkedProductsPage: number;
  hasNextLinkedProductsPage: boolean;
  hasPreviousLinkedProductsPage: boolean;
  productResults: ProductSummary[];
  productResultsPage: number;
  hasNextProductResultsPage: boolean;
  hasPreviousProductResultsPage: boolean;
  searchQuery: string;
};

export type RecipeIngredientReviewRow = RecipeIngredientLinkRow & {
  recipes: RecipeRow | null;
};

type IngredientProductReviewRow = IngredientProductLinkRow & {
  products: ProductRow | null;
  users: Pick<UserRow, 'id' | 'name'> | null;
};

type ProductSearchRow = ProductRow & {
  ingredient_product_links: Array<Pick<IngredientProductLinkRow, 'product_id' | 'ingredient_id'>> | null;
};

type NextUnlinkedIngredientRow = {
  source: string;
  handle: string;
  updated_at: string;
  ingredient_product_links: Array<Record<string, never>> | null;
};

type SetIngredientPantryStatusInput = {
  source: string;
  handle: string;
  isPantry: boolean;
};

export type NextIngredientNavigation = {
  nextReviewPath: string | null;
  deferredNextReviewPath: string | null;
};

export type IngredientReviewResult = {
  status: DataStatus;
  data: IngredientReviewData | null;
  errorMessage: string | null;
};

type IngredientReviewOptions = {
  searchQuery?: string | null;
  productPage?: number | null;
  deferredKeys?: string[];
  activeTab?: IngredientReviewTab;
  recipePage?: number | null;
  linkedPage?: number | null;
};

function formatSearchQuery(handle: string, searchQuery?: string | null) {
  const trimmed = searchQuery?.trim();

  if (trimmed) {
    return trimmed;
  }

  return handle.replace(/[-_]+/g, ' ').trim();
}

function resolvePageNumber(value: number | null | undefined) {
  if (!Number.isFinite(value) || !value || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

function getLinkSortWeight(productId: string, linkedProductIds: Set<string>) {
  return linkedProductIds.has(productId) ? 0 : 1;
}

function assertQuerySucceeded(error: unknown) {
  if (error) {
    throw error;
  }
}

function getNextIngredientRow<T extends { source: string; handle: string }>(
  rows: T[],
  source: string,
  handle: string,
  deferredKeys: string[]
): T | null {
  const currentKey = `${source}:${handle}`;
  const deferredKeySet = new Set(deferredKeys);
  const seenKeys = new Set<string>();

  for (const row of rows) {
    const rowKey = `${row.source}:${row.handle}`;

    if (seenKeys.has(rowKey)) {
      continue;
    }

    seenKeys.add(rowKey);

    if (rowKey === currentKey || deferredKeySet.has(rowKey)) {
      continue;
    }

    return row;
  }

  return null;
}

function buildNextIngredientNavigation(
  nextRow: NextUnlinkedIngredientRow | null,
  source: string,
  handle: string,
  deferredKeys: string[]
): NextIngredientNavigation {
  if (!nextRow) {
    return {
      nextReviewPath: null,
      deferredNextReviewPath: null
    };
  }

  const currentKey = `${source}:${handle}`;

  return {
    nextReviewPath: getIngredientReviewPath({
      source: nextRow.source,
      handle: nextRow.handle,
      deferredKeys
    }),
    deferredNextReviewPath: getIngredientReviewPath({
      source: nextRow.source,
      handle: nextRow.handle,
      deferredKeys: [...new Set([...deferredKeys, currentKey])]
    })
  };
}

export async function getNextIngredientNavigation(
  source: string,
  handle: string,
  deferredKeys: string[] = []
): Promise<NextIngredientNavigation> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase environment variables are missing for this admin action.');
  }

  try {
    const limit = Math.max(25, deferredKeys.length + 5);
    const { data, error } = await supabase
      .from('ingredients')
      .select('source, handle, updated_at, ingredient_product_links()')
      .eq('is_pantry', false)
      .is('ingredient_product_links', null)
      .order('updated_at', { ascending: false })
      .limit(limit)
      .returns<NextUnlinkedIngredientRow[]>();

    if (error) {
      throw error;
    }

    return buildNextIngredientNavigation(
      getNextIngredientRow(data ?? [], source, handle, deferredKeys),
      source,
      handle,
      deferredKeys
    );
  } catch (error) {
    if (isSetupBlockingError(error)) {
      return {
        nextReviewPath: null,
        deferredNextReviewPath: null
      };
    }

    throw error;
  }
}

export async function getIngredientReview(
  source: string,
  handle: string,
  {
    searchQuery,
    productPage,
    deferredKeys = [],
    activeTab = 'search',
    recipePage,
    linkedPage
  }: IngredientReviewOptions = {}
): Promise<IngredientReviewResult> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { status: 'env-missing', data: null, errorMessage: null };
  }

  try {
    const normalizedSearchQuery = formatSearchQuery(handle, searchQuery);
    const productResultsPage = resolvePageNumber(productPage);
    const recipeMentionsPage = resolvePageNumber(recipePage);
    const linkedProductsPage = resolvePageNumber(linkedPage);
    const productResultsFrom = (productResultsPage - 1) * INGREDIENT_REVIEW_PRODUCT_PAGE_SIZE;
    const productResultsTo = productResultsFrom + INGREDIENT_REVIEW_PRODUCT_PAGE_SIZE;
    const linkedProductsFrom = (linkedProductsPage - 1) * INGREDIENT_REVIEW_LINKED_PRODUCT_PAGE_SIZE;
    const linkedProductsTo = linkedProductsFrom + INGREDIENT_REVIEW_LINKED_PRODUCT_PAGE_SIZE;
    const recipeMentionsFrom = (recipeMentionsPage - 1) * INGREDIENT_REVIEW_RECIPE_PAGE_SIZE;
    const recipeMentionsTo = recipeMentionsFrom + INGREDIENT_REVIEW_RECIPE_PAGE_SIZE;
    const shouldLoadProductResults = activeTab === 'search';
    const shouldLoadRecipeMentions = activeTab === 'recipes';
    const shouldLoadLinkedProducts = activeTab === 'matches';
    const { data: ingredient, error: ingredientError } = await supabase
      .from('ingredients')
      .select('id, source, handle, image_url, is_pantry, created_at, updated_at')
      .eq('source', source)
      .eq('handle', handle)
      .maybeSingle<IngredientRow>();

    if (ingredientError) {
      throw ingredientError;
    }

    if (!ingredient) {
      return {
        status: 'ready',
        data: null,
        errorMessage: null
      };
    }

    const [recipeCountResult, linkedProductCountResult, recipeIngredientsResult, linksResult, productSearchResult] = await Promise.all([
      supabase
        .from('recipe_ingredient_links')
        .select('id', { count: 'estimated', head: true })
        .eq('ingredient_id', ingredient.id),
      supabase
        .from('ingredient_product_links')
        .select('id', { count: 'estimated', head: true })
        .eq('ingredient_id', ingredient.id),
      shouldLoadRecipeMentions
        ? supabase
            .from('recipe_ingredient_links')
            .select(
              'id, recipe_id, ingredient_id, quantity, unit, created_at, updated_at, recipes(id, source, external_id, name, slug, headline, image_url, website_url, servings, prep_minutes, total_minutes, difficulty, created_at, updated_at)'
            )
            .eq('ingredient_id', ingredient.id)
            .order('updated_at', { ascending: false })
            .range(recipeMentionsFrom, recipeMentionsTo)
            .returns<RecipeIngredientReviewRow[]>()
        : Promise.resolve({ data: [] as RecipeIngredientReviewRow[], error: null }),
      shouldLoadLinkedProducts
        ? supabase
            .from('ingredient_product_links')
            .select(
              `id, ingredient_id, product_id, priority, notes, created_by_user_id, created_at, updated_at, products(${PRODUCT_SUMMARY_SELECT}), users(id, name)`
            )
            .eq('ingredient_id', ingredient.id)
            .order('priority', { ascending: false })
            .range(linkedProductsFrom, linkedProductsTo)
            .returns<IngredientProductReviewRow[]>()
        : Promise.resolve({ data: [] as IngredientProductReviewRow[], error: null }),
      shouldLoadProductResults && normalizedSearchQuery
        ? supabase
            .from('products')
            .select(`${PRODUCT_SUMMARY_SELECT}, ingredient_product_links(product_id, ingredient_id)`)
            .ilike('name', `%${normalizedSearchQuery}%`)
            .order('updated_at', { ascending: false })
            .range(productResultsFrom, productResultsTo)
            .returns<ProductSearchRow[]>()
        : Promise.resolve({ data: [] as ProductSearchRow[], error: null })
    ]);

    assertQuerySucceeded(recipeIngredientsResult.error);
    assertQuerySucceeded(recipeCountResult.error);
    assertQuerySucceeded(linkedProductCountResult.error);
    assertQuerySucceeded(linksResult.error);
    assertQuerySucceeded(productSearchResult.error);

    const linkRows = linksResult.data ?? [];
    const linkedProductCount = linkedProductCountResult.count ?? 0;
    const linkedProducts = linkRows
      .slice(0, INGREDIENT_REVIEW_LINKED_PRODUCT_PAGE_SIZE)
      .map((row) => {
        const productRow = row.products;

        if (!productRow) {
          return null;
        }

        const product = mapProduct(productRow);

        return {
          linkId: row.id,
          productId: product.id,
          name: product.name,
          brand: product.brand,
          source: product.source,
          available: product.available,
          linkable: isProductLinkable(productRow),
          priority: row.priority,
          createdByUserId: row.created_by_user_id,
          createdByName: row.users?.name ?? null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          imageUrl: product.imageUrl,
          websiteUrl: product.websiteUrl
        } satisfies IngredientLinkedProduct;
      })
      .filter((value): value is IngredientLinkedProduct => value !== null);
    const rawProductResults = productSearchResult.data ?? [];
    const existingLinkedProductIds = [
      ...new Set(
        rawProductResults.flatMap((row) =>
          (row.ingredient_product_links ?? [])
            .filter((link) => link.ingredient_id === ingredient.id)
            .map((link) => link.product_id)
        )
      )
    ];
    const existingLinkedProductIdSet = new Set(existingLinkedProductIds);
    const productResults = rawProductResults
      .slice(0, INGREDIENT_REVIEW_PRODUCT_PAGE_SIZE)
      .filter(isProductLinkable)
      .map(mapProduct)
      .sort((left, right) => {
        const linkWeightDifference =
          getLinkSortWeight(left.id, existingLinkedProductIdSet) - getLinkSortWeight(right.id, existingLinkedProductIdSet);

        if (linkWeightDifference !== 0) {
          return linkWeightDifference;
        }

        return right.updatedAt.localeCompare(left.updatedAt);
      });

    const rawRecipeMentions = recipeIngredientsResult.data ?? [];
    const recipeExamples = rawRecipeMentions
      .slice(0, INGREDIENT_REVIEW_RECIPE_PAGE_SIZE)
      .map((row) => {
        const recipe = row.recipes;

        if (!recipe) {
          return null;
        }

        return {
          id: row.id,
          recipeId: row.recipe_id,
          recipeName: recipe.name,
          recipeSlug: recipe.slug,
          externalIngredientId: null,
          ingredientType: null,
          ingredientSlug: null,
          ingredientCountry: null,
          familyName: null,
          shipped: false,
          rawName: ingredient.handle,
          quantity: row.quantity,
          unit: row.unit
        } satisfies IngredientRecipeExample;
      })
      .filter(Boolean) as IngredientRecipeExample[];

    return {
      status: 'ready',
      data: {
        source,
        handle,
        isPantry: ingredient.is_pantry,
        activeTab,
        deferredKeys,
        recipeCount: recipeCountResult.count ?? recipeExamples.length,
        recipeExamples,
        recipeMentionsPage,
        hasNextRecipeMentionsPage: rawRecipeMentions.length > INGREDIENT_REVIEW_RECIPE_PAGE_SIZE,
        hasPreviousRecipeMentionsPage: recipeMentionsPage > 1,
        linkedProductCount,
        existingLinkedProductIds,
        linkedProducts,
        linkedProductsPage,
        hasNextLinkedProductsPage: linkRows.length > INGREDIENT_REVIEW_LINKED_PRODUCT_PAGE_SIZE,
        hasPreviousLinkedProductsPage: linkedProductsPage > 1,
        productResults,
        productResultsPage,
        hasNextProductResultsPage: rawProductResults.length > INGREDIENT_REVIEW_PRODUCT_PAGE_SIZE,
        hasPreviousProductResultsPage: productResultsPage > 1,
        searchQuery: normalizedSearchQuery
      },
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

export async function setIngredientPantryStatus({
  source,
  handle,
  isPantry
}: SetIngredientPantryStatusInput): Promise<void> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase environment variables are missing for this admin action.');
  }

  const { data, error } = await supabase
    .from('ingredients')
    .update({ is_pantry: isPantry })
    .eq('source', source)
    .eq('handle', handle)
    .select('id')
    .maybeSingle<Pick<IngredientRow, 'id'>>();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Ingredient could not be found.');
  }
}

type CreateIngredientProductLinkInput = {
  source: string;
  handle: string;
  productId: string;
  createdByUserId: string;
};

type BulkCreateIngredientProductLinksInput = {
  source: string;
  handle: string;
  productIds: string[];
  createdByUserId: string;
};

type CreateIngredientProductLinkResult =
  | {
      status: 'exists';
      linkId: string;
    }
  | {
      status: 'created';
      createdAt: string;
      createdByUserId: string;
      linkId: string;
      priority: number;
      updatedAt: string;
    };

type BulkCreateIngredientProductLinksResult = {
  createdLinks: Array<{
    createdAt: string;
    createdByUserId: string;
    linkId: string;
    priority: number;
    productId: string;
    updatedAt: string;
  }>;
  existingCount: number;
};

function buildOrFilter(column: string, values: string[]) {
  return values.map((value) => `${column}.eq.${value}`).join(',');
}

export async function createIngredientProductLink({
  source,
  handle,
  productId,
  createdByUserId
}: CreateIngredientProductLinkInput): Promise<CreateIngredientProductLinkResult> {
  await assertProductIsAvailable(productId);

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase environment variables are missing for this admin action.');
  }

  const { data: ingredient, error: ingredientError } = await supabase
    .from('ingredients')
    .select('id')
    .eq('source', source)
    .eq('handle', handle)
    .single<Pick<IngredientRow, 'id'>>();

  if (ingredientError) {
    throw ingredientError;
  }

  const { data: existingLink, error: existingLinkError } = await supabase
    .from('ingredient_product_links')
    .select('id')
    .eq('ingredient_id', ingredient.id)
    .eq('product_id', productId)
    .maybeSingle<Pick<IngredientProductLinkRow, 'id'>>();

  if (existingLinkError) {
    throw existingLinkError;
  }

  if (existingLink) {
    return { status: 'exists' as const, linkId: existingLink.id };
  }

  const { data, error } = await supabase
    .from('ingredient_product_links')
    .insert({
      ingredient_id: ingredient.id,
      product_id: productId,
      created_by_user_id: createdByUserId
    })
    .select('id, priority, created_by_user_id, created_at, updated_at')
    .single<
      Pick<
        IngredientProductLinkRow,
        'id' | 'priority' | 'created_by_user_id' | 'created_at' | 'updated_at'
      >
    >();

  if (error) {
    throw error;
  }

  return {
    status: 'created' as const,
    createdAt: data.created_at,
    createdByUserId,
    linkId: data.id,
    priority: data.priority,
    updatedAt: data.updated_at
  };
}

export async function bulkCreateIngredientProductLinks({
  source,
  handle,
  productIds,
  createdByUserId
}: BulkCreateIngredientProductLinksInput): Promise<BulkCreateIngredientProductLinksResult> {
  const uniqueProductIds = [...new Set(productIds.filter(Boolean))];

  if (uniqueProductIds.length === 0) {
    return {
      createdLinks: [],
      existingCount: 0
    };
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase environment variables are missing for this admin action.');
  }

  const { data: ingredient, error: ingredientError } = await supabase
    .from('ingredients')
    .select('id')
    .eq('source', source)
    .eq('handle', handle)
    .single<Pick<IngredientRow, 'id'>>();

  if (ingredientError) {
    throw ingredientError;
  }

  const productFilter = buildOrFilter('id', uniqueProductIds);
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, available, discontinued, name')
    .or(productFilter)
    .returns<Array<Pick<ProductRow, 'id' | 'available' | 'discontinued' | 'name'>>>();

  if (productsError) {
    throw productsError;
  }

  const productsById = new Map((products ?? []).map((product) => [product.id, product]));

  for (const productId of uniqueProductIds) {
    const product = productsById.get(productId);

    if (!product) {
      throw new Error('One or more selected products could not be found.');
    }

    if (!isProductLinkable(product)) {
      if (product.discontinued === true) {
        throw new Error(`Cannot link discontinued product: ${product.name}.`);
      }

      throw new Error(`Cannot link unavailable product: ${product.name}.`);
    }
  }

  const existingFilter = buildOrFilter('product_id', uniqueProductIds);
  const { data: existingLinks, error: existingLinksError } = await supabase
    .from('ingredient_product_links')
    .select('id, product_id')
    .eq('ingredient_id', ingredient.id)
    .or(existingFilter)
    .returns<Array<Pick<IngredientProductLinkRow, 'id' | 'product_id'>>>();

  if (existingLinksError) {
    throw existingLinksError;
  }

  const existingProductIds = new Set((existingLinks ?? []).map((link) => link.product_id));
  const productIdsToInsert = uniqueProductIds.filter((productId) => !existingProductIds.has(productId));

  if (productIdsToInsert.length === 0) {
    return {
      createdLinks: [],
      existingCount: uniqueProductIds.length
    };
  }

  const { data, error } = await supabase
    .from('ingredient_product_links')
    .insert(
      productIdsToInsert.map((productId) => ({
        ingredient_id: ingredient.id,
        product_id: productId,
        created_by_user_id: createdByUserId
      }))
    )
    .select('id, product_id, priority, created_by_user_id, created_at, updated_at')
    .returns<
      Array<
        Pick<
          IngredientProductLinkRow,
          'id' | 'product_id' | 'priority' | 'created_by_user_id' | 'created_at' | 'updated_at'
        >
      >
    >();

  if (error) {
    throw error;
  }

  return {
    createdLinks: (data ?? []).map((row) => ({
      createdAt: row.created_at,
      createdByUserId: row.created_by_user_id ?? createdByUserId,
      linkId: row.id,
      priority: row.priority,
      productId: row.product_id,
      updatedAt: row.updated_at
    })),
    existingCount: existingProductIds.size
  };
}