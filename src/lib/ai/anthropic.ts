import {
  INSURANCE_EXTRACTION_PROMPT,
  INSURANCE_INTERPRETATION_PROMPT,
} from "@/lib/ai/prompt";
import { getUploadAssetKind, type UploadAsset } from "@/lib/uploadAssets";
import {
  AIConfigError,
  parseContractPayload,
  parseInterpretationPayload,
  type AIConfig,
  type AIProvider,
} from "@/lib/ai/provider";
import type { InterpretationPromptInput } from "@/types/interpretation";

function extractAnthropicText(data: unknown): string {
  if (typeof data !== "object" || data === null) {
    throw new Error("Anthropic 接口返回了空响应。");
  }

  const root = data as Record<string, unknown>;
  const content = Array.isArray(root.content) ? root.content : [];
  const firstBlock =
    content.find((item): item is Record<string, unknown> => typeof item === "object" && item !== null) ??
    null;
  const text = firstBlock?.text;

  if (typeof text !== "string") {
    throw new Error("Anthropic 接口未返回文本块。");
  }

  return text;
}

export function createAnthropicProvider(config: AIConfig): AIProvider {
  return {
    name: "anthropic",
    async extractContract(assets: UploadAsset[], userContext?: string) {
      if (!config.apiUrl || !config.apiKey || config.model === "unset-model") {
        throw new AIConfigError(
          "缺少 AI_PROVIDER / AI_API_URL / AI_API_KEY / AI_MODEL 环境变量，无法调用上传解析接口。",
        );
      }

      if (assets.length !== 1 || getUploadAssetKind(assets[0].mimeType) !== "pdf") {
        throw new Error("Anthropic provider 当前仅支持单个 PDF 上传，请切换到 OpenAI 兼容 provider。");
      }

      const [pdfAsset] = assets;

      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 4096,
          system: INSURANCE_EXTRACTION_PROMPT,
          messages: [
            {
              role: "user",
              content: `请解析这份保险 PDF 的 Base64 内容，并严格返回 JSON。${
                userContext?.trim()
                  ? `\n用户补充说明（仅作辅助线索，不能脱离原文编造）：\n${userContext.trim()}\n`
                  : "\n"
              }PDF Base64：${pdfAsset.base64Data}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI 接口调用失败：${errorText}`);
      }

      const raw = await response.json();
      return parseContractPayload(extractAnthropicText(raw));
    },
    async interpretAnalysis(input: InterpretationPromptInput) {
      if (!config.apiUrl || !config.apiKey || config.model === "unset-model") {
        throw new AIConfigError(
          "缺少 AI_PROVIDER / AI_API_URL / AI_API_KEY / AI_MODEL 环境变量，无法调用 AI 解读接口。",
        );
      }

      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 1024,
          system: INSURANCE_INTERPRETATION_PROMPT,
          messages: [
            {
              role: "user",
              content: `请基于以下结构化分析结果生成 3-5 句中文通俗解读，并严格返回 JSON：${JSON.stringify(input)}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI 解读接口调用失败：${errorText}`);
      }

      const raw = await response.json();
      return parseInterpretationPayload(extractAnthropicText(raw));
    },
  };
}
