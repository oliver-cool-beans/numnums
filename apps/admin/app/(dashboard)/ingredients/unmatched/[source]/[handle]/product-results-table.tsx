'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeader,
  AdminTableRow,
} from '@/components/tables/admin-table';
import {
  HeaderSelectCheckbox,
  RowSelectCheckbox,
  SelectableTableToolbar,
  useSelectableIds
} from '@/components/tables/selectable-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { IngredientLinkedProduct, ProductSummary } from '@/server/db/types';

import {
  bulkCreateIngredientProductLinkAction,
  createIngredientProductLinkAction
} from './actions';

type ProductResultsTableProps = {
  deferredKeys: string[];
  existingLinksByProductId: Record<string, true>;
  handle: string;
  onLinksCreated: (links: IngredientLinkedProduct[]) => void;
  page: number;
  products: ProductSummary[];
  searchQuery: string;
  source: string;
};

function ProductThumbnail({ alt, src }: { alt: string; src: string | null }) {
  return (
    <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
      {src ? (
        <Image alt={alt} className="object-cover" fill sizes="36px" src={src} />
      ) : (
        <span className="text-[10px] font-medium text-muted-foreground">No image</span>
      )}
    </div>
  );
}

function getStatusBadgeVariant(status: string) {
  return status === 'linked' ? 'default' : 'outline';
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export function ProductResultsTable({
  deferredKeys,
  existingLinksByProductId,
  handle,
  onLinksCreated,
  page,
  products,
  searchQuery,
  source
}: ProductResultsTableProps) {
  const selectableProductIds = products
    .filter((product) => !existingLinksByProductId[product.id])
    .map((product) => product.id);
  const [isBulkLinkPending, startBulkLinkTransition] = useTransition();
  const [isSingleLinkPending, startSingleLinkTransition] = useTransition();
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const {
    allSelected,
    selectAllRef,
    selectedIds: selectedProductIds,
    setSelectedIds,
    toggleAll
  } = useSelectableIds(selectableProductIds);
  const linkEligibleProductIds = selectedProductIds.filter((productId) => !existingLinksByProductId[productId]);

  function buildLinkedProduct(createdLink: IngredientLinkedProduct['linkId'] extends string ? {
    createdAt: string;
    createdByUserId: string;
    linkId: string;
    priority: number;
    productId: string;
    updatedAt: string;
  } : never) {
    const product = products.find((item) => item.id === createdLink.productId);

    if (!product) {
      return null;
    }

    return {
      available: product.available,
      brand: product.brand,
      createdAt: createdLink.createdAt,
      createdByName: null,
      createdByUserId: createdLink.createdByUserId,
      imageUrl: product.imageUrl,
      linkId: createdLink.linkId,
      linkable: product.available,
      name: product.name,
      priority: createdLink.priority,
      productId: product.id,
      source: product.source,
      updatedAt: createdLink.updatedAt,
      websiteUrl: product.websiteUrl
    } satisfies IngredientLinkedProduct;
  }

  function handleBulkLinkSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBulkLinkPending || linkEligibleProductIds.length === 0) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    startBulkLinkTransition(async () => {
      const result = await bulkCreateIngredientProductLinkAction(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      const nextLinks = result.createdLinks.flatMap((createdLink) => {
        const nextLink = buildLinkedProduct(createdLink);
        return nextLink ? [nextLink] : [];
      });

      if (nextLinks.length > 0) {
        onLinksCreated(nextLinks);
      }

      setSelectedIds([]);

      if (result.notice) {
        toast.success(result.notice);
      }
    });
  }

  function handleSingleLinkSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSingleLinkPending) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const productId = formData.get('productId');

    if (typeof productId !== 'string' || !productId.trim()) {
      toast.error('Missing product id.');
      return;
    }

    setPendingProductId(productId);

    startSingleLinkTransition(async () => {
      const result = await createIngredientProductLinkAction(formData);

      setPendingProductId(null);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.createdLink) {
        const nextLink = buildLinkedProduct(result.createdLink);

        if (nextLink) {
          onLinksCreated([nextLink]);
        }
      }

      if (result.notice) {
        toast.success(result.notice);
      }
    });
  }

  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
        No products match the current search query.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SelectableTableToolbar
        actions={(
          <form onSubmit={handleBulkLinkSubmit}>
            <input name="source" type="hidden" value={source} />
            <input name="handle" type="hidden" value={handle} />
            <input name="searchQuery" type="hidden" value={searchQuery} />
            <input name="page" type="hidden" value={page} />
            {deferredKeys.map((deferredKey) => (
              <input key={`defer-${deferredKey}`} name="defer" type="hidden" value={deferredKey} />
            ))}
            {linkEligibleProductIds.map((productId) => (
              <input key={`link-${productId}`} name="productIds" type="hidden" value={productId} />
            ))}
            <Button
              disabled={linkEligibleProductIds.length === 0 || isBulkLinkPending}
              loading={isBulkLinkPending}
              loadingText="Linking selected"
              size="sm"
              type="submit"
            >
              Link selected
            </Button>
          </form>
        )}
        helperText="Linking makes the match live immediately."
        selectedCount={selectedProductIds.length}
        totalCount={products.length}
        unitLabel="product"
      />

      <AdminTable>
        <AdminTableHeader>
          <AdminTableRow>
            <AdminTableHead className="w-12">
              <HeaderSelectCheckbox
                allSelected={allSelected}
                ariaLabel="Select all eligible products"
                onChange={toggleAll}
                selectAllRef={selectAllRef}
              />
            </AdminTableHead>
            <AdminTableHead>Product</AdminTableHead>
            <AdminTableHead>Retailer</AdminTableHead>
            <AdminTableHead>Pack</AdminTableHead>
            <AdminTableHead>Status</AdminTableHead>
            <AdminTableHead>Updated</AdminTableHead>
            <AdminTableHead className="w-[320px]">Actions</AdminTableHead>
          </AdminTableRow>
        </AdminTableHeader>
        <AdminTableBody>
          {products.map((product) => {
            const existingLink = existingLinksByProductId[product.id];
            const statusLabel = existingLink ? 'linked' : 'unlinked';
            const hasExistingLink = Boolean(existingLink);
            const isSelected = selectedProductIds.includes(product.id);
            const isUnavailable = product.available === false;
            const nextUpdatedAt = product.updatedAt;
            const isCurrentProductPending = isSingleLinkPending && pendingProductId === product.id;
            let actionButtons: React.ReactNode = null;

            if (!hasExistingLink) {
              actionButtons = (
                <form onSubmit={handleSingleLinkSubmit}>
                  <input name="source" type="hidden" value={source} />
                  <input name="handle" type="hidden" value={handle} />
                  <input name="productId" type="hidden" value={product.id} />
                  <input name="searchQuery" type="hidden" value={searchQuery} />
                        <input name="page" type="hidden" value={page} />
                  {deferredKeys.map((deferredKey) => (
                    <input key={`defer-${product.id}-${deferredKey}`} name="defer" type="hidden" value={deferredKey} />
                  ))}
                  <Button disabled={isCurrentProductPending} loading={isCurrentProductPending} loadingText="Linking" size="sm" type="submit">
                    Link
                  </Button>
                </form>
              );
            }

            return (
              <AdminTableRow data-state={isSelected ? 'selected' : undefined} key={product.id}>
                <AdminTableCell className="align-top">
                  <RowSelectCheckbox
                    ariaLabel={`Select ${product.name}`}
                    checked={isSelected}
                    disabled={hasExistingLink}
                    onChange={(checked) => {
                      setSelectedIds((currentSelection) => {
                        if (checked) {
                          return [...currentSelection, product.id];
                        }

                        return currentSelection.filter((productId) => productId !== product.id);
                      });
                    }}
                  />
                </AdminTableCell>
                <AdminTableCell className="align-top py-3">
                  <div className="flex items-start gap-2.5">
                    <ProductThumbnail alt={product.name} src={product.imageUrl} />
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.brand ?? 'Unbranded'}</p>
                    </div>
                  </div>
                </AdminTableCell>
                <AdminTableCell className="align-top py-3">
                  <Badge className="uppercase" variant="outline">
                    {product.source}
                  </Badge>
                </AdminTableCell>
                <AdminTableCell className="align-top py-3 text-sm text-muted-foreground">
                  {product.sellingSize && product.sellingUnit
                    ? `${product.sellingSize} ${product.sellingUnit}`
                    : 'Not set'}
                </AdminTableCell>
                <AdminTableCell className="align-top py-3">
                  <div className="space-y-1">
                    <Badge variant={getStatusBadgeVariant(statusLabel)}>
                      {statusLabel}
                    </Badge>
                    {isUnavailable ? <p className="text-xs font-medium text-rose-600">Unavailable product</p> : null}
                    {hasExistingLink ? <p className="text-xs text-muted-foreground">Already linked</p> : null}
                  </div>
                </AdminTableCell>
                <AdminTableCell className="align-top py-3 text-xs text-muted-foreground">
                  {formatTimestamp(nextUpdatedAt)}
                </AdminTableCell>
                <AdminTableCell className="align-top py-3">
                  <div className="flex flex-wrap gap-2">
                    {actionButtons}

                    {product.websiteUrl ? (
                      <Button asChild size="sm" type="button" variant="outline">
                        <a href={product.websiteUrl} rel="noreferrer" target="_blank">
                          View product
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </AdminTableCell>
              </AdminTableRow>
            );
          })}
        </AdminTableBody>
      </AdminTable>
    </div>
  );
}