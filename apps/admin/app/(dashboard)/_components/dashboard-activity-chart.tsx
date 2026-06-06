'use client';

import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

type DashboardActivityPoint = {
  label: string;
  date: string | null;
  seen: number;
  created: number;
  updated: number;
};

type DashboardActivityChartProps = {
  data: DashboardActivityPoint[];
};

function formatAxisLabel(value: string | null, fallback: string) {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat('en-AU', {
    month: 'short',
    day: 'numeric'
  }).format(new Date(value));
}

function formatTooltipLabel(value: string | null, fallback: string) {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export function DashboardActivityChart({ data }: DashboardActivityChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
        No import activity is available yet.
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="dashboardSeenFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.32} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeOpacity={0.4} />
          <XAxis
            axisLine={false}
            dataKey="date"
            minTickGap={32}
            tickFormatter={(value, index) => formatAxisLabel(value, data[index]?.label ?? 'Run')}
            tickLine={false}
            tickMargin={10}
          />
          <Tooltip
            cursor={false}
            contentStyle={{
              borderRadius: 16,
              borderColor: 'hsl(var(--border))',
              backgroundColor: 'hsl(var(--background))'
            }}
            formatter={(value: number, name: string) => [value.toLocaleString(), name]}
            labelFormatter={(value, payload) => formatTooltipLabel(typeof value === 'string' ? value : null, payload?.[0]?.payload?.label ?? 'Run')}
          />
          <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 20 }} />
          <Area
            type="monotone"
            dataKey="seen"
            name="Seen rows"
            stroke="hsl(var(--chart-1))"
            fill="url(#dashboardSeenFill)"
            strokeWidth={1.5}
          />
          <Line
            type="monotone"
            dataKey="created"
            name="Created rows"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="updated"
            name="Updated rows"
            stroke="hsl(var(--chart-3))"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}