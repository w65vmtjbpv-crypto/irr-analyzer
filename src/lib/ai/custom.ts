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

export function createCustomProvider(config: AIConfig): AIProvider {
  return {
    name: "custom",
    async extractContract(assets: UploadAsset[], userContext?: string) {
      if (!config.apiUrl) {
        throw new AIConfigError(
          "未配置 AI_API_URL。你可以设置自定义后端，把 OCR / LLM 解析能力接到 /api/extract。",
        );
      }

      const firstPdf = assets.find((asset) => getUploadAssetKind(asset.mimeType) === "pdf");

      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.model,
          prompt: INSURANCE_EXTRACTION_PROMPT,
          files: assets,
          ...(userContext ? { userContext } : {}),
          ...(firstPdf
            ? {
                pdfBase64: firstPdf.base64Data,
                fileName: firstPdf.fileName,
              }
            : {}),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`自定义 AI 接口调用失败：${errorText}`);
      }

      const raw = await response.json();

      if (typeof raw === "object" && raw !== null && "contract" in raw) {
        const root = raw as Record<string, unknown>;
        return parseContractPayload(root.contract);
      }

      return parseContractPayload(raw);
    },
    async interpretAnalysis(input: InterpretationPromptInput) {
      if (!config.apiUrl) {
        throw new AIConfigError("未配置 AI_API_URL，无法调用 AI 解读接口。");
      }

      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          task: "interpretation",
          model: config.model,
          prompt: INSURANCE_INTERPRETATION_PROMPT,
          input,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`自定义 AI 解读接口调用失败：${errorText}`);
      }

      const raw = await response.json();

      if (typeof raw === "object" && raw !== null && "lines" in raw) {
        return parseInterpretationPayload(raw);
      }

      return parseInterpretationPayload(raw);
    },
  };
}
