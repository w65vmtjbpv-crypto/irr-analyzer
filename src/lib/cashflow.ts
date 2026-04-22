import type { InsuranceContract, YearCashflow, YearCumulative } from "@/types/insurance";

export function buildCashflows(contract: InsuranceContract): YearCashflow[] {
  const flows: YearCashflow[] = [];

  for (let year = 0; year <= contract.policyYears; year += 1) {
    const premium = year >= 1 && year <= contract.paymentYears ? contract.premiumPerYear : 0;
    const benefitTotal = contract.benefits
      .filter((benefit) => benefit.year === year && benefit.guaranteed)
      .reduce((sum, benefit) => sum + benefit.amount, 0);

    flows.push({
      year,
      premium: -premium,
      benefitTotal,
      netCashflow: benefitTotal - premium,
    });
  }

  return flows;
}

export function buildCumulativeCashflows(flows: YearCashflow[]): YearCumulative[] {
  const cumulative: YearCumulative[] = [];
  let cumulativePremiums = 0;
  let cumulativeBenefits = 0;
  let cumulativeNetCashflow = 0;

  for (const flow of flows) {
    cumulativePremiums += Math.abs(flow.premium);
    cumulativeBenefits += flow.benefitTotal;
    cumulativeNetCashflow += flow.netCashflow;

    cumulative.push({
      year: flow.year,
      cumulativePremiums,
      cumulativeBenefits,
      cumulativeNetCashflow,
    });
  }

  return cumulative;
}

export function findBreakEvenYear(cumulativeFlows: YearCumulative[]): number | null {
  const breakEvenPoint = cumulativeFlows.find(
    (flow) => flow.year > 0 && flow.cumulativeNetCashflow >= 0,
  );

  return breakEvenPoint?.year ?? null;
}
