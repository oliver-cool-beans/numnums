'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { LoaderCircle } from 'lucide-react';

import { AdminTableCell, AdminTableHead } from '@/components/tables/admin-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type TableRowActionsMenuProps = {
  align?: 'center' | 'end' | 'start';
  children: ReactNode;
  className?: string;
  label?: string;
  triggerLabel?: string;
};

type TableRowActionsHeaderProps = {
  children?: ReactNode;
  className?: string;
};

type TableRowActionsCellProps = {
  children: ReactNode;
  className?: string;
};

type TableRowActionSubmitItemProps = {
  children: string;
  disabled?: boolean;
  loadingText: string;
  tone?: 'default' | 'destructive';
};

export function TableRowActionsHeader({ children = 'Actions', className }: TableRowActionsHeaderProps) {
  return <AdminTableHead className={cn('w-[60px] px-2 text-right', className)}>{children}</AdminTableHead>;
}

export function TableRowActionsCell({ children, className }: TableRowActionsCellProps) {
  return (
    <AdminTableCell className={cn('px-2 py-2 text-right', className)}>
      <div className="flex justify-end">{children}</div>
    </AdminTableCell>
  );
}

export function TableRowActionSubmitItem({
  children,
  disabled,
  loadingText,
  tone = 'default'
}: TableRowActionSubmitItemProps) {
  const { pending } = useFormStatus();

  return (
    <DropdownMenuItem asChild disabled={disabled}>
      <button
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm',
          tone === 'destructive' ? 'text-destructive' : 'text-foreground'
        )}
        disabled={disabled || pending}
        type="submit"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {pending ? loadingText : children}
      </button>
    </DropdownMenuItem>
  );
}

export function TableRowActionsMenu({
  align = 'end',
  children,
  className,
  label = 'Row actions',
  triggerLabel = 'Open row actions'
}: TableRowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="size-8 rounded-lg p-0" size="icon" type="button" variant="ghost">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">{triggerLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={cn('w-52 p-1.5', className)}>
        <DropdownMenuLabel className="px-3 py-2">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}