"use client";

import { VerdictBadge } from "@/components/VerdictBadge";
import { formatPercent } from "@/lib/format";
import type { AnalysisResult } from "@/types/insurance";
import { useEffect, useState } from "react";

interface IRRDisplayProps {
  result: AnalysisResult;
}

function methodLabel(method: string): string {
  return method === "none" ? "未收敛" : method;
}

export function IRRDisplay({ result }: IRRDisplayProps) {
  const [displayValue, setDisplayValue] = useState(0);

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
            THIS IS THE NUMBER
          </p>
          <h2 className="mt-3 max-w-xl text-3xl font-bold leading-tight text-[var(--foreground)] md:text-5xl">
            REAL IRR. NO FLUFF. NO SALES FOG.
          </h2>
          <div className="mt-4 font-mono text-5xl font-bold tracking-tight text-[var(--foreground)] md:text-7xl">
            {result.irr.final === null ? "N/A" : formatPercent(displayValue)}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <VerdictBadge verdict={result.verdict} label={result.verdictLabel} />
            <p className="text-sm font-semibold text-[var(--muted-strong)]">{result.verdictSummary}</p>
          </div>
        </div>

        <div className="brutal-card-soft grid gap-3 p-5 text-sm font-medium text-[var(--muted-strong)]">
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
            <strong className="font-mono uppercase text-[var(--foreground)]">{result.irr.confidence}</strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>采信算法</span>
            <strong className="font-mono text-[var(--foreground)]">{methodLabel(result.irr.method)}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
