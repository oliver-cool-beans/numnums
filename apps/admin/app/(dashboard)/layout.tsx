import {
  DashboardSidebar,
  DashboardTopbar,
  type DashboardNavGroup
} from '@/components/layout/dashboard-nav';
import { requireAdminUser } from '@/server/auth/admin-access';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const navGroups = getDashboardNavGroups();

  return <DashboardShell navGroups={navGroups}>{children}</DashboardShell>;
}

function getDashboardNavGroups(): DashboardNavGroup[] {
  return [
    {
      label: 'Overview',
      items: [
        {
          title: 'Dashboard',
          href: '/',
          icon: 'layout-dashboard'
        },
        {
          title: 'Imports',
          href: '/imports',
          icon: 'arrow-down-to-line'
        }
      ]
    },
    {
      label: 'Ingredient Matching',
      items: [
        {
          title: 'Ingredient Linking',
          href: '/ingredients/unmatched',
          icon: 'sparkles'
        },
        {
          title: 'Active Links',
          href: '/ingredients/links',
          icon: 'sparkles'
        }
      ]
    },
    {
      label: 'Catalogue',
      items: [
        {
          title: 'Recipes',
          href: '/recipes',
          icon: 'book-open'
        },
        {
          title: 'Products',
          href: '/products',
          icon: 'package'
        }
      ]
    },
    {
      label: 'Account',
      items: [
        {
          title: 'My Account',
          href: '/users',
          icon: 'users'
        }
      ]
    }
  ];
}

async function DashboardShell({
  children,
  navGroups
}: {
  children: React.ReactNode;
  navGroups: DashboardNavGroup[];
}) {
  const user = await requireAdminUser();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-screen-2xl">
        <DashboardSidebar email={user.email} groups={navGroups} />
        <main className="relative flex w-full flex-1 flex-col bg-background md:m-2 md:ml-[272px] md:rounded-xl md:border md:shadow-surface-sm">
          <DashboardTopbar email={user.email} groups={navGroups} />
          <div className="h-full p-4 md:p-6">
            <div className="space-y-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
