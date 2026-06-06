export type IngredientReviewTab = 'search' | 'matches' | 'recipes';

type IngredientReviewPathArgs = {
  source: string;
  handle: string;
  searchQuery?: string | null;
  page?: number | null;
  linkedPage?: number | null;
  recipePage?: number | null;
  tab?: IngredientReviewTab | null;
  notice?: string | null;
  error?: string | null;
  deferredKeys?: string[] | null;
};

export function parseIngredientReviewTab(value: string | undefined): IngredientReviewTab {
  return value === 'matches' || value === 'recipes' ? value : 'search';
}

export function parseDeferredReviewKeys(value: string | string[] | undefined) {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];

  return [...new Set(values.flatMap((item) => item.split(',')).map((item) => item.trim()).filter(Boolean))];
}

export function getIngredientReviewPath({
  source,
  handle,
  searchQuery,
  page,
  linkedPage,
  recipePage,
  tab,
  notice,
  error,
  deferredKeys
}: IngredientReviewPathArgs) {
  const params = new URLSearchParams();
  const resolvedTab = tab ?? 'search';

  if (searchQuery?.trim()) {
    params.set('q', searchQuery.trim());
  }

  if (Number.isFinite(page) && page && page > 1) {
    params.set('page', String(Math.floor(page)));
  }

  if (resolvedTab !== 'search') {
    params.set('tab', resolvedTab);
  }

  if (resolvedTab === 'matches' && Number.isFinite(linkedPage) && linkedPage && linkedPage > 1) {
    params.set('linkedPage', String(Math.floor(linkedPage)));
  }

  if (resolvedTab === 'recipes' && Number.isFinite(recipePage) && recipePage && recipePage > 1) {
    params.set('recipePage', String(Math.floor(recipePage)));
  }

  if (notice) {
    params.set('notice', notice);
  }

  if (error) {
    params.set('error', error);
  }

  for (const deferredKey of deferredKeys ?? []) {
    params.append('defer', deferredKey);
  }

  const path = `/ingredients/unmatched/${encodeURIComponent(source)}/${encodeURIComponent(handle)}`;
  const query = params.toString();

  return query ? `${path}?${query}` : path;
}