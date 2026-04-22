import { INSURANCE_EXTRACTION_PROMPT } from "@/lib/ai/prompt";
import { AIConfigError, parseContractPayload, type AIConfig, type AIProvider } from "@/lib/ai/provider";

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
    async extractContract(pdfBase64: string) {
      if (!config.apiUrl || !config.apiKey || config.model === "unset-model") {
        throw new AIConfigError(
          "缺少 AI_PROVIDER / AI_API_URL / AI_API_KEY / AI_MODEL 环境变量，无法调用上传解析接口。",
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
          max_tokens: 4096,
          system: INSURANCE_EXTRACTION_PROMPT,
          messages: [
            {
              role: "user",
              content: `请解析这份保险 PDF 的 Base64 内容，并严格返回 JSON：${pdfBase64}`,
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
  };
}
