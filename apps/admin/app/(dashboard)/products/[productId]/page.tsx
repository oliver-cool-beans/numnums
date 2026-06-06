import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, CheckCircle2, Clock3, Link2 } from 'lucide-react';

import { HeaderStat } from '@/components/layout/header-stat';
import { PageHeader } from '@/components/layout/page-header';
import { SetupNotice } from '@/components/layout/setup-notice';
import { TableCard } from '@/components/tables/table-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getIngredientReviewPath } from '@/server/ingredients/review-path';
import { getProductDetail } from '@/server/products/list-products';

export const dynamic = 'force-dynamic';

function formatPrice(priceCents: number | null) {
  if (priceCents === null) {
    return 'Unknown';
  }

  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(priceCents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function formatSellingSize(sellingSize: number | null, sellingUnit: string | null) {
  const size = sellingSize === null ? 'Unknown' : String(sellingSize);

  return `${size} ${sellingUnit ?? ''}`.trim();
}

function getMatchingFootprintText(product: NonNullable<Awaited<ReturnType<typeof getProductDetail>>['data']>) {
  if (product.usage.totalLinks === 0) {
    return 'This product is not linked to any ingredient handles yet.';
  }

  const handleLabel = product.usage.linkedHandles === 1 ? 'handle' : 'handles';
  const recipeLabel = product.usage.recipesCovered === 1 ? 'record' : 'records';

  return `This product is connected to ${product.usage.linkedHandles} ingredient ${handleLabel} across ${product.usage.recipesCovered} recipe ${recipeLabel}.`;
}

function getLinkedUsageText(link: {
  priority: number;
  recipeCount: number;
}) {
  const recipeLabel = link.recipeCount === 1 ? 'recipe' : 'recipes';

  return `Priority ${link.priority} · Used by ${link.recipeCount} ${recipeLabel}`;
}

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const result = await getProductDetail(productId);

  if (result.status === 'ready' && !result.data) {
    notFound();
  }

  const product = result.data;

  if (!product) {
    return (
      <div className="space-y-6">
        <PageHeader
          description="Use this screen to inspect the product record itself and see where it is already linked to recipe ingredients across the admin portal."
          eyebrow="Products"
          title="Product detail"
        />
        <SetupNotice errorMessage={result.errorMessage} status={result.status} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Products</p>
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">{product.name}</h1>
              <p className="text-sm text-muted-foreground">{product.brand ?? 'Unbranded'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="uppercase" variant="outline">{product.source}</Badge>
            <Badge variant={product.available ? 'default' : 'outline'}>
              {product.available ? 'Available' : 'Unavailable'}
            </Badge>
            <Badge variant="outline">{formatPrice(product.priceCents)}</Badge>
            <Badge variant="outline">{formatSellingSize(product.sellingSize, product.sellingUnit)}</Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <HeaderStat icon={Link2} label="Total links" value={product.usage.totalLinks} />
            <HeaderStat icon={CheckCircle2} label="Live links" value={product.usage.liveLinks} />
            <HeaderStat icon={Clock3} label="Linked handles" value={product.usage.linkedHandles} />
            <HeaderStat icon={BookOpen} label="Recipes affected" value={product.usage.recipesCovered} />
          </div>
        </div>

        <Link
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          href="/products"
        >
          Back to products
        </Link>
      </div>

      <SetupNotice errorMessage={result.errorMessage} status={result.status} />

      <div className="dashboard-grid lg:grid-cols-[1.3fr_0.7fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product overview</CardTitle>
              <CardDescription>Imported metadata and operational context used during matching review.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-6 sm:flex-row">
                <div className="relative h-40 w-40 overflow-hidden rounded-3xl border border-border bg-muted/30">
                  {product.imageUrl ? (
                    <Image alt={product.name} className="object-cover" fill sizes="160px" src={product.imageUrl} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">No image</div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xl font-semibold text-foreground">Product snapshot</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Imported metadata and operational context used during matching review.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{product.usage.linkedHandles} linked handle{product.usage.linkedHandles === 1 ? '' : 's'}</Badge>
                    <Badge variant="outline">Updated {formatDate(product.updatedAt)}</Badge>
                  </div>
                  {product.websiteUrl ? (
                    <Button asChild variant="outline">
                      <a href={product.websiteUrl} rel="noreferrer" target="_blank">
                        Open retailer source
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Category</p>
                  <p className="mt-2 text-sm text-foreground">{product.category ?? 'Uncategorised'}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Selling size</p>
                  <p className="mt-2 text-sm text-foreground">{formatSellingSize(product.sellingSize, product.sellingUnit)}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">External id</p>
                  <p className="mt-2 text-sm text-foreground">{product.externalId}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Last updated</p>
                  <p className="mt-2 text-sm text-foreground">{formatDate(product.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usage and metadata</CardTitle>
              <CardDescription>Useful when checking import freshness and where this product is already being reused.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-4">
                <p className="font-medium text-foreground">Matching footprint</p>
                <p className="mt-1 leading-6">
                  {getMatchingFootprintText(product)}
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Created</p>
                <p>{formatDate(product.createdAt)}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Updated</p>
                <p>{formatDate(product.updatedAt)}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Internal record id</p>
                <p className="break-all">{product.id}</p>
              </div>
            </CardContent>
          </Card>
      </div>

      <TableCard
        description="Open the linked ingredient review to inspect or correct the matching decision that points at this product."
        title="Linked ingredient handles"
      >
        <div className="space-y-3">
              {product.linkedIngredients.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  This product is not linked to any ingredient handles yet.
                </div>
              ) : (
                product.linkedIngredients.map((link) => (
                  <div key={link.linkId} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{link.ingredientHandle}</p>
                          <Badge variant="default">Live</Badge>
                          <Badge className="uppercase" variant="outline">
                            {link.ingredientSource}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{getLinkedUsageText(link)}</p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={getIngredientReviewPath({
                            source: link.ingredientSource,
                            handle: link.ingredientHandle,
                            searchQuery: product.name
                          })}
                        >
                          Open linking
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
        </div>
      </TableCard>
    </div>
  );
}