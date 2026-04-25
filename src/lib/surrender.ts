import { computeIRR } from "@/lib/irr";
import type { InsuranceContract, KeyTimePointIRR, SurrenderAnalysis } from "@/types/insurance";

function buildSurrenderCashflows(contract: InsuranceContract, surrenderYear: number, surrenderValue: number): number[] {
  const cashflows = new Array(surrenderYear + 1).fill(0);

  for (let year = 1; year <= surrenderYear; year += 1) {
    if (year <= contract.paymentYears) {
      cashflows[year] -= contract.premiumPerYear;
    }

    if (year < surrenderYear) {
      cashflows[year] += contract.benefits
        .filter((benefit) => benefit.guaranteed && benefit.year === year)
        .reduce((sum, benefit) => sum + benefit.amount, 0);
    }
  }

  cashflows[surrenderYear] += surrenderValue;

  return cashflows;
}

export function buildSurrenderAnalysis(contract: InsuranceContract): SurrenderAnalysis[] {
  return contract.surrenderValues.map((item) => {
    const totalPaid = contract.premiumPerYear * Math.min(item.year, contract.paymentYears);
    const netLoss = totalPaid - item.amount;
    const lossRate = totalPaid === 0 ? 0 : (netLoss / totalPaid) * 100;
    const surrenderIRR = computeIRR(
      buildSurrenderCashflows(contract, item.year, item.amount),
    ).final;

    return {
      year: item.year,
      surrenderValue: item.amount,
      totalPaid,
      netLoss,
      lossRate,
      surrenderIRR,
    };
  });
}

const KEY_YEARS = [5, 10, 15, 20, 30, 40, 50, 60, 70, 80];

export function buildKeyTimePointIRRs(contract: InsuranceContract): KeyTimePointIRR[] {
  if (contract.surrenderValues.length === 0 || contract.premiumPerYear <= 0) {
    return [];
  }

  const maxSVYear = Math.max(...contract.surrenderValues.map((sv) => sv.year));
  const relevantYears = KEY_YEARS.filter((y) => y <= maxSVYear);

  // Also add the last available year if it's not already in the list
  if (!relevantYears.includes(maxSVYear)) {
    relevantYears.push(maxSVYear);
  }

  return relevantYears.map((year) => {
    // Find exact or closest preceding surrender value
    const exact = contract.surrenderValues.find((sv) => sv.year === year);

    // If no exact match, try interpolation from surrounding values
    let svAmount = 0;
    let svAmountOptimistic: number | null = null;

    if (exact) {
      svAmount = exact.amount;
      svAmountOptimistic = exact.amountOptimistic ?? null;
    } else {
      // Find closest preceding value
      const preceding = [...contract.surrenderValues]
        .filter((sv) => sv.year <= year)
        .sort((a, b) => b.year - a.year)[0];

      if (preceding) {
        svAmount = preceding.amount;
        svAmountOptimistic = preceding.amountOptimistic ?? null;
      }
    }

    const totalPaid = contract.premiumPerYear * Math.min(year, contract.paymentYears);

    const conservativeCashflows = buildSurrenderCashflows(contract, year, svAmount);
    const irr = computeIRR(conservativeCashflows).final;

    let irrOptimistic: number | null = null;

    if (svAmountOptimistic != null && svAmountOptimistic !== svAmount) {
      const optimisticCashflows = buildSurrenderCashflows(contract, year, svAmountOptimistic);
      irrOptimistic = computeIRR(optimisticCashflows).final;
    }

    return {
      year,
      irr,
      irrOptimistic,
      surrenderValue: svAmount,
      surrenderValueOptimistic: svAmountOptimistic,
      totalPaid,
    };
  });
}
