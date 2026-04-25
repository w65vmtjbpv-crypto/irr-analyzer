import { DEFAULT_BENCHMARKS } from "@/constants/benchmarks";
import { createProvider, getServerAIConfig } from "@/lib/ai/provider";
import { analyzeContract } from "@/lib/analysis";
import { normalizeContract } from "@/lib/contract";
import { buildInterpretation, buildInterpretationInput } from "@/lib/interpretation";
import type { BenchmarkRate, InsuranceContract } from "@/types/insurance";
import type { InterpretRequestBody, InterpretResponseBody } from "@/types/interpretation";
import { NextRequest, NextResponse } from "next/server";

function normalizeBenchmarks(input: unknown): BenchmarkRate[] {
  if (!Array.isArray(input)) {
    return DEFAULT_BENCHMARKS.map((item) => ({ ...item }));
  }

  return DEFAULT_BENCHMARKS.map((defaultItem) => {
    const matched = input.find(
      (item): item is Partial<BenchmarkRate> & { key: string } =>
        typeof item === "object" &&
        item !== null &&
        "key" in item &&
        typeof item.key === "string" &&
        item.key === defaultItem.key,
    );

    const rate =
      matched && typeof matched.rate === "number" && Number.isFinite(matched.rate)
        ? matched.rate
        : defaultItem.rate;

    return {
      ...defaultItem,
      rate,
    };
  });
}

function normalizeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "AI 解读生成失败。";
  }

  const sanitized = error.message.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  if (sanitized === "fetch failed" || sanitized.includes("ECONNREFUSED")) {
    return "无法连接到 AI 解读服务，请检查 AI_API_URL 配置和网络连接。";
  }

  if (sanitized.includes("AbortError") || sanitized.includes("aborted")) {
    return "AI 解读请求超时，请稍后重试。";
  }

  if (sanitized.includes("502")) {
    return "AI 后端暂时不可用（502），当前先展示规则版解读。";
  }

  if (sanitized.includes("503") || sanitized.includes("504")) {
    return "AI 后端暂时不可用，当前先展示规则版解读。";
  }

  return sanitized.slice(0, 160) || "AI 解读生成失败。";
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as InterpretRequestBody;

  if (!body.contract || typeof body.contract !== "object") {
    return NextResponse.json(
      { error: "请求体缺少 contract。" },
      { status: 400 },
    );
  }

  const contract = normalizeContract(body.contract as InsuranceContract);
  const benchmarks = normalizeBenchmarks(body.benchmarks);
  const result = analyzeContract(contract, benchmarks);
  const fallbackLines = buildInterpretation(contract, result);

  try {
    const config = getServerAIConfig();
    const provider = createProvider(config);
    const lines = await provider.interpretAnalysis(
      buildInterpretationInput(contract, result, benchmarks),
    );

    return NextResponse.json({
      lines,
      source: "ai",
    } satisfies InterpretResponseBody);
  } catch (error) {
    return NextResponse.json({
      lines: fallbackLines,
      source: "fallback",
      error: normalizeErrorMessage(error),
    } satisfies InterpretResponseBody);
  }
}
