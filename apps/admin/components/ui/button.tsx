import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-[color,background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-surface-sm hover:bg-primary/92',
        destructive:
          'bg-destructive text-destructive-foreground shadow-surface-sm hover:bg-destructive/90',
        outline:
          'border border-border bg-background text-foreground shadow-surface-sm hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-11 px-5',
        icon: 'h-10 w-10 rounded-xl'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  formAction?: any;
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, disabled, loading = false, loadingText, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const buttonContent = (
      <>
        {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {loading && loadingText ? loadingText : children}
      </>
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ children?: React.ReactNode }>;
      const childContent = (
        <>
          {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {loading && loadingText ? loadingText : child.props.children}
        </>
      );

      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={disabled || loading}
          {...props}
        >
          {React.cloneElement(child, undefined, childContent)}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {buttonContent}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
