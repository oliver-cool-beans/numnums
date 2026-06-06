import { PageHeader } from '@/components/layout/page-header';
import { SetupNotice } from '@/components/layout/setup-notice';
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableEmptyState,
  AdminTableHead,
  AdminTableHeader,
  AdminTableRow
} from '@/components/tables/admin-table';
import { TableCard } from '@/components/tables/table-card';
import { Badge } from '@/components/ui/badge';
import { listUsers } from '@/server/users/list-users';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const result = await listUsers();

  return (
    <div className="space-y-6">
      <PageHeader
        description="Review the account currently signed into the admin portal. Your admin access still comes from Supabase auth app metadata, while the public profile row stores supplementary details like name and plan."
        eyebrow="My account"
        title="Signed-in account"
      />
      <SetupNotice errorMessage={result.errorMessage} status={result.status} />
      <TableCard
        description="Your visible public.users row under own-row RLS, shown alongside the current auth role backing access to this portal."
        title="Account details"
      >
        <AdminTable>
          <AdminTableHeader>
            <AdminTableRow>
              <AdminTableHead>User ID</AdminTableHead>
              <AdminTableHead>Name</AdminTableHead>
              <AdminTableHead>Access</AdminTableHead>
              <AdminTableHead>Plan</AdminTableHead>
              <AdminTableHead>Last seen</AdminTableHead>
            </AdminTableRow>
          </AdminTableHeader>
          <AdminTableBody>
            {result.items.length === 0 ? (
              <AdminTableEmptyState colSpan={5}>No account details are visible yet.</AdminTableEmptyState>
            ) : (
              result.items.map((user) => (
                <AdminTableRow key={user.id}>
                  <AdminTableCell className="font-mono text-xs text-muted-foreground">{user.id}</AdminTableCell>
                  <AdminTableCell className="text-muted-foreground">{user.name ?? 'Unknown'}</AdminTableCell>
                  <AdminTableCell>
                    <Badge variant={user.authRole === 'admin' ? 'default' : 'outline'}>
                      {user.authRole ?? 'No access role'}
                    </Badge>
                  </AdminTableCell>
                  <AdminTableCell className="text-muted-foreground">{user.plan ?? 'No plan'}</AdminTableCell>
                  <AdminTableCell className="text-muted-foreground">{user.lastSeenAt ?? 'Never'}</AdminTableCell>
                </AdminTableRow>
              ))
            )}
          </AdminTableBody>
        </AdminTable>
      </TableCard>
    </div>
  );
}