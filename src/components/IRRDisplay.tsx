"use client";

import { VerdictBadge } from "@/components/VerdictBadge";
import { formatPercent } from "@/lib/format";
import type { AnalysisResult } from "@/types/insurance";
import { useEffect, useState } from "react";

interface IRRDisplayProps {
  result: AnalysisResult;
  inflationRate: number;
}

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

function methodLabel(method: string): string {
  const labels: Record<string, string> = {
    none: "未收敛",
    newton: "牛顿法",
    bisection: "二分法",
    brent: "Brent 法",
  };

  return labels[method] ?? method;
}

export function IRRDisplay({ result, inflationRate }: IRRDisplayProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (result.irr.final === null) {
      return;
    }

    const target = result.irr.final;
    const start = performance.now();
    const duration = 1500;
    let frameId = 0;

    const tick = (timestamp: number) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(target * eased);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [result.irr.final]);

  return (
    <section className="brutal-panel-accent p-7 md:p-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-[var(--accent-red)] uppercase">
            IRR 年化收益率
          </p>
          <div className="mt-4 font-mono text-5xl font-bold tracking-tight text-[var(--foreground)] md:text-7xl">
            {result.irr.final === null ? "暂无" : formatPercent(displayValue)}
            {result.irrOptimistic?.final != null && result.irr.final != null ? (
              <span className="ml-2 text-3xl font-bold text-[var(--muted-strong)] md:text-5xl">
                ~ {formatPercent(result.irrOptimistic.final)}
              </span>
            ) : null}
          </div>
          {result.irrOptimistic?.final != null && result.irr.final != null ? (
            <p className="mt-2 text-xs font-medium text-[var(--muted)]">
              左侧为保守值，右侧为条件达标后的乐观值
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <VerdictBadge verdict={result.verdict} label={result.verdictLabel} />
            <p className="text-sm font-semibold text-[var(--muted-strong)]">{result.verdictSummary}</p>
          </div>
          {(result.realIRR ?? null) !== null && result.irr.final !== null ? (
            <div className="mt-4 flex items-baseline gap-3 rounded-[12px] border-[2px] border-[var(--border)] bg-white/60 px-4 py-3">
              <span className="text-sm font-medium text-[var(--muted)]">扣除通胀后实际 IRR</span>
              <span className={`font-mono text-xl font-bold ${(result.realIRR ?? 0) >= 0 ? "text-[var(--accent)]" : "text-[var(--accent-red)]"}`}>
                {formatPercent(result.realIRR)}
              </span>
              <span className="text-xs text-[var(--muted)]">（按 CPI {formatPercent(inflationRate, 1)} 调整）</span>
            </div>
          ) : null}
        </div>

        <div className="text-sm font-medium text-[var(--muted-strong)]">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="flex items-center gap-2 text-xs font-mono tracking-[0.12em] uppercase text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <span>{showDetails ? "▼" : "▶"}</span>
            算法细节
          </button>
          {showDetails ? (
            <div className="brutal-card-soft mt-3 grid gap-3 p-5">
              <div className="flex items-center justify-between gap-4">
                <span>牛顿法</span>
                <strong className="font-mono text-[var(--foreground)]">{formatPercent(result.irr.newton)}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>二分法</span>
                <strong className="font-mono text-[var(--foreground)]">{formatPercent(result.irr.bisection)}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Brent 法</span>
                <strong className="font-mono text-[var(--foreground)]">{formatPercent(result.irr.brent)}</strong>
              </div>
              <div className="h-[2px] bg-[rgba(17,17,17,0.18)]" />
              <div className="flex items-center justify-between gap-4">
                <span>置信度</span>
                <strong className="font-mono text-[var(--foreground)]">{CONFIDENCE_LABELS[result.irr.confidence] ?? result.irr.confidence}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>采信算法</span>
                <strong className="font-mono text-[var(--foreground)]">{methodLabel(result.irr.method)}</strong>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
