'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, CheckCircle2, Clock3, ListTodo } from 'lucide-react';
import { useState } from 'react';

import { HeaderStat } from '@/components/layout/header-stat';
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableEmptyState,
  AdminTableHead,
  AdminTableHeader,
  AdminTableRow
} from '@/components/tables/admin-table';
import { ServerPagination } from '@/components/tables/server-pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { cn } from '@/lib/utils';
import type { IngredientLinkedProduct } from '@/server/db/types';
import type { IngredientReviewData } from '@/server/ingredients/get-ingredient-review';
import { getIngredientReviewPath, type IngredientReviewTab } from '@/server/ingredients/review-path';

import { rejectIngredientProductLinkAction, setIngredientPantryStatusAction } from './actions';
import { NextIngredientButton } from './next-ingredient-button';
import { ProductResultsTable } from './product-results-table';
import { RecipeMentionsTable } from './recipe-mentions-table';

function formatAuditTimestamp(value: string | null) {
  if (!value) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function buildAuditLabel(prefix: string, timestamp: string | null, userName: string | null) {
  const at = formatAuditTimestamp(timestamp);

  return userName ? `${prefix} ${at} by ${userName}` : `${prefix} ${at}`;
}

function ProductThumbnail({ alt, compact = false, src }: { alt: string; compact?: boolean; src: string | null }) {
  return (
    <div
      className={
        compact
          ? 'relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-background'
          : 'relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-background'
      }
    >
      {src ? (
        <Image alt={alt} className="object-cover" fill sizes={compact ? '48px' : '80px'} src={src} />
      ) : (
        <div className="flex h-full items-center justify-center text-xs font-medium text-muted-foreground">No image</div>
      )}
    </div>
  );
}

function NoticeCard({ tone, message }: { tone: 'notice' | 'error'; message: string }) {
  return (
    <Card className={tone === 'error' ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}>
      <CardContent className="p-4 text-sm font-medium text-foreground">{message}</CardContent>
    </Card>
  );
}

function buildIngredientReviewSearchPath(data: IngredientReviewData, page: number) {
  return getIngredientReviewPath({
    source: data.source,
    handle: data.handle,
    searchQuery: data.searchQuery,
    tab: 'search',
    page,
    deferredKeys: data.deferredKeys
  });
}

function buildIngredientReviewRecipesPath(data: IngredientReviewData, recipePage: number) {
  return getIngredientReviewPath({
    source: data.source,
    handle: data.handle,
    searchQuery: data.searchQuery,
    tab: 'recipes',
    recipePage,
    deferredKeys: data.deferredKeys
  });
}

function buildIngredientReviewMatchesPath(data: IngredientReviewData, linkedPage: number) {
  return getIngredientReviewPath({
    source: data.source,
    handle: data.handle,
    searchQuery: data.searchQuery,
    tab: 'matches',
    linkedPage,
    deferredKeys: data.deferredKeys
  });
}

function buildIngredientReviewTabPath(data: IngredientReviewData, tab: IngredientReviewTab) {
  return getIngredientReviewPath({
    source: data.source,
    handle: data.handle,
    searchQuery: data.searchQuery,
    tab,
    page: tab === 'search' ? data.productResultsPage : undefined,
    linkedPage: tab === 'matches' ? data.linkedProductsPage : undefined,
    recipePage: tab === 'recipes' ? data.recipeMentionsPage : undefined,
    deferredKeys: data.deferredKeys
  });
}

function CurrentMatches({
  deferredKeys,
  handle,
  hasNextPage,
  hasPreviousPage,
  links,
  linkedPage,
  nextHref,
  previousHref,
  searchQuery,
  source,
  tab
}: {
  deferredKeys: string[];
  handle: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  links: IngredientLinkedProduct[];
  linkedPage: number;
  nextHref: string;
  previousHref: string;
  searchQuery: string;
  source: string;
  tab: IngredientReviewTab;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Current matches</CardTitle>
        <CardDescription>Existing live links already created for this ingredient.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminTable>
          <AdminTableHeader>
            <AdminTableRow>
              <AdminTableHead>Product</AdminTableHead>
              <AdminTableHead>Retailer</AdminTableHead>
              <AdminTableHead>Audit</AdminTableHead>
              <AdminTableHead className="w-[220px]">Actions</AdminTableHead>
            </AdminTableRow>
          </AdminTableHeader>
          <AdminTableBody>
            {links.length === 0 ? (
              <AdminTableEmptyState colSpan={4}>No matches have been created yet.</AdminTableEmptyState>
            ) : (
              links.map((link) => (
                <AdminTableRow key={link.linkId}>
                  <AdminTableCell>
                    <div className="flex items-start gap-3">
                      <ProductThumbnail alt={link.name} compact src={link.imageUrl} />
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium text-foreground">{link.name}</p>
                        <p className="text-sm text-muted-foreground">{link.brand ?? 'Unbranded'}</p>
                      </div>
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>
                    <Badge className="uppercase" variant="outline">
                      {link.source}
                    </Badge>
                  </AdminTableCell>
                  <AdminTableCell className="text-xs text-muted-foreground">
                    <div className="space-y-1">
                      <p>{buildAuditLabel('Created', link.createdAt, link.createdByName)}</p>
                      <p>{link.linkable ? 'Live link' : 'Product currently unavailable'}</p>
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className="flex flex-wrap gap-2">
                      <form action={rejectIngredientProductLinkAction}>
                        <input name="source" type="hidden" value={source} />
                        <input name="handle" type="hidden" value={handle} />
                        <input name="linkId" type="hidden" value={link.linkId} />
                        <input name="searchQuery" type="hidden" value={searchQuery} />
                        <input name="page" type="hidden" value={1} />
                        <input name="linkedPage" type="hidden" value={linkedPage} />
                        <input name="tab" type="hidden" value={tab} />
                        {deferredKeys.map((deferredKey) => (
                          <input key={`defer-${link.linkId}-${deferredKey}`} name="defer" type="hidden" value={deferredKey} />
                        ))}
                        <SubmitButton loadingText="Deleting" variant="outline">
                          Delete
                        </SubmitButton>
                      </form>
                    </div>
                  </AdminTableCell>
                </AdminTableRow>
              ))
            )}
          </AdminTableBody>
        </AdminTable>
        {(hasPreviousPage || hasNextPage) ? (
          <ServerPagination
            currentPage={linkedPage}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            nextHref={nextHref}
            previousHref={previousHref}
            summary={`Showing ${links.length} live match${links.length === 1 ? '' : 'es'}`}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

export function IngredientReviewContent({
  data,
  error,
  notice
}: {
  data: IngredientReviewData;
  error: string | null;
  notice: string | null;
}) {
  const [existingLinkedProductIds, setExistingLinkedProductIds] = useState(data.existingLinkedProductIds);
  const [linkedProductCount, setLinkedProductCount] = useState(data.linkedProductCount);
  const existingLinksByProductId = Object.fromEntries(
    existingLinkedProductIds.map((productId) => [productId, true] as const)
  );
  const hasLinks = linkedProductCount > 0;
  const isResolved = hasLinks || data.isPantry;

  function handleLinksCreated(nextLinks: IngredientLinkedProduct[]) {
    setExistingLinkedProductIds((currentIds) => {
      const nextIds = new Set(currentIds);
      let addedCount = 0;

      for (const link of nextLinks) {
        if (!nextIds.has(link.productId)) {
          nextIds.add(link.productId);
          addedCount += 1;
        }
      }

      if (addedCount > 0) {
        setLinkedProductCount((currentCount) => currentCount + addedCount);
      }

      return [...nextIds];
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Ingredient linking</p>
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">{data.handle}</h1>
              <p className="font-mono text-sm text-muted-foreground">{data.handle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="uppercase" variant="outline">
              {data.source}
            </Badge>
            <Badge variant={data.recipeCount > 0 ? 'default' : 'outline'}>
              In {data.recipeCount} recipe{data.recipeCount === 1 ? '' : 's'}
            </Badge>
            {data.isPantry ? <Badge variant="secondary">Pantry item</Badge> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <HeaderStat icon={BookOpen} label="Recipes" value={data.recipeCount} />
            <HeaderStat icon={ListTodo} label="Mentions" value={data.recipeCount} />
            <HeaderStat icon={CheckCircle2} label="Live links" value={linkedProductCount} />
            {data.activeTab === 'search' ? (
              <HeaderStat icon={Clock3} label="Search results" value={data.productResults.length} />
            ) : null}
          </div>
        </div>
        <Link
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          href="/ingredients/unmatched"
        >
          Back to ingredients
        </Link>
      </div>

      {data.isPantry ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-foreground">
            This ingredient is marked as a pantry item, so recipe coverage treats it as resolved without requiring a product link.
          </CardContent>
        </Card>
      ) : null}

      {notice ? <NoticeCard message={notice} tone="notice" /> : null}
      {error ? <NoticeCard message={error} tone="error" /> : null}

      <div className="space-y-4">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex h-auto w-full flex-wrap gap-1 rounded-2xl bg-muted/60 p-1 sm:w-auto sm:flex-nowrap">
            {([
              { label: 'Search', value: 'search' },
              { label: `Matches (${linkedProductCount})`, value: 'matches' },
              { label: `Recipes (${data.recipeCount})`, value: 'recipes' }
            ] as const).map((tab) => (
              <Link
                key={tab.value}
                className={cn(
                  'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 py-1.5 text-xs font-medium transition-all sm:px-3 sm:text-sm',
                  data.activeTab === tab.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                href={buildIngredientReviewTabPath(data, tab.value)}
                prefetch={false}
              >
                {tab.label}
              </Link>
            ))}
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <form action={setIngredientPantryStatusAction} className="w-full sm:w-auto">
              <input name="source" type="hidden" value={data.source} />
              <input name="handle" type="hidden" value={data.handle} />
              <input name="searchQuery" type="hidden" value={data.searchQuery} />
              <input name="page" type="hidden" value={data.productResultsPage} />
              <input name="linkedPage" type="hidden" value={data.linkedProductsPage} />
              <input name="recipePage" type="hidden" value={data.recipeMentionsPage} />
              <input name="tab" type="hidden" value={data.activeTab} />
              <input name="isPantry" type="hidden" value={data.isPantry ? 'false' : 'true'} />
              {data.deferredKeys.map((deferredKey) => (
                <input key={`defer-pantry-${deferredKey}`} name="defer" type="hidden" value={deferredKey} />
              ))}
              <SubmitButton
                className="w-full sm:w-auto"
                loadingText={data.isPantry ? 'Removing pantry status' : 'Marking pantry'}
                variant={data.isPantry ? 'outline' : 'secondary'}
              >
                {data.isPantry ? 'Remove pantry status' : 'Mark as pantry'}
              </SubmitButton>
            </form>

            <NextIngredientButton
              deferredKeys={data.deferredKeys}
              handle={data.handle}
              isResolved={isResolved}
              source={data.source}
            />
          </div>
        </div>

        {data.activeTab === 'search' ? (
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Find the right product</p>
                  <p className="text-sm text-muted-foreground">Search, then link products from the table.</p>
                </div>
                <form
                  action={getIngredientReviewPath({
                    source: data.source,
                    handle: data.handle,
                    tab: 'search',
                    deferredKeys: data.deferredKeys
                  })}
                  className="flex w-full flex-col gap-3 md:w-auto md:min-w-[22rem] md:flex-row"
                  key={`${data.source}:${data.handle}:${data.searchQuery}`}
                >
                  <Input
                    className="w-full md:min-w-[18rem]"
                    defaultValue={data.searchQuery}
                    name="q"
                    placeholder="Search product names"
                    type="search"
                  />
                  <SubmitButton className="md:self-end" loadingText="Searching" variant="outline">
                    Search
                  </SubmitButton>
                </form>
              </div>

              <ProductResultsTable
                deferredKeys={data.deferredKeys}
                existingLinksByProductId={existingLinksByProductId}
                handle={data.handle}
                onLinksCreated={handleLinksCreated}
                page={data.productResultsPage}
                products={data.productResults}
                searchQuery={data.searchQuery}
                source={data.source}
              />

              {(data.hasPreviousProductResultsPage || data.hasNextProductResultsPage) ? (
                <ServerPagination
                  currentPage={data.productResultsPage}
                  hasNextPage={data.hasNextProductResultsPage}
                  hasPreviousPage={data.hasPreviousProductResultsPage}
                  nextHref={buildIngredientReviewSearchPath(data, data.productResultsPage + 1)}
                  previousHref={buildIngredientReviewSearchPath(data, data.productResultsPage - 1)}
                  summary={`Showing ${data.productResults.length} product result${data.productResults.length === 1 ? '' : 's'}`}
                />
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {data.activeTab === 'matches' ? (
          <CurrentMatches
            deferredKeys={data.deferredKeys}
            handle={data.handle}
            hasNextPage={data.hasNextLinkedProductsPage}
            hasPreviousPage={data.hasPreviousLinkedProductsPage}
            links={data.linkedProducts}
            linkedPage={data.linkedProductsPage}
            nextHref={buildIngredientReviewMatchesPath(data, data.linkedProductsPage + 1)}
            previousHref={buildIngredientReviewMatchesPath(data, data.linkedProductsPage - 1)}
            searchQuery={data.searchQuery}
            source={data.source}
            tab={data.activeTab}
          />
        ) : null}

        {data.activeTab === 'recipes' ? (
          <RecipeMentionsTable
            currentPage={data.recipeMentionsPage}
            hasNextPage={data.hasNextRecipeMentionsPage}
            hasPreviousPage={data.hasPreviousRecipeMentionsPage}
            nextHref={buildIngredientReviewRecipesPath(data, data.recipeMentionsPage + 1)}
            previousHref={buildIngredientReviewRecipesPath(data, data.recipeMentionsPage - 1)}
            recipeCount={data.recipeCount}
            recipeExamples={data.recipeExamples}
          />
        ) : null}
      </div>
    </div>
  );
}