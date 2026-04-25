import type { BenchmarkRate, InsuranceContract } from "@/types/insurance";

export interface InterpretationBenchmarkHighlight {
  key: string;
  label: string;
  rate: number;
  delta: number | null;
  status: "above" | "below" | "equal" | "unavailable";
}

export interface InterpretationSurrenderHighlight {
  year: number;
  lossRate: number;
  netLoss: number;
}

export interface InterpretationPromptInput {
  mode: "irr" | "clause";
  productName: string;
  productType: string;
  documentType: string;
  premiumPerYear: number;
  paymentYears: number;
  policyYears: number;
  totalPremium: number;
  nominalIRR: number | null;
  realIRR: number | null;
  inflationRate: number;
  breakEvenYear: number | null;
  leverageRatio: number | null;
  verdictLabel: string;
  verdictSummary: string;
  benchmarkHighlights: InterpretationBenchmarkHighlight[];
  worstSurrenderPoint: InterpretationSurrenderHighlight | null;
  paymentEndSurrenderPoint: InterpretationSurrenderHighlight | null;
  attentionPoints: string[];
  riskWarnings: string[];
  notes: string[];
  dataWarnings: string[];
}

export interface InterpretRequestBody {
  contract?: InsuranceContract;
  benchmarks?: BenchmarkRate[];
}

export interface InterpretResponseBody {
  lines?: string[];
  source?: "ai" | "fallback";
  error?: string;
}
