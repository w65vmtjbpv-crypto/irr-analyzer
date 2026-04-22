import { createProvider, getServerAIConfig, AIConfigError } from "@/lib/ai/provider";
import { normalizeContract } from "@/lib/contract";
import { NextRequest, NextResponse } from "next/server";

interface ExtractRequestBody {
  pdfBase64?: string;
  fileName?: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ExtractRequestBody;

  if (!body.pdfBase64) {
    return NextResponse.json(
      { error: "请求体缺少 pdfBase64。" },
      { status: 400 },
    );
  }

  try {
    const config = getServerAIConfig();
    const provider = createProvider(config);
    const contract = await provider.extractContract(body.pdfBase64);

    return NextResponse.json({
      contract: normalizeContract(contract),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    const status = error instanceof AIConfigError ? 503 : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status },
    );
  }
}
