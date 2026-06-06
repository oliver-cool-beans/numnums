'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type DashboardSeriesChartPoint = {
  bucketStart: string;
  label: string;
  fullLabel: string;
  value: number;
};

type DashboardSeriesChartProps = {
  data: DashboardSeriesChartPoint[];
  emptyMessage: string;
  seriesLabel: string;
};

export function DashboardSeriesChart({ data, emptyMessage, seriesLabel }: DashboardSeriesChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 4, right: 16, top: 8 }}>
          <CartesianGrid vertical={false} strokeOpacity={0.35} />
          <XAxis axisLine={false} dataKey="label" minTickGap={24} tickLine={false} tickMargin={10} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={36} />
          <Tooltip
            cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '4 4' }}
            contentStyle={{
              borderRadius: 16,
              borderColor: 'hsl(var(--border))',
              backgroundColor: 'hsl(var(--background))'
            }}
            formatter={(value: number) => [value.toLocaleString(), seriesLabel]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ''}
          />
          <Line
            type="monotone"
            dataKey="value"
            name={seriesLabel}
            stroke="hsl(var(--chart-1))"
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}