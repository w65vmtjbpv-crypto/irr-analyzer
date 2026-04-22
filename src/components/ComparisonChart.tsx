"use client";

import type { BenchmarkRate, ComparisonSeriesPoint } from "@/types/insurance";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ComparisonChartProps {
  data: ComparisonSeriesPoint[];
  benchmarks: BenchmarkRate[];
}

function sampleSeries(series: ComparisonSeriesPoint[], maxPoints = 28) {
  if (series.length <= maxPoints) {
    return series;
  }

  const stride = Math.ceil(series.length / maxPoints);

  return series.filter(
    (item, index) => index === 0 || index === series.length - 1 || item.year % stride === 0,
  );
}

export function ComparisonChart({ data, benchmarks }: ComparisonChartProps) {
  const chartData = sampleSeries(data).map((point) => {
    const normalized: ComparisonSeriesPoint = {
      year: point.year,
      insuranceValue: point.insuranceValue / 10000,
    };

    for (const benchmark of benchmarks) {
      normalized[benchmark.key] = point[benchmark.key] / 10000;
    }

    return normalized;
  });

  return (
    <div className="brutal-card p-5">
      <div className="mb-5">
        <p className="font-mono text-xs tracking-[0.16em] text-[var(--accent-amber)] uppercase">
          BENCHMARK FIGHT
        </p>
        <h3 className="mt-2 text-3xl font-bold text-[var(--foreground)]">别和自己比。和外面打。</h3>
      </div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid stroke="rgba(17,17,17,0.12)" vertical={false} />
            <XAxis dataKey="year" stroke="#3d372f" tickLine={false} axisLine={false} />
            <YAxis
              stroke="#3d372f"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value.toFixed(0)}万`}
            />
            <Tooltip
              contentStyle={{
                background: "#fffdf8",
                border: "3px solid #111111",
                borderRadius: 18,
                boxShadow: "4px 4px 0 #111111",
              }}
              formatter={(value) => [`${Number(value ?? 0).toFixed(1)} 万元`, ""]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="insuranceValue"
              name="保险现金价值"
              stroke="#ff5030"
              strokeWidth={3}
              dot={false}
            />
            {benchmarks.map((benchmark) => (
              <Line
                key={benchmark.key}
                type="monotone"
                dataKey={benchmark.key}
                name={benchmark.shortLabel}
                stroke={benchmark.color}
                strokeWidth={1.8}
                strokeDasharray={benchmark.key === "hs300" ? "6 6" : undefined}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
