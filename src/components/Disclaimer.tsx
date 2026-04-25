export function Disclaimer() {
  return (
    <div className="brutal-card-soft bg-[#fff1ef] p-5 text-sm leading-7 text-[var(--muted)]">
      <p className="font-mono text-xs tracking-[0.16em] text-[var(--accent-red)] uppercase">
        重要声明
      </p>
      <div className="mt-4 grid gap-2 font-medium">
        <p>本工具仅基于合同中的确定现金流与现金价值做量化演示，不构成保险销售建议或投资建议。</p>
        <p>文档解析依赖 AI 识别（OCR），提取的数据可能存在误差，包括但不限于数字识别错误、列混淆、分页遗漏等。请务必核对关键数值与原始文件是否一致。</p>
        <p>分红、万能账户结算利率、理赔触发概率、附加险条款等非确定因素默认不纳入 IRR 计算。</p>
        <p>所有分析结果仅保存在您当前浏览器的本地存储中，不会上传至任何服务器，清除浏览器数据后将无法恢复。</p>
        <p>请在签约前结合保障需求、流动性安排、健康告知和家庭资产配置做综合判断。</p>
      </div>
    </div>
  );
}
