import {
  INSURANCE_EXTRACTION_PROMPT,
  INSURANCE_INTERPRETATION_PROMPT,
} from "@/lib/ai/prompt";
import {
  buildUploadAssetDataUri,
  getUploadAssetKind,
  type UploadAsset,
} from "@/lib/uploadAssets";
import {
  AIConfigError,
  parseContractPayload,
  parseInterpretationPayload,
  type AIConfig,
  type AIProvider,
} from "@/lib/ai/provider";
import type { InterpretationPromptInput } from "@/types/interpretation";

function normalizeApiUrl(name: string, apiUrl: string): string {
  // If URL explicitly contains chat/completions, use as-is
  if (apiUrl.includes("/chat/completions")) {
    return apiUrl;
  }

  // Convert any /v1/responses URL to /v1/chat/completions for compatibility
  if (apiUrl.includes("/v1/responses")) {
    return apiUrl.replace("/v1/responses", "/v1/chat/completions");
  }

  const trimmed = apiUrl.replace(/\/+$/, "");
  return `${trimmed}/v1/chat/completions`;
}

function buildUserInstruction(assets: UploadAsset[], userContext?: string): string {
  const fileList = assets
    .map((asset, index) => `${index + 1}. ${asset.fileName} (${asset.mimeType})`)
    .join("\n");
  const contextBlock = userContext?.trim()
    ? `\n用户补充说明（作为辅助线索，不能脱离原文编造；如与原文冲突，以原文可见内容为准）：\n${userContext.trim()}\n`
    : "\n";

  if (assets.length <= 1) {
    return `请解析这份保险材料，并严格按要求返回 JSON。\n文件清单：\n${fileList}${contextBlock}`;
  }

  return `以下文件已经由用户手动确认属于同一份保险合同/计划书，请合并阅读后再解析，不要拆成多份产品。\n文件清单：\n${fileList}${contextBlock}请综合所有页面、截图、表格与说明，严格按要求返回 JSON。`;
}

function buildInterpretationInstruction(input: InterpretationPromptInput): string {
  return [
    "请基于以下结构化保险分析结果，生成 3-5 句通俗中文解读。",
    "不要重新计算，不要编造数据。",
    "输入数据：",
    JSON.stringify(input),
  ].join("\n");
}

function buildResponsesJsonBody(
  model: string,
  instructions: string,
  content: Record<string, unknown>[],
): Record<string, unknown> {
  return {
    model,
    stream: false,
    instructions,
    input: [
      {
        role: "user",
        content,
      },
    ],
  };
}

function buildChatJsonBody(
  model: string,
  systemPrompt: string,
  content: Record<string, unknown>[],
): Record<string, unknown> {
  return {
    model,
    stream: false,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content,
      },
    ],
  };
}

function buildResponsesAssetContent(asset: UploadAsset): Record<string, unknown> {
  const kind = getUploadAssetKind(asset.mimeType);
  const dataUri = buildUploadAssetDataUri(asset);

  if (kind === "pdf") {
    return {
      type: "input_file",
      filename: asset.fileName,
      file_data: dataUri,
    };
  }

  if (kind === "image") {
    return {
      type: "input_image",
      image_url: dataUri,
    };
  }

  throw new Error(`暂不支持的文件类型：${asset.mimeType}`);
}

function buildChatAssetContent(asset: UploadAsset): Record<string, unknown> {
  const kind = getUploadAssetKind(asset.mimeType);
  const dataUri = buildUploadAssetDataUri(asset);

  if (kind === "pdf") {
    return {
      type: "file",
      file: {
        filename: asset.fileName,
        file_data: dataUri,
      },
    };
  }

  if (kind === "image") {
    return {
      type: "image_url",
      image_url: {
        url: dataUri,
      },
    };
  }

  throw new Error(`暂不支持的文件类型：${asset.mimeType}`);
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

const EXTRACT_MAX_RETRIES = 1;
const EXTRACT_TIMEOUT_MS = 90_000; // 90s — 带图片，给久一点
const INTERPRET_MAX_RETRIES = 1;
const INTERPRET_TIMEOUT_MS = 30_000; // 30s — 纯文本，快进快出

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries: number,
  timeoutMs: number,
): Promise<Response> {
  let lastError: Error | null = null;
  let lastStatus: number | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, init, timeoutMs);

      // Retry on 5xx or 429
      if ((response.status >= 500 || response.status === 429) && attempt < retries) {
        lastStatus = response.status;
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
  }

  if (lastError?.name === "AbortError") {
    throw new Error("AI 接口请求超时（120 秒），文件可能过大或网络不稳定，请压缩文件后重试。");
  }

  if (lastStatus && lastStatus >= 500) {
    throw new Error(
      `AI 后端服务持续不可用（HTTP ${lastStatus}，已重试 ${retries} 次）。请检查 AI 服务状态后重试。`,
    );
  }

  throw new Error(
    `AI 接口连接失败（已重试 ${retries} 次）：${lastError?.message ?? "网络异常"}。请检查网络连接后重试。`,
  );
}

export function createOpenAICompatibleProvider(
  name: string,
  config: AIConfig,
): AIProvider {
  return {
    name,
    async extractContract(assets: UploadAsset[], userContext?: string) {
      if (!config.apiUrl || !config.apiKey || config.model === "unset-model") {
        throw new AIConfigError(
          "缺少 AI_PROVIDER / AI_API_URL / AI_API_KEY / AI_MODEL 环境变量，无法调用上传解析接口。",
        );
      }

      if (assets.length === 0) {
        throw new Error("没有可供解析的上传文件。");
      }

      const apiUrl = normalizeApiUrl(name, config.apiUrl);
      const usesResponsesApi = apiUrl.includes("/v1/responses");
      const userInstruction = buildUserInstruction(assets, userContext);

      const response = await fetchWithRetry(
        apiUrl,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            usesResponsesApi
              ? buildResponsesJsonBody(
                  config.model,
                  INSURANCE_EXTRACTION_PROMPT,
                  [
                    {
                      type: "input_text",
                      text: userInstruction,
                    },
                    ...assets.map((asset) => buildResponsesAssetContent(asset)),
                  ],
                )
              : buildChatJsonBody(
                  config.model,
                  INSURANCE_EXTRACTION_PROMPT,
                  [
                    {
                      type: "text",
                      text: userInstruction,
                    },
                    ...assets.map((asset) => buildChatAssetContent(asset)),
                  ],
                ),
          ),
        },
        EXTRACT_MAX_RETRIES,
        EXTRACT_TIMEOUT_MS,
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "无法读取响应体");
        const status = response.status;

        if (status === 413) {
          throw new Error("文件过大，AI 接口拒绝处理。请压缩图片或拆分上传后重试。");
        }

        if (status === 429) {
          throw new Error("AI 接口请求过于频繁，请稍后再试。");
        }

        if (status === 502 || status === 503 || status === 504) {
          throw new Error(
            `AI 后端服务暂时不可用（HTTP ${status}）。这通常是后端服务器过载或重启中，请等待 1-2 分钟后重试。`,
          );
        }

        // Strip HTML from error responses
        const cleanError = errorText.replace(/<[^>]*>/g, "").trim().slice(0, 200);
        throw new Error(`AI 接口返回 ${status} 错误：${cleanError || "未知错误"}`);
      }

      const raw = await response.json();
      return parseContractPayload(
        usesResponsesApi ? extractResponsesContent(raw) : extractChatCompletionsContent(raw),
      );
    },
    async interpretAnalysis(input: InterpretationPromptInput) {
      if (!config.apiUrl || !config.apiKey || config.model === "unset-model") {
        throw new AIConfigError(
          "缺少 AI_PROVIDER / AI_API_URL / AI_API_KEY / AI_MODEL 环境变量，无法调用 AI 解读接口。",
        );
      }

      const apiUrl = normalizeApiUrl(name, config.apiUrl);
      const usesResponsesApi = apiUrl.includes("/v1/responses");
      const userInstruction = buildInterpretationInstruction(input);

      const response = await fetchWithRetry(
        apiUrl,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            usesResponsesApi
              ? buildResponsesJsonBody(
                  config.model,
                  INSURANCE_INTERPRETATION_PROMPT,
                  [
                    {
                      type: "input_text",
                      text: userInstruction,
                    },
                  ],
                )
              : buildChatJsonBody(
                  config.model,
                  INSURANCE_INTERPRETATION_PROMPT,
                  [
                    {
                      type: "text",
                      text: userInstruction,
                    },
                  ],
                ),
          ),
        },
        INTERPRET_MAX_RETRIES,
        INTERPRET_TIMEOUT_MS,
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "无法读取响应体");
        throw new Error(`AI 解读接口调用失败：${errorText}`);
      }

      const raw = await response.json();
      return parseInterpretationPayload(
        usesResponsesApi ? extractResponsesContent(raw) : extractChatCompletionsContent(raw),
      );
    },
  };
}
