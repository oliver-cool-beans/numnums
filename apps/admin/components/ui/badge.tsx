import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-normal tracking-normal transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-primary/20 bg-primary/10 text-primary hover:bg-primary/15',
        secondary: 'border-border/70 bg-secondary/50 text-secondary-foreground hover:bg-secondary/70',
        destructive: 'border-destructive/10 bg-destructive/10 text-destructive hover:bg-destructive/15',
        outline: 'border-border/80 bg-muted/30 text-muted-foreground hover:bg-muted/45'
      }
    },
    defaultVariants: {
      variant: 'outline'
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
