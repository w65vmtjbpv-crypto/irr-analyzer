import { computeIRR } from "@/lib/irr";
import type { InsuranceContract, SurrenderAnalysis } from "@/types/insurance";

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
