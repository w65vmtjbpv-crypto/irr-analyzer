"use client";

import type { BenefitType, InsuranceContract, ProductType } from "@/types/insurance";
import { useState } from "react";

interface ManualFormProps {
  onSubmit: (contract: InsuranceContract) => void;
  onCancel?: () => void;
}

interface BenefitRowState {
  id: string;
  startYear: number;
  endYear: number;
  amount: number;
  type: BenefitType;
  label: string;
  guaranteed: boolean;
}

interface SurrenderRowState {
  id: string;
  year: number;
  amount: number;
}

const PRODUCT_OPTIONS: Array<{ value: ProductType; label: string }> = [
  { value: "annuity", label: "年金险" },
  { value: "wholeLife", label: "增额终身寿" },
  { value: "critical", label: "重疾险" },
  { value: "universal", label: "万能险" },
  { value: "endowment", label: "两全险" },
  { value: "participating", label: "分红险" },
];

const BENEFIT_OPTIONS: Array<{ value: BenefitType; label: string }> = [
  { value: "annuity", label: "年金" },
  { value: "maturity", label: "满期金" },
  { value: "survival", label: "生存金" },
  { value: "bonus", label: "奖金/其他" },
];

function makeRowId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ManualForm({ onSubmit, onCancel }: ManualFormProps) {
  const [productName, setProductName] = useState("手动录入保险方案");
  const [productType, setProductType] = useState<ProductType>("annuity");
  const [insuredAge, setInsuredAge] = useState(35);
  const [premiumPerYear, setPremiumPerYear] = useState(20000);
  const [paymentYears, setPaymentYears] = useState(10);
  const [policyYears, setPolicyYears] = useState(30);
  const [deathBenefit, setDeathBenefit] = useState("身故给付按合同约定执行。");
  const [coverageAmount, setCoverageAmount] = useState<number | "">( "");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [benefitRows, setBenefitRows] = useState<BenefitRowState[]>([
    {
      id: makeRowId("benefit"),
      startYear: 11,
      endYear: 20,
      amount: 10000,
      type: "annuity",
      label: "年金领取",
      guaranteed: true,
    },
  ]);
  const [surrenderRows, setSurrenderRows] = useState<SurrenderRowState[]>([
    { id: makeRowId("surrender"), year: 10, amount: 160000 },
  ]);

  function addBenefitRow() {
    setBenefitRows((rows) => [
      ...rows,
      {
        id: makeRowId("benefit"),
        startYear: 1,
        endYear: 1,
        amount: 0,
        type: "survival",
        label: "新给付",
        guaranteed: true,
      },
    ]);
  }

  function addSurrenderRow() {
    setSurrenderRows((rows) => [...rows, { id: makeRowId("surrender"), year: 1, amount: 0 }]);
  }

  function handleSubmit() {
    if (!productName.trim()) {
      setFormError("产品名称不能为空。");
      return;
    }

    const benefits = benefitRows
      .filter((row) => row.amount > 0)
      .flatMap((row) => {
        const start = Math.max(1, Math.min(row.startYear, row.endYear));
        const end = Math.max(start, Math.max(row.startYear, row.endYear));

        return Array.from({ length: end - start + 1 }, (_, index) => ({
          year: start + index,
          amount: row.amount,
          type: row.type,
          label: row.label.trim() || "给付",
          guaranteed: row.guaranteed,
        }));
      });

    const surrenderValues = surrenderRows
      .filter((row) => row.amount >= 0)
      .map((row) => ({
        year: Math.max(1, row.year),
        amount: Math.max(0, row.amount),
      }));

    const contract: InsuranceContract = {
      productName: productName.trim(),
      productType,
      insuredAge,
      premiumPerYear,
      paymentYears,
      policyYears,
      benefits,
      surrenderValues,
      deathBenefit: deathBenefit.trim(),
      coverageAmount: coverageAmount === "" ? null : coverageAmount,
      notes: notes.trim() || undefined,
    };

    setFormError(null);
    onSubmit(contract);
  }

  return (
    <div className="manual-form brutal-card p-6 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-[var(--accent-red)] uppercase">
            MANUAL MODE
          </p>
          <h3 className="mt-2 text-4xl font-bold text-[var(--foreground)]">自己填。自己拆。</h3>
          <p className="mt-2 text-sm font-medium leading-7 text-[var(--muted-strong)]">
            没 PDF 也没关系。把保费、给付、现金价值直接扔进来，照样算。
          </p>
        </div>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="brutal-button-secondary"
          >
            HIDE FORM
          </button>
        ) : null}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm text-[var(--muted-strong)]">产品名称</span>
          <input
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-[var(--accent)]"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm text-[var(--muted-strong)]">产品类型</span>
          <select
            value={productType}
            onChange={(event) => setProductType(event.target.value as ProductType)}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-[var(--accent)]"
          >
            {PRODUCT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm text-[var(--muted-strong)]">被保人年龄</span>
          <input
            type="number"
            value={insuredAge}
            onChange={(event) => setInsuredAge(Number(event.target.value))}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-[var(--accent)]"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm text-[var(--muted-strong)]">年缴保费（元）</span>
          <input
            type="number"
            value={premiumPerYear}
            onChange={(event) => setPremiumPerYear(Number(event.target.value))}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-[var(--accent)]"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm text-[var(--muted-strong)]">缴费年限</span>
          <input
            type="number"
            value={paymentYears}
            onChange={(event) => setPaymentYears(Number(event.target.value))}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-[var(--accent)]"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm text-[var(--muted-strong)]">保障年限</span>
          <input
            type="number"
            value={policyYears}
            onChange={(event) => setPolicyYears(Number(event.target.value))}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-[var(--accent)]"
          />
        </label>
      </div>

      <div className="mt-8 rounded-[24px] border-[3px] border-[var(--border)] bg-[#fff4dd] p-5 shadow-[5px_5px_0_#111111]">
        <div className="flex items-center justify-between">
          <h4 className="font-mono text-sm tracking-[0.16em] text-[var(--accent-amber)] uppercase">
            BENEFIT SCHEDULE
          </h4>
          <button
            type="button"
            onClick={addBenefitRow}
            className="brutal-button-secondary px-3 py-2 text-xs"
          >
            ADD ROW
          </button>
        </div>
        <div className="mt-4 grid gap-4">
          {benefitRows.map((row) => (
            <div key={row.id} className="grid gap-3 rounded-2xl border-[3px] border-[var(--border)] bg-white p-4 shadow-[4px_4px_0_#111111] lg:grid-cols-6">
              <input
                type="number"
                value={row.startYear}
                onChange={(event) =>
                  setBenefitRows((rows) =>
                    rows.map((item) =>
                      item.id === row.id ? { ...item, startYear: Number(event.target.value) } : item,
                    ),
                  )
                }
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:border-[var(--accent)]"
                placeholder="起始年"
              />
              <input
                type="number"
                value={row.endYear}
                onChange={(event) =>
                  setBenefitRows((rows) =>
                    rows.map((item) =>
                      item.id === row.id ? { ...item, endYear: Number(event.target.value) } : item,
                    ),
                  )
                }
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:border-[var(--accent)]"
                placeholder="结束年"
              />
              <input
                type="number"
                value={row.amount}
                onChange={(event) =>
                  setBenefitRows((rows) =>
                    rows.map((item) =>
                      item.id === row.id ? { ...item, amount: Number(event.target.value) } : item,
                    ),
                  )
                }
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:border-[var(--accent)]"
                placeholder="每年金额"
              />
              <select
                value={row.type}
                onChange={(event) =>
                  setBenefitRows((rows) =>
                    rows.map((item) =>
                      item.id === row.id ? { ...item, type: event.target.value as BenefitType } : item,
                    ),
                  )
                }
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:border-[var(--accent)]"
              >
                {BENEFIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={row.label}
                onChange={(event) =>
                  setBenefitRows((rows) =>
                    rows.map((item) =>
                      item.id === row.id ? { ...item, label: event.target.value } : item,
                    ),
                  )
                }
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:border-[var(--accent)]"
                placeholder="描述"
              />
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-[var(--muted-strong)]">
                  <input
                    type="checkbox"
                    checked={row.guaranteed}
                    onChange={(event) =>
                      setBenefitRows((rows) =>
                        rows.map((item) =>
                          item.id === row.id ? { ...item, guaranteed: event.target.checked } : item,
                        ),
                      )
                    }
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  保证给付
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setBenefitRows((rows) => rows.filter((item) => item.id !== row.id))
                  }
                  className="text-sm font-semibold text-[var(--accent-red)]"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border-[3px] border-[var(--border)] bg-[#eef7ff] p-5 shadow-[5px_5px_0_#111111]">
        <div className="flex items-center justify-between">
          <h4 className="font-mono text-sm tracking-[0.16em] text-[var(--accent)] uppercase">
            SURRENDER TABLE
          </h4>
          <button
            type="button"
            onClick={addSurrenderRow}
            className="brutal-button-secondary px-3 py-2 text-xs"
          >
            ADD YEAR
          </button>
        </div>
        <div className="mt-4 grid gap-4">
          {surrenderRows.map((row) => (
            <div key={row.id} className="grid gap-3 rounded-2xl border-[3px] border-[var(--border)] bg-white p-4 shadow-[4px_4px_0_#111111] md:grid-cols-[1fr_2fr_auto]">
              <input
                type="number"
                value={row.year}
                onChange={(event) =>
                  setSurrenderRows((rows) =>
                    rows.map((item) =>
                      item.id === row.id ? { ...item, year: Number(event.target.value) } : item,
                    ),
                  )
                }
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:border-[var(--accent)]"
                placeholder="年份"
              />
              <input
                type="number"
                value={row.amount}
                onChange={(event) =>
                  setSurrenderRows((rows) =>
                    rows.map((item) =>
                      item.id === row.id ? { ...item, amount: Number(event.target.value) } : item,
                    ),
                  )
                }
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:border-[var(--accent)]"
                placeholder="现金价值"
              />
              <button
                type="button"
                onClick={() => setSurrenderRows((rows) => rows.filter((item) => item.id !== row.id))}
                className="brutal-button-danger rounded-xl px-4 py-2 text-sm"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm text-[var(--muted-strong)]">身故赔付描述</span>
          <textarea
            rows={4}
            value={deathBenefit}
            onChange={(event) => setDeathBenefit(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-[var(--accent)]"
          />
        </label>
        <div className="grid gap-6">
          <label className="grid gap-2">
            <span className="text-sm text-[var(--muted-strong)]">保额（可选）</span>
            <input
              type="number"
              value={coverageAmount}
              onChange={(event) =>
                setCoverageAmount(event.target.value === "" ? "" : Number(event.target.value))
              }
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-[var(--accent)]"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-[var(--muted-strong)]">备注</span>
            <textarea
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-[var(--accent)]"
            />
          </label>
        </div>
      </div>

      {formError ? (
        <div className="mt-6 rounded-2xl border-[3px] border-[var(--border)] bg-[rgba(255,80,48,0.16)] px-4 py-3 text-sm font-semibold text-[var(--accent-red)] shadow-[4px_4px_0_#111111]">
          {formError}
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          className="brutal-button"
        >
          RUN THE NUMBERS
        </button>
        <button
          type="button"
          onClick={addBenefitRow}
          className="brutal-button-secondary"
        >
          ADD MORE CASHFLOW
        </button>
      </div>
    </div>
  );
}
