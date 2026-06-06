import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { cn } from '@/lib/utils';

type TableCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  toolbar?: React.ReactNode;
};

export function TableCard({ title, description, children, actions, toolbar }: TableCardProps) {
  return (
    <Card className="flex flex-col gap-4 overflow-hidden rounded-xl border-0 py-4 shadow-none ring-1 ring-foreground/10">
      <CardHeader className="grid auto-rows-min items-start gap-1 border-b px-4 pb-4">
        <div className="grid gap-1 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-3">
          <div className="space-y-1">
            <CardTitle className="font-medium leading-none">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
          {actions ? <div className="self-start justify-self-end">{actions}</div> : null}
        </div>
      </CardHeader>
      <CardContent className={cn('px-4 pt-0 pb-0', toolbar ? 'space-y-4' : undefined)}>
        {toolbar ? <div>{toolbar}</div> : null}
        {children}
      </CardContent>
    </Card>
  );
}