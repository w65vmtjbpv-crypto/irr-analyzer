import { findBracket, hasMixedSigns, npv } from "@/lib/irr/shared";

export function calcIRR_Bisection(
  cashflows: number[],
  lo = -0.5,
  hi = 1,
): number | null {
  if (!hasMixedSigns(cashflows)) {
    return null;
  }

  const bracket = findBracket(cashflows, lo, hi);

  if (!bracket) {
    return null;
  }

  let left = bracket.lo;
  let right = bracket.hi;
  let leftValue = npv(cashflows, left);
  let rightValue = npv(cashflows, right);

  if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
    return null;
  }

  if (leftValue === 0) {
    return left;
  }

  if (rightValue === 0) {
    return right;
  }

  for (let iteration = 0; iteration < 1000; iteration += 1) {
    const midpoint = (left + right) / 2;
    const midpointValue = npv(cashflows, midpoint);

    if (!Number.isFinite(midpointValue)) {
      return null;
    }

    if (Math.abs(right - left) < 1e-10 || Math.abs(midpointValue) < 1e-10) {
      return midpoint;
    }

    if (leftValue * midpointValue < 0) {
      right = midpoint;
      rightValue = midpointValue;
    } else {
      left = midpoint;
      leftValue = midpointValue;
    }
  }

  return (left + right) / 2;
}
