import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

type ServerPaginationProps = {
  currentPage: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  previousHref: string;
  nextHref: string;
  summary: string;
};

export function ServerPagination({
  currentPage,
  hasPreviousPage,
  hasNextPage,
  previousHref,
  nextHref,
  summary
}: ServerPaginationProps) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="text-sm text-muted-foreground">{summary}</div>
      <div className="flex items-center gap-3">
        <div className="text-sm font-medium">Page {currentPage}</div>
        <div className="flex items-center gap-2">
          <Button asChild className="size-8" disabled={!hasPreviousPage} size="icon" variant="outline">
            {hasPreviousPage ? (
              <Link href={previousHref}>
                <ChevronLeft className="size-4" />
                <span className="sr-only">Previous page</span>
              </Link>
            ) : (
              <span>
                <ChevronLeft className="size-4" />
                <span className="sr-only">Previous page</span>
              </span>
            )}
          </Button>
          <Button asChild className="size-8" disabled={!hasNextPage} size="icon" variant="outline">
            {hasNextPage ? (
              <Link href={nextHref}>
                <ChevronRight className="size-4" />
                <span className="sr-only">Next page</span>
              </Link>
            ) : (
              <span>
                <ChevronRight className="size-4" />
                <span className="sr-only">Next page</span>
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}