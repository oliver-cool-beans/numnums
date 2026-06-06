import { PageHeader } from '@/components/layout/page-header';
import { ImportActivityChart } from '@/components/layout/import-activity-chart';
import { SetupNotice } from '@/components/layout/setup-notice';
import { ServerPagination } from '@/components/tables/server-pagination';
import { TableCard } from '@/components/tables/table-card';
import { Badge } from '@/components/ui/badge';
import { getImportsPageData } from '@/server/dashboard/get-dashboard-stats';

export const dynamic = 'force-dynamic';

type SearchState = {
  page?: string;
};

function parsePageNumber(value: string | undefined) {
  const page = Number.parseInt(value ?? '', 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function buildImportsPath(page: number) {
  return page > 1 ? `/imports?page=${page}` : '/imports';
}

function formatImportValue(value: number | null) {
  return (value ?? 0).toLocaleString();
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return 'No completed run yet';
  }

  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function getImportLabel(importType: string) {
  return importType === 'everyplate_recipes' ? 'Recipe import' : 'Product import';
}

export default async function ImportsPage({
  searchParams
}: {
  searchParams: Promise<SearchState>;
}) {
  const resolvedSearchParams = await searchParams;
  const currentPage = parsePageNumber(resolvedSearchParams.page);
  const stats = await getImportsPageData(currentPage);
  const importChartData = stats.latestImports
    .slice(0, 6)
    .reverse()
    .map((run) => ({
      label: run.importType === 'everyplate_recipes' ? 'Recipes' : 'Products',
      created: run.recordsInserted ?? 0,
      updated: run.recordsUpdated ?? 0
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        description="Track the latest product and recipe imports, including how many rows were seen, created, and updated during each run."
        eyebrow="Imports"
        title="Import health and recent runs"
      />
      <SetupNotice errorMessage={stats.errorMessage} status={stats.status} />

      <section className="dashboard-grid xl:grid-cols-2">
        <TableCard
          description="Most recent product import outcome for the ALDI catalogue feed."
          title="Latest product import"
        >
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 sm:col-span-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">ALDI product run</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatTimestamp(stats.latestImportsByType.products?.completedAt ?? null)}</p>
                </div>
                <Badge variant="outline">{stats.latestImportsByType.products?.status ?? 'not run yet'}</Badge>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Seen</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {formatImportValue(stats.latestImportsByType.products?.recordsSeen ?? null)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Created</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {formatImportValue(stats.latestImportsByType.products?.recordsInserted ?? null)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Updated</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {formatImportValue(stats.latestImportsByType.products?.recordsUpdated ?? null)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Status</p>
              <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                {stats.latestImportsByType.products?.status ?? 'Not run'}
              </p>
            </div>
          </div>
        </TableCard>

        <TableCard
          description="Most recent recipe import outcome for the EveryPlate recipe feed."
          title="Latest recipe import"
        >
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 sm:col-span-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">EveryPlate recipe run</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatTimestamp(stats.latestImportsByType.recipes?.completedAt ?? null)}</p>
                </div>
                <Badge variant="outline">{stats.latestImportsByType.recipes?.status ?? 'not run yet'}</Badge>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Seen</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {formatImportValue(stats.latestImportsByType.recipes?.recordsSeen ?? null)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Created</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {formatImportValue(stats.latestImportsByType.recipes?.recordsInserted ?? null)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Updated</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {formatImportValue(stats.latestImportsByType.recipes?.recordsUpdated ?? null)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Status</p>
              <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                {stats.latestImportsByType.recipes?.status ?? 'Not run'}
              </p>
            </div>
          </div>
        </TableCard>
      </section>

      <TableCard
        description="Recent created and updated counts charted with the same reporting library foundation now used on the dashboard."
        title="Import throughput"
      >
        <ImportActivityChart data={importChartData} />
      </TableCard>

      <TableCard
        description="Recent product and recipe import runs in reverse chronological order."
        title="Recent runs"
      >
        <div className="space-y-4">
          {stats.latestImports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No import runs are visible yet.</p>
          ) : (
            stats.latestImports.map((run) => (
              <div key={run.id} className="rounded-xl border border-border bg-background px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{getImportLabel(run.importType)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Completed: {formatTimestamp(run.completedAt)}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Seen {formatImportValue(run.recordsSeen)} · Created {formatImportValue(run.recordsInserted)} · Updated {formatImportValue(run.recordsUpdated)}
                    </p>
                  </div>
                  <Badge variant="outline">{run.status}</Badge>
                </div>
              </div>
            ))
          )}
          {(stats.hasPreviousPage || stats.hasNextPage) ? (
            <ServerPagination
              currentPage={stats.page}
              hasNextPage={stats.hasNextPage}
              hasPreviousPage={stats.hasPreviousPage}
              nextHref={buildImportsPath(stats.page + 1)}
              previousHref={buildImportsPath(stats.page - 1)}
              summary={`Showing ${stats.latestImports.length} import run${stats.latestImports.length === 1 ? '' : 's'}`}
            />
          ) : null}
        </div>
      </TableCard>
    </div>
  );
}
