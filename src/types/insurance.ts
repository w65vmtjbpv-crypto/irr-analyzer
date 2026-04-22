export type ProductType =
  | "annuity"
  | "wholeLife"
  | "critical"
  | "universal"
  | "endowment"
  | "participating";

export type BenefitType = "annuity" | "maturity" | "survival" | "bonus";

export type DocumentType = "illustration" | "proposal" | "policy" | "clause" | "unknown";

export type ConfidenceLevel = "high" | "medium" | "low";

export type Verdict = "excellent" | "good" | "mediocre" | "poor" | "negative" | "unscored";

export type AnalysisSource = "demo" | "manual" | "upload";

export interface InsuranceContract {
  productName: string;
  productType: ProductType;
  insuredAge: number;
  premiumPerYear: number;
  paymentYears: number;
  policyYears: number;
  benefits: Benefit[];
  surrenderValues: SurrenderValue[];
  deathBenefit: string;
  coverageAmount: number | null;
  documentType?: DocumentType;
  attentionPoints?: string[];
  riskWarnings?: string[];
  notes?: string;
}

export interface Benefit {
  year: number;
  amount: number;
  type: BenefitType;
  label: string;
  guaranteed: boolean;
}

export interface SurrenderValue {
  year: number;
  amount: number;
}

export interface IRRResult {
  newton: number | null;
  bisection: number | null;
  brent: number | null;
  final: number | null;
  confidence: ConfidenceLevel;
  method: string;
  convergenceNote?: string;
}

export interface YearCashflow {
  year: number;
  premium: number;
  benefitTotal: number;
  netCashflow: number;
}

export interface YearCumulative {
  year: number;
  cumulativePremiums: number;
  cumulativeBenefits: number;
  cumulativeNetCashflow: number;
}

export interface SurrenderAnalysis {
  year: number;
  surrenderValue: number;
  totalPaid: number;
  netLoss: number;
  lossRate: number;
  surrenderIRR: number | null;
}

export interface BenchmarkRate {
  key: string;
  label: string;
  shortLabel: string;
  rate: number;
  description: string;
  color: string;
}

export interface BenchmarkComparison {
  key: string;
  label: string;
  shortLabel: string;
  rate: number;
  delta: number | null;
  status: "above" | "below" | "equal" | "unavailable";
  benchmarkValue: number;
  insuranceValue: number;
}

export interface ComparisonSeriesPoint {
  year: number;
  insuranceValue: number;
  [key: string]: number;
}

export interface AnalysisResult {
  irr: IRRResult;
  cashflows: YearCashflow[];
  cumulativeCashflows: YearCumulative[];
  breakEvenYear: number | null;
  surrenderAnalysis: SurrenderAnalysis[];
  benchmarkComparison: BenchmarkComparison[];
  comparisonSeries: ComparisonSeriesPoint[];
  insuranceValueSeries: Array<{ year: number; value: number }>;
  leverageRatio: number | null;
  verdict: Verdict;
  verdictLabel: string;
  verdictSummary: string;
  notes: string[];
}

export interface AnalysisRecord {
  id: string;
  createdAt: string;
  source: AnalysisSource;
  contract: InsuranceContract;
  result: AnalysisResult;
}
