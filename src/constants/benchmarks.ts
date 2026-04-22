import type { BenchmarkRate } from "@/types/insurance";

export const DEFAULT_BENCHMARKS: BenchmarkRate[] = [
  {
    key: "deposit1y",
    label: "银行1年定期",
    shortLabel: "1年定期",
    rate: 0.015,
    description: "短期保守基准",
    color: "#4dd0e1",
  },
  {
    key: "deposit3y",
    label: "银行3年定期",
    shortLabel: "3年定期",
    rate: 0.02,
    description: "中期保守基准",
    color: "#80cbc4",
  },
  {
    key: "deposit5y",
    label: "银行5年定期",
    shortLabel: "5年定期",
    rate: 0.022,
    description: "长期保守基准",
    color: "#ffca28",
  },
  {
    key: "treasury10y",
    label: "10年期国债",
    shortLabel: "10年国债",
    rate: 0.025,
    description: "稳健无风险近似",
    color: "#ffb300",
  },
  {
    key: "cpi",
    label: "CPI 通胀率",
    shortLabel: "通胀",
    rate: 0.022,
    description: "购买力守门线",
    color: "#ef5350",
  },
  {
    key: "hs300",
    label: "沪深300年化",
    shortLabel: "沪深300",
    rate: 0.08,
    description: "激进权益基准",
    color: "#7e57c2",
  },
];
