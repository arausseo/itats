"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface SeniorityDonutChartProps {
  data: { seniority: string; count: number }[];
}

const COLORS = [
  "#60a5fa",
  "#34d399",
  "#a78bfa",
  "#fb923c",
  "#facc15",
  "#f87171",
  "#94a3b8",
];

export function SeniorityDonutChart({ data }: SeniorityDonutChartProps) {
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="seniority"
            cx="50%"
            cy="50%"
            innerRadius={38}
            outerRadius={60}
            paddingAngle={2}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
              boxShadow: "0 2px 8px rgba(0,0,0,.08)",
            }}
            formatter={(value: number, name: string) => [value, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex flex-col gap-1.5 min-w-0">
        {data.map((d, index) => (
          <li key={d.seniority} className="flex items-center gap-2 min-w-0">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: COLORS[index % COLORS.length] }}
            />
            <span className="truncate text-xs text-muted-foreground">
              {d.seniority}
            </span>
            <span className="ml-auto pl-2 text-xs font-medium text-foreground tabular-nums">
              {d.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
