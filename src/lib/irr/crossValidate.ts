import { isAcceptableSolution, isFiniteNumber, npv } from "@/lib/irr/shared";
import type { IRRResult } from "@/types/insurance";

const RESULT_TOLERANCE = 1e-6;

interface Candidate {
  method: "newton" | "bisection" | "brent";
  value: number;
  residual: number;
}

function createCandidate(
  method: Candidate["method"],
  value: number | null,
  cashflows: number[],
): Candidate | null {
  if (!isFiniteNumber(value) || !isAcceptableSolution(cashflows, value, 1e-2)) {
    return null;
  }

  return {
    method,
    value,
    residual: Math.abs(npv(cashflows, value)),
  };
}

export function crossValidate(
  newton: number | null,
  bisection: number | null,
  brent: number | null,
  cashflows: number[],
): IRRResult {
  const candidates = [
    createCandidate("newton", newton, cashflows),
    createCandidate("bisection", bisection, cashflows),
    createCandidate("brent", brent, cashflows),
  ].filter((candidate): candidate is Candidate => candidate !== null);

  if (candidates.length === 0) {
    return {
      newton,
      bisection,
      brent,
      final: null,
      confidence: "low",
      method: "none",
      convergenceNote: "三种算法均未找到满足 NPV 反验的有效根。",
    };
  }

  const ordered = [...candidates].sort((left, right) => left.value - right.value);
  const spread = ordered[ordered.length - 1].value - ordered[0].value;

  if (ordered.length === 3 && spread < RESULT_TOLERANCE) {
    const preferred = candidates.find((candidate) => candidate.method === "brent") ?? ordered[0];

    return {
      newton,
      bisection,
      brent,
      final: preferred.value,
      confidence: "high",
      method: preferred.method,
      convergenceNote: "三轨结果高度一致，采用稳健性更好的 Brent 法结果。",
    };
  }

  let pair: [Candidate, Candidate] | null = null;

  for (let index = 0; index < candidates.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < candidates.length; nextIndex += 1) {
      const left = candidates[index];
      const right = candidates[nextIndex];

      if (Math.abs(left.value - right.value) < RESULT_TOLERANCE) {
        pair = [left, right];
        break;
      }
    }

    if (pair) {
      break;
    }
  }

  if (pair) {
    const average = (pair[0].value + pair[1].value) / 2;
    const chosen = isAcceptableSolution(cashflows, average, 1e-2)
      ? average
      : pair.sort((left, right) => left.residual - right.residual)[0].value;

    return {
      newton,
      bisection,
      brent,
      final: chosen,
      confidence: "medium",
      method: `${pair[0].method}+${pair[1].method}`,
      convergenceNote: "两种算法结果一致，第三种偏离，采用一致区间结果。",
    };
  }

  const best = [...candidates].sort((left, right) => left.residual - right.residual)[0];

  return {
    newton,
    bisection,
    brent,
    final: best.value,
    confidence: "low",
    method: best.method,
    convergenceNote: "算法收敛存在分歧，采用 NPV 最接近 0 的候选值。",
  };
}
