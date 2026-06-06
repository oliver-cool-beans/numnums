import type { LucideIcon } from 'lucide-react';

export function HeaderStat({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-sm text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span className="font-medium text-foreground">{value}</span>
      <span>{label}</span>
    </div>
  );
}