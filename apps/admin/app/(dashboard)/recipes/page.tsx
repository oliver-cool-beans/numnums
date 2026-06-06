import Link from 'next/link';
import { BookOpen, CheckCircle2, Clock3, ListTodo, Search, SlidersHorizontal } from 'lucide-react';

import { HeaderStat } from '@/components/layout/header-stat';
import { PageHeader } from '@/components/layout/page-header';
import { SetupNotice } from '@/components/layout/setup-notice';
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableEmptyState,
  AdminTableHead,
  AdminTableHeader,
  AdminTableRow,
  AdminTableToolbar
} from '@/components/tables/admin-table';
import { ServerPagination } from '@/components/tables/server-pagination';
import { TableCard } from '@/components/tables/table-card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { listRecipes } from '@/server/recipes/list-recipes';

export const dynamic = 'force-dynamic';

type SearchState = {
  source?: string;
  coverage?: 'linked' | 'unlinked';
  q?: string;
  page?: string;
};

function parsePageNumber(value: string | undefined) {
  const page = Number.parseInt(value ?? '', 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function buildRecipesPath(state: SearchState) {
  const params = new URLSearchParams();

  if (state.source) {
    params.set('source', state.source);
  }

  if (state.coverage) {
    params.set('coverage', state.coverage);
  }

  if (state.q) {
    params.set('q', state.q);
  }

  if (state.page && Number.parseInt(state.page, 10) > 1) {
    params.set('page', state.page);
  }

  const query = params.toString();
  return query ? `/recipes?${query}` : '/recipes';
}

function countActiveFilters(state: SearchState) {
  return [state.source, state.coverage].filter(Boolean).length;
}

function formatShortDate(value: string | null) {
  if (!value) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'short' }).format(new Date(value));
}

export default async function RecipesPage({
  searchParams
}: {
  searchParams: Promise<SearchState>;
}) {
  const resolvedSearchParams = await searchParams;
  const currentPage = parsePageNumber(resolvedSearchParams.page);
  const result = await listRecipes({
    source: resolvedSearchParams.source,
    query: resolvedSearchParams.q,
    coverage: resolvedSearchParams.coverage,
    page: currentPage
  });
  const fullyCoveredRecipes = result.items.filter((recipe) => recipe.ingredientCount > 0 && recipe.unlinkedIngredients === 0).length;
  const coveredRecipes = result.items.filter((recipe) => recipe.linkedIngredients > 0).length;
  const needsLinkingRecipes = result.items.filter((recipe) => recipe.unlinkedIngredients > 0).length;
  const availableSources = [...new Set(result.items.map((recipe) => recipe.source))].sort((left, right) => left.localeCompare(right));
  const activeFilterCount = countActiveFilters(resolvedSearchParams);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Review imported recipes, inspect the metadata driving ingredient extraction, and spot which recipes may still need more matching work."
        eyebrow="Recipes"
        title="Recipe coverage"
      />
      <SetupNotice errorMessage={result.errorMessage} status={result.status} />

      <div className="flex flex-wrap gap-2">
        <HeaderStat icon={BookOpen} label="Visible recipes" value={result.items.length} />
        <HeaderStat icon={CheckCircle2} label="Fully covered" value={fullyCoveredRecipes} />
        <HeaderStat icon={Clock3} label="With coverage" value={coveredRecipes} />
        <HeaderStat icon={ListTodo} label="Needs linking" value={needsLinkingRecipes} />
      </div>

      <TableCard
        description="Most recently updated recipe rows currently available to the admin portal. Search by recipe name or headline, then narrow by linking coverage."
        title="Imported recipes"
        toolbar={
          <AdminTableToolbar>
            <form action="/recipes" className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative w-full lg:w-80">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 rounded-lg border-input bg-transparent pl-8 shadow-none"
                  defaultValue={resolvedSearchParams.q}
                  name="q"
                  placeholder="Search recipe name or headline"
                  type="search"
                />
              </div>
              <input name="source" type="hidden" value={resolvedSearchParams.source ?? ''} />
              <input name="coverage" type="hidden" value={resolvedSearchParams.coverage ?? ''} />
              <SubmitButton loadingText="Searching" size="sm" variant="outline">Search</SubmitButton>
            </form>

            <div className="flex flex-wrap items-center justify-end gap-2 xl:ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" type="button" variant="outline">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 ? <span>{activeFilterCount}</span> : null}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Filter recipes</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Coverage</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-52">
                      <DropdownMenuItem asChild>
                        <Link href={buildRecipesPath({ ...resolvedSearchParams, coverage: undefined, page: undefined })}>All coverage states</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={buildRecipesPath({ ...resolvedSearchParams, coverage: 'linked', page: undefined })}>Fully covered</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={buildRecipesPath({ ...resolvedSearchParams, coverage: 'unlinked', page: undefined })}>Needs linking</Link>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Source</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-52">
                      <DropdownMenuItem asChild>
                        <Link href={buildRecipesPath({ ...resolvedSearchParams, source: undefined, page: undefined })}>All sources</Link>
                      </DropdownMenuItem>
                      {availableSources.map((source) => (
                        <DropdownMenuItem asChild key={source}>
                          <Link href={buildRecipesPath({ ...resolvedSearchParams, source, page: undefined })}>{source}</Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/recipes">Clear all filters</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button asChild size="sm" type="button" variant="ghost">
                <Link href="/recipes">Clear</Link>
              </Button>
            </div>
          </AdminTableToolbar>
        }
      >
        <AdminTable>
          <AdminTableHeader>
            <AdminTableRow>
              <AdminTableHead>Name</AdminTableHead>
              <AdminTableHead>Source</AdminTableHead>
              <AdminTableHead>Covered ingredients</AdminTableHead>
              <AdminTableHead>Created at</AdminTableHead>
              <AdminTableHead>Updated at</AdminTableHead>
            </AdminTableRow>
          </AdminTableHeader>
          <AdminTableBody>
            {result.items.length === 0 ? (
              <AdminTableEmptyState colSpan={5}>No recipes have been imported yet.</AdminTableEmptyState>
            ) : (
              result.items.map((recipe) => (
                <AdminTableRow key={recipe.id}>
                  <AdminTableCell>
                    <div>
                      <Link className="font-medium text-foreground underline-offset-4 hover:underline" href={`/recipes/${recipe.id}`}>
                        {recipe.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{recipe.headline ?? 'No headline'}</p>
                    </div>
                  </AdminTableCell>
                  <AdminTableCell className="uppercase text-muted-foreground">{recipe.source}</AdminTableCell>
                  <AdminTableCell className="text-sm font-medium text-foreground">
                    {recipe.linkedIngredients}/{recipe.ingredientCount}
                  </AdminTableCell>
                  <AdminTableCell className="text-sm text-muted-foreground">{formatShortDate(recipe.createdAt)}</AdminTableCell>
                  <AdminTableCell className="text-sm text-muted-foreground">{formatShortDate(recipe.updatedAt)}</AdminTableCell>
                </AdminTableRow>
              ))
            )}
          </AdminTableBody>
        </AdminTable>
        {(result.hasPreviousPage || result.hasNextPage) ? (
          <ServerPagination
            currentPage={result.page}
            hasNextPage={result.hasNextPage}
            hasPreviousPage={result.hasPreviousPage}
            nextHref={buildRecipesPath({ ...resolvedSearchParams, page: String(result.page + 1) })}
            previousHref={buildRecipesPath({ ...resolvedSearchParams, page: String(result.page - 1) })}
            summary={`Showing ${result.items.length} recipe${result.items.length === 1 ? '' : 's'}`}
          />
        ) : null}
      </TableCard>
    </div>
  );
}