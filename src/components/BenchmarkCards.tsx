import { formatCompactCurrency, formatNumber, formatSignedPercent } from "@/lib/format";
import type { BenchmarkComparison } from "@/types/insurance";

interface BenchmarkCardsProps {
  comparisons: BenchmarkComparison[];
  breakEvenYear: number | null;
  leverageRatio: number | null;
}

const statusStyles: Record<BenchmarkComparison["status"], string> = {
  above: "text-[var(--accent)]",
  below: "text-[var(--accent-red)]",
  equal: "text-[var(--accent-amber)]",
  unavailable: "text-[var(--muted)]",
};

export function BenchmarkCards({
  comparisons,
  breakEvenYear,
  leverageRatio,
}: BenchmarkCardsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      {comparisons.map((comparison) => (
        <div
          key={comparison.key}
          className="brutal-card-soft p-5"
        >
          <p className="font-mono text-xs tracking-[0.14em] uppercase text-[var(--muted)]">{comparison.label}</p>
          <div className={`mt-3 font-mono text-2xl font-semibold ${statusStyles[comparison.status]}`}>
            {formatSignedPercent(comparison.delta)}
          </div>
          <p className="mt-2 text-xs font-medium leading-6 text-[var(--muted-strong)]">
            对比基准利率 {formatSignedPercent(comparison.rate, 1).replace("+", "")}
          </p>
          <p className="mt-3 text-xs font-medium leading-6 text-[var(--muted)]">
            终局价值 {formatCompactCurrency(comparison.insuranceValue)} vs 基准{" "}
            {formatCompactCurrency(comparison.benchmarkValue)}
          </p>
        </div>
      ))}

      <div className="brutal-card-soft p-5">
        <p className="font-mono text-xs tracking-[0.14em] uppercase text-[var(--muted)]">回本年限</p>
        <div className="mt-3 font-mono text-2xl font-semibold text-[var(--foreground)]">
          {breakEvenYear === null ? "未回本" : `第 ${breakEvenYear} 年`}
        </div>
        <p className="mt-2 text-xs font-medium leading-6 text-[var(--muted)]">
          以累计净现金流首次转正作为回本口径。
        </p>
      </div>

      <div className="brutal-card-soft p-5">
        <p className="font-mono text-xs tracking-[0.14em] uppercase text-[var(--muted)]">保障杠杆率</p>
        <div className="mt-3 font-mono text-2xl font-semibold text-[var(--foreground)]">
          {leverageRatio === null ? "N/A" : `${formatNumber(leverageRatio, 2)}x`}
        </div>
        <p className="mt-2 text-xs font-medium leading-6 text-[var(--muted)]">
          保障型产品更应关注低保费撬动高保额的能力。
        </p>
      </div>
    </div>
  );
}
