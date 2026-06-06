import { BookOpen, CheckCircle2, ListTodo } from 'lucide-react';

import { HeaderStat } from '@/components/layout/header-stat';
import { PageHeader } from '@/components/layout/page-header';
import { SetupNotice } from '@/components/layout/setup-notice';
import { ServerPagination } from '@/components/tables/server-pagination';
import { TableCard } from '@/components/tables/table-card';
import { getIngredientReviewQueueSnapshot } from '@/server/ingredients/list-unmatched-ingredients';

import { ReviewQueueTable } from './review-queue-table';

export const dynamic = 'force-dynamic';

type SearchState = {
  page?: string;
};

function parsePageNumber(value: string | undefined) {
  const page = Number.parseInt(value ?? '', 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function buildUnmatchedIngredientsPath(page: number) {
  return page > 1 ? `/ingredients/unmatched?page=${page}` : '/ingredients/unmatched';
}

export default async function UnmatchedIngredientsPage({
  searchParams
}: {
  searchParams: Promise<SearchState>;
}) {
  const resolvedSearchParams = await searchParams;
  const currentPage = parsePageNumber(resolvedSearchParams.page);
  const snapshot = await getIngredientReviewQueueSnapshot(currentPage);
  const uniqueSources = new Set(snapshot.items.map((item) => item.source)).size;

  return (
    <div className="space-y-6">
      <PageHeader
        description="Ingredients that do not have live product links yet. Open an ingredient to inspect recipe context, search products, and create links directly."
        eyebrow="Ingredient linking"
        title="Ingredients to link"
      />
      <SetupNotice errorMessage={snapshot.errorMessage} status={snapshot.status} />

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <HeaderStat icon={ListTodo} label="Visible ingredients" value={snapshot.outstandingCount} />
          <HeaderStat icon={BookOpen} label="Recipe rows" value={snapshot.pendingRowCount} />
          <HeaderStat icon={CheckCircle2} label="Sources" value={uniqueSources} />
        </div>
      </div>

      <TableCard
        description="Ungrouped ingredients from the current loaded slice that still need product links. Open one to inspect recipe context, search the catalogue, and create links."
        title="Ingredient linking"
      >
        <div className="space-y-4">
          <ReviewQueueTable items={snapshot.items} />
          {(snapshot.hasPreviousPage || snapshot.hasNextPage) ? (
            <ServerPagination
              currentPage={snapshot.page}
              hasNextPage={snapshot.hasNextPage}
              hasPreviousPage={snapshot.hasPreviousPage}
              nextHref={buildUnmatchedIngredientsPath(snapshot.page + 1)}
              previousHref={buildUnmatchedIngredientsPath(snapshot.page - 1)}
              summary={`Showing ${snapshot.items.length} ingredient${snapshot.items.length === 1 ? '' : 's'}`}
            />
          ) : null}
        </div>
      </TableCard>
    </div>
  );
}