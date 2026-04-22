import { formatCurrency, formatPercent } from "@/lib/format";
import type { SurrenderAnalysis } from "@/types/insurance";

interface SurrenderTableProps {
  rows: SurrenderAnalysis[];
}

export function SurrenderTable({ rows }: SurrenderTableProps) {
  return (
    <div className="brutal-card p-5">
      <div className="mb-5">
        <p className="font-mono text-xs tracking-[0.16em] text-[var(--accent-red)] uppercase">
          EXIT DAMAGE
        </p>
        <h3 className="mt-2 text-3xl font-bold text-[var(--foreground)]">提前退，代价有多硬。</h3>
      </div>

      {rows.length === 0 ? (
        <div className="brutal-card-soft px-4 py-6 text-sm font-medium text-[var(--muted)]">
          当前合同没有提供现金价值表，无法计算逐年退保 IRR。
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="brutal-table min-w-full text-left text-sm">
            <thead className="text-[var(--muted)]">
              <tr>
                <th className="px-3 py-3 font-medium">年份</th>
                <th className="px-3 py-3 font-medium">已交保费</th>
                <th className="px-3 py-3 font-medium">退保金</th>
                <th className="px-3 py-3 font-medium">损失</th>
                <th className="px-3 py-3 font-medium">损失率</th>
                <th className="px-3 py-3 font-medium">退保 IRR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.year} className="text-[var(--muted-strong)]">
                  <td className="px-3 py-3 font-mono text-[var(--foreground)]">{row.year}</td>
                  <td className="px-3 py-3">{formatCurrency(row.totalPaid)}</td>
                  <td className="px-3 py-3">{formatCurrency(row.surrenderValue)}</td>
                  <td className="px-3 py-3">{formatCurrency(row.netLoss)}</td>
                  <td className="px-3 py-3">{formatPercent(row.lossRate / 100)}</td>
                  <td className="px-3 py-3 font-mono text-[var(--foreground)]">{formatPercent(row.surrenderIRR)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
