'use client';

import Link from 'next/link';
import { MoreHorizontal, Search, SlidersHorizontal } from 'lucide-react';

import {
  HeaderSelectCheckbox,
  RowSelectCheckbox,
  useSelectableIds
} from '@/components/tables/selectable-table';
import { Badge } from '@/components/ui/badge';
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
import {
  TableRowActionSubmitItem,
  TableRowActionsCell,
  TableRowActionsHeader,
  TableRowActionsMenu
} from '@/components/tables/row-actions-menu';
import type { IngredientLinkSummary } from '@/server/db/types';
import { getIngredientReviewPath } from '@/server/ingredients/review-path';

import {
  bulkDeleteIngredientLinksAction,
  deleteIngredientLinkAction,
  updateIngredientLinkPriorityAction
} from './actions';

type SearchState = {
  page?: number | string;
  source?: string;
  retailer?: string;
  handle?: string;
  product?: string;
};

type IngredientLinksTableProps = {
  availableSources?: string[];
  items: IngredientLinkSummary[];
  search: SearchState;
};

function formatCompactTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium'
  }).format(new Date(value));
}

function buildIngredientLinksPath(state: SearchState) {
  const params = new URLSearchParams();

  if (state.source) {
    params.set('source', state.source);
  }

  if (state.retailer) {
    params.set('retailer', state.retailer);
  }

  if (state.handle) {
    params.set('handle', state.handle);
  }

  if (state.product) {
    params.set('product', state.product);
  }

  const query = params.toString();

  return query ? `/ingredients/links?${query}` : '/ingredients/links';
}

function countActiveFilters(state: SearchState) {
  return [state.source].filter(Boolean).length;
}

function ReturnFilterInputs({ search }: { search: SearchState }) {
  return (
    <>
      <input name="returnSource" type="hidden" value={search.source ?? ''} />
      <input name="returnRetailer" type="hidden" value={search.retailer ?? ''} />
      <input name="returnHandle" type="hidden" value={search.handle ?? ''} />
      <input name="returnProduct" type="hidden" value={search.product ?? ''} />
    </>
  );
}

function BulkActionsMenu({
  deleteEligibleIds,
  search
}: {
  deleteEligibleIds: string[];
  search: SearchState;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" type="button" variant="outline">
          <MoreHorizontal className="h-4 w-4" />
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Bulk actions</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <form action={bulkDeleteIngredientLinksAction}>
          <ReturnFilterInputs search={search} />
          {deleteEligibleIds.map((linkId) => (
            <input key={`delete-${linkId}`} name="linkIds" type="hidden" value={linkId} />
          ))}
          <TableRowActionSubmitItem disabled={deleteEligibleIds.length === 0} loadingText="Deleting selected" tone="destructive">
            Delete selected
          </TableRowActionSubmitItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RowActionsMenu({ item, search }: { item: IngredientLinkSummary; search: SearchState }) {
  return (
    <TableRowActionsMenu>
        <form action={deleteIngredientLinkAction}>
          <input name="linkId" type="hidden" value={item.linkId} />
          <ReturnFilterInputs search={search} />
          <TableRowActionSubmitItem loadingText="Deleting" tone="destructive">Delete</TableRowActionSubmitItem>
        </form>
    </TableRowActionsMenu>
  );
}

export function IngredientLinksTable({ availableSources = [], items, search }: IngredientLinksTableProps) {
  const itemById = new Map(items.map((item) => [item.linkId, item]));
  const selectableLinkIds = items.map((item) => item.linkId);
  const {
    allSelected,
    selectAllRef,
    selectedIds: selectedLinkIds,
    setSelectedIds,
    toggleAll
  } = useSelectableIds(selectableLinkIds);
  const selectedItems = selectedLinkIds.flatMap((linkId) => {
    const item = itemById.get(linkId);
    return item ? [item] : [];
  });
  const deleteEligibleIds = selectedItems.map((item) => item.linkId);
  const searchQuery = search.handle ?? search.product ?? '';
  const activeFilterCount = countActiveFilters(search);

  return (
    <div className="space-y-4">
      <AdminTableToolbar>
        <form action="/ingredients/links" className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-7 rounded-lg border-input bg-transparent pl-8 shadow-none"
              defaultValue={searchQuery}
              name="handle"
              placeholder="Search handles or products..."
              type="search"
            />
          </div>
          <input name="source" type="hidden" value={search.source ?? ''} />
          <SubmitButton loadingText="Searching" size="sm" variant="outline">Search</SubmitButton>
        </form>

        <div className="flex flex-wrap items-center justify-end gap-2 xl:ml-auto">
          {selectedLinkIds.length > 0 ? (
            <span className="text-sm text-muted-foreground">
              {selectedLinkIds.length} selected
            </span>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" type="button" variant="outline">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 ? <span>{activeFilterCount}</span> : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Filter matches</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Ingredient source</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href={buildIngredientLinksPath({ ...search, source: undefined })}>All sources</Link>
                  </DropdownMenuItem>
                  {availableSources.map((source) => (
                    <DropdownMenuItem asChild key={source}>
                      <Link href={buildIngredientLinksPath({ ...search, source })}>
                        {source}
                        {search.source === source ? ' - active' : ''}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/ingredients/links">Clear all filters</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {selectedLinkIds.length > 0 ? (
            <BulkActionsMenu
              deleteEligibleIds={deleteEligibleIds}
              search={search}
            />
          ) : null}
        </div>
      </AdminTableToolbar>

      <AdminTable>
        <AdminTableHeader>
          <AdminTableRow>
            <AdminTableHead className="w-12">
              <HeaderSelectCheckbox
                allSelected={allSelected}
                ariaLabel="Select all links"
                onChange={toggleAll}
                selectAllRef={selectAllRef}
              />
            </AdminTableHead>
            <AdminTableHead>Source</AdminTableHead>
            <AdminTableHead className="w-[190px]">Ingredient handle</AdminTableHead>
            <AdminTableHead className="w-[260px]">Product</AdminTableHead>
            <AdminTableHead className="w-[150px]">Retailer</AdminTableHead>
            <AdminTableHead className="w-[80px]">Recipes</AdminTableHead>
            <AdminTableHead className="w-[150px]">Priority</AdminTableHead>
            <AdminTableHead className="w-[160px]">Created</AdminTableHead>
            <TableRowActionsHeader />
          </AdminTableRow>
        </AdminTableHeader>
        <AdminTableBody>
          {items.length === 0 ? (
            <AdminTableEmptyState colSpan={9}>No links match the current filters.</AdminTableEmptyState>
          ) : (
            items.map((item) => {
              const isSelected = selectedLinkIds.includes(item.linkId);

              return (
                <AdminTableRow data-state={isSelected ? 'selected' : undefined} key={item.linkId}>
                  <AdminTableCell>
                    <RowSelectCheckbox
                      ariaLabel={`Select ${item.ingredientHandle}`}
                      checked={isSelected}
                      onChange={(checked) => {
                        setSelectedIds((currentSelection) => {
                          if (checked) {
                            return [...currentSelection, item.linkId];
                          }

                          return currentSelection.filter((linkId) => linkId !== item.linkId);
                        });
                      }}
                    />
                  </AdminTableCell>
                  <AdminTableCell>
                    <Badge className="uppercase" variant="outline">
                      {item.ingredientSource}
                    </Badge>
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className="space-y-1">
                      <p className="font-mono text-xs text-foreground">{item.ingredientHandle}</p>
                      <Link
                        className="text-xs font-medium text-emerald-700 underline-offset-4 hover:underline"
                        href={getIngredientReviewPath({ source: item.ingredientSource, handle: item.ingredientHandle })}
                      >
                        Review
                      </Link>
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{item.productName}</p>
                      {item.productBrand ? <p className="text-xs text-muted-foreground">{item.productBrand}</p> : null}
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge className="uppercase" variant="outline">
                        {item.productSource}
                      </Badge>
                      {item.productLinkable === false ? <Badge variant="destructive">Unavailable</Badge> : null}
                    </div>
                  </AdminTableCell>
                  <AdminTableCell className="text-sm text-muted-foreground">{item.recipeCount}</AdminTableCell>
                  <AdminTableCell>
                    <form action={updateIngredientLinkPriorityAction} className="flex items-center gap-2">
                      <input name="linkId" type="hidden" value={item.linkId} />
                      <ReturnFilterInputs search={search} />
                      <Input className="h-8 w-16" defaultValue={String(item.priority)} min={0} name="priority" type="number" />
                      <SubmitButton loadingText="Saving" size="sm" variant="outline">
                        Save
                      </SubmitButton>
                    </form>
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className="space-y-1">
                      <Badge variant="default">Live</Badge>
                      <p className="text-xs text-muted-foreground">Created {formatCompactTimestamp(item.createdAt)}</p>
                    </div>
                  </AdminTableCell>
                  <TableRowActionsCell>
                    <RowActionsMenu item={item} search={search} />
                  </TableRowActionsCell>
                </AdminTableRow>
              );
            })
          )}
        </AdminTableBody>
      </AdminTable>
    </div>
  );
}