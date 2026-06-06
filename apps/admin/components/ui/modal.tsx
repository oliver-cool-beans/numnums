'use client';

import * as React from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Button } from './button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './dialog';

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  hideCloseButton?: boolean;
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
  hideCloseButton = false
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('overflow-hidden p-0', contentClassName)}>
        <div className={cn('border-b border-border bg-muted/30 px-6 py-4', className)}>
          <div className="flex items-start justify-between gap-4">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </DialogHeader>
            {hideCloseButton ? null : (
              <DialogClose asChild>
                <Button className="size-9 shrink-0 rounded-full" size="icon" type="button" variant="ghost">
                  <X className="size-4" />
                  <span className="sr-only">Close modal</span>
                </Button>
              </DialogClose>
            )}
          </div>
        </div>

        {children ? <div className="px-6 py-5">{children}</div> : null}

        {footer ? (
          <div className="border-t border-border bg-muted/20 px-6 py-4">
            <DialogFooter>{footer}</DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}