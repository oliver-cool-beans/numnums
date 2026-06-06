'use client';

import { useFormStatus } from 'react-dom';

import { Button, type ButtonProps } from '@/components/ui/button';

type SubmitButtonProps = Omit<ButtonProps, 'loading'>;

export function SubmitButton({ children, disabled, loadingText, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      {...props}
      disabled={disabled || pending}
      loading={pending}
      loadingText={loadingText}
      type={props.type ?? 'submit'}
    >
      {children}
    </Button>
  );
}