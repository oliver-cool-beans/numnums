import { BookOpen, CheckCircle2, Clock3, ListTodo } from 'lucide-react';

import { HeaderStat } from '@/components/layout/header-stat';
import { PageHeader } from '@/components/layout/page-header';
import { SetupNotice } from '@/components/layout/setup-notice';
import { ServerPagination } from '@/components/tables/server-pagination';
import { TableCard } from '@/components/tables/table-card';
import { Badge } from '@/components/ui/badge';
import { listIngredientLinks } from '@/server/ingredients/ingredient-links';

import { IngredientLinksTable } from './ingredient-links-table';
import { NoticeCard } from './notice-card';

export const dynamic = 'force-dynamic';

type SearchState = {
  page?: string;
  notice?: string;
  error?: string;
};

function parsePageNumber(value: string | undefined) {
  const page = Number.parseInt(value ?? '', 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function buildIngredientLinksPath(page: number) {
  return page > 1 ? `/ingredients/links?page=${page}` : '/ingredients/links';
}

export default async function IngredientLinksPage({
  searchParams
}: {
  searchParams: Promise<SearchState>;
}) {
  const resolvedSearchParams = await searchParams;
  const currentPage = parsePageNumber(resolvedSearchParams.page);
  const result = await listIngredientLinks({
    page: currentPage
  });
  const availabilityRisk = result.counts.unavailable;

  return (
    <div className="space-y-6">
      <PageHeader
        description="Maintain the live and rejected product matches already connected to recipe ingredients. Use this page to remove bad links, adjust priority, and review unsafe matches."
        eyebrow="Live matches"
        title="Match maintenance"
      />
      <SetupNotice errorMessage={result.errorMessage} status={result.status} />
      {resolvedSearchParams.notice ? <NoticeCard message={resolvedSearchParams.notice} tone="notice" /> : null}
      {resolvedSearchParams.error ? <NoticeCard message={resolvedSearchParams.error} tone="error" /> : null}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={availabilityRisk > 0 ? 'default' : 'outline'}>
            {availabilityRisk} availability risk{availabilityRisk === 1 ? '' : 's'}
          </Badge>
          <Badge variant="outline">Page {result.page}</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <HeaderStat icon={ListTodo} label="Visible links" value={result.items.length} />
          <HeaderStat icon={CheckCircle2} label="Live" value={result.counts.live} />
          <HeaderStat icon={Clock3} label="Unavailable" value={result.counts.unavailable} />
          <HeaderStat icon={BookOpen} label="Risk" value={availabilityRisk} />
        </div>
      </div>

      <TableCard
        description="Review the latest live links, update priority, or delete bad matches without loading the full link table into memory."
        title="Existing matches"
      >
        <div className="space-y-4">
          <IngredientLinksTable items={result.items} search={{ page: result.page }} />
          {(result.hasPreviousPage || result.hasNextPage) ? (
            <ServerPagination
              currentPage={result.page}
              hasNextPage={result.hasNextPage}
              hasPreviousPage={result.hasPreviousPage}
              nextHref={buildIngredientLinksPath(result.page + 1)}
              previousHref={buildIngredientLinksPath(result.page - 1)}
              summary={`Showing ${result.items.length} link row${result.items.length === 1 ? '' : 's'}`}
            />
          ) : null}
        </div>
      </TableCard>
    </div>
  );
}