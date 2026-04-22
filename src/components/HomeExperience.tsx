"use client";

import { AnalyzingScreen } from "@/components/AnalyzingScreen";
import { DemoCards } from "@/components/DemoCards";
import { ManualForm } from "@/components/ManualForm";
import { UploadZone } from "@/components/UploadZone";
import { type DemoProfile } from "@/data/demoProfiles";
import { useAnalysisStore } from "@/store/analysisStore";
import type { InsuranceContract } from "@/types/insurance";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error("无法读取 PDF 文件。"));
        return;
      }

      const [, base64] = result.split(",");
      resolve(base64 ?? result);
    };

    reader.onerror = () => reject(new Error("读取文件失败。"));
    reader.readAsDataURL(file);
  });
}

export function HomeExperience() {
  const router = useRouter();
  const createAnalysis = useAnalysisStore((state) => state.createAnalysis);
  const [showManualForm, setShowManualForm] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0.08);
  const [stage, setStage] = useState("等待上传 PDF");
  const [error, setError] = useState<string | null>(null);

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

  async function handleUpload(file: File) {
    setError(null);
    setIsAnalyzing(true);

    try {
      setStage("读取 PDF 文件");
      setProgress(0.18);
      const pdfBase64 = await readFileAsBase64(file);

      setStage("调用 AI 提取合同条款");
      setProgress(0.52);

      const response = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdfBase64,
          fileName: file.name,
        }),
      });

      const payload = (await response.json()) as {
        contract?: InsuranceContract;
        error?: string;
      };

      if (!response.ok || !payload.contract) {
        throw new Error(payload.error ?? "AI 提取失败，请稍后重试。");
      }

      setStage("构建现金流与多轨 IRR");
      setProgress(0.84);

      const id = createAnalysis(payload.contract, "upload");

      setStage("生成报告仪表盘");
      setProgress(1);
      goToAnalysis(id);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "上传流程失败。";
      setError(message);
      setIsAnalyzing(false);
      setProgress(0.08);
      setStage("等待上传 PDF");
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
                上传 PDF。拆掉话术。直接看真实 IRR、回本点和退保代价。
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
                    WHAT YOU GET
                  </div>
                  <div className="mt-2 text-2xl font-bold">REAL IRR. BREAK-EVEN. SURRENDER DAMAGE.</div>
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
            ["BENCHMARK GAP", "和定存、国债、通胀、HS300 正面对打。"],
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
          <UploadZone disabled={isAnalyzing} onUpload={handleUpload} />

          <div className="brutal-card-soft p-6">
            <p className="font-mono text-xs tracking-[0.18em] text-[var(--accent-amber)] uppercase">
              MOVE FAST
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight">DROP FILE. GET SIGNAL.</h2>
            <div className="mt-5 grid gap-4 text-sm font-medium leading-7 text-[var(--muted-strong)]">
              <p>1. 上传 PDF，或者手动把现金流输进来。</p>
              <p>2. AI 把条款抽成结构化数据，只抓确定利益。</p>
              <p>3. 三轨 IRR 交叉验证，不信单点算法。</p>
              <p>4. 再拿去和定存、国债、通胀、指数收益狠狠干一场。</p>
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
      </div>
    </main>
  );
}
