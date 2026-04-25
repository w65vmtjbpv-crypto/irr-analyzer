import type {
  BenchmarkComparison,
  BenchmarkRate,
  ComparisonSeriesPoint,
  InsuranceContract,
  YearCashflow,
} from "@/types/insurance";

function fallbackInsuranceValueSeries(cashflows: YearCashflow[]): Array<{ year: number; value: number }> {
  let running = 0;

  return cashflows.map((flow) => {
    running += flow.netCashflow;

    return {
      year: flow.year,
      value: running,
    };
  });
}

export function buildInsuranceValueSeries(
  contract: InsuranceContract,
  cashflows: YearCashflow[],
): Array<{ year: number; value: number }> {
  if (contract.surrenderValues.length < 2) {
    return fallbackInsuranceValueSeries(cashflows);
  }

  const points = [{ year: 0, amount: 0 }, ...contract.surrenderValues].sort(
    (left, right) => left.year - right.year,
  );

  const series: Array<{ year: number; value: number }> = [];

  for (let year = 0; year <= contract.policyYears; year += 1) {
    const exact = points.find((point) => point.year === year);

    if (exact) {
      series.push({ year, value: exact.amount });
      continue;
    }

    const right = points.find((point) => point.year > year);
    const left = [...points].reverse().find((point) => point.year < year);

    if (left && right) {
      const span = right.year - left.year;
      const ratio = span === 0 ? 0 : (year - left.year) / span;
      const value = left.amount + (right.amount - left.amount) * ratio;
      series.push({ year, value });
      continue;
    }

    if (!left && right) {
      const ratio = right.year === 0 ? 0 : year / right.year;
      series.push({ year, value: right.amount * ratio });
      continue;
    }

    if (left) {
      series.push({ year, value: left.amount });
      continue;
    }
  }

  return series;
}

export function buildBenchmarkValueAtYear(
  premiumPerYear: number,
  paymentYears: number,
  rate: number,
  year: number,
): number {
  let total = 0;
  const effectiveYears = Math.min(year, paymentYears);

  for (let contributionYear = 1; contributionYear <= effectiveYears; contributionYear += 1) {
    total += premiumPerYear * Math.pow(1 + rate, year - contributionYear);
  }

  return total;
}

export function buildComparisonSeries(
  contract: InsuranceContract,
  insuranceValueSeries: Array<{ year: number; value: number }>,
  benchmarks: BenchmarkRate[],
): ComparisonSeriesPoint[] {
  return insuranceValueSeries.map((point) => {
    const dataPoint: ComparisonSeriesPoint = {
      year: point.year,
      insuranceValue: point.value,
    };

    for (const benchmark of benchmarks) {
      dataPoint[benchmark.key] = buildBenchmarkValueAtYear(
        contract.premiumPerYear,
        contract.paymentYears,
        benchmark.rate,
        point.year,
      );
    }

    return dataPoint;
  });
}

export function getBenchmarkRate(
  benchmarks: BenchmarkRate[],
  key: string,
  fallback: number,
): number {
  const benchmark = benchmarks.find((item) => item.key === key);
  return benchmark?.rate ?? fallback;
}

export function buildBenchmarkComparison(
  contract: InsuranceContract,
  irrFinal: number | null,
  insuranceValueSeries: Array<{ year: number; value: number }>,
  benchmarks: BenchmarkRate[],
): BenchmarkComparison[] {
  const finalInsuranceValue = insuranceValueSeries.at(-1)?.value ?? 0;
  const terminalYear = insuranceValueSeries.at(-1)?.year ?? 0;

  return benchmarks.map((benchmark) => ({
    key: benchmark.key,
    label: benchmark.label,
    shortLabel: benchmark.shortLabel,
    rate: benchmark.rate,
    delta: irrFinal === null ? null : irrFinal - benchmark.rate,
    status:
      irrFinal === null
        ? "unavailable"
        : irrFinal > benchmark.rate
          ? "above"
          : irrFinal < benchmark.rate
            ? "below"
            : "equal",
    benchmarkValue: buildBenchmarkValueAtYear(
      contract.premiumPerYear,
      contract.paymentYears,
      benchmark.rate,
      terminalYear,
    ),
    insuranceValue: finalInsuranceValue,
  }));
}
