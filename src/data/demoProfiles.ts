import type { AnalysisRecord, InsuranceContract } from "@/types/insurance";

export interface DemoProfile {
  id: string;
  title: string;
  kicker: string;
  summary: string;
  contract: InsuranceContract;
}

export const demoProfiles: DemoProfile[] = [
  {
    id: "demo-annuity",
    title: "年金险",
    kicker: "稳定领取 + 满期返还",
    summary: "适合验证年金领取、同年多笔给付和现金价值插值。",
    contract: {
      productName: "瑞盈金生年金险（示例）",
      productType: "annuity",
      insuredAge: 35,
      premiumPerYear: 100000,
      paymentYears: 10,
      policyYears: 30,
      benefits: [
        ...Array.from({ length: 20 }, (_, index) => ({
          year: index + 11,
          amount: 26000,
          type: "annuity" as const,
          label: "年金领取",
          guaranteed: true,
        })),
        {
          year: 30,
          amount: 1250000,
          type: "maturity",
          label: "满期给付",
          guaranteed: true,
        },
      ],
      surrenderValues: [
        { year: 1, amount: 32000 },
        { year: 3, amount: 186000 },
        { year: 5, amount: 355000 },
        { year: 10, amount: 760000 },
        { year: 15, amount: 910000 },
        { year: 20, amount: 1040000 },
        { year: 25, amount: 1170000 },
        { year: 30, amount: 1250000 },
      ],
      deathBenefit: "身故给付为已交保费或现金价值较大者。",
      coverageAmount: null,
      notes: "演示同一年既有年金又有满期金时，必须按年度求和。",
    },
  },
  {
    id: "demo-whole-life",
    title: "增额终身寿",
    kicker: "长期锁定 + 80 岁视作终点",
    summary: "观察长久期产品的 IRR 与退保现金价值变化。",
    contract: {
      productName: "臻享传家增额终身寿（示例）",
      productType: "wholeLife",
      insuredAge: 30,
      premiumPerYear: 50000,
      paymentYears: 10,
      policyYears: 50,
      benefits: [
        {
          year: 50,
          amount: 1120000,
          type: "maturity",
          label: "80岁保单价值参考",
          guaranteed: true,
        },
      ],
      surrenderValues: [
        { year: 1, amount: 16000 },
        { year: 5, amount: 182000 },
        { year: 10, amount: 420000 },
        { year: 20, amount: 645000 },
        { year: 30, amount: 823000 },
        { year: 40, amount: 978000 },
        { year: 50, amount: 1120000 },
      ],
      deathBenefit: "身故按当年有效保额与现金价值取大。",
      coverageAmount: 650000,
      notes: "终身寿险按被保人 80 岁截断做 IRR 近似。",
    },
  },
  {
    id: "demo-critical",
    title: "重疾险",
    kicker: "收益弱，杠杆强",
    summary: "典型保障型产品，IRR 不应成为唯一判断依据。",
    contract: {
      productName: "守护无忧重疾险（示例）",
      productType: "critical",
      insuredAge: 28,
      premiumPerYear: 12000,
      paymentYears: 20,
      policyYears: 40,
      benefits: [],
      surrenderValues: [
        { year: 1, amount: 0 },
        { year: 5, amount: 24000 },
        { year: 10, amount: 76000 },
        { year: 20, amount: 165000 },
        { year: 30, amount: 195000 },
        { year: 40, amount: 210000 },
      ],
      deathBenefit: "重疾确诊给付 50 万，身故返还已交保费。",
      coverageAmount: 500000,
      notes: "保障型产品建议结合保障杠杆率一起看。",
    },
  },
  {
    id: "demo-universal",
    title: "万能险",
    kicker: "只看保底，不算浮动",
    summary: "用于验证保底现金流建模和逐年基准对比曲线。",
    contract: {
      productName: "稳盈保底万能险（示例）",
      productType: "universal",
      insuredAge: 40,
      premiumPerYear: 20000,
      paymentYears: 10,
      policyYears: 30,
      benefits: [
        ...Array.from({ length: 16 }, (_, index) => ({
          year: index + 15,
          amount: 15000,
          type: "survival" as const,
          label: "保底生存领取",
          guaranteed: true,
        })),
        {
          year: 30,
          amount: 180000,
          type: "maturity",
          label: "账户价值给付",
          guaranteed: true,
        },
      ],
      surrenderValues: [
        { year: 1, amount: 6000 },
        { year: 5, amount: 76000 },
        { year: 10, amount: 164000 },
        { year: 15, amount: 188000 },
        { year: 20, amount: 215000 },
        { year: 25, amount: 246000 },
        { year: 30, amount: 285000 },
      ],
      deathBenefit: "身故给付账户价值与风险保额之和。",
      coverageAmount: 150000,
      notes: "示例只保留保底部分，不纳入超额结算利率。",
    },
  },
];

export const demoRecordIds = new Set(demoProfiles.map((profile) => profile.id));

export function findDemoProfile(id: string): DemoProfile | undefined {
  return demoProfiles.find((profile) => profile.id === id);
}

export function toDemoRecord(contract: InsuranceContract, id: string): AnalysisRecord {
  return {
    id,
    createdAt: new Date().toISOString(),
    source: "demo",
    contract,
    result: {
      irr: {
        newton: null,
        bisection: null,
        brent: null,
        final: null,
        confidence: "low",
        method: "pending",
      },
      cashflows: [],
      cumulativeCashflows: [],
      breakEvenYear: null,
      surrenderAnalysis: [],
      benchmarkComparison: [],
      comparisonSeries: [],
      insuranceValueSeries: [],
      leverageRatio: null,
      verdict: "poor",
      verdictLabel: "",
      verdictSummary: "",
      notes: [],
    },
  };
}
