import type { InsuranceContract, YearCashflow, YearCumulative } from "@/types/insurance";

/**
 * Build yearly cashflows from a contract.
 *
 * When no guaranteed benefits produce positive cashflow, the terminal
 * surrender value (cash value at the last available year) is injected as
 * a "hold-to-maturity" terminal inflow. This is the standard approach for
 * computing insurance IRR and covers the most common reason IRR fails:
 * the AI extracted premiums and a cash-value table but no explicit benefit
 * entries.
 *
 * `usedTerminalSurrenderValue` on the returned array indicates whether
 * this fallback was applied, so callers can annotate the result.
 */
export interface CashflowBuildResult {
  flows: YearCashflow[];
  usedTerminalSurrenderValue: boolean;
  terminalSurrenderYear: number | null;
  terminalSurrenderAmount: number | null;
}

export function buildCashflows(contract: InsuranceContract): CashflowBuildResult {
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

  // Check if there is any positive cashflow from guaranteed benefits
  const hasPositiveBenefit = flows.some((f) => f.benefitTotal > 0);

  let usedTerminalSurrenderValue = false;
  let terminalSurrenderYear: number | null = null;
  let terminalSurrenderAmount: number | null = null;

  if (!hasPositiveBenefit && contract.surrenderValues.length > 0) {
    // No guaranteed benefit produced positive cashflow.
    // Use the last available surrender value as a terminal "hold-to-end" inflow.
    const sorted = [...contract.surrenderValues]
      .filter((sv) => sv.amount > 0)
      .sort((a, b) => a.year - b.year);

    const lastSV = sorted[sorted.length - 1];

    if (lastSV) {
      // Find or extend flows to include the surrender-value year
      let targetFlow = flows.find((f) => f.year === lastSV.year);

      if (!targetFlow && lastSV.year > contract.policyYears) {
        // Surrender value table extends beyond policyYears — add the extra year
        targetFlow = {
          year: lastSV.year,
          premium: 0,
          benefitTotal: 0,
          netCashflow: 0,
        };
        flows.push(targetFlow);
      }

      if (targetFlow) {
        targetFlow.benefitTotal += lastSV.amount;
        targetFlow.netCashflow += lastSV.amount;
        usedTerminalSurrenderValue = true;
        terminalSurrenderYear = lastSV.year;
        terminalSurrenderAmount = lastSV.amount;
      }
    }
  }

  return { flows, usedTerminalSurrenderValue, terminalSurrenderYear, terminalSurrenderAmount };
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
