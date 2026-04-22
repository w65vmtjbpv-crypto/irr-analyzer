import { DEFAULT_BENCHMARKS } from "@/constants/benchmarks";
import {
  buildBenchmarkComparison,
  buildComparisonSeries,
  buildInsuranceValueSeries,
} from "@/lib/benchmark";
import { buildCashflows, buildCumulativeCashflows, findBreakEvenYear } from "@/lib/cashflow";
import { normalizeContract, totalPremium } from "@/lib/contract";
import { computeIRR } from "@/lib/irr";
import { buildSurrenderAnalysis } from "@/lib/surrender";
import { deriveVerdict } from "@/lib/verdict";
import type { AnalysisResult, BenchmarkRate, InsuranceContract } from "@/types/insurance";

function buildNotes(contract: InsuranceContract, result: AnalysisResult): string[] {
  const notes = new Set<string>();

  if (contract.notes) {
    notes.add(contract.notes);
  }

  if (result.irr.final === null) {
    notes.add("这份产品的确定现金流无法形成有效 IRR，通常意味着它更偏保障用途。");
  }

  if (result.irr.confidence !== "high" && result.irr.convergenceNote) {
    notes.add(result.irr.convergenceNote);
  }

  if (contract.coverageAmount && result.leverageRatio) {
    notes.add(
      "保障型产品的核心价值不在收益率，而在于用低保费撬动高保额的风险对冲能力。",
    );
  }

  if (contract.benefits.some((benefit) => !benefit.guaranteed)) {
    notes.add("分析结果只纳入保证利益，未计入分红、浮动结算和其他不确定收益。");
  }

  return [...notes];
}

export function analyzeContract(
  rawContract: InsuranceContract,
  benchmarks: BenchmarkRate[] = DEFAULT_BENCHMARKS,
): AnalysisResult {
  const contract = normalizeContract(rawContract);
  const cashflows = buildCashflows(contract);
  const cumulativeCashflows = buildCumulativeCashflows(cashflows);
  const irr = computeIRR(cashflows.map((flow) => flow.netCashflow));
  const insuranceValueSeries = buildInsuranceValueSeries(contract, cashflows);
  const comparisonSeries = buildComparisonSeries(contract, insuranceValueSeries, benchmarks);
  const benchmarkComparison = buildBenchmarkComparison(
    contract,
    irr.final,
    insuranceValueSeries,
    benchmarks,
  );
  const surrenderAnalysis = buildSurrenderAnalysis(contract);
  const verdict = deriveVerdict(irr.final);
  const leverageRatio =
    contract.coverageAmount && totalPremium(contract) > 0
      ? contract.coverageAmount / totalPremium(contract)
      : null;

  const result: AnalysisResult = {
    irr,
    cashflows,
    cumulativeCashflows,
    breakEvenYear: findBreakEvenYear(cumulativeCashflows),
    surrenderAnalysis,
    benchmarkComparison,
    comparisonSeries,
    insuranceValueSeries,
    leverageRatio,
    verdict: verdict.verdict,
    verdictLabel: verdict.label,
    verdictSummary: verdict.summary,
    notes: [],
  };

  result.notes = buildNotes(contract, result);

  return result;
}
