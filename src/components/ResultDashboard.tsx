"use client";

import { BenchmarkCards } from "@/components/BenchmarkCards";
import { CashflowChart } from "@/components/CashflowChart";
import { ComparisonChart } from "@/components/ComparisonChart";
import { Disclaimer } from "@/components/Disclaimer";
import { IRRDisplay } from "@/components/IRRDisplay";
import { SurrenderTable } from "@/components/SurrenderTable";
import { DEFAULT_BENCHMARKS } from "@/constants/benchmarks";
import { analyzeContract } from "@/lib/analysis";
import { getBenchmarkRate } from "@/lib/benchmark";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { AnalysisRecord, BenchmarkRate } from "@/types/insurance";
import type { InterpretResponseBody } from "@/types/interpretation";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

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
  const [aiInterpretation, setAiInterpretation] = useState<string[] | null>(null);
  const [interpretationSource, setInterpretationSource] = useState<"loading" | "ai" | "fallback">(
    "loading",
  );
  const [interpretationError, setInterpretationError] = useState<string | null>(null);
  const deferredBenchmarks = useDeferredValue(benchmarks);
  const benchmarkSignature = useMemo(
    () => JSON.stringify(deferredBenchmarks.map((item) => [item.key, item.rate])),
    [deferredBenchmarks],
  );
  const currentResult = useMemo(
    () => analyzeContract(record.contract, benchmarks),
    [record.contract, benchmarks],
  );
  const currentInflationRate = useMemo(
    () => getBenchmarkRate(benchmarks, "cpi", 0.02),
    [benchmarks],
  );
  const attentionPoints = record.contract.attentionPoints ?? [];
  const riskWarnings = record.contract.riskWarnings ?? [];
  const hasClauseInsights = attentionPoints.length > 0 || riskWarnings.length > 0;
  const hasCashflowInputs =
    record.contract.premiumPerYear > 0 ||
    record.contract.benefits.length > 0 ||
    record.contract.surrenderValues.length > 0;
  const displayedInterpretation = aiInterpretation ?? currentResult.interpretation;

  useEffect(() => {
    const controller = new AbortController();
    // Frontend-side timeout: if the whole round-trip exceeds 35s, abort and use fallback
    const abortTimer = window.setTimeout(() => controller.abort(), 35_000);
    const timer = window.setTimeout(async () => {
      setAiInterpretation(null);
      setInterpretationSource("loading");
      setInterpretationError(null);

      try {
        const response = await fetch("/api/interpret", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contract: record.contract,
            benchmarks: deferredBenchmarks,
          }),
          signal: controller.signal,
        });

        const payload = (await response.json()) as InterpretResponseBody;

        if (!response.ok || !payload.lines || payload.lines.length === 0) {
          throw new Error(payload.error ?? "AI 解读生成失败。");
        }

        setAiInterpretation(payload.lines);
        setInterpretationSource(payload.source === "fallback" ? "fallback" : "ai");
        setInterpretationError(payload.source === "fallback" ? payload.error ?? null : null);
      } catch (error) {
        if (controller.signal.aborted) {
          // Timed out or unmounted — show fallback silently
          setInterpretationSource("fallback");
          setInterpretationError("AI 解读超时，已自动切换到规则版解读。");
          return;
        }

        const message = error instanceof Error ? error.message : "AI 解读生成失败。";
        setAiInterpretation(null);
        setInterpretationSource("fallback");
        setInterpretationError(message);
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
      window.clearTimeout(abortTimer);
    };
  }, [benchmarkSignature, deferredBenchmarks, record.contract]);

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
              返回首页
            </Link>
            <Link href="/compare" className="brutal-button-secondary">
              对比全部
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="brutal-button-secondary"
            >
              打印 / 导出
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="brutal-button"
            >
              {copied ? "已复制（仅本设备可查看）" : "复制链接（仅限本设备）"}
            </button>
          </div>
        </header>

        <section className="brutal-card-soft p-6">
          <div className="grid gap-4 text-sm font-medium text-[var(--muted-strong)] md:grid-cols-2 xl:grid-cols-4">
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
                {record.contract.premiumPerYear > 0 && record.contract.paymentYears > 0
                  ? `，总保费 ${formatCurrency(record.contract.premiumPerYear * record.contract.paymentYears)}`
                  : ""}
              </p>
            </div>
            <div>
              <span className="text-[var(--muted)]">被保人 / 期限</span>
              <p className="mt-1 text-[var(--foreground)]">
                {record.contract.insuredAge > 0 ? `${record.contract.insuredAge} 岁` : "未识别"}
                {record.contract.policyYears > 0
                  ? ` / 保 ${record.contract.policyYears} 年`
                  : ""}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 text-sm font-medium text-[var(--muted-strong)] md:grid-cols-3">
            <div>
              <span className="text-[var(--muted)]">现金价值数据</span>
              <p className="mt-1 text-[var(--foreground)]">
                {record.contract.surrenderValues.length > 0
                  ? `已提取 ${record.contract.surrenderValues.length} 个年份`
                  : "无数据"}
                {record.contract.surrenderValues.some((sv) => sv.amountOptimistic != null)
                  ? " / 含双轨制"
                  : ""}
              </p>
            </div>
            <div>
              <span className="text-[var(--muted)]">确定给付</span>
              <p className="mt-1 text-[var(--foreground)]">
                {record.contract.benefits.filter((b) => b.guaranteed).length > 0
                  ? `${record.contract.benefits.filter((b) => b.guaranteed).length} 笔`
                  : "无"}
              </p>
            </div>
            {record.contract.coverageAmount ? (
              <div>
                <span className="text-[var(--muted)]">保额</span>
                <p className="mt-1 text-[var(--foreground)]">{formatCurrency(record.contract.coverageAmount)}</p>
              </div>
            ) : null}
          </div>
        </section>

        {(currentResult.dataWarnings ?? []).length > 0 ? (
          <section className="brutal-card-soft bg-[rgba(255,80,48,0.08)] p-5">
            <p className="font-mono text-xs tracking-[0.16em] text-[var(--accent-red)] uppercase">
              DATA VALIDATION WARNINGS
            </p>
            <h3 className="mt-2 text-xl font-bold text-[var(--accent-red)]">数据校验发现异常</h3>
            <div className="mt-3 grid gap-2 text-sm font-medium leading-7 text-[var(--accent-red)]">
              {(currentResult.dataWarnings ?? []).map((w) => (
                <p key={w}>- {w}</p>
              ))}
            </div>
          </section>
        ) : null}

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

        <IRRDisplay result={currentResult} inflationRate={currentInflationRate} />

        {displayedInterpretation.length > 0 ? (
          <section className="brutal-card p-5">
            <div className="mb-5">
              <p className="font-mono text-xs tracking-[0.16em] text-[var(--accent)] uppercase">
                PLAIN CHINESE
              </p>
              <h3 className="mt-2 text-3xl font-bold text-[var(--foreground)]">先把人话讲清楚。</h3>
              <p className="mt-2 text-sm font-medium leading-7 text-[var(--muted-strong)]">
                这部分会优先调用 AI 结合当前 IRR、通胀和基准对比来解释；AI 不可用时，自动回退到规则版解读。
              </p>
            </div>
            <div className="grid gap-3 text-sm font-medium leading-7 text-[var(--muted-strong)]">
              {displayedInterpretation.map((line) => (
                <p key={line}>- {line}</p>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold">
              <span className="rounded-full border-[2px] border-[var(--border)] bg-white px-3 py-1 text-[var(--foreground)]">
                {interpretationSource === "loading"
                  ? "AI 解读生成中"
                  : interpretationSource === "ai"
                    ? "当前展示：AI 解读"
                    : "当前展示：规则版解读"}
              </span>
              {interpretationError ? (
                <span className="text-[var(--accent-red)]">
                  AI 暂时不可用：{interpretationError}
                </span>
              ) : null}
            </div>
          </section>
        ) : null}

        {(currentResult.keyTimePointIRRs ?? []).length > 0 ? (
          <section className="brutal-card p-5">
            <div className="mb-5">
              <p className="font-mono text-xs tracking-[0.16em] text-[var(--accent)] uppercase">
                IRR BY HOLDING PERIOD
              </p>
              <h3 className="mt-2 text-3xl font-bold text-[var(--foreground)]">持有不同年限的 IRR 变化。</h3>
              <p className="mt-2 text-sm font-medium leading-7 text-[var(--muted-strong)]">
                不同持有年限退保，IRR 差异很大。以下展示关键年份的年化收益率。
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-[3px] border-[var(--border)]">
                    <th className="px-3 py-3 font-mono text-xs tracking-[0.12em] uppercase text-[var(--muted)]">持有年限</th>
                    <th className="px-3 py-3 font-mono text-xs tracking-[0.12em] uppercase text-[var(--muted)]">现金价值</th>
                    <th className="px-3 py-3 font-mono text-xs tracking-[0.12em] uppercase text-[var(--muted)]">已缴保费</th>
                    <th className="px-3 py-3 font-mono text-xs tracking-[0.12em] uppercase text-[var(--muted)]">
                      IRR{currentResult.irrOptimistic ? "（保守）" : ""}
                    </th>
                    {currentResult.irrOptimistic ? (
                      <th className="px-3 py-3 font-mono text-xs tracking-[0.12em] uppercase text-[var(--muted)]">IRR（乐观）</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {(currentResult.keyTimePointIRRs ?? []).map((point) => (
                    <tr key={point.year} className="border-b border-[var(--border)]">
                      <td className="px-3 py-3 font-semibold text-[var(--foreground)]">第 {point.year} 年</td>
                      <td className="px-3 py-3 text-[var(--foreground)]">
                        {formatCurrency(point.surrenderValue)}
                        {point.surrenderValueOptimistic != null && point.surrenderValueOptimistic !== point.surrenderValue
                          ? ` ~ ${formatCurrency(point.surrenderValueOptimistic)}`
                          : ""}
                      </td>
                      <td className="px-3 py-3 text-[var(--foreground)]">{formatCurrency(point.totalPaid)}</td>
                      <td className={`px-3 py-3 font-mono font-bold ${point.irr !== null && point.irr >= 0 ? "text-[var(--accent)]" : "text-[var(--accent-red)]"}`}>
                        {point.irr !== null ? `${(point.irr * 100).toFixed(2)}%` : "—"}
                      </td>
                      {currentResult.irrOptimistic ? (
                        <td className={`px-3 py-3 font-mono font-bold ${point.irrOptimistic !== null && point.irrOptimistic >= 0 ? "text-[var(--accent)]" : "text-[var(--accent-red)]"}`}>
                          {point.irrOptimistic !== null ? `${(point.irrOptimistic * 100).toFixed(2)}%` : "—"}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {hasCashflowInputs ? (
          <>
            <BenchmarkCards
              comparisons={currentResult.benchmarkComparison}
              breakEvenYear={currentResult.breakEvenYear}
              leverageRatio={currentResult.leverageRatio}
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
              <CashflowChart data={currentResult.cumulativeCashflows} breakEvenYear={currentResult.breakEvenYear} />
              <ComparisonChart data={currentResult.comparisonSeries} benchmarks={benchmarks} />
            </div>

            <SurrenderTable rows={currentResult.surrenderAnalysis} />
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
            {currentResult.notes.map((note) => (
              <p key={note}>- {note}</p>
            ))}
          </div>
        </section>

        <Disclaimer />
      </div>
    </div>
  );
}
