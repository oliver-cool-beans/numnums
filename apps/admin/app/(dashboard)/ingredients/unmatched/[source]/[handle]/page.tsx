import { PageHeader } from '@/components/layout/page-header';
import { SetupNotice } from '@/components/layout/setup-notice';
import { getIngredientReview } from '@/server/ingredients/get-ingredient-review';
import { parseDeferredReviewKeys, parseIngredientReviewTab } from '@/server/ingredients/review-path';

import { IngredientReviewContent } from './ingredient-review-content';

export const dynamic = 'force-dynamic';

export default async function IngredientReviewPage({
  params,
  searchParams
}: {
  params: Promise<{ source: string; handle: string }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
    linkedPage?: string;
    recipePage?: string;
    tab?: string;
    notice?: string;
    error?: string;
    defer?: string | string[];
  }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const deferredKeys = parseDeferredReviewKeys(resolvedSearchParams.defer);
  const activeTab = parseIngredientReviewTab(resolvedSearchParams.tab);
  const page = Number.parseInt(resolvedSearchParams.page ?? '', 10);
  const linkedPage = Number.parseInt(resolvedSearchParams.linkedPage ?? '', 10);
  const recipePage = Number.parseInt(resolvedSearchParams.recipePage ?? '', 10);
  const result = await getIngredientReview(
    resolvedParams.source,
    resolvedParams.handle,
    {
      searchQuery: resolvedSearchParams.q,
      productPage: Number.isFinite(page) && page > 0 ? page : 1,
      deferredKeys,
      activeTab,
      recipePage: Number.isFinite(recipePage) && recipePage > 0 ? recipePage : 1,
      linkedPage: Number.isFinite(linkedPage) && linkedPage > 0 ? linkedPage : 1
    }
  );

  if (result.status === 'ready' && result.data) {
    return (
      <IngredientReviewContent
        data={result.data}
        error={resolvedSearchParams.error ?? null}
        notice={resolvedSearchParams.notice ?? null}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="This ingredient-linking route depends on the matching tables being available through the admin Data API policies."
        eyebrow="Ingredient linking"
        title="Ingredient linking"
      />
      <SetupNotice errorMessage={result.errorMessage} status={result.status} />
    </div>
  );
}
