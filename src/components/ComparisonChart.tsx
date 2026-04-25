"use client";

import type { BenchmarkRate, ComparisonSeriesPoint } from "@/types/insurance";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
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

const INSURANCE_KEY = "insuranceValue";
const INSURANCE_COLOR = "#ff5030";

export function ComparisonChart({ data, benchmarks }: ComparisonChartProps) {
  const maxYear = data.length > 0 ? data[data.length - 1].year : 50;
  const minYear = data.length > 0 ? data[0].year : 0;

  // Presets for quick range selection
  const presets = useMemo(() => {
    const candidates = [10, 15, 20, 30, 50, maxYear].filter(
      (y) => y <= maxYear && y > minYear,
    );
    // Deduplicate
    return [...new Set(candidates)];
  }, [maxYear, minYear]);

  const [rangeEnd, setRangeEnd] = useState(Math.min(30, maxYear));
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  function toggleKey(key: string) {
    setHiddenKeys((prev) => {
      const next = new Set(prev);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  const filteredData = useMemo(() => {
    return data
      .filter((point) => point.year >= minYear && point.year <= rangeEnd)
      .map((point) => {
        const normalized: ComparisonSeriesPoint = {
          year: point.year,
          insuranceValue: point.insuranceValue / 10000,
        };

        for (const benchmark of benchmarks) {
          normalized[benchmark.key] = point[benchmark.key] / 10000;
        }

        return normalized;
      });
  }, [data, benchmarks, minYear, rangeEnd]);

  // Visible series for legend rendering
  const visibleBenchmarks = benchmarks.filter((b) => !hiddenKeys.has(b.key));
  const showInsurance = !hiddenKeys.has(INSURANCE_KEY);

  return (
    <div className="brutal-card p-5">
      <div className="mb-4">
        <p className="font-mono text-xs tracking-[0.16em] text-[var(--accent-amber)] uppercase">
          基准对比
        </p>
        <h3 className="mt-2 text-3xl font-bold text-[var(--foreground)]">别和自己比。和外面打。</h3>
      </div>

      {/* Year range control */}
      <div className="mb-4 flex flex-col gap-3 rounded-[14px] border-[2px] border-[var(--border)] bg-white p-4 shadow-[3px_3px_0_#111111]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--muted)]">
            观察范围：第 {minYear} ~ {rangeEnd} 年
          </span>
          <div className="flex gap-1.5">
            {presets.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setRangeEnd(y)}
                className={`rounded-full border-[2px] border-[var(--border)] px-2.5 py-1 text-xs font-bold transition-colors ${
                  rangeEnd === y
                    ? "bg-[var(--foreground)] text-white"
                    : "bg-white text-[var(--foreground)] hover:bg-[rgba(17,17,17,0.06)]"
                }`}
              >
                {y === maxYear ? `${y}（全部）` : `${y}年`}
              </button>
            ))}
          </div>
        </div>
        <input
          type="range"
          min={Math.min(5, maxYear)}
          max={maxYear}
          step={1}
          value={rangeEnd}
          onChange={(e) => setRangeEnd(Number(e.target.value))}
          className="w-full accent-[var(--foreground)]"
        />
      </div>

      {/* Series toggle */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => toggleKey(INSURANCE_KEY)}
          className={`flex items-center gap-1.5 rounded-full border-[2px] px-3 py-1.5 text-xs font-bold transition-colors ${
            showInsurance
              ? "border-[#ff5030] bg-[rgba(255,80,48,0.08)] text-[#ff5030]"
              : "border-[var(--border)] bg-white text-[var(--muted)] line-through"
          }`}
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: showInsurance ? INSURANCE_COLOR : "#ccc" }}
          />
          保险现金价值
        </button>
        {benchmarks.map((b) => {
          const active = !hiddenKeys.has(b.key);

          return (
            <button
              key={b.key}
              type="button"
              onClick={() => toggleKey(b.key)}
              className={`flex items-center gap-1.5 rounded-full border-[2px] px-3 py-1.5 text-xs font-bold transition-colors ${
                active
                  ? "border-[var(--border)] bg-[rgba(17,17,17,0.04)] text-[var(--foreground)]"
                  : "border-[var(--border)] bg-white text-[var(--muted)] line-through"
              }`}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: active ? b.color : "#ccc" }}
              />
              {b.shortLabel}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
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
            <Tooltip
              contentStyle={{
                background: "#fffdf8",
                border: "3px solid #111111",
                borderRadius: 10,
                boxShadow: "4px 4px 0 #111111",
                fontSize: 13,
              }}
              formatter={(value, name) => {
                const label =
                  name === INSURANCE_KEY
                    ? "保险现金价值"
                    : benchmarks.find((b) => b.key === name)?.shortLabel ?? String(name);
                return [`${Number(value ?? 0).toFixed(1)} 万元`, label];
              }}
            />
            {showInsurance ? (
              <Line
                type="monotone"
                dataKey="insuranceValue"
                name={INSURANCE_KEY}
                stroke={INSURANCE_COLOR}
                strokeWidth={3.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: INSURANCE_COLOR, fill: "#fff" }}
              />
            ) : null}
            {visibleBenchmarks.map((benchmark) => (
              <Line
                key={benchmark.key}
                type="monotone"
                dataKey={benchmark.key}
                name={benchmark.key}
                stroke={benchmark.color}
                strokeWidth={2}
                strokeDasharray={benchmark.key === "hs300" ? "8 4" : undefined}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
