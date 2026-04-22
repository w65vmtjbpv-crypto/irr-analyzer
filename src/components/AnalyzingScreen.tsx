"use client";

interface AnalyzingScreenProps {
  stage: string;
  progress: number;
}

const stages = ["读取合同", "AI 提取条款", "构建现金流", "生成分析结果"];

export function AnalyzingScreen({ stage, progress }: AnalyzingScreenProps) {
  return (
    <div className="brutal-card p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-[var(--border)] border-t-[var(--accent-red)] bg-white shadow-[4px_4px_0_#111111]" />
          <div>
            <p className="font-mono text-xs tracking-[0.18em] text-[var(--accent-red)] uppercase">
              EXECUTING
            </p>
            <h3 className="mt-2 text-xl font-bold text-[var(--foreground)]">{stage}</h3>
            <p className="mt-2 text-sm font-medium text-[var(--muted-strong)]">
              没有花里胡哨。正在抽条款、打平现金流、硬算 IRR。
            </p>
          </div>
        </div>
        <div className="grid gap-2 text-sm font-medium text-[var(--muted-strong)]">
          {stages.map((item, index) => (
            <div key={item} className="flex items-center gap-3">
              <span
                className={`h-3 w-3 rounded-full border-2 border-[var(--border)] ${
                  index <= Math.floor(progress * (stages.length - 1))
                    ? "bg-[var(--accent)]"
                    : "bg-white"
                }`}
              />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 h-3 overflow-hidden rounded-full border-[3px] border-[var(--border)] bg-white">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-amber),var(--accent-red))] transition-all duration-500"
          style={{ width: `${Math.max(progress * 100, 8)}%` }}
        />
      </div>
    </div>
  );
}
