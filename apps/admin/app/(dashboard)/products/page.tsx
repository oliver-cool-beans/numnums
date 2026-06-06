import Image from 'next/image';
import Link from 'next/link';
import { Link2, Package2, Search, Store, TriangleAlert } from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { listProducts } from '@/server/products/list-products';

export const dynamic = 'force-dynamic';

type SearchState = {
  source?: string;
  availability?: 'available' | 'unavailable';
  q?: string;
  page?: string;
};

function parsePageNumber(value: string | undefined) {
  const page = Number.parseInt(value ?? '', 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function FilterLink({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      className={
        active
          ? 'inline-flex h-7 items-center rounded-lg border border-border bg-muted px-2.5 text-[0.8rem] font-medium text-foreground'
          : 'inline-flex h-7 items-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
      }
      href={href}
    >
      {label}
    </Link>
  );
}

function buildProductsPath(state: SearchState) {
  const params = new URLSearchParams();

  if (state.source) {
    params.set('source', state.source);
  }

  if (state.availability) {
    params.set('availability', state.availability);
  }

  if (state.q) {
    params.set('q', state.q);
  }

  if (state.page && Number.parseInt(state.page, 10) > 1) {
    params.set('page', state.page);
  }

  const query = params.toString();
  return query ? `/products?${query}` : '/products';
}

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<SearchState>;
}) {
  const resolvedSearchParams = await searchParams;
  const currentPage = parsePageNumber(resolvedSearchParams.page);
  const result = await listProducts({
    source: resolvedSearchParams.source,
    availability: resolvedSearchParams.availability,
    query: resolvedSearchParams.q,
    page: currentPage
  });
  const linkedProducts = result.items.filter((product) => product.linkCount > 0).length;
  const unavailableProducts = result.items.filter((product) => !product.available).length;
  const representedSources = new Set(result.items.map((product) => product.source)).size;
  const activeFilterCount = [resolvedSearchParams.source, resolvedSearchParams.availability, resolvedSearchParams.q].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader
        description="Browse the imported retailer catalogue before using products in recipe matches. Availability, size, and source links stay visible here for faster review decisions."
        eyebrow="Products"
        title="Product catalogue"
      />
      <SetupNotice errorMessage={result.errorMessage} status={result.status} />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={resolvedSearchParams.availability === 'unavailable' ? 'default' : 'outline'}>
            {resolvedSearchParams.availability ? `Showing ${resolvedSearchParams.availability}` : 'All availability states'}
          </Badge>
          <Badge variant="outline">{activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}</Badge>
          <Badge variant="outline">{representedSources} source{representedSources === 1 ? '' : 's'}</Badge>
          {resolvedSearchParams.q ? <Badge variant="outline">Search: {resolvedSearchParams.q}</Badge> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <HeaderStat icon={Package2} label="Visible products" value={result.items.length} />
          <HeaderStat icon={Link2} label="Linked" value={linkedProducts} />
          <HeaderStat icon={TriangleAlert} label="Unavailable" value={unavailableProducts} />
          <HeaderStat icon={Store} label="Sources" value={representedSources} />
        </div>
      </div>

      <TableCard
        description="Most recently updated product rows currently available for matching. Search by product, brand, or category, then narrow the result set by availability."
        title="Imported products"
        toolbar={
          <div className="space-y-4">
            <AdminTableToolbar>
              <form action="/products" className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative w-full lg:w-80">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-7 rounded-lg border-input bg-transparent pl-8 shadow-none"
                    defaultValue={resolvedSearchParams.q}
                    name="q"
                    placeholder="Search products..."
                    type="search"
                  />
                </div>
                <input name="source" type="hidden" value={resolvedSearchParams.source ?? ''} />
                <input name="availability" type="hidden" value={resolvedSearchParams.availability ?? ''} />
                <div className="flex items-center gap-2">
                  <SubmitButton loadingText="Searching" size="sm" variant="outline">Search</SubmitButton>
                  <Button asChild size="sm" type="button" variant="outline">
                    <Link href="/products">Clear</Link>
                  </Button>
                </div>
              </form>
              <div className="flex flex-wrap items-center gap-2">
                <FilterLink active={!resolvedSearchParams.availability} href={buildProductsPath({ ...resolvedSearchParams, availability: undefined })} label="All" />
                <FilterLink active={resolvedSearchParams.availability === 'available'} href={buildProductsPath({ ...resolvedSearchParams, availability: 'available', page: undefined })} label="Available" />
                <FilterLink active={resolvedSearchParams.availability === 'unavailable'} href={buildProductsPath({ ...resolvedSearchParams, availability: 'unavailable', page: undefined })} label="Unavailable" />
              </div>
            </AdminTableToolbar>
          </div>
        }
      >
        <AdminTable>
          <AdminTableHeader>
            <AdminTableRow>
              <AdminTableHead>Product</AdminTableHead>
              <AdminTableHead>Source</AdminTableHead>
              <AdminTableHead>Category</AdminTableHead>
              <AdminTableHead>Selling size</AdminTableHead>
              <AdminTableHead>Linked handles</AdminTableHead>
              <AdminTableHead>Status</AdminTableHead>
            </AdminTableRow>
          </AdminTableHeader>
          <AdminTableBody>
            {result.items.length === 0 ? (
              <AdminTableEmptyState colSpan={6}>No products have been imported yet.</AdminTableEmptyState>
            ) : (
              result.items.map((product) => (
                <AdminTableRow key={product.id}>
                  <AdminTableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-border bg-muted/40">
                        {product.imageUrl ? (
                          <Image
                            alt={product.name}
                            className="object-cover"
                            fill
                            sizes="56px"
                            src={product.imageUrl}
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <Link
                          className="block truncate font-medium text-foreground underline-offset-4 hover:underline"
                          href={`/products/${product.id}`}
                        >
                          {product.name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{product.brand ?? 'Unbranded'}</p>
                        {product.websiteUrl ? (
                          <a
                            className="text-xs font-medium text-emerald-700 underline-offset-4 hover:underline"
                            href={product.websiteUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            View on {product.source.toUpperCase()}
                          </a>
                        ) : (
                          <p className="text-xs text-muted-foreground">No source link</p>
                        )}
                      </div>
                    </div>
                  </AdminTableCell>
                  <AdminTableCell className="uppercase text-muted-foreground">{product.source}</AdminTableCell>
                  <AdminTableCell className="text-muted-foreground">{product.category ?? 'Uncategorised'}</AdminTableCell>
                  <AdminTableCell className="text-muted-foreground">{product.sellingSize ?? 'Unknown'} {product.sellingUnit ?? ''}</AdminTableCell>
                  <AdminTableCell className="text-muted-foreground">{product.linkCount}</AdminTableCell>
                  <AdminTableCell>
                    <Badge variant={product.available ? 'default' : 'outline'}>
                      {product.available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </AdminTableCell>
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
            nextHref={buildProductsPath({ ...resolvedSearchParams, page: String(result.page + 1) })}
            previousHref={buildProductsPath({ ...resolvedSearchParams, page: String(result.page - 1) })}
            summary={`Showing ${result.items.length} product${result.items.length === 1 ? '' : 's'}`}
          />
        ) : null}
      </TableCard>
    </div>
  );
}