'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown, CalendarDays, ChevronLeft, ChevronRight, CreditCard, Search } from 'lucide-react';

import { AdminTable, AdminTableBody, AdminTableCell, AdminTableEmptyState, AdminTableHead, AdminTableHeader, AdminTableRow, AdminTableToolbar } from '@/components/tables/admin-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

type DashboardImportRunRow = {
  id: string;
  importType: string;
  source: string;
  status: string;
  seen: number;
  created: number;
  updated: number;
  completedAt: string | null;
};

type DashboardImportRunsTableProps = {
  rows: DashboardImportRunRow[];
};

const PAGE_SIZE = 6;

function formatCompletedAt(value: string | null) {
  if (!value) {
    return 'Not completed';
  }

  const date = new Date(value);

  return {
    day: new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(date),
    time: new Intl.DateTimeFormat('en-AU', { timeStyle: 'short' }).format(date)
  };
}

export function DashboardImportRunsTable({ rows }: DashboardImportRunsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortValue, setSortValue] = useState<'newest' | 'oldest' | 'seen' | 'created'>('newest');
  const [pageIndex, setPageIndex] = useState(0);

  const filteredRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const nextRows = rows.filter((row) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        row.importType.toLowerCase().includes(normalizedQuery) ||
        row.status.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesSource = sourceFilter === 'all' || row.source === sourceFilter;

      return matchesQuery && matchesStatus && matchesSource;
    });

    nextRows.sort((left, right) => {
      if (sortValue === 'seen') {
        return right.seen - left.seen;
      }

      if (sortValue === 'created') {
        return right.created - left.created;
      }

      const leftTime = left.completedAt ? new Date(left.completedAt).getTime() : 0;
      const rightTime = right.completedAt ? new Date(right.completedAt).getTime() : 0;

      return sortValue === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
    });

    return nextRows;
  }, [rows, searchQuery, sourceFilter, sortValue, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const visibleRows = filteredRows.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  const statuses = Array.from(new Set(rows.map((row) => row.status)));

  return (
    <div className="space-y-4">
      <AdminTableToolbar>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8"
              placeholder="Search import runs..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPageIndex(0);
              }}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <CreditCard className="size-4" />
                Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuRadioGroup value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                setPageIndex(0);
              }}>
                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                {statuses.map((status) => (
                  <DropdownMenuRadioItem key={status} value={status}>{status}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <CalendarDays className="size-4" />
                Import type
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuRadioGroup value={sourceFilter} onValueChange={(value) => {
                setSourceFilter(value);
                setPageIndex(0);
              }}>
                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="Products">Products</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="Recipes">Recipes</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <ArrowUpDown className="size-4" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuRadioGroup value={sortValue} onValueChange={(value) => {
              setSortValue(value as 'newest' | 'oldest' | 'seen' | 'created');
              setPageIndex(0);
            }}>
              <DropdownMenuRadioItem value="newest">Newest first</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="oldest">Oldest first</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="seen">Most seen</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="created">Most created</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </AdminTableToolbar>

      <AdminTable>
        <AdminTableHeader>
          <AdminTableRow>
            <AdminTableHead>Import</AdminTableHead>
            <AdminTableHead>Status</AdminTableHead>
            <AdminTableHead>Seen</AdminTableHead>
            <AdminTableHead>Created</AdminTableHead>
            <AdminTableHead>Updated</AdminTableHead>
            <AdminTableHead>Completed</AdminTableHead>
          </AdminTableRow>
        </AdminTableHeader>
        <AdminTableBody>
          {visibleRows.length === 0 ? (
            <AdminTableEmptyState colSpan={6}>No results.</AdminTableEmptyState>
          ) : (
            visibleRows.map((row) => {
              const completed = formatCompletedAt(row.completedAt);

              return (
                <AdminTableRow key={row.id}>
                  <AdminTableCell>
                    <div className="grid gap-0.5">
                      <span className="font-medium leading-none">{row.importType}</span>
                      <span className="text-xs leading-none text-muted-foreground">#{row.id.slice(0, 8)}</span>
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>
                    <Badge variant="outline">{row.status}</Badge>
                  </AdminTableCell>
                  <AdminTableCell>{row.seen.toLocaleString()}</AdminTableCell>
                  <AdminTableCell>{row.created.toLocaleString()}</AdminTableCell>
                  <AdminTableCell>{row.updated.toLocaleString()}</AdminTableCell>
                  <AdminTableCell>
                    {typeof completed === 'string' ? (
                      <span className="text-muted-foreground text-sm">{completed}</span>
                    ) : (
                      <div className="grid gap-0.5">
                        <span className="text-sm">{completed.day}</span>
                        <span className="text-xs text-muted-foreground">at {completed.time}</span>
                      </div>
                    )}
                  </AdminTableCell>
                </AdminTableRow>
              );
            })
          )}
        </AdminTableBody>
      </AdminTable>

      <div className="flex items-center justify-between px-1">
        <div className="text-sm text-muted-foreground">
          {filteredRows.length} visible run(s)
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium">
            Page {currentPage + 1} of {pageCount}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => setPageIndex((value) => Math.min(pageCount - 1, value + 1))}
              disabled={currentPage >= pageCount - 1}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}