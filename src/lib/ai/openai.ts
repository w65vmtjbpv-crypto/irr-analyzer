import { INSURANCE_EXTRACTION_PROMPT } from "@/lib/ai/prompt";
import { AIConfigError, parseContractPayload, type AIConfig, type AIProvider } from "@/lib/ai/provider";

function normalizeApiUrl(name: string, apiUrl: string): string {
  if (apiUrl.includes("/v1/responses") || apiUrl.includes("/chat/completions")) {
    return apiUrl;
  }

  const trimmed = apiUrl.replace(/\/+$/, "");
  return name === "openai" ? `${trimmed}/v1/responses` : `${trimmed}/v1/chat/completions`;
}

function toPdfDataUri(pdfBase64: string): string {
  return pdfBase64.startsWith("data:application/pdf;base64,")
    ? pdfBase64
    : `data:application/pdf;base64,${pdfBase64}`;
}

function extractChatCompletionsContent(data: unknown): string {
  if (typeof data !== "object" || data === null) {
    throw new Error("OpenAI 兼容接口返回了空响应。");
  }

  const root = data as Record<string, unknown>;
  const choices = Array.isArray(root.choices) ? root.choices : [];
  const firstChoice =
    choices.find((item): item is Record<string, unknown> => typeof item === "object" && item !== null) ??
    null;

  const message =
    firstChoice && typeof firstChoice.message === "object" && firstChoice.message !== null
      ? (firstChoice.message as Record<string, unknown>)
      : null;

  const content = message?.content;

  if (typeof content !== "string") {
    throw new Error("OpenAI 兼容接口未返回 message.content。");
  }

  return content;
}

function extractResponsesContent(data: unknown): string {
  if (typeof data !== "object" || data === null) {
    throw new Error("Responses 接口返回了空响应。");
  }

  const root = data as Record<string, unknown>;
  const output = Array.isArray(root.output) ? root.output : [];

  const chunks = output
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .flatMap((item) => {
      const content = Array.isArray(item.content) ? item.content : [];

      return content
        .filter(
          (entry): entry is Record<string, unknown> =>
            typeof entry === "object" && entry !== null,
        )
        .filter((entry) => entry.type === "output_text" && typeof entry.text === "string")
        .map((entry) => entry.text as string);
    });

  const text = chunks.join("\n").trim();

  if (!text) {
    throw new Error("Responses 接口未返回 output_text。");
  }

  return text;
}

export function createOpenAICompatibleProvider(
  name: string,
  config: AIConfig,
): AIProvider {
  return {
    name,
    async extractContract(pdfBase64: string) {
      if (!config.apiUrl || !config.apiKey || config.model === "unset-model") {
        throw new AIConfigError(
          "缺少 AI_PROVIDER / AI_API_URL / AI_API_KEY / AI_MODEL 环境变量，无法调用上传解析接口。",
        );
      }

      const apiUrl = normalizeApiUrl(name, config.apiUrl);
      const usesResponsesApi = apiUrl.includes("/v1/responses");
      const pdfData = toPdfDataUri(pdfBase64);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          usesResponsesApi
            ? {
                model: config.model,
                instructions: INSURANCE_EXTRACTION_PROMPT,
                text: {
                  format: {
                    type: "json_object",
                  },
                },
                input: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "input_file",
                        filename: "insurance-contract.pdf",
                        file_data: pdfData,
                      },
                      {
                        type: "input_text",
                        text: "请解析这份保险 PDF，并严格按要求返回 JSON。",
                      },
                    ],
                  },
                ],
              }
            : {
                model: config.model,
                response_format: {
                  type: "json_object",
                },
                messages: [
                  {
                    role: "system",
                    content: INSURANCE_EXTRACTION_PROMPT,
                  },
                  {
                    role: "user",
                    content: [
                      {
                        type: "file",
                        file: {
                          filename: "insurance-contract.pdf",
                          file_data: pdfData,
                        },
                      },
                      {
                        type: "text",
                        text: "请解析这份保险 PDF，并严格按要求返回 JSON。",
                      },
                    ],
                  },
                ],
              },
        ),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI 接口调用失败：${errorText}`);
      }

      const raw = await response.json();
      return parseContractPayload(
        usesResponsesApi ? extractResponsesContent(raw) : extractChatCompletionsContent(raw),
      );
    },
  };
}
