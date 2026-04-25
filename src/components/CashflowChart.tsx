"use client";

import type { YearCumulative } from "@/types/insurance";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface CashflowChartProps {
  data: YearCumulative[];
  breakEvenYear?: number | null;
}

function sampleSeries<T extends { year: number }>(
  series: T[],
  breakEvenYear: number | null | undefined,
  maxPoints = 32,
): T[] {
  if (series.length <= maxPoints) {
    return series;
  }

  const stride = Math.ceil(series.length / maxPoints);

  return series.filter(
    (item, index) =>
      index === 0 ||
      index === series.length - 1 ||
      item.year % stride === 0 ||
      (breakEvenYear != null && item.year === breakEvenYear),
  );
}

export function CashflowChart({ data, breakEvenYear }: CashflowChartProps) {
  const chartData = sampleSeries(data, breakEvenYear).map((point) => ({
    year: point.year,
    cumulativeNet: point.cumulativeNetCashflow / 10000,
  }));

  return (
    <div className="brutal-card p-5">
      <div className="mb-5">
        <p className="font-mono text-xs tracking-[0.16em] text-[var(--accent-red)] uppercase">
          累积现金流
        </p>
        <h3 className="mt-2 text-3xl font-bold text-[var(--foreground)]">钱到底什么时候回来。</h3>
      </div>
      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="cashflowGradientPos" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#4caf50" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#4caf50" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="cashflowGradientNeg" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#ff5030" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ff5030" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(17,17,17,0.08)" vertical={false} />
            <XAxis
              dataKey="year"
              stroke="#5f554c"
              tickLine={false}
              axisLine={false}
              label={{ value: "保单年度", position: "insideBottomRight", offset: -5, fill: "#5f554c", fontSize: 11 }}
            />
            <YAxis
              stroke="#5f554c"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value.toFixed(0)}万`}
            />
            <ReferenceLine y={0} stroke="#111111" strokeWidth={2} strokeDasharray="6 4" />
            {breakEvenYear != null ? (
              <ReferenceLine
                x={breakEvenYear}
                stroke="#4caf50"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{ value: `第${breakEvenYear}年回本`, fill: "#4caf50", fontSize: 11, position: "top" }}
              />
            ) : null}
            <Tooltip
              contentStyle={{
                background: "#fffdf8",
                border: "3px solid #111111",
                borderRadius: 10,
                boxShadow: "4px 4px 0 #111111",
                fontSize: 13,
              }}
              formatter={(value) => [`${Number(value ?? 0).toFixed(1)} 万元`, "累计净现金流"]}
            />
            <Area
              type="monotone"
              dataKey="cumulativeNet"
              stroke="#ff5030"
              strokeWidth={3}
              fill="url(#cashflowGradientNeg)"
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#ff5030", fill: "#fff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
