import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DataStatus } from '@/server/db/runtime';

const setupCopy: Record<Exclude<DataStatus, 'ready'>, { title: string; body: string }> = {
  'env-missing': {
    title: 'Supabase environment is not configured',
    body: 'Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY before expecting live admin data.'
  },
  'schema-pending': {
    title: 'Database schema has not been applied yet',
    body: 'Apply the initial Supabase migration before expecting products, recipes, ingredient linking data, or import runs to load.'
  }
};

type SetupNoticeProps = {
  status: DataStatus;
  errorMessage?: string | null;
};

export function SetupNotice({ status, errorMessage }: SetupNoticeProps) {
  if (status === 'ready') {
    return null;
  }

  const copy = setupCopy[status];

  return (
    <Card className="border-amber-200 bg-amber-50 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-amber-950">{copy.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-amber-900">
        <p>{copy.body}</p>
        {errorMessage ? (
          <p className="rounded-xl border border-amber-200 bg-white/70 px-3 py-2 font-mono text-xs text-amber-800">
            {errorMessage}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}