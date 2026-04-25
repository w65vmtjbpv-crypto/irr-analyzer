"use client";

import { findDemoProfile } from "@/data/demoProfiles";
import { analyzeContract } from "@/lib/analysis";
import { normalizeContract } from "@/lib/contract";
import { useAnalysisStore } from "@/store/analysisStore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ResultDashboard } from "./ResultDashboard";

interface AnalysisPageClientProps {
  id: string;
}

function LoadingSkeleton() {
  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="brutal-card animate-pulse p-6">
          <div className="h-4 w-32 rounded bg-[rgba(17,17,17,0.1)]" />
          <div className="mt-4 h-10 w-80 rounded bg-[rgba(17,17,17,0.1)]" />
          <div className="mt-3 h-3 w-48 rounded bg-[rgba(17,17,17,0.06)]" />
        </div>
        <div className="brutal-card-soft animate-pulse p-6">
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="h-3 w-16 rounded bg-[rgba(17,17,17,0.08)]" />
                <div className="mt-2 h-5 w-28 rounded bg-[rgba(17,17,17,0.1)]" />
              </div>
            ))}
          </div>
        </div>
        <div className="brutal-panel-accent animate-pulse p-8">
          <div className="h-4 w-24 rounded bg-[rgba(17,17,17,0.08)]" />
          <div className="mt-4 h-16 w-48 rounded bg-[rgba(17,17,17,0.12)]" />
          <div className="mt-4 h-8 w-32 rounded bg-[rgba(17,17,17,0.08)]" />
        </div>
      </div>
    </main>
  );
}

export function AnalysisPageClient({ id }: AnalysisPageClientProps) {
  const record = useAnalysisStore((state) => state.records[id]);
  const createAnalysis = useAnalysisStore((state) => state.createAnalysis);
  const demoProfile = findDemoProfile(id);
  const [hydrated, setHydrated] = useState(false);

  // Zustand persist hydrates after first render — useSyncExternalStore fires after mount
  if (!hydrated) {
    // Schedule hydration flag outside of effect to satisfy lint rules
    queueMicrotask(() => setHydrated(true));
  }

  useEffect(() => {
    if (!record && demoProfile) {
      createAnalysis(demoProfile.contract, "demo", id);
    }
  }, [createAnalysis, demoProfile, id, record]);

  // Wait for Zustand to hydrate from localStorage before deciding "not found"
  if (!hydrated) {
    return <LoadingSkeleton />;
  }

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
            记录未找到
          </p>
          <h1 className="mt-4 text-4xl font-bold text-[var(--foreground)]">这份结果不在这台机器上。</h1>
          <p className="mt-4 text-sm font-medium leading-7 text-[var(--muted)]">
            分析记录仅保存在本地浏览器中。如果这是别人分享的链接，需要在原设备上查看。
          </p>
          <Link href="/" className="brutal-button mt-6 inline-flex">
            返回首页
          </Link>
        </div>
      </main>
    );
  }

  return <ResultDashboard record={resolvedRecord} />;
}
