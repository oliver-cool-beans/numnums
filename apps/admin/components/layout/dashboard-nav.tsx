'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowDownToLine,
  BookOpen,
  Command,
  LayoutDashboard,
  Menu,
  Package,
  PanelLeft,
  Search,
  Settings,
  Sparkles,
  SquareArrowUpRight,
  Sun,
  Users,
  type LucideIcon
} from 'lucide-react';

import { AppUserMenu } from '@/components/layout/app-user-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export type DashboardNavItem = {
  title: string;
  href: string;
  badgeCount?: number;
  icon?:
    | 'layout-dashboard'
    | 'arrow-down-to-line'
    | 'sparkles'
    | 'book-open'
    | 'package'
    | 'users';
};

export type DashboardNavGroup = {
  label?: string;
  items: DashboardNavItem[];
};

type DashboardNavProps = {
  groups: DashboardNavGroup[];
};

const navIcons: Record<NonNullable<DashboardNavItem['icon']>, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  'arrow-down-to-line': ArrowDownToLine,
  sparkles: Sparkles,
  'book-open': BookOpen,
  package: Package,
  users: Users
};

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isItemActive(pathname: string, item: DashboardNavItem) {
  return isActivePath(pathname, item.href);
}

function NavigationGroups({ groups, pathname }: DashboardNavProps & { pathname: string }) {
  return (
    <div className="flex flex-col gap-0">
      {groups.map((group) => (
        <div key={group.label ?? 'ungrouped'} className="p-2">
          {group.label ? (
            <div className="flex h-8 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70">
              {group.label}
            </div>
          ) : null}
          <div className="flex flex-col gap-2 text-sm">
            <ul className="flex w-full min-w-0 flex-col gap-0">
              {group.items.map((item) => {
                const Icon = item.icon ? navIcons[item.icon] : null;
                const active = isItemActive(pathname, item);
                const baseClass = cn(
                  'flex h-8 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left text-sm transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  active && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                );

                return (
                  <li key={item.title} className="relative">
                    <Link className={baseClass} href={item.href}>
                      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                      <span className="truncate">{item.title}</span>
                      {typeof item.badgeCount === 'number' && item.badgeCount > 0 ? (
                        <Badge className="ml-auto rounded-md border-border/60 bg-muted/20 px-1.5 py-0.5 text-[10px] tracking-normal text-muted-foreground" variant="outline">
                          {item.badgeCount.toLocaleString()}
                        </Badge>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSidebar({ email, groups }: DashboardNavProps & { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 z-10 hidden w-[272px] transition-[left,right,width] duration-200 ease-linear md:flex">
      <div className="flex size-full flex-col p-2">
        <div className="flex size-full flex-col bg-sidebar">
          <div className="flex flex-col gap-2 p-2">
            <ul className="flex w-full min-w-0 flex-col gap-0">
              <li className="relative">
                <Link className="flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" href="/">
                  <Command className="h-4 w-4 shrink-0" />
                  <span className="truncate text-base font-semibold">Studio Admin</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-auto">
            <NavigationGroups groups={groups} pathname={pathname} />
          </div>

          <div className="p-2">
            <AppUserMenu email={email} variant="sidebar" />
          </div>
        </div>
      </div>
    </aside>
  );
}

export function DashboardMobileNav({ groups }: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button className="-ml-1 h-7 w-7 rounded-lg" size="icon" variant="ghost">
            <Menu className="h-4 w-4" />
            <span className="sr-only">Open navigation</span>
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[92vw] max-w-sm border-sidebar-border bg-sidebar p-0" side="left">
          <div className="border-b border-sidebar-border p-4">
            <Link className="flex h-8 items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" href="/">
              <Command className="h-4 w-4 shrink-0" />
              <span className="text-base font-semibold">Studio Admin</span>
            </Link>
          </div>
          <div className="max-h-[calc(100vh-5rem)] overflow-auto py-2">
            <NavigationGroups groups={groups} pathname={pathname} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function DashboardTopbar({
  email,
  groups
}: DashboardNavProps & {
  email: string;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <DashboardMobileNav groups={groups} />
          <Button className="hidden h-7 w-7 rounded-lg md:inline-flex" size="icon" variant="ghost">
            <PanelLeft className="h-4 w-4" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <div className="mx-2 hidden h-4 w-px bg-border md:block" />
          <Button className="h-8 gap-1.5 px-0 font-normal text-muted-foreground hover:no-underline" variant="link">
            <Search className="h-4 w-4" />
            Search
            <span className="inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-foreground">
              <span className="text-xs">⌘</span>J
            </span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button className="h-8 w-8 rounded-lg" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
          <Button className="h-8 w-8 rounded-lg" size="icon">
            <Sun className="h-4 w-4" />
          </Button>
          <Button asChild className="h-8 w-8 rounded-lg" size="icon">
            <Link href="https://github.com/arhamkhnz/next-shadcn-admin-dashboard" rel="noreferrer" target="_blank">
              <SquareArrowUpRight className="h-4 w-4" />
              <span className="sr-only">Open GitHub repository</span>
            </Link>
          </Button>
          <AppUserMenu email={email} variant="avatar" />
        </div>
      </div>
    </header>
  );
}