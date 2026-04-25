const MIN_RATE = -0.999999999;
const MAX_RATE = 50;

export function isFiniteNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

export function isRateUsable(rate: number): boolean {
  return Number.isFinite(rate) && rate > MIN_RATE && rate < MAX_RATE;
}

export function hasMixedSigns(cashflows: number[]): boolean {
  let hasPositive = false;
  let hasNegative = false;

  for (const value of cashflows) {
    if (value > 0) {
      hasPositive = true;
    }
    if (value < 0) {
      hasNegative = true;
    }
  }

  return hasPositive && hasNegative;
}

export function npv(cashflows: number[], rate: number): number {
  if (!isRateUsable(rate)) {
    return Number.NaN;
  }

  let total = 0;

  for (let index = 0; index < cashflows.length; index += 1) {
    total += cashflows[index] / Math.pow(1 + rate, index);
  }

  return total;
}

export function npvDerivative(cashflows: number[], rate: number): number {
  if (!isRateUsable(rate)) {
    return Number.NaN;
  }

  let total = 0;

  for (let index = 1; index < cashflows.length; index += 1) {
    total += (-index * cashflows[index]) / Math.pow(1 + rate, index + 1);
  }

  return total;
}

export function isAcceptableSolution(
  cashflows: number[],
  rate: number,
  tolerance = 1e-2,
): boolean {
  if (!isRateUsable(rate)) {
    return false;
  }

  const value = npv(cashflows, rate);
  return Number.isFinite(value) && Math.abs(value) < tolerance;
}

interface Bracket {
  lo: number;
  hi: number;
}

function scanBracket(cashflows: number[], lo: number, hi: number, steps: number): Bracket | null {
  let previousRate = lo;
  let previousValue = npv(cashflows, previousRate);

  if (!Number.isFinite(previousValue)) {
    return null;
  }

  if (previousValue === 0) {
    return { lo: previousRate, hi: previousRate };
  }

  for (let index = 1; index <= steps; index += 1) {
    const currentRate = lo + ((hi - lo) * index) / steps;
    const currentValue = npv(cashflows, currentRate);

    if (!Number.isFinite(currentValue)) {
      continue;
    }

    if (currentValue === 0) {
      return { lo: currentRate, hi: currentRate };
    }

    if (previousValue * currentValue < 0) {
      return {
        lo: previousRate,
        hi: currentRate,
      };
    }

    previousRate = currentRate;
    previousValue = currentValue;
  }

  return null;
}

export function findBracket(
  cashflows: number[],
  lo = -0.5,
  hi = 1,
): Bracket | null {
  const searchWindows: Array<{ lo: number; hi: number; steps: number }> = [
    { lo, hi, steps: 600 },
    { lo: -0.95, hi: 2, steps: 1200 },
    { lo: -0.95, hi: 5, steps: 2000 },
    { lo: -0.999, hi: 0.001, steps: 2000 },
    { lo: -0.999, hi: 10, steps: 3000 },
  ];

  for (const window of searchWindows) {
    const bracket = scanBracket(cashflows, window.lo, window.hi, window.steps);

    if (bracket) {
      return bracket;
    }
  }

  return null;
}
