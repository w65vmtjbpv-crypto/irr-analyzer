"use client";

import { findDemoProfile } from "@/data/demoProfiles";
import { analyzeContract } from "@/lib/analysis";
import { normalizeContract } from "@/lib/contract";
import { useAnalysisStore } from "@/store/analysisStore";
import Link from "next/link";
import { useEffect } from "react";
import { ResultDashboard } from "./ResultDashboard";

interface AnalysisPageClientProps {
  id: string;
}

export function AnalysisPageClient({ id }: AnalysisPageClientProps) {
  const record = useAnalysisStore((state) => state.records[id]);
  const createAnalysis = useAnalysisStore((state) => state.createAnalysis);
  const demoProfile = findDemoProfile(id);

  useEffect(() => {
    if (!record && demoProfile) {
      createAnalysis(demoProfile.contract, "demo", id);
    }
  }, [createAnalysis, demoProfile, id, record]);

  const fallbackRecord =
    demoProfile === undefined
      ? undefined
      : {
          id,
          createdAt: new Date().toISOString(),
          source: "demo" as const,
          contract: normalizeContract(demoProfile.contract),
          result: analyzeContract(demoProfile.contract),
        };

  const resolvedRecord = record ?? fallbackRecord;

  if (!resolvedRecord) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="brutal-card max-w-xl p-8 text-center">
          <p className="font-mono text-xs tracking-[0.18em] text-[var(--accent-red)] uppercase">
            ANALYSIS MISSING
          </p>
          <h1 className="mt-4 text-4xl font-bold text-[var(--foreground)]">这份结果不在这台机器上。</h1>
          <p className="mt-4 text-sm font-medium leading-7 text-[var(--muted)]">
            这通常是因为分析记录只保存在本地浏览器，或者分享链接来自其他设备。
          </p>
          <Link href="/" className="brutal-button mt-6 inline-flex">
            RUN AGAIN
          </Link>
        </div>
      </main>
    );
  }

  return <ResultDashboard record={resolvedRecord} />;
}
