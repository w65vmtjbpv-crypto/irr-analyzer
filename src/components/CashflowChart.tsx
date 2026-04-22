"use client";

import type { YearCumulative } from "@/types/insurance";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface CashflowChartProps {
  data: YearCumulative[];
}

function sampleSeries<T extends { year: number }>(series: T[], maxPoints = 28): T[] {
  if (series.length <= maxPoints) {
    return series;
  }

  const stride = Math.ceil(series.length / maxPoints);

  return series.filter(
    (item, index) => index === 0 || index === series.length - 1 || item.year % stride === 0,
  );
}

export function CashflowChart({ data }: CashflowChartProps) {
  const chartData = sampleSeries(data).map((point) => ({
    year: point.year,
    cumulativeNet: point.cumulativeNetCashflow / 10000,
  }));

  return (
    <div className="brutal-card p-5">
      <div className="mb-5">
        <p className="font-mono text-xs tracking-[0.16em] text-[var(--accent-red)] uppercase">
          CASHFLOW CURVE
        </p>
        <h3 className="mt-2 text-3xl font-bold text-[var(--foreground)]">钱到底什么时候回来。</h3>
      </div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="cashflowGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#ff5030" stopOpacity={0.7} />
                <stop offset="95%" stopColor="#ff5030" stopOpacity={0.1} />
              </linearGradient>
            </defs>
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
              formatter={(value) => [`${Number(value ?? 0).toFixed(1)} 万元`, "累计净现金流"]}
            />
            <Area
              type="monotone"
              dataKey="cumulativeNet"
              stroke="#ff5030"
              strokeWidth={3}
              fill="url(#cashflowGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
