import { getBenchmarkRate } from "@/lib/benchmark";
import { formatCurrency } from "@/lib/format";
import type { AnalysisResult, BenchmarkRate, InsuranceContract } from "@/types/insurance";
import type { InterpretationPromptInput } from "@/types/interpretation";

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function buildInterpretation(
  contract: InsuranceContract,
  result: AnalysisResult,
): string[] {
  const lines: string[] = [];
  const irr = result.irr.final;
  const realIRR = result.realIRR;
  const total = contract.premiumPerYear * contract.paymentYears;
  const productName = contract.productName || "这份产品";

  if (contract.premiumPerYear <= 0 || contract.paymentYears <= 0) {
    lines.push("缺少保费或缴费年限信息，无法生成完整解读。请补充后重新分析。");
    return lines;
  }

  // 1. Opening: what you're buying
  lines.push(
    `${productName}的缴费结构是每年 ${formatCurrency(contract.premiumPerYear)}，缴 ${contract.paymentYears} 年，合计投入 ${formatCurrency(total)}。`,
  );

  // 2. IRR interpretation
  if (irr !== null) {
    if (irr >= 0.03) {
      lines.push(
        `名义年化 IRR 为 ${pct(irr)}，在保险产品中属于优秀水平，长期持有的回报表现扎实。`,
      );
    } else if (irr >= 0.02) {
      lines.push(
        `名义年化 IRR 为 ${pct(irr)}，与银行定期存款大致持平，收益中规中矩。`,
      );
    } else if (irr >= 0.01) {
      lines.push(
        `名义年化 IRR 为 ${pct(irr)}，低于主流理财产品，但保险的核心价值不只在收益。`,
      );
    } else if (irr >= 0) {
      lines.push(
        `名义年化 IRR 仅 ${pct(irr)}，几乎没有投资回报。这更像一份保障工具而非理财产品。`,
      );
    } else {
      lines.push(
        `名义年化 IRR 为 ${pct(irr)}，确定现金流口径下实际亏损。建议重新评估是否继续持有。`,
      );
    }

    const treasuryComparison = result.benchmarkComparison.find(
      (item) => item.key === "treasury10y",
    );

    if (treasuryComparison && treasuryComparison.delta !== null) {
      const delta = Math.abs(treasuryComparison.delta);

      if (delta < 0.001) {
        lines.push(
          `和 10 年期国债相比，这份产品的名义收益率基本持平。`,
        );
      } else {
        lines.push(
          `和 10 年期国债相比，这份产品的名义收益率${treasuryComparison.delta > 0 ? "高" : "低"} ${(delta * 100).toFixed(2)} 个百分点。`,
        );
      }
    }
  } else {
    lines.push(
      "该产品的确定现金流无法形成有效 IRR。这通常是纯保障型产品（如重疾险、定期寿险），不适合用投资回报率来衡量。",
    );
  }

  // 3. Real IRR — inflation impact
  if (realIRR !== null && irr !== null) {
    if (realIRR < 0) {
      lines.push(
        `扣除通胀后的实际 IRR 为 ${pct(realIRR)}。也就是说，虽然账面上看有 ${pct(irr)} 的回报，但你的钱的实际购买力在缩水。${contract.policyYears}年后的 ${formatCurrency(total)} 买到的东西会比现在少。`,
      );
    } else if (realIRR < 0.005) {
      lines.push(
        `扣除通胀后实际 IRR 约 ${pct(realIRR)}，基本刚好抵消通胀，购买力勉强保住。`,
      );
    } else {
      lines.push(
        `扣除通胀后实际 IRR 为 ${pct(realIRR)}，能实现真实的财富增值，在保险产品中难得。`,
      );
    }
  }

  // 4. Break-even
  if (result.breakEvenYear !== null) {
    if (result.breakEvenYear <= contract.paymentYears + 5) {
      lines.push(
        `第 ${result.breakEvenYear} 年回本，回本速度较快。`,
      );
    } else if (result.breakEvenYear <= contract.paymentYears + 15) {
      lines.push(
        `第 ${result.breakEvenYear} 年才能回本，也就是交完保费后还要再等 ${result.breakEvenYear - contract.paymentYears} 年。这段时间如果急用钱，退保会亏本。`,
      );
    } else {
      lines.push(
        `回本要到第 ${result.breakEvenYear} 年，等待时间非常长。如果你不确定未来 ${result.breakEvenYear} 年内是否需要动用这笔资金，需要慎重考虑。`,
      );
    }
  } else if (irr !== null) {
    lines.push("在保单期限内始终没有回本，累计现金流一直为负。");
  }

  // 5. Liquidity cost — surrender highlights
  if (result.surrenderAnalysis.length > 0) {
    // Find worst loss point and payment-end point
    const atPaymentEnd = result.surrenderAnalysis.find(
      (s) => s.year === contract.paymentYears,
    );
    const worst = [...result.surrenderAnalysis]
      .filter((s) => s.year <= contract.paymentYears && s.year > 0)
      .sort((a, b) => b.lossRate - a.lossRate)[0];

    if (worst && worst.lossRate > 0) {
      lines.push(
        `缴费期内最大退保损失出现在第 ${worst.year} 年，退保会亏掉已交保费的 ${worst.lossRate.toFixed(0)}%。`,
      );
    }

    if (atPaymentEnd && atPaymentEnd.netLoss > 0) {
      lines.push(
        `刚交完全部保费时（第 ${contract.paymentYears} 年），退保仍然亏损 ${formatCurrency(atPaymentEnd.netLoss)}，损失率 ${atPaymentEnd.lossRate.toFixed(0)}%。`,
      );
    }
  }

  // 6. Leverage ratio
  if (result.leverageRatio !== null && result.leverageRatio >= 2) {
    lines.push(
      `保障杠杆比 ${result.leverageRatio.toFixed(1)} 倍——每投入 1 元保费可以撬动 ${result.leverageRatio.toFixed(1)} 元保障。对于以保障为目的的配置来说，这是核心价值。`,
    );
  }

  // 7. Closing recommendation framework
  if (irr !== null) {
    const suitableFor: string[] = [];

    if (irr >= 0.015 && (result.breakEvenYear ?? 999) <= 30) {
      suitableFor.push("追求稳健长期回报");
    }

    if (result.leverageRatio && result.leverageRatio >= 5) {
      suitableFor.push("需要高杠杆身故保障");
    }

    if (contract.paymentYears <= 10 && (result.breakEvenYear ?? 999) <= 25) {
      suitableFor.push("短期缴费、愿意长期锁定");
    }

    if (suitableFor.length > 0) {
      lines.push(`这份产品相对适合：${suitableFor.join("、")}的人群。`);
    }

    const notSuitableFor: string[] = [];

    if ((result.breakEvenYear ?? 999) > 20) {
      notSuitableFor.push("未来 20 年内可能需要动用这笔资金");
    }

    if (realIRR !== null && realIRR < 0) {
      notSuitableFor.push("在意资金实际购买力的保值");
    }

    if (notSuitableFor.length > 0) {
      lines.push(`不太适合：${notSuitableFor.join("、")}的场景。`);
    }
  }

  const uniqueLines = [...new Set(lines)];

  if (uniqueLines.length <= 5) {
    return uniqueLines;
  }

  const prioritized = [
    uniqueLines[0],
    uniqueLines.find((line) => line.includes("名义年化 IRR") || line.includes("无法形成有效 IRR")),
    uniqueLines.find((line) => line.includes("10 年期国债")),
    uniqueLines.find((line) => line.includes("实际 IRR")),
    uniqueLines.find((line) => line.includes("回本") || line.includes("没有回本")),
    uniqueLines.find((line) => line.includes("退保")),
    uniqueLines.find((line) => line.includes("相对适合") || line.includes("不太适合")),
  ]
    .filter((line): line is string => Boolean(line));

  return [...new Set(prioritized)].slice(0, 5);
}

export function buildInterpretationInput(
  contract: InsuranceContract,
  result: AnalysisResult,
  benchmarks: BenchmarkRate[],
): InterpretationPromptInput {
  const inflationRate = getBenchmarkRate(benchmarks, "cpi", 0.02);
  const totalPremium = contract.premiumPerYear * contract.paymentYears;
  const worstSurrenderPoint =
    [...result.surrenderAnalysis]
      .filter((item) => item.year > 0 && item.year <= contract.paymentYears)
      .sort((left, right) => right.lossRate - left.lossRate)[0] ?? null;
  const paymentEndSurrenderPoint =
    result.surrenderAnalysis.find((item) => item.year === contract.paymentYears) ?? null;

  return {
    mode: result.irr.final === null ? "clause" : "irr",
    productName: contract.productName,
    productType: contract.productType,
    documentType: contract.documentType ?? "unknown",
    premiumPerYear: contract.premiumPerYear,
    paymentYears: contract.paymentYears,
    policyYears: contract.policyYears,
    totalPremium,
    nominalIRR: result.irr.final,
    realIRR: result.realIRR,
    inflationRate,
    breakEvenYear: result.breakEvenYear,
    leverageRatio: result.leverageRatio,
    verdictLabel: result.verdictLabel,
    verdictSummary: result.verdictSummary,
    benchmarkHighlights: result.benchmarkComparison
      .filter((item) => ["deposit3y", "treasury10y", "cpi"].includes(item.key))
      .map((item) => ({
        key: item.key,
        label: item.label,
        rate: item.rate,
        delta: item.delta,
        status: item.status,
      })),
    worstSurrenderPoint:
      worstSurrenderPoint === null
        ? null
        : {
            year: worstSurrenderPoint.year,
            lossRate: worstSurrenderPoint.lossRate,
            netLoss: worstSurrenderPoint.netLoss,
          },
    paymentEndSurrenderPoint:
      paymentEndSurrenderPoint === null
        ? null
        : {
            year: paymentEndSurrenderPoint.year,
            lossRate: paymentEndSurrenderPoint.lossRate,
            netLoss: paymentEndSurrenderPoint.netLoss,
          },
    attentionPoints: contract.attentionPoints ?? [],
    riskWarnings: contract.riskWarnings ?? [],
    notes: result.notes,
    dataWarnings: result.dataWarnings,
  };
}
