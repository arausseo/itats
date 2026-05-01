"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PipelineBarChartProps {
  data: { status: string; count: number }[];
  labelMap: Record<string, string>;
}

const STATUS_COLORS: Record<string, string> = {
  Sourced: "#94a3b8",
  "To Contact": "#60a5fa",
  Screening: "#34d399",
  "Tech Assessment": "#a78bfa",
  Interview: "#fb923c",
  Offer: "#facc15",
  Hired: "#4ade80",
  Rejected: "#f87171",
};

export function PipelineBarChart({ data, labelMap }: PipelineBarChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: labelMap[d.status] ?? d.status,
    fill: STATUS_COLORS[d.status] ?? "#94a3b8",
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 8, left: -16, bottom: 4 }}
        barCategoryGap="30%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={-25}
          textAnchor="end"
          height={46}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            color: "hsl(var(--foreground))",
            boxShadow: "0 2px 8px rgba(0,0,0,.08)",
          }}
          formatter={(value, _name, item) => [
            Number(value ?? 0),
            typeof item?.payload === "object" && item.payload !== null && "label" in item.payload
              ? String((item.payload as { label: string }).label)
              : "",
          ]}
          labelFormatter={() => ""}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
