import * as React from 'react';

import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

type AdminTableProps = React.ComponentPropsWithoutRef<typeof Table>;

export function AdminTable({ children, className, ...props }: AdminTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table
        className={cn(
          '[&_td]:align-middle [&_td]:whitespace-normal [&_th]:whitespace-normal',
          className
        )}
        {...props}
      >
        {children}
      </Table>
    </div>
  );
}

export function AdminTableToolbar({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between', className)}>
      {children}
    </div>
  );
}

export function AdminTableEmptyState({
  children,
  className,
  colSpan
}: {
  children: React.ReactNode;
  className?: string;
  colSpan: number;
}) {
  return (
    <AdminTableRow>
      <AdminTableCell className={cn('h-24 text-center text-muted-foreground', className)} colSpan={colSpan}>
        {children}
      </AdminTableCell>
    </AdminTableRow>
  );
}

export function AdminTableHeader({ className, ...props }: React.ComponentPropsWithoutRef<typeof TableHeader>) {
  return <TableHeader className={cn('bg-muted/15', className)} {...props} />;
}

export function AdminTableBody(props: React.ComponentPropsWithoutRef<typeof TableBody>) {
  return <TableBody {...props} />;
}

export function AdminTableFooter(props: React.ComponentPropsWithoutRef<typeof TableFooter>) {
  return <TableFooter {...props} />;
}

export function AdminTableRow(props: React.ComponentPropsWithoutRef<typeof TableRow>) {
  return <TableRow {...props} />;
}

export function AdminTableHead(props: React.ComponentPropsWithoutRef<typeof TableHead>) {
  return <TableHead {...props} />;
}

export function AdminTableCell(props: React.ComponentPropsWithoutRef<typeof TableCell>) {
  return <TableCell {...props} />;
}

export function AdminTableCaption(props: React.ComponentPropsWithoutRef<typeof TableCaption>) {
  return <TableCaption {...props} />;
}