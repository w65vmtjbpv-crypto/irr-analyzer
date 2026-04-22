export function Disclaimer() {
  return (
    <div className="brutal-card-soft bg-[#fff1ef] p-5 text-sm leading-7 text-[var(--muted)]">
      <p className="font-mono text-xs tracking-[0.16em] text-[var(--accent-red)] uppercase">
        LEGAL. BORING. STILL IMPORTANT.
      </p>
      <div className="mt-4 grid gap-2 font-medium">
        <p>本工具仅基于合同中的确定现金流与现金价值做量化演示，不构成保险销售建议或投资建议。</p>
        <p>分红、万能账户结算利率、理赔触发概率、附加险条款等非确定因素默认不纳入 IRR 计算。</p>
        <p>请在签约前结合保障需求、流动性安排、健康告知和家庭资产配置做综合判断。</p>
      </div>
    </div>
  );
}
