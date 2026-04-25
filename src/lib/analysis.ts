import { DEFAULT_BENCHMARKS } from "@/constants/benchmarks";
import {
  buildBenchmarkComparison,
  buildComparisonSeries,
  getBenchmarkRate,
  buildInsuranceValueSeries,
} from "@/lib/benchmark";
import { buildCashflows, buildCumulativeCashflows, findBreakEvenYear, type CashflowBuildResult } from "@/lib/cashflow";
import { normalizeContract, totalPremium, validateContractData } from "@/lib/contract";
import { computeIRR } from "@/lib/irr";
import { buildSurrenderAnalysis, buildKeyTimePointIRRs } from "@/lib/surrender";
import { buildInterpretation } from "@/lib/interpretation";
import { deriveVerdict } from "@/lib/verdict";
import type { AnalysisResult, BenchmarkRate, InsuranceContract } from "@/types/insurance";

function buildNotes(contract: InsuranceContract, result: AnalysisResult, cashflowResult: CashflowBuildResult): string[] {
  const notes = new Set<string>();

  if (contract.notes) {
    notes.add(contract.notes);
  }

  if (cashflowResult.usedTerminalSurrenderValue && cashflowResult.terminalSurrenderYear !== null) {
    notes.add(
      `本次 IRR 基于第 ${cashflowResult.terminalSurrenderYear} 年退保现金价值（${cashflowResult.terminalSurrenderAmount?.toLocaleString()}）作为终值计算，代表"持有到该年退保"的年化收益率。`,
    );
  }

  if (result.irrOptimistic?.final != null && result.irr.final != null) {
    notes.add(
      `该产品现金价值存在条件分档（如运动达标），保守 IRR ${(result.irr.final * 100).toFixed(2)}%，乐观 IRR ${(result.irrOptimistic.final * 100).toFixed(2)}%。`,
    );
  }

  if (result.irr.final === null) {
    if (contract.coverageAmount && result.leverageRatio) {
      notes.add(
        `这份产品的确定现金流无法形成有效 IRR。但作为保障型产品，保费杠杆比为 ${result.leverageRatio.toFixed(1)} 倍，核心价值在于风险对冲而非投资回报。`,
      );
    } else {
      notes.add("这份产品的确定现金流无法形成有效 IRR，通常意味着它更偏保障用途，或文档中缺少关键数值信息。");
    }
  }

  if (result.irr.confidence !== "high" && result.irr.convergenceNote) {
    notes.add(result.irr.convergenceNote);
  }

  if (contract.coverageAmount && result.leverageRatio && result.irr.final !== null) {
    notes.add(
      "保障型产品的核心价值不在收益率，而在于用低保费撬动高保额的风险对冲能力。",
    );
  }

  if (contract.benefits.some((benefit) => !benefit.guaranteed)) {
    notes.add("分析结果只纳入保证利益，未计入分红、浮动结算和其他不确定收益。");
  }

  return [...notes];
}

function buildIRRSanityWarnings(result: AnalysisResult): string[] {
  const warnings: string[] = [];
  const irr = result.irr.final;

  if (irr === null) {
    return warnings;
  }

  // Early positive IRR is suspicious for traditional life insurance
  const earlyPoints = (result.keyTimePointIRRs ?? []).filter((p) => p.year <= 5);

  for (const p of earlyPoints) {
    if (p.irr !== null && p.irr > 0) {
      warnings.push(
        `第 ${p.year} 年 IRR 为正值（${(p.irr * 100).toFixed(2)}%），对于传统寿险非常罕见，建议确认数据是否准确。`,
      );
      break;
    }
  }

  // Terminal IRR > 4% is unusual for traditional life insurance
  if (irr > 0.04) {
    warnings.push(
      `终局 IRR 达到 ${(irr * 100).toFixed(2)}%，对于传统终身寿险极为罕见，请二次确认现金价值数据。`,
    );
  }

  // Terminal IRR > 8% is almost certainly wrong
  if (irr > 0.08) {
    warnings.push(
      `终局 IRR 超过 8%，数据几乎必然有误。请检查 OCR 是否混入了减额交清保额列或多列合并。`,
    );
  }

  return warnings;
}

export function analyzeContract(
  rawContract: InsuranceContract,
  benchmarks: BenchmarkRate[] = DEFAULT_BENCHMARKS,
): AnalysisResult {
  const contract = normalizeContract(rawContract);
  const cashflowResult = buildCashflows(contract);
  const { flows: cashflows } = cashflowResult;
  const cumulativeCashflows = buildCumulativeCashflows(cashflows);
  const irr = computeIRR(cashflows.map((flow) => flow.netCashflow));

  // Compute optimistic IRR if any surrender value has an optimistic variant
  const hasOptimistic = contract.surrenderValues.some(
    (sv) => sv.amountOptimistic != null && sv.amountOptimistic !== sv.amount,
  );
  let irrOptimistic: typeof irr | null = null;

  if (hasOptimistic && cashflowResult.usedTerminalSurrenderValue) {
    // Build optimistic cashflows — same as conservative but use amountOptimistic for terminal value
    const optimisticFlows = cashflows.map((f) => ({ ...f }));

    if (cashflowResult.terminalSurrenderYear !== null) {
      const sorted = [...contract.surrenderValues]
        .filter((sv) => (sv.amountOptimistic ?? sv.amount) > 0)
        .sort((a, b) => a.year - b.year);
      const lastSV = sorted[sorted.length - 1];

      if (lastSV) {
        const optimisticAmount = lastSV.amountOptimistic ?? lastSV.amount;
        const targetFlow = optimisticFlows.find((f) => f.year === lastSV.year);

        if (targetFlow) {
          // Replace conservative terminal value with optimistic
          const conservativeAmount = cashflowResult.terminalSurrenderAmount ?? 0;
          targetFlow.benefitTotal += optimisticAmount - conservativeAmount;
          targetFlow.netCashflow += optimisticAmount - conservativeAmount;
        }
      }
    }

    irrOptimistic = computeIRR(optimisticFlows.map((f) => f.netCashflow));
  }

  const insuranceValueSeries = buildInsuranceValueSeries(contract, cashflows);
  const comparisonSeries = buildComparisonSeries(contract, insuranceValueSeries, benchmarks);
  const benchmarkComparison = buildBenchmarkComparison(
    contract,
    irr.final,
    insuranceValueSeries,
    benchmarks,
  );
  const surrenderAnalysis = buildSurrenderAnalysis(contract);
  const keyTimePointIRRs = buildKeyTimePointIRRs(contract);
  const leverageRatio =
    contract.coverageAmount && totalPremium(contract) > 0
      ? contract.coverageAmount / totalPremium(contract)
      : null;
  const verdict = deriveVerdict(irr.final, leverageRatio);
  const inflationRate = getBenchmarkRate(benchmarks, "cpi", 0.02);

  // Real IRR = (1 + nominal) / (1 + CPI) - 1
  const realIRR =
    irr.final !== null ? (1 + irr.final) / (1 + inflationRate) - 1 : null;

  const result: AnalysisResult = {
    irr,
    irrOptimistic,
    realIRR,
    keyTimePointIRRs,
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
    interpretation: [],
    notes: [],
    dataWarnings: [],
  };

  result.interpretation = buildInterpretation(contract, result);
  result.notes = buildNotes(contract, result, cashflowResult);
  result.dataWarnings = [
    ...validateContractData(contract),
    ...buildIRRSanityWarnings(result),
  ];

  return result;
}
