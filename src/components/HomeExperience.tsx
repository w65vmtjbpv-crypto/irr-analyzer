"use client";

import { AnalyzingScreen } from "@/components/AnalyzingScreen";
import { DemoCards } from "@/components/DemoCards";
import { ManualForm } from "@/components/ManualForm";
import { UploadZone } from "@/components/UploadZone";
import { type DemoProfile } from "@/data/demoProfiles";
import {
  formatUploadMimeTypeLabel,
  isSupportedUploadMimeType,
  normalizeUploadMimeType,
  type UploadAsset,
} from "@/lib/uploadAssets";
import { useAnalysisStore } from "@/store/analysisStore";
import type { InsuranceContract } from "@/types/insurance";
import type { ExtractResponseBody } from "@/types/upload";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useState } from "react";

interface MissingFieldsState {
  contract: InsuranceContract;
  missingFields: Array<"premiumPerYear" | "paymentYears">;
}

function MissingFieldsModal({
  state,
  onConfirm,
  onCancel,
}: {
  state: MissingFieldsState;
  onConfirm: (contract: InsuranceContract) => void;
  onCancel: () => void;
}) {
  const [premiumPerYear, setPremiumPerYear] = useState(
    state.contract.premiumPerYear > 0 ? String(state.contract.premiumPerYear) : "",
  );
  const [paymentYears, setPaymentYears] = useState(
    state.contract.paymentYears > 0 ? String(state.contract.paymentYears) : "",
  );

  function handleSubmit() {
    const premium = Number(premiumPerYear);
    const years = Number(paymentYears);

    if (state.missingFields.includes("premiumPerYear") && (isNaN(premium) || premium <= 0)) {
      return;
    }

    if (state.missingFields.includes("paymentYears") && (isNaN(years) || years <= 0)) {
      return;
    }

    const patched: InsuranceContract = {
      ...state.contract,
      premiumPerYear: premium > 0 ? premium : state.contract.premiumPerYear,
      paymentYears: years > 0 ? years : state.contract.paymentYears,
    };

    onConfirm(patched);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="brutal-card w-full max-w-lg bg-white p-6">
        <p className="font-mono text-xs tracking-[0.18em] text-[var(--accent-red)] uppercase">
          MISSING DATA DETECTED
        </p>
        <h3 className="mt-3 text-2xl font-bold">
          AI 未能从文档中识别到关键数值
        </h3>
        <p className="mt-3 text-sm font-medium leading-7 text-[var(--muted-strong)]">
          文档中缺少计算 IRR 所必需的信息。请手动补充以下字段，系统将结合 AI 已提取的现金价值表继续分析。
        </p>

        {state.contract.productName ? (
          <div className="mt-4 rounded-[12px] border-[2px] border-[var(--border)] bg-[rgba(217,255,67,0.14)] px-4 py-3 text-sm font-medium">
            已识别产品：{state.contract.productName}
            {state.contract.surrenderValues.length > 0
              ? ` / 已提取 ${state.contract.surrenderValues.length} 个年份的现金价值`
              : ""}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4">
          {state.missingFields.includes("premiumPerYear") ? (
            <div>
              <label
                htmlFor="modal-premium"
                className="block text-sm font-semibold text-[var(--foreground)]"
              >
                年缴保费（元）
              </label>
              <input
                id="modal-premium"
                type="number"
                value={premiumPerYear}
                onChange={(e) => setPremiumPerYear(e.target.value)}
                placeholder="例如 30000"
                className="mt-2 w-full rounded-[12px] border-[3px] border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] shadow-[4px_4px_0_#111111] outline-none focus:border-[var(--accent-red)]"
              />
            </div>
          ) : null}
          {state.missingFields.includes("paymentYears") ? (
            <div>
              <label
                htmlFor="modal-payment-years"
                className="block text-sm font-semibold text-[var(--foreground)]"
              >
                缴费年限（年）
              </label>
              <input
                id="modal-payment-years"
                type="number"
                value={paymentYears}
                onChange={(e) => setPaymentYears(e.target.value)}
                placeholder="例如 10"
                className="mt-2 w-full rounded-[12px] border-[3px] border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] shadow-[4px_4px_0_#111111] outline-none focus:border-[var(--accent-red)]"
              />
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={handleSubmit} className="brutal-button">
            CONFIRM AND ANALYZE
          </button>
          <button type="button" onClick={onCancel} className="brutal-button-secondary">
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error("无法读取上传文件。"));
        return;
      }

      const [, base64] = result.split(",");
      resolve(base64 ?? result);
    };

    reader.onerror = () => reject(new Error("读取文件失败。"));
    reader.readAsDataURL(file);
  });
}

interface PendingUploadItem {
  id: string;
  file: File;
  mimeType: string;
}

function createPendingUploadId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function getPendingUploadKey(file: File, mimeType: string): string {
  return `${file.name}-${file.size}-${file.lastModified}-${mimeType}`;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${bytes} B`;
}

async function toUploadAsset(item: PendingUploadItem): Promise<UploadAsset> {
  return {
    fileName: item.file.name,
    mimeType: item.mimeType,
    base64Data: await readFileAsBase64(item.file),
  };
}

export function HomeExperience() {
  const router = useRouter();
  const createAnalysis = useAnalysisStore((state) => state.createAnalysis);
  const [showManualForm, setShowManualForm] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0.08);
  const [stage, setStage] = useState("等待上传文件");
  const [error, setError] = useState<string | null>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUploadItem[]>([]);
  const [uploadContext, setUploadContext] = useState("");
  const [missingFieldsState, setMissingFieldsState] = useState<MissingFieldsState | null>(null);

  function goToAnalysis(id: string) {
    startTransition(() => {
      router.push(`/analysis/${id}`);
    });
  }

  function handleDemoSelect(profile: DemoProfile) {
    const id = createAnalysis(profile.contract, "demo", profile.id);
    goToAnalysis(id);
  }

  function handleManualSubmit(contract: InsuranceContract) {
    const id = createAnalysis(contract, "manual");
    goToAnalysis(id);
  }

  const handleMissingFieldsConfirm = useCallback(
    (patchedContract: InsuranceContract) => {
      setMissingFieldsState(null);
      const id = createAnalysis(patchedContract, "upload");
      clearPendingUploads();
      goToAnalysis(id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [createAnalysis, router],
  );

  function handleMissingFieldsCancel() {
    setMissingFieldsState(null);
  }

  function handleSelectFiles(files: File[]) {
    setError(null);

    const validItems: PendingUploadItem[] = [];
    const invalidFileNames: string[] = [];

    for (const file of files) {
      const mimeType = normalizeUploadMimeType(file.type, file.name);

      if (!isSupportedUploadMimeType(mimeType)) {
        invalidFileNames.push(file.name);
        continue;
      }

      validItems.push({
        id: createPendingUploadId(file),
        file,
        mimeType,
      });
    }

    if (validItems.length > 0) {
      setPendingUploads((items) => {
        const seen = new Set(items.map((item) => getPendingUploadKey(item.file, item.mimeType)));
        const merged = [...items];

        for (const item of validItems) {
          const key = getPendingUploadKey(item.file, item.mimeType);

          if (!seen.has(key)) {
            merged.push(item);
            seen.add(key);
          }
        }

        return merged;
      });
    }

    if (invalidFileNames.length > 0) {
      setError(
        `这些文件格式暂不支持：${invalidFileNames.join("、")}。目前仅支持 PDF / JPG / PNG / WEBP / GIF。`,
      );
    }
  }

  function removePendingUpload(id: string) {
    setPendingUploads((items) => {
      const nextItems = items.filter((item) => item.id !== id);

      if (nextItems.length === 0) {
        setUploadContext("");
      }

      return nextItems;
    });
  }

  function clearPendingUploads() {
    setPendingUploads([]);
    setUploadContext("");
  }

  async function handleConfirmUpload() {
    if (pendingUploads.length === 0) {
      setError("请先添加至少 1 个 PDF 或图片文件。");
      return;
    }

    setError(null);
    setIsAnalyzing(true);

    try {
      setStage(`读取 ${pendingUploads.length} 个上传文件`);
      setProgress(0.18);
      const files = await Promise.all(pendingUploads.map((item) => toUploadAsset(item)));
      const userContext = uploadContext.trim() || undefined;

      setStage("调用 AI 合并解析文件与图片");
      setProgress(0.52);

      const response = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files,
          userContext,
        }),
      });

      const payload = (await response.json()) as ExtractResponseBody;

      if (!response.ok || !payload.contract) {
        throw new Error(payload.error ?? "AI 提取失败，请稍后重试。");
      }

      // Check if critical fields are missing
      const missing: Array<"premiumPerYear" | "paymentYears"> = [];

      if (!payload.contract.premiumPerYear || payload.contract.premiumPerYear <= 0) {
        missing.push("premiumPerYear");
      }

      if (!payload.contract.paymentYears || payload.contract.paymentYears <= 0) {
        missing.push("paymentYears");
      }

      if (missing.length > 0 && payload.contract.surrenderValues?.length > 0) {
        // Has cash value data but missing premium info — show modal
        setIsAnalyzing(false);
        setProgress(0.08);
        setStage("等待上传文件");
        setMissingFieldsState({ contract: payload.contract, missingFields: missing });
        return;
      }

      setStage("构建现金流与多轨 IRR");
      setProgress(0.84);

      const id = createAnalysis(payload.contract, "upload");
      clearPendingUploads();

      setStage("生成报告仪表盘");
      setProgress(1);
      goToAnalysis(id);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "上传流程失败。";
      setError(message);
      setIsAnalyzing(false);
      setProgress(0.08);
      setStage("等待上传文件");
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="brutal-card noise-accent flex flex-col gap-6 overflow-hidden p-6 md:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
            <div className="max-w-4xl">
              <div className="brutal-kicker">RAW IRR. ZERO SALES TALK.</div>
              <h1 className="mt-6 max-w-5xl text-5xl font-bold leading-[0.95] text-[var(--foreground)] md:text-7xl">
                STOP BUYING BLIND.
                <br />
                把保险摁回现金流。
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-[var(--muted-strong)] md:text-lg">
                合同怎么包装，不重要。钱什么时候出去，什么时候回来，才重要。
                上传 PDF 或截图。拆掉话术。直接看真实 IRR、回本点和退保代价。
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/compare" className="brutal-button-secondary">
                  SEE THE BOARD
                </Link>
                <button
                  type="button"
                  onClick={() => setShowManualForm((value) => !value)}
                  className="brutal-button"
                >
                  {showManualForm ? "HIDE MANUAL MODE" : "BUILD IT BY HAND"}
                </button>
              </div>
            </div>

            <div className="brutal-panel-accent p-5">
              <p className="font-mono text-xs tracking-[0.18em] uppercase text-[var(--foreground)]">
                BUILT TO CUT THE NOISE
              </p>
              <div className="mt-5 grid gap-4">
                <div className="rounded-[18px] border-[3px] border-[var(--border)] bg-white p-4 shadow-[4px_4px_0_#111111]">
                  <div className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--muted)]">
                    3 ENGINES
                  </div>
                  <div className="mt-2 text-2xl font-bold">Newton / Bisection / Brent</div>
                </div>
                <div className="rounded-[18px] border-[3px] border-[var(--border)] bg-white p-4 shadow-[4px_4px_0_#111111]">
                  <div className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--muted)]">
                    INPUTS
                  </div>
                  <div className="mt-2 text-2xl font-bold">PDF. PHOTO. SCREENSHOT. BATCHED.</div>
                </div>
                <div className="rounded-[18px] border-[3px] border-[var(--border)] bg-white p-4 shadow-[4px_4px_0_#111111]">
                  <div className="font-mono text-xs tracking-[0.15em] uppercase text-[var(--muted)]">
                    NO FANTASY
                  </div>
                  <div className="mt-2 text-2xl font-bold">不把分红演示、浮动利率、销售话术算进收益。</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["REAL IRR", "把每一年的进出钱拉平。只留现金流。"],
            ["SURRENDER HIT", "退保时会亏多少，提前摆上桌。"],
            ["BATCH OCR", "PDF 和多张截图可以合并成一次分析。"],
            ["NO FLUFF", "看结果。别再猜“听起来不错”。"],
          ].map(([title, copy]) => (
            <div key={title} className="brutal-card-soft p-5">
              <p className="font-mono text-xs tracking-[0.16em] uppercase text-[var(--accent-red)]">
                {title}
              </p>
              <p className="mt-3 text-sm font-medium leading-7 text-[var(--muted-strong)]">{copy}</p>
            </div>
          ))}
        </section>

        {isAnalyzing ? <AnalyzingScreen stage={stage} progress={progress} /> : null}

        {error ? (
          <div className="brutal-card-soft bg-[rgba(255,80,48,0.12)] px-5 py-4 text-sm font-semibold text-[var(--accent-red)]">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <UploadZone
            disabled={isAnalyzing}
            selectedCount={pendingUploads.length}
            onSelectFiles={handleSelectFiles}
          />

          <div className="brutal-card-soft p-6">
            <p className="font-mono text-xs tracking-[0.18em] text-[var(--accent-amber)] uppercase">
              CONFIRM THE SET
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight">STAGE FILES. THEN LOCK THE RELATION.</h2>
            <div className="mt-5 grid gap-4 text-sm font-medium leading-7 text-[var(--muted-strong)]">
              <p>1. 你可以一次上传 PDF，也可以分批补充多张 JPG / PNG 截图。</p>
              <p>2. 只有你点确认后，这批文件才会被当成同一份保险材料一起分析。</p>
              <p>3. AI 会合并读取条款页、利益演示页、现金价值表和截图。</p>
              <p>4. 如果数值齐全，就进入 IRR 模式；如果只是条款页，就进入条款风险模式。</p>
            </div>

            <div className="mt-6 grid gap-3">
              {pendingUploads.length === 0 ? (
                <div className="rounded-[18px] border-[3px] border-[var(--border)] bg-white px-4 py-4 text-sm font-medium leading-7 text-[var(--muted-strong)] shadow-[4px_4px_0_#111111]">
                  当前还没有待分析文件。支持 PDF / JPG / PNG / WEBP / GIF。多张图片可以分次加入，最后手动确认它们的归属关系。
                </div>
              ) : (
                <>
                  <div className="rounded-[18px] border-[3px] border-[var(--border)] bg-white px-4 py-4 text-sm font-semibold text-[var(--foreground)] shadow-[4px_4px_0_#111111]">
                    已暂存 {pendingUploads.length} 个文件。点击确认后，这些文件会作为同一份保险材料一起送去分析。
                  </div>
                  <div className="grid gap-3">
                    {pendingUploads.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 rounded-[18px] border-[3px] border-[var(--border)] bg-white px-4 py-3 shadow-[4px_4px_0_#111111]"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-[var(--foreground)]">{item.file.name}</div>
                          <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                            {formatUploadMimeTypeLabel(item.mimeType)} / {formatFileSize(item.file.size)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePendingUpload(item.id)}
                          disabled={isAnalyzing}
                          className="brutal-button-danger shrink-0 px-3 py-2 text-xs"
                        >
                          REMOVE
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-[18px] border-[3px] border-[var(--border)] bg-[rgba(217,255,67,0.14)] p-4 shadow-[4px_4px_0_#111111]">
                    <label
                      htmlFor="upload-context"
                      className="font-mono text-xs tracking-[0.14em] uppercase text-[var(--foreground)]"
                    >
                      MANUAL CONTEXT FOR AI
                    </label>
                    <p className="mt-2 text-sm font-medium leading-7 text-[var(--muted-strong)]">
                      可选补充。这里写的内容会和图片/PDF 一起发给 AI，用来说明缴费口径、图片关系、页码前后顺序等。
                    </p>
                    <textarea
                      id="upload-context"
                      value={uploadContext}
                      onChange={(event) => setUploadContext(event.target.value)}
                      disabled={isAnalyzing}
                      rows={5}
                      placeholder="例如：每年 3 万，交 10 年。这两张图属于同一张现金价值表，第一页是前半段，第二页是后半段。"
                      className="mt-3 min-h-[132px] w-full resize-y rounded-[18px] border-[3px] border-[var(--border)] bg-white px-4 py-3 text-sm font-medium leading-7 text-[var(--foreground)] shadow-[4px_4px_0_#111111] outline-none transition focus:border-[var(--accent-red)]"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={isAnalyzing || pendingUploads.length === 0}
                className="brutal-button disabled:cursor-not-allowed disabled:opacity-50"
              >
                CONFIRM AND ANALYZE
              </button>
              <button
                type="button"
                onClick={clearPendingUploads}
                disabled={isAnalyzing || pendingUploads.length === 0}
                className="brutal-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                CLEAR STAGED FILES
              </button>
            </div>
          </div>
        </section>

        <section className="brutal-card p-6">
          <div className="mb-5">
            <p className="font-mono text-xs tracking-[0.18em] text-[var(--accent)] uppercase">
              PICK ONE. BREAK IT FAST.
            </p>
            <h2 className="mt-2 text-4xl font-bold">先拿示例开刀。</h2>
          </div>
          <DemoCards onSelect={handleDemoSelect} />
        </section>

        {showManualForm ? (
          <ManualForm
            onSubmit={handleManualSubmit}
            onCancel={() => setShowManualForm(false)}
          />
        ) : null}

        {missingFieldsState ? (
          <MissingFieldsModal
            state={missingFieldsState}
            onConfirm={handleMissingFieldsConfirm}
            onCancel={handleMissingFieldsCancel}
          />
        ) : null}
      </div>
    </main>
  );
}
