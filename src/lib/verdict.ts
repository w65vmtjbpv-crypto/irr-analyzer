import type { Verdict } from "@/types/insurance";

interface VerdictDescriptor {
  verdict: Verdict;
  label: string;
  summary: string;
}

const SCALE: VerdictDescriptor[] = [
  {
    verdict: "unscored",
    label: "IRR 不适用",
    summary: "当前文档缺少可确定现金流，先看保障责任、免责、等待期、续保和退保条件。",
  },
  {
    verdict: "excellent",
    label: "收益优秀",
    summary: "跑赢大部分稳健理财，长期持有的收益表现扎实。",
  },
  {
    verdict: "good",
    label: "收益尚可",
    summary: "大致持平银行定期，适合兼顾稳健与保险属性的场景。",
  },
  {
    verdict: "mediocre",
    label: "收益一般",
    summary: "跑输国债，需要结合保障价值和资金使用计划来判断。",
  },
  {
    verdict: "poor",
    label: "收益极低",
    summary: "几乎不赚钱，更接近保障型而非理财型配置。",
  },
  {
    verdict: "negative",
    label: "实际亏损",
    summary: "确定现金流口径下为负收益，建议重新评估持有逻辑。",
  },
];

export function deriveVerdict(
  irr: number | null,
  leverageRatio?: number | null,
): VerdictDescriptor {
  if (irr === null) {
    if (leverageRatio && leverageRatio >= 5) {
      return {
        verdict: "unscored",
        label: "纯保障型",
        summary: `保费杠杆比 ${leverageRatio.toFixed(1)} 倍，这是一份典型的保障型产品，不适合用 IRR 衡量，核心价值在于风险转移。`,
      };
    }

    return SCALE[0];
  }

  if (irr >= 0.03) {
    return SCALE[1];
  }

  if (irr >= 0.02) {
    return SCALE[2];
  }

  if (irr >= 0.01) {
    return SCALE[3];
  }

  if (irr >= 0) {
    return SCALE[4];
  }

  return SCALE[5];
}
