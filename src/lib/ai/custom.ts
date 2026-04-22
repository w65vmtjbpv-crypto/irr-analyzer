import { INSURANCE_EXTRACTION_PROMPT } from "@/lib/ai/prompt";
import { AIConfigError, parseContractPayload, type AIConfig, type AIProvider } from "@/lib/ai/provider";

export function createCustomProvider(config: AIConfig): AIProvider {
  return {
    name: "custom",
    async extractContract(pdfBase64: string) {
      if (!config.apiUrl) {
        throw new AIConfigError(
          "未配置 AI_API_URL。你可以设置自定义后端，把 OCR / LLM 解析能力接到 /api/extract。",
        );
      }

      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.model,
          prompt: INSURANCE_EXTRACTION_PROMPT,
          pdfBase64,
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
  };
}
