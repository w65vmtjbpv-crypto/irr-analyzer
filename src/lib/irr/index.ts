import { calcIRR_Bisection } from "@/lib/irr/bisection";
import { calcIRR_Brent } from "@/lib/irr/brent";
import { crossValidate } from "@/lib/irr/crossValidate";
import { calcIRR_Newton } from "@/lib/irr/newton";
import { hasMixedSigns } from "@/lib/irr/shared";
import type { IRRResult } from "@/types/insurance";

export function computeIRR(cashflows: number[]): IRRResult {
  if (!hasMixedSigns(cashflows)) {
    return {
      newton: null,
      bisection: null,
      brent: null,
      final: null,
      confidence: "low",
      method: "none",
      convergenceNote: "现金流不存在有效正负切换，无法定义标准 IRR。",
    };
  }

  // Try multiple initial guesses for Newton to handle edge cases
  const newtonGuesses = [0.03, 0.01, 0.005, 0.001, -0.01, 0.1];
  let newton: number | null = null;

  for (const guess of newtonGuesses) {
    newton = calcIRR_Newton(cashflows, guess);

    if (newton !== null) {
      break;
    }
  }

  const bisection = calcIRR_Bisection(cashflows, -0.5, 1);
  const brent = calcIRR_Brent(cashflows, -0.5, 1);

  return crossValidate(newton, bisection, brent, cashflows);
}
