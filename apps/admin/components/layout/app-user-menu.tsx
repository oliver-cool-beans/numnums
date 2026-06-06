'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { EllipsisVertical, LogOut } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { getBrowserSupabaseClient } from '@/lib/supabase/browser';

type AppUserMenuProps = {
  email: string;
  variant?: 'avatar' | 'sidebar';
};

export function AppUserMenu({ email, variant = 'avatar' }: AppUserMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const supabase = getBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.replace('/login');
      router.refresh();
    });
  }

  const initial = email.slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'sidebar' ? (
          <button
            className="flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-2 text-left transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            type="button"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-muted text-sm font-semibold text-foreground">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">Admin user</span>
              <span className="block truncate text-xs text-muted-foreground">{email}</span>
            </span>
            <EllipsisVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        ) : (
          <button
            aria-label="Open account menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground"
            type="button"
          >
            {initial}
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="border-b border-border px-2 py-2">
          <p className="truncate text-sm font-medium text-foreground">Admin user</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <DropdownMenuItem className="gap-2" disabled={isPending} onSelect={handleSignOut}>
          <LogOut className="h-4 w-4" />
          {isPending ? 'Signing out...' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}