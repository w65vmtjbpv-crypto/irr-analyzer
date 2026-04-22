"use client";

import { BenchmarkCards } from "@/components/BenchmarkCards";
import { CashflowChart } from "@/components/CashflowChart";
import { ComparisonChart } from "@/components/ComparisonChart";
import { Disclaimer } from "@/components/Disclaimer";
import { IRRDisplay } from "@/components/IRRDisplay";
import { SurrenderTable } from "@/components/SurrenderTable";
import { DEFAULT_BENCHMARKS } from "@/constants/benchmarks";
import { buildBenchmarkComparison, buildComparisonSeries } from "@/lib/benchmark";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { AnalysisRecord, BenchmarkRate } from "@/types/insurance";
import Link from "next/link";
import { useState } from "react";

interface ResultDashboardProps {
  record: AnalysisRecord;
}

const documentTypeLabels = {
  illustration: "利益演示",
  proposal: "投保方案",
  policy: "正式保单",
  clause: "保险条款",
  unknown: "未识别",
} as const;

export function ResultDashboard({ record }: ResultDashboardProps) {
  const [benchmarks, setBenchmarks] = useState<BenchmarkRate[]>(
    DEFAULT_BENCHMARKS.map((benchmark) => ({ ...benchmark })),
  );
  const [copied, setCopied] = useState(false);
  const attentionPoints = record.contract.attentionPoints ?? [];
  const riskWarnings = record.contract.riskWarnings ?? [];
  const hasClauseInsights = attentionPoints.length > 0 || riskWarnings.length > 0;
  const hasCashflowInputs =
    record.contract.premiumPerYear > 0 ||
    record.contract.benefits.length > 0 ||
    record.contract.surrenderValues.length > 0;

  const benchmarkComparison = buildBenchmarkComparison(
    record.contract,
    record.result.irr.final,
    record.result.insuranceValueSeries,
    benchmarks,
  );
  const comparisonSeries = buildComparisonSeries(
    record.contract,
    record.result.insuranceValueSeries,
    benchmarks,
  );

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);

    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="brutal-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-xs tracking-[0.18em] text-[var(--accent-red)] uppercase">
              analysis / {record.id}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)] md:text-5xl">
              {record.contract.productName}
            </h1>
            <p className="mt-2 text-sm font-medium text-[var(--muted)]">
              创建于 {formatDateTime(record.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="brutal-button-secondary">
              NEW RUN
            </Link>
            <Link href="/compare" className="brutal-button-secondary">
              SEE ALL
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="brutal-button-secondary"
            >
              EXPORT PDF
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="brutal-button"
            >
              {copied ? "LINK COPIED" : "COPY LINK"}
            </button>
          </div>
        </header>

        <section className="brutal-card-soft p-6">
          <div className="grid gap-4 text-sm font-medium text-[var(--muted-strong)] md:grid-cols-2 xl:grid-cols-5">
            <div>
              <span className="text-[var(--muted)]">文档类型</span>
              <p className="mt-1 text-[var(--foreground)]">
                {documentTypeLabels[record.contract.documentType ?? "unknown"]}
              </p>
            </div>
            <div>
              <span className="text-[var(--muted)]">产品类型</span>
              <p className="mt-1 font-mono text-lg text-[var(--foreground)]">{record.contract.productType}</p>
            </div>
            <div>
              <span className="text-[var(--muted)]">投保结构</span>
              <p className="mt-1 text-[var(--foreground)]">
                {record.contract.premiumPerYear > 0
                  ? `年缴 ${formatCurrency(record.contract.premiumPerYear)}`
                  : "年缴未识别"}
                ，
                {record.contract.paymentYears > 0
                  ? `缴 ${record.contract.paymentYears} 年`
                  : "缴费年限未识别"}
              </p>
            </div>
            <div>
              <span className="text-[var(--muted)]">保障期限</span>
              <p className="mt-1 text-[var(--foreground)]">
                {record.contract.policyYears > 0
                  ? `保单按 ${record.contract.policyYears} 年建模`
                  : "保障期限未识别"}
              </p>
            </div>
            <div>
              <span className="text-[var(--muted)]">被保人年龄</span>
              <p className="mt-1 text-[var(--foreground)]">
                {record.contract.insuredAge > 0 ? `${record.contract.insuredAge} 岁` : "未识别"}
              </p>
            </div>
          </div>
        </section>

        {hasClauseInsights ? (
          <section className="grid gap-6 xl:grid-cols-2">
            <div className="brutal-card p-5">
              <div className="mb-5">
                <p className="font-mono text-xs tracking-[0.16em] text-[var(--accent)] uppercase">
                  WHAT TO CHECK
                </p>
                <h3 className="mt-2 text-3xl font-bold text-[var(--foreground)]">先看清条款重点。</h3>
              </div>
              <div className="grid gap-3 text-sm font-medium leading-7 text-[var(--muted-strong)]">
                {attentionPoints.length > 0 ? (
                  attentionPoints.map((item) => <p key={item}>- {item}</p>)
                ) : (
                  <p>AI 没有从当前文档里抽到足够清晰的条款重点。</p>
                )}
              </div>
            </div>

            <div className="brutal-card p-5">
              <div className="mb-5">
                <p className="font-mono text-xs tracking-[0.16em] text-[var(--accent-red)] uppercase">
                  RISK WARNINGS
                </p>
                <h3 className="mt-2 text-3xl font-bold text-[var(--foreground)]">这些地方最容易踩坑。</h3>
              </div>
              <div className="grid gap-3 text-sm font-medium leading-7 text-[var(--muted-strong)]">
                {riskWarnings.length > 0 ? (
                  riskWarnings.map((item) => <p key={item}>- {item}</p>)
                ) : (
                  <p>AI 没有从当前文档里抽到明确的风险提示。</p>
                )}
              </div>
            </div>
          </section>
        ) : null}

        <IRRDisplay result={record.result} />

        {hasCashflowInputs ? (
          <>
            <BenchmarkCards
              comparisons={benchmarkComparison}
              breakEvenYear={record.result.breakEvenYear}
              leverageRatio={record.result.leverageRatio}
            />

            <section className="brutal-card p-5">
              <div className="mb-5">
                <p className="font-mono text-xs tracking-[0.16em] text-[var(--accent-red)] uppercase">
                  EDIT THE FIGHT
                </p>
                <h3 className="mt-2 text-3xl font-bold text-[var(--foreground)]">把基准调狠一点。</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {benchmarks.map((benchmark) => (
                  <label key={benchmark.key} className="grid gap-2">
                    <span className="text-sm font-medium text-[var(--muted-strong)]">{benchmark.label}</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        step="0.1"
                        value={(benchmark.rate * 100).toFixed(1)}
                        onChange={(event) =>
                          setBenchmarks((items) =>
                            items.map((item) =>
                              item.key === benchmark.key
                                ? { ...item, rate: Number(event.target.value) / 100 }
                                : item,
                            ),
                          )
                        }
                        className="brutal-input"
                      />
                      <span className="text-sm font-semibold text-[var(--foreground)]">%</span>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <CashflowChart data={record.result.cumulativeCashflows} />
              <ComparisonChart data={comparisonSeries} benchmarks={benchmarks} />
            </div>

            <SurrenderTable rows={record.result.surrenderAnalysis} />
          </>
        ) : (
          <section className="brutal-card-soft p-6 text-sm font-medium leading-7 text-[var(--muted-strong)]">
            当前上传的是条款/责任说明类文档，AI 已切到条款分析模式。由于缺少保费、现金价值或确定给付的数值页，这里不展示回本曲线、基准对打和退保表。
          </section>
        )}

        <section className="brutal-card p-5">
          <div className="mb-5">
            <p className="font-mono text-xs tracking-[0.16em] text-[var(--accent-amber)] uppercase">
              HARD NOTES
            </p>
            <h3 className="mt-2 text-3xl font-bold text-[var(--foreground)]">先看风险，再谈故事。</h3>
          </div>
          <div className="grid gap-3 text-sm font-medium leading-7 text-[var(--muted-strong)]">
            <p>身故赔付：{record.contract.deathBenefit || "未提供"}</p>
            {record.result.notes.map((note) => (
              <p key={note}>- {note}</p>
            ))}
          </div>
        </section>

        <Disclaimer />
      </div>
    </div>
  );
}
