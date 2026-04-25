import { createProvider, getServerAIConfig, AIConfigError } from "@/lib/ai/provider";
import { normalizeContract } from "@/lib/contract";
import {
  isSupportedUploadMimeType,
  normalizeUploadMimeType,
  type UploadAsset,
} from "@/lib/uploadAssets";
import type { ExtractRequestBody } from "@/types/upload";
import { NextRequest, NextResponse } from "next/server";

function normalizeRequestFiles(body: ExtractRequestBody): UploadAsset[] {
  if (Array.isArray(body.files) && body.files.length > 0) {
    return body.files.map((file, index) => {
      const fileName = typeof file.fileName === "string" ? file.fileName.trim() : "";
      const mimeType = normalizeUploadMimeType(
        typeof file.mimeType === "string" ? file.mimeType : "",
        fileName,
      );
      const base64Data = typeof file.base64Data === "string" ? file.base64Data.trim() : "";

      if (!fileName || !base64Data) {
        throw new Error(`第 ${index + 1} 个文件缺少 fileName 或 base64Data。`);
      }

      if (!isSupportedUploadMimeType(mimeType)) {
        throw new Error(`不支持的文件类型：${mimeType || fileName}`);
      }

      return {
        fileName,
        mimeType,
        base64Data,
      };
    });
  }

  if (typeof body.pdfBase64 === "string" && body.pdfBase64.trim()) {
    return [
      {
        fileName: body.fileName?.trim() || "insurance-contract.pdf",
        mimeType: "application/pdf",
        base64Data: body.pdfBase64.trim(),
      },
    ];
  }

  return [];
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ExtractRequestBody;

  try {
    const files = normalizeRequestFiles(body);
    const userContext = typeof body.userContext === "string" ? body.userContext.trim() : "";

    if (files.length === 0) {
      return NextResponse.json(
        { error: "请求体缺少可解析的文件。" },
        { status: 400 },
      );
    }

    const config = getServerAIConfig();
    const provider = createProvider(config);
    const contract = await provider.extractContract(files, userContext || undefined);

    return NextResponse.json({
      contract: normalizeContract(contract),
    });
  } catch (error) {
    let message = "未知错误";

    if (error instanceof Error) {
      // Make raw "fetch failed" more helpful
      if (error.message === "fetch failed" || error.message.includes("ECONNREFUSED")) {
        message = "无法连接到 AI 服务，请检查 AI_API_URL 配置和网络连接。";
      } else if (error.message.includes("AbortError") || error.message.includes("aborted")) {
        message = "AI 接口请求超时，文件可能过大或网络不稳定，请压缩文件后重试。";
      } else {
        message = error.message;
      }
    }

    const status = error instanceof AIConfigError ? 503 : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status },
    );
  }
}
