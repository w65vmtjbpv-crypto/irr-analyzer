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
    .map((value) => ({
      year: Math.round(value.year),
      amount: Math.round(value.amount),
    }))
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
