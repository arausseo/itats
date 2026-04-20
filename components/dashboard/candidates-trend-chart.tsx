"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface CandidatesTrendChartProps {
  data: { month: string; count: number }[];
}

export function CandidatesTrendChart({ data }: CandidatesTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart
        data={data}
        margin={{ top: 4, right: 8, left: -16, bottom: 4 }}
      >
        <defs>
          <linearGradient id="candidateGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            color: "hsl(var(--foreground))",
            boxShadow: "0 2px 8px rgba(0,0,0,.08)",
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#60a5fa"
          strokeWidth={2}
          fill="url(#candidateGradient)"
          dot={false}
          activeDot={{ r: 4, fill: "#60a5fa" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
