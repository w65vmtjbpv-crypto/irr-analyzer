import { hasMixedSigns, isAcceptableSolution, isRateUsable, npv, npvDerivative } from "@/lib/irr/shared";

export function calcIRR_Newton(cashflows: number[], initialGuess = 0.03): number | null {
  if (!hasMixedSigns(cashflows)) {
    return null;
  }

  let rate = initialGuess;

  for (let iteration = 0; iteration < 1000; iteration += 1) {
    const value = npv(cashflows, rate);
    const derivative = npvDerivative(cashflows, rate);

    if (!Number.isFinite(value) || !Number.isFinite(derivative) || Math.abs(derivative) < 1e-12) {
      return null;
    }

    if (Math.abs(value) < 1e-10 && isAcceptableSolution(cashflows, rate, 1e-2)) {
      return rate;
    }

    const nextRate = rate - value / derivative;

    if (!isRateUsable(nextRate)) {
      return null;
    }

    if (Math.abs(nextRate - rate) < 1e-10) {
      return isAcceptableSolution(cashflows, nextRate, 1e-2) ? nextRate : null;
    }

    rate = nextRate;
  }

  return isAcceptableSolution(cashflows, rate, 1e-2) ? rate : null;
}
