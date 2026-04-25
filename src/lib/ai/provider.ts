import { createAnthropicProvider } from "@/lib/ai/anthropic";
import { createCustomProvider } from "@/lib/ai/custom";
import { createOpenAICompatibleProvider } from "@/lib/ai/openai";
import type { UploadAsset } from "@/lib/uploadAssets";
import type { DocumentType, InsuranceContract } from "@/types/insurance";
import type { InterpretationPromptInput } from "@/types/interpretation";

export interface AIProvider {
  name: string;
  extractContract(assets: UploadAsset[], userContext?: string): Promise<InsuranceContract>;
  interpretAnalysis(input: InterpretationPromptInput): Promise<string[]>;
}

export interface AIConfig {
  provider: "anthropic" | "openai" | "zhipu" | "qwen" | "custom";
  apiUrl: string;
  apiKey?: string;
  model: string;
}

export class AIConfigError extends Error {}

function getDefaultApiUrl(provider: AIConfig["provider"]): string {
  switch (provider) {
    case "anthropic":
      return "https://api.anthropic.com/v1/messages";
    case "openai":
      return "https://api.openai.com/v1/responses";
    case "zhipu":
      return "https://open.bigmodel.cn/api/paas/v4/chat/completions";
    case "qwen":
      return "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
    case "custom":
      return "";
  }
}

export function getServerAIConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER ?? "custom") as AIConfig["provider"];

  return {
    provider,
    apiUrl: process.env.AI_API_URL ?? getDefaultApiUrl(provider),
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL ?? "unset-model",
  };
}

function readStringField(record: Record<string, unknown>, key: string, fallback = ""): string {
  const value = record[key];
  return typeof value === "string" ? value : fallback;
}

function readNumberField(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readNullableNumberField(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];

  if (value === null) {
    return null;
  }

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readStringArrayField(record: Record<string, unknown>, key: string): string[] | undefined {
  const value = record[key];

  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value.filter((item): item is string => typeof item === "string");
  return items.length > 0 ? items : undefined;
}

export function parseInterpretationPayload(payload: unknown): string[] {
  const parsed =
    typeof payload === "string" ? (JSON.parse(payload) as unknown) : payload;

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("AI 解读返回内容不是合法对象。");
  }

  const root = parsed as Record<string, unknown>;
  const lines = Array.isArray(root.lines) ? root.lines : [];
  const normalized = lines
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (normalized.length === 0) {
    throw new Error("AI 解读未返回有效 lines。");
  }

  return normalized;
}

export function parseContractPayload(payload: unknown): InsuranceContract {
  const parsed =
    typeof payload === "string" ? (JSON.parse(payload) as unknown) : payload;

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("AI 返回内容不是合法对象。");
  }

  const root = parsed as Record<string, unknown>;
  const benefits = Array.isArray(root.benefits) ? root.benefits : [];
  const surrenderValues = Array.isArray(root.surrenderValues) ? root.surrenderValues : [];

  return {
    productName: readStringField(root, "productName"),
    productType:
      readStringField(root, "productType") as InsuranceContract["productType"],
    insuredAge: readNumberField(root, "insuredAge"),
    premiumPerYear: readNumberField(root, "premiumPerYear"),
    paymentYears: readNumberField(root, "paymentYears"),
    policyYears: readNumberField(root, "policyYears"),
    benefits: benefits
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => ({
        year: readNumberField(item, "year"),
        amount: readNumberField(item, "amount"),
        type: readStringField(item, "type") as InsuranceContract["benefits"][number]["type"],
        label: readStringField(item, "label"),
        guaranteed: Boolean(item.guaranteed),
      })),
    surrenderValues: surrenderValues
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => {
        const sv: { year: number; amount: number; amountOptimistic?: number } = {
          year: readNumberField(item, "year"),
          amount: readNumberField(item, "amount"),
        };
        const optimistic = readNumberField(item, "amountOptimistic");

        if (optimistic > 0 && optimistic !== sv.amount) {
          sv.amountOptimistic = optimistic;
        }

        return sv;
      }),
    deathBenefit: readStringField(root, "deathBenefit"),
    coverageAmount: readNullableNumberField(root, "coverageAmount"),
    documentType: readStringField(root, "documentType", "unknown") as DocumentType,
    attentionPoints: readStringArrayField(root, "attentionPoints"),
    riskWarnings: readStringArrayField(root, "riskWarnings"),
    notes: readStringField(root, "notes") || undefined,
  };
}

export function createProvider(config: AIConfig): AIProvider {
  switch (config.provider) {
    case "anthropic":
      return createAnthropicProvider(config);
    case "openai":
      return createOpenAICompatibleProvider("openai", config);
    case "zhipu":
      return createOpenAICompatibleProvider("zhipu", config);
    case "qwen":
      return createOpenAICompatibleProvider("qwen", config);
    case "custom":
      return createCustomProvider(config);
  }
}
