import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type MetricCardProps = {
  label: string;
  value: number;
  detail: string;
  kicker?: string;
};

export function MetricCard({ label, value, detail, kicker }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </CardTitle>
          {kicker ? (
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {kicker}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-0">
        <p className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
          {value.toLocaleString()}
        </p>
        <p className="text-xs leading-5 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}