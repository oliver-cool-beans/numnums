import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from './login-form';

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const nextPath = resolvedSearchParams.next ?? '/';
  const reason = resolvedSearchParams.reason ?? null;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-6 py-12 text-foreground sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(148,163,184,0.12),_transparent_42%)]" />
      <Card className="relative w-full max-w-[380px] rounded-[28px] border-border/70 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur">
        <CardHeader className="space-y-3 px-6 pb-4 pt-6 text-center sm:px-7 sm:pt-7">
          <div className="mx-auto inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            NumNums Studio
          </div>
          <CardTitle className="text-[1.75rem] tracking-tight text-slate-950">Sign in to admin</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 sm:px-7 sm:pb-7">
          <LoginForm nextPath={nextPath} reason={reason} />
        </CardContent>
      </Card>
    </div>
  );
}
