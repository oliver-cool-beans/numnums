'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeader,
  AdminTableRow
} from '@/components/tables/admin-table';
import type { IngredientReviewGroupItem } from '@/server/db/types';
import { getIngredientReviewPath } from '@/server/ingredients/review-path';

function formatUpdatedAt(updatedAt: string) {
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(updatedAt));
}

function OpenLinkingButton({ reviewPath }: { reviewPath: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      loading={isPending}
      loadingText="Opening"
      onClick={(event) => {
        event.stopPropagation();
        startTransition(() => {
          router.push(reviewPath);
        });
      }}
      size="sm"
      type="button"
    >
      Open linking
    </Button>
  );
}

export function ReviewQueueTable({ items }: { items: IngredientReviewGroupItem[] }) {
  const router = useRouter();

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No unlinked ingredients are visible right now.</p>;
  }

  return (
    <AdminTable>
      <AdminTableHeader>
        <AdminTableRow>
          <AdminTableHead>Ingredient</AdminTableHead>
          <AdminTableHead>Source</AdminTableHead>
          <AdminTableHead>Link status</AdminTableHead>
          <AdminTableHead className="w-[180px]">Last updated</AdminTableHead>
          <AdminTableHead className="w-[140px] text-right">Action</AdminTableHead>
        </AdminTableRow>
      </AdminTableHeader>
      <AdminTableBody>
        {items.map((item) => {
          const reviewPath = getIngredientReviewPath({ source: item.source, handle: item.handle });

          return (
            <AdminTableRow
              key={`${item.source}:${item.handle}`}
              className="cursor-pointer"
              onClick={() => {
                router.push(reviewPath);
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') {
                  return;
                }

                event.preventDefault();
                router.push(reviewPath);
              }}
              role="link"
              tabIndex={0}
            >
              <AdminTableCell>
                <div className="grid gap-1">
                  <span className="font-medium text-foreground">{item.rawName}</span>
                  <span className="font-mono text-xs text-muted-foreground">{item.handle}</span>
                </div>
              </AdminTableCell>
              <AdminTableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="uppercase" variant="outline">
                    {item.source}
                  </Badge>
                </div>
              </AdminTableCell>
              <AdminTableCell>
                <Badge className="lowercase" variant="outline">
                  unlinked
                </Badge>
              </AdminTableCell>
              <AdminTableCell>
                <span className="text-sm text-muted-foreground">{formatUpdatedAt(item.updatedAt)}</span>
              </AdminTableCell>
              <AdminTableCell className="text-right">
                <OpenLinkingButton reviewPath={reviewPath} />
              </AdminTableCell>
            </AdminTableRow>
          );
        })}
      </AdminTableBody>
    </AdminTable>
  );
}