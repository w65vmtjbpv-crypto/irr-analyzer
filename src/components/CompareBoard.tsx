"use client";

import { formatCurrency, formatDateTime, formatPercent } from "@/lib/format";
import { useAnalysisStore } from "@/store/analysisStore";
import Link from "next/link";
import { useMemo } from "react";

export function CompareBoard() {
  const order = useAnalysisStore((state) => state.order);
  const recordMap = useAnalysisStore((state) => state.records);
  const records = useMemo(
    () =>
      order
        .map((id) => recordMap[id])
        .filter((record): record is NonNullable<(typeof recordMap)[string]> => Boolean(record)),
    [order, recordMap],
  );
  const removeRecord = useAnalysisStore((state) => state.removeRecord);

  function handleDelete(id: string, productName: string) {
    if (window.confirm(`确定要删除「${productName}」的分析记录吗？删除后不可恢复。`)) {
      removeRecord(id);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="brutal-card flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-xs tracking-[0.18em] text-[var(--accent-red)] uppercase">
              THE BOARD
            </p>
            <h1 className="mt-2 text-4xl font-bold text-[var(--foreground)]">把几份保险摆一排。直接打。</h1>
            <p className="mt-3 text-sm font-medium leading-7 text-[var(--muted)]">
              不用温柔解释。只比较 IRR、回本年限和杠杆。谁强谁弱，一眼看完。
            </p>
          </div>
          <Link href="/" className="brutal-button">
            新建分析
          </Link>
        </header>

        {records.length === 0 ? (
          <div className="brutal-card-soft p-8 text-sm font-medium text-[var(--muted)]">
            还没有可对比的分析记录。先回首页跑一份合同，再回到这里横向查看。
          </div>
        ) : (
          <div className="brutal-card overflow-x-auto p-4">
            <table className="brutal-table min-w-full text-left text-sm">
              <thead className="text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-3 font-medium">产品</th>
                  <th className="px-3 py-3 font-medium">IRR</th>
                  <th className="px-3 py-3 font-medium">年缴/缴费年限</th>
                  <th className="px-3 py-3 font-medium">回本</th>
                  <th className="px-3 py-3 font-medium">杠杆率</th>
                  <th className="px-3 py-3 font-medium">创建时间</th>
                  <th className="px-3 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="text-[var(--muted-strong)]">
                    <td className="px-3 py-3">
                      <div className="font-medium text-[var(--foreground)]">{record.contract.productName}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">{record.contract.productType}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[var(--foreground)]">
                      {formatPercent(record.result.irr.final)}
                    </td>
                    <td className="px-3 py-3">
                      {record.contract.premiumPerYear > 0
                        ? formatCurrency(record.contract.premiumPerYear)
                        : "未识别"}
                      {" / "}
                      {record.contract.paymentYears > 0 ? `${record.contract.paymentYears}年` : "未识别"}
                    </td>
                    <td className="px-3 py-3">
                      {record.result.breakEvenYear === null ? "未回本" : `第${record.result.breakEvenYear}年`}
                    </td>
                    <td className="px-3 py-3">
                      {record.result.leverageRatio === null
                        ? "N/A"
                        : `${record.result.leverageRatio.toFixed(2)}x`}
                    </td>
                    <td className="px-3 py-3">{formatDateTime(record.createdAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/analysis/${record.id}`} className="brutal-button-secondary px-3 py-1 text-xs">
                          查看
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(record.id, record.contract.productName)}
                          className="brutal-button-danger px-3 py-1 text-xs"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
