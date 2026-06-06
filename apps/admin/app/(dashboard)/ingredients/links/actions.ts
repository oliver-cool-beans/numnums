'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireAdminUser } from '@/server/auth/admin-access';
import {
  bulkDeleteIngredientProductLinks,
  deleteIngredientProductLink,
  updateIngredientProductLinkPriority
} from '@/server/ingredients/ingredient-links';
import { getIngredientReviewPath } from '@/server/ingredients/review-path';

type IngredientLinksRedirectState = {
  page?: string;
  notice?: string;
  error?: string;
};

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === 'string' ? value.trim() : '';
}

function getRedirectState(formData: FormData): IngredientLinksRedirectState {
  return {
    page: getRequiredString(formData, 'returnPage') || undefined
  };
}

function buildIngredientLinksPath(state: IngredientLinksRedirectState) {
  const params = new URLSearchParams();

  if (state.page) {
    params.set('page', state.page);
  }

  if (state.notice) {
    params.set('notice', state.notice);
  }

  if (state.error) {
    params.set('error', state.error);
  }

  const query = params.toString();

  return query ? `/ingredients/links?${query}` : '/ingredients/links';
}

function revalidateIngredientLinkPaths(source: string, handle: string) {
  revalidatePath('/ingredients/links');
  revalidatePath('/ingredients/unmatched');
  revalidatePath(getIngredientReviewPath({ source, handle }));
}

function getLinkIds(formData: FormData) {
  return [
    ...new Set(
      formData
        .getAll('linkIds')
        .flatMap((value) => (typeof value === 'string' && value.trim() ? [value.trim()] : []))
    )
  ];
}

export async function updateIngredientLinkStatusAction(formData: FormData) {
  redirect(buildIngredientLinksPath({ error: 'Status changes are no longer supported for live links.' }));
}

export async function bulkUpdateIngredientLinkStatusAction(formData: FormData) {
  redirect(buildIngredientLinksPath({ error: 'Status changes are no longer supported for live links.' }));
}

export async function updateIngredientLinkPriorityAction(formData: FormData) {
  await requireAdminUser();

  const linkId = getRequiredString(formData, 'linkId');
  const priorityValue = Number.parseInt(getRequiredString(formData, 'priority'), 10);
  const redirectState = getRedirectState(formData);

  if (!linkId || !Number.isFinite(priorityValue) || priorityValue < 0) {
    redirect(
      buildIngredientLinksPath({
        ...redirectState,
        error: 'Priority must be a whole number greater than or equal to zero.'
      })
    );
  }

  const result = await updateIngredientProductLinkPriority({
    linkId,
    priority: priorityValue
  });

  revalidateIngredientLinkPaths(result.source, result.handle);

  redirect(buildIngredientLinksPath({ ...redirectState, notice: 'Link priority updated.' }));
}

export async function deleteIngredientLinkAction(formData: FormData) {
  await requireAdminUser();

  const linkId = getRequiredString(formData, 'linkId');
  const redirectState = getRedirectState(formData);

  if (!linkId) {
    redirect(buildIngredientLinksPath({ ...redirectState, error: 'Missing link id for deletion.' }));
  }

  const result = await deleteIngredientProductLink(linkId);

  revalidateIngredientLinkPaths(result.source, result.handle);

  redirect(buildIngredientLinksPath({ ...redirectState, notice: 'Link deleted.' }));
}

export async function bulkDeleteIngredientLinksAction(formData: FormData) {
  await requireAdminUser();

  const redirectState = getRedirectState(formData);
  const linkIds = getLinkIds(formData);

  if (linkIds.length === 0) {
    redirect(buildIngredientLinksPath({ ...redirectState, error: 'Select at least one link to delete.' }));
  }

  const results = await bulkDeleteIngredientProductLinks(linkIds);

  for (const result of results) {
    revalidateIngredientLinkPaths(result.source, result.handle);
  }

  redirect(buildIngredientLinksPath({ ...redirectState, notice: `${linkIds.length} links deleted.` }));
}