'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireAdminUser } from '@/server/auth/admin-access';
import {
  bulkCreateIngredientProductLinks,
  createIngredientProductLink,
  getNextIngredientNavigation,
  setIngredientPantryStatus,
  type NextIngredientNavigation
} from '@/server/ingredients/get-ingredient-review';
import { deleteIngredientProductLink } from '@/server/ingredients/ingredient-links';
import {
  getIngredientReviewPath,
  parseDeferredReviewKeys,
  parseIngredientReviewTab
} from '@/server/ingredients/review-path';

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === 'string' ? value.trim() : '';
}

function buildRedirectPath(input: {
  source: string;
  handle: string;
  searchQuery: string;
  page: number;
  linkedPage?: number;
  recipePage?: number;
  tab: 'search' | 'matches' | 'recipes';
  deferredKeys: string[];
  notice?: string;
  error?: string;
}) {
  return getIngredientReviewPath(input);
}

function revalidateIngredientReviewPaths(source: string, handle: string) {
  revalidatePath('/ingredients/links');
  revalidatePath('/ingredients/unmatched');
  revalidatePath('/recipes');
  revalidatePath(getIngredientReviewPath({ source, handle }));
}

export async function setIngredientPantryStatusAction(formData: FormData) {
  await requireAdminUser();

  const source = getRequiredString(formData, 'source');
  const handle = getRequiredString(formData, 'handle');
  const searchQuery = getRequiredString(formData, 'searchQuery');
  const page = Number.parseInt(getRequiredString(formData, 'page'), 10);
  const linkedPage = Number.parseInt(getRequiredString(formData, 'linkedPage'), 10);
  const recipePage = Number.parseInt(getRequiredString(formData, 'recipePage'), 10);
  const tab = parseIngredientReviewTab(getRequiredString(formData, 'tab') || undefined);
  const deferredKeys = parseDeferredReviewKeys(
    formData.getAll('defer').flatMap((value) => (typeof value === 'string' ? [value] : []))
  );
  const pantryValue = getRequiredString(formData, 'isPantry');
  const isPantry = pantryValue === 'true';
  const currentPage = Number.isFinite(page) && page > 0 ? page : 1;
  const currentLinkedPage = Number.isFinite(linkedPage) && linkedPage > 0 ? linkedPage : 1;
  const currentRecipePage = Number.isFinite(recipePage) && recipePage > 0 ? recipePage : 1;

  if (!source || !handle || (pantryValue !== 'true' && pantryValue !== 'false')) {
    redirect(
      buildRedirectPath({
        source,
        handle,
        searchQuery,
        page: currentPage,
        linkedPage: currentLinkedPage,
        recipePage: currentRecipePage,
        tab,
        deferredKeys,
        error: 'Missing pantry update parameters.'
      })
    );
  }

  await setIngredientPantryStatus({ source, handle, isPantry });

  revalidateIngredientReviewPaths(source, handle);

  redirect(
    buildRedirectPath({
      source,
      handle,
      searchQuery,
      page: currentPage,
      linkedPage: currentLinkedPage,
      recipePage: currentRecipePage,
      tab,
      deferredKeys,
      notice: isPantry ? 'Ingredient marked as pantry.' : 'Pantry status removed.'
    })
  );
}

type CreatedLink = {
  createdAt: string;
  createdByUserId: string;
  linkId: string;
  priority: number;
  productId: string;
  updatedAt: string;
};

type CreateIngredientProductLinkActionResult =
  | {
      createdLink: CreatedLink | null;
      error: null;
      notice: string;
      ok: true;
    }
  | {
      createdLink: null;
      error: string;
      notice: null;
      ok: false;
    };

export async function createIngredientProductLinkAction(
  formData: FormData
): Promise<CreateIngredientProductLinkActionResult> {
  const user = await requireAdminUser();

  const source = getRequiredString(formData, 'source');
  const handle = getRequiredString(formData, 'handle');
  const productId = getRequiredString(formData, 'productId');

  if (!source || !handle || !productId) {
    return {
      createdLink: null,
      error: 'Missing link parameters.',
      notice: null,
      ok: false
    };
  }

  try {
    const result = await createIngredientProductLink({
      source,
      handle,
      productId,
      createdByUserId: user.id
    });

    revalidateIngredientReviewPaths(source, handle);

    return {
      createdLink:
        result.status === 'created'
          ? {
              createdAt: result.createdAt,
              createdByUserId: result.createdByUserId,
              linkId: result.linkId,
              priority: result.priority,
              productId,
              updatedAt: result.updatedAt
            }
          : null,
      error: null,
      notice:
        result.status === 'created'
          ? 'Link created and live.'
          : 'Product is already linked live for this ingredient.',
      ok: true
    };
  } catch (error) {
    return {
      createdLink: null,
      error: error instanceof Error ? error.message : 'Linking failed.',
      notice: null,
      ok: false
    };
  }
}

function getProductIds(formData: FormData) {
  return [
    ...new Set(
      formData
        .getAll('productIds')
        .flatMap((value) => (typeof value === 'string' && value.trim() ? [value.trim()] : []))
    )
  ];
}

type BulkCreateIngredientProductLinkActionResult =
  | {
      createdLinks: CreatedLink[];
      error: null;
      notice: string;
      ok: true;
    }
  | {
      createdLinks: [];
      error: string;
      notice: null;
      ok: false;
    };

export async function bulkCreateIngredientProductLinkAction(
  formData: FormData
): Promise<BulkCreateIngredientProductLinkActionResult> {
  const user = await requireAdminUser();

  const source = getRequiredString(formData, 'source');
  const handle = getRequiredString(formData, 'handle');
  const productIds = getProductIds(formData);

  if (!source || !handle || productIds.length === 0) {
    return {
      createdLinks: [],
      error: 'Select at least one product to create links.',
      notice: null,
      ok: false
    };
  }

  try {
    const result = await bulkCreateIngredientProductLinks({
      source,
      handle,
      productIds,
      createdByUserId: user.id
    });

    revalidateIngredientReviewPaths(source, handle);

    const linkedCount = result.createdLinks.length;
    const existingCount = result.existingCount;

    const noticeParts = [`${linkedCount} ${linkedCount === 1 ? 'link is' : 'links are'} now live.`];

    if (existingCount > 0) {
      noticeParts.push(`${existingCount} already ${existingCount === 1 ? 'was' : 'were'} live.`);
    }

    return {
      createdLinks: result.createdLinks,
      error: null,
      notice: noticeParts.join(' '),
      ok: true
    };
  } catch (error) {
    return {
      createdLinks: [],
      error: error instanceof Error ? error.message : 'Bulk linking failed.',
      notice: null,
      ok: false
    };
  }
}

export async function rejectIngredientProductLinkAction(formData: FormData) {
  await requireAdminUser();

  const source = getRequiredString(formData, 'source');
  const handle = getRequiredString(formData, 'handle');
  const linkId = getRequiredString(formData, 'linkId');
  const searchQuery = getRequiredString(formData, 'searchQuery');
  const page = Number.parseInt(getRequiredString(formData, 'page'), 10);
  const linkedPage = Number.parseInt(getRequiredString(formData, 'linkedPage'), 10);
  const tab = parseIngredientReviewTab(getRequiredString(formData, 'tab') || undefined);
  const deferredKeys = parseDeferredReviewKeys(
    formData.getAll('defer').flatMap((value) => (typeof value === 'string' ? [value] : []))
  );
  const currentPage = Number.isFinite(page) && page > 0 ? page : 1;
  const currentLinkedPage = Number.isFinite(linkedPage) && linkedPage > 0 ? linkedPage : 1;

  if (!source || !handle || !linkId) {
    redirect(
      buildRedirectPath({
        source,
        handle,
        searchQuery,
        page: currentPage,
        linkedPage: currentLinkedPage,
        tab,
        deferredKeys,
        error: 'Missing link rejection parameters.'
      })
    );
  }

  await deleteIngredientProductLink(linkId);

  revalidateIngredientReviewPaths(source, handle);

  redirect(
    buildRedirectPath({
      source,
      handle,
      searchQuery,
      page: currentPage,
      linkedPage: currentLinkedPage,
      tab,
      deferredKeys,
      notice: 'Link deleted.'
    })
  );
}

export async function loadNextIngredientNavigationAction(input: {
  source: string;
  handle: string;
  deferredKeys: string[];
}): Promise<NextIngredientNavigation> {
  await requireAdminUser();

  return getNextIngredientNavigation(input.source, input.handle, input.deferredKeys);
}