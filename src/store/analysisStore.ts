"use client";

import { analyzeContract } from "@/lib/analysis";
import { normalizeContract } from "@/lib/contract";
import type { AnalysisRecord, AnalysisSource, InsuranceContract } from "@/types/insurance";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const ANALYSIS_STORAGE_KEY = "insurance-irr-analyzer-store";

interface AnalysisState {
  records: Record<string, AnalysisRecord>;
  order: string[];
  createAnalysis: (
    contract: InsuranceContract,
    source: AnalysisSource,
    forcedId?: string,
  ) => string;
  saveRecord: (record: AnalysisRecord) => void;
  removeRecord: (id: string) => void;
}

function createAnalysisId(source: AnalysisSource): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${source}-${Date.now().toString(36)}-${suffix}`;
}

function buildRecord(
  contract: InsuranceContract,
  source: AnalysisSource,
  id: string,
): AnalysisRecord {
  const normalized = normalizeContract(contract);

  return {
    id,
    createdAt: new Date().toISOString(),
    source,
    contract: normalized,
    result: analyzeContract(normalized),
  };
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set) => ({
      records: {},
      order: [],
      createAnalysis: (contract, source, forcedId) => {
        const id = forcedId ?? createAnalysisId(source);
        const record = buildRecord(contract, source, id);

        set((state) => ({
          records: {
            ...state.records,
            [id]: record,
          },
          order: [id, ...state.order.filter((entry) => entry !== id)],
        }));

        return id;
      },
      saveRecord: (record) => {
        set((state) => ({
          records: {
            ...state.records,
            [record.id]: record,
          },
          order: [record.id, ...state.order.filter((entry) => entry !== record.id)],
        }));
      },
      removeRecord: (id) => {
        set((state) => {
          const nextRecords = { ...state.records };
          delete nextRecords[id];

          return {
            records: nextRecords,
            order: state.order.filter((entry) => entry !== id),
          };
        });
      },
    }),
    {
      name: ANALYSIS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        records: state.records,
        order: state.order,
      }),
    },
  ),
);
