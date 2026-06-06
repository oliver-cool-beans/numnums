'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

type ImportActivityPoint = {
  label: string;
  created: number;
  updated: number;
};

type ImportActivityChartProps = {
  data: ImportActivityPoint[];
};

export function ImportActivityChart({ data }: ImportActivityChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
        Run an import to start charting created and updated rows.
      </div>
    );
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart barCategoryGap={18} data={data}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={false}
          />
          <YAxis axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 16,
              border: '1px solid hsl(var(--border))',
              boxShadow: '0 12px 30px hsl(var(--shadow-color) / 0.08)',
              background: 'hsl(var(--card))'
            }}
          />
          <Bar dataKey="created" fill="hsl(var(--chart-1))" name="Created" radius={[8, 8, 0, 0]} />
          <Bar dataKey="updated" fill="hsl(var(--chart-2))" name="Updated" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}