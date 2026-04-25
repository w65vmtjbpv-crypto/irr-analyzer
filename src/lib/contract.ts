import type { Benefit, InsuranceContract, SurrenderValue } from "@/types/insurance";

function normalizeBenefits(benefits: Benefit[]): Benefit[] {
  return benefits
    .filter((benefit) => benefit.year >= 0 && benefit.amount >= 0)
    .map((benefit) => ({
      ...benefit,
      year: Math.round(benefit.year),
      amount: Math.round(benefit.amount),
      label: benefit.label.trim() || "给付",
    }))
    .sort((left, right) => {
      if (left.year !== right.year) {
        return left.year - right.year;
      }

      return left.amount - right.amount;
    });
}

function normalizeSurrenderValues(values: SurrenderValue[]): SurrenderValue[] {
  return values
    .filter((value) => value.year >= 0 && value.amount >= 0)
    .map((value) => {
      const normalized: SurrenderValue = {
        year: Math.round(value.year),
        amount: Math.round(value.amount),
      };

      if (value.amountOptimistic != null && value.amountOptimistic >= 0) {
        normalized.amountOptimistic = Math.round(value.amountOptimistic);
      }

      return normalized;
    })
    .sort((left, right) => left.year - right.year);
}

function normalizeStringList(values: string[] | undefined): string[] | undefined {
  const items = values
    ?.map((value) => value.trim())
    .filter((value) => value.length > 0);

  return items && items.length > 0 ? items : undefined;
}

export function normalizeContract(contract: InsuranceContract): InsuranceContract {
  const computedPolicyYears =
    contract.productType === "wholeLife" && contract.insuredAge > 0
      ? Math.max(contract.policyYears, 80 - contract.insuredAge)
      : contract.policyYears;

  return {
    ...contract,
    productName: contract.productName.trim(),
    insuredAge: Math.max(0, Math.round(contract.insuredAge)),
    premiumPerYear: Math.max(0, Math.round(contract.premiumPerYear)),
    paymentYears: Math.max(0, Math.round(contract.paymentYears)),
    policyYears: Math.max(0, Math.round(computedPolicyYears)),
    benefits: normalizeBenefits(contract.benefits),
    surrenderValues: normalizeSurrenderValues(contract.surrenderValues),
    deathBenefit: contract.deathBenefit.trim(),
    coverageAmount:
      contract.coverageAmount === null ? null : Math.max(0, Math.round(contract.coverageAmount)),
    documentType: contract.documentType ?? "unknown",
    attentionPoints: normalizeStringList(contract.attentionPoints),
    riskWarnings: normalizeStringList(contract.riskWarnings),
    notes: contract.notes?.trim() || undefined,
  };
}

export function totalPremium(contract: InsuranceContract): number {
  return contract.premiumPerYear * contract.paymentYears;
}

/**
 * Validate extracted contract data for common OCR errors.
 * Returns an array of warning strings. Empty array = all checks passed.
 */
export function validateContractData(contract: InsuranceContract): string[] {
  const warnings: string[] = [];
  const premium = contract.premiumPerYear;

  if (premium <= 0 || contract.surrenderValues.length === 0) {
    return warnings;
  }

  // Check 1: First year cash value should be 1%-15% of annual premium
  const firstYearSV = contract.surrenderValues.find((sv) => sv.year === 1);

  if (firstYearSV && firstYearSV.amount > 0) {
    const ratio = firstYearSV.amount / premium;

    if (ratio > 0.5) {
      warnings.push(
        `第1年现金价值（${firstYearSV.amount.toLocaleString()}）为年保费的 ${(ratio * 100).toFixed(0)}%，正常应在 1%-15%，数据可能提取有误（多列合并或减额交清混入）。`,
      );
    }
  }

  // Check 2: Cash values should be monotonically increasing (allow small dips)
  const sorted = [...contract.surrenderValues].sort((a, b) => a.year - b.year);

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (curr.amount > 0 && prev.amount > 0 && curr.year > prev.year) {
      const growthRate = (curr.amount - prev.amount) / prev.amount;

      if (growthRate > 0.2 && curr.year - prev.year === 1) {
        warnings.push(
          `第 ${prev.year}→${curr.year} 年现金价值增长 ${(growthRate * 100).toFixed(0)}%（${prev.amount.toLocaleString()} → ${curr.amount.toLocaleString()}），单年涨幅异常，可能存在 OCR 错误。`,
        );
        break;
      }
    }
  }

  // Check 3: End-of-payment cash value sanity
  if (contract.paymentYears > 0) {
    const endPaymentSV = sorted.find((sv) => sv.year === contract.paymentYears);
    const totalPaid = premium * contract.paymentYears;

    if (endPaymentSV && totalPaid > 0) {
      const ratio = endPaymentSV.amount / totalPaid;

      if (ratio > 1.5) {
        warnings.push(
          `缴费期结束（第 ${contract.paymentYears} 年）时现金价值为总保费的 ${(ratio * 100).toFixed(0)}%，数据可能有误。`,
        );
      }
    }
  }

  return warnings;
}
