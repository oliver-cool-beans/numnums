import Link from 'next/link';
import { BookOpen, Clock3, Package, Users } from 'lucide-react';

import { HeaderStat } from '@/components/layout/header-stat';
import { PageHeader } from '@/components/layout/page-header';
import { SetupNotice } from '@/components/layout/setup-notice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardOverviewStats } from '@/server/dashboard/get-dashboard-stats';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const stats = await getDashboardOverviewStats();

  return (
    <div className="space-y-6">
      <PageHeader
        description="Direct operational view of the catalogue, linking queue, imports, and admin accounts."
        eyebrow="Overview"
        title="Dashboard"
      />
      <SetupNotice errorMessage={stats.errorMessage} status={stats.status} />

      <div className="flex flex-wrap gap-2">
        <HeaderStat icon={Package} label="products" value={stats.counts.products} />
        <HeaderStat icon={BookOpen} label="recipes" value={stats.counts.recipes} />
        <HeaderStat icon={Clock3} label="ingredients needing matching" value={stats.counts.ingredientsNeedingMatching} />
        <HeaderStat icon={Users} label="user accounts" value={stats.counts.users} />
      </div>

      <section className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Ingredient linking</CardTitle>
              <CardDescription>Review unmatched ingredients and approve product links.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-semibold tracking-tight">{stats.counts.ingredientsNeedingMatching.toLocaleString()}</p>
              <Button asChild size="sm" variant="outline">
                <Link href="/ingredients/unmatched">Open ingredient linking</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Imports</CardTitle>
              <CardDescription>Check the latest product and recipe import runs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Latest product import: {stats.latestImportsByType.products?.status ?? 'not run yet'}</p>
                <p>Latest recipe import: {stats.latestImportsByType.recipes?.status ?? 'not run yet'}</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/imports">Open imports</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accounts</CardTitle>
              <CardDescription>Admin user counts and recent activity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{stats.counts.users.toLocaleString()} total users</p>
              <p>{stats.counts.activeUsers.toLocaleString()} active in the last 30 days</p>
              <Button asChild size="sm" variant="outline">
                <Link href="/users">Open users</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
