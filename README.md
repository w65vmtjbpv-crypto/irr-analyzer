# Insurance IRR Analyzer / 保险合同 IRR 分析器

上传保险 PDF 或截图，AI 提取合同数据，本地计算真实 IRR、回本点、退保代价和基准对比。

## 功能

- **多格式上传** — PDF / JPG / PNG / WEBP / GIF，支持多文件合并分析
- **AI 智能提取** — 自动识别保费、缴费年限、现金价值表、给付表、条款要点
- **三轨 IRR** — Newton / Bisection / Brent 交叉验证，结果可信度分级
- **通胀调整** — 名义 IRR 与扣除 CPI 后的实际 IRR 对比展示
- **双轨制支持** — 自动识别 "/" 分隔的双值现金价值表（保守/乐观区间）
- **多时间点 IRR** — 展示第 5/10/15/20/30/50/60 年的持有回报变化
- **AI 解读** — 基于分析结果生成通俗白话总结，AI 不可用时自动回退到规则版
- **基准对比图** — 可交互的年份范围滑块 + 基准线开关，沪深300 不再撑爆 Y 轴
- **退保损失表** — 逐年退保金额、损失率、退保 IRR
- **OCR 校验** — 自动检测常见 OCR 错误（多列合并、减额交清混入、数值跳跃）
- **条款模式** — 非数值类文档自动切换到条款风险分析
- **本地存储** — 所有数据存在浏览器 localStorage，不上传服务器

## 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/w65vmtjbpv-crypto/irr-analyzer.git
cd irr-analyzer

# 2. 安装依赖
npm install

# 3. 配置 AI（见下方说明）
cp .env.example .env.local   # 或手动创建

# 4. 启动
npm run dev

# 5. 打开浏览器
open http://localhost:3089
```

## AI 配置

在项目根目录创建 `.env.local` 文件，填入以下 4 个环境变量：

```bash
AI_PROVIDER=openai
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
AI_MODEL=gpt-4o
```

| 变量 | 说明 |
|---|---|
| `AI_PROVIDER` | 提供商标识：`openai` / `anthropic` / `zhipu` / `qwen` / `custom` |
| `AI_API_URL` | API 地址，支持任何 OpenAI Chat Completions 兼容接口 |
| `AI_API_KEY` | 你的 API Key |
| `AI_MODEL` | 模型名称，需支持图片/PDF 多模态输入 |

### 配置示例

<details>
<summary><strong>OpenAI 官方</strong></summary>

```bash
AI_PROVIDER=openai
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx
AI_MODEL=gpt-4o
```
</details>

<details>
<summary><strong>自建代理 / 转发服务</strong></summary>

```bash
AI_PROVIDER=openai
AI_API_URL=https://your-proxy.com/v1/chat/completions
AI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
AI_MODEL=gpt-4o
```

确保代理端点兼容 OpenAI Chat Completions 格式，且支持 `image_url` 类型的多模态输入。
</details>

<details>
<summary><strong>智谱 GLM</strong></summary>

```bash
AI_PROVIDER=zhipu
AI_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
AI_API_KEY=xxxxxxxxxxxx.xxxxxxxxxxxx
AI_MODEL=glm-4v
```
</details>

<details>
<summary><strong>通义千问</strong></summary>

```bash
AI_PROVIDER=qwen
AI_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
AI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
AI_MODEL=qwen-vl-max
```
</details>

<details>
<summary><strong>Anthropic Claude</strong></summary>

```bash
AI_PROVIDER=anthropic
AI_API_URL=https://api.anthropic.com/v1/messages
AI_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
AI_MODEL=claude-sonnet-4-20250514
```

注意：Anthropic 通道当前仅支持单个 PDF，不支持多图批量输入。
</details>

### 模型要求

- 必须支持**图片输入**（vision / 多模态），否则上传截图会失败
- 推荐使用 GPT-4o、GLM-4V、Qwen-VL-Max 等视觉模型
- 纯文本模型（如 GPT-3.5）无法处理图片和 PDF

## 使用方式

### 方式一：上传文档

1. 拖拽或选择 PDF / 图片文件到上传区域
2. 可以分多次添加文件（如现金价值表拍了多张照片）
3. 在「补充说明」中填写 AI 可能识别不到的信息，例如：
   - `每年 3 万，交 10 年`
   - `这两张图是同一张现金价值表的上下半段`
4. 点击「确认并分析」
5. 如果 AI 未能识别到保费或缴费年限，会弹窗让你手动补充

### 方式二：手动输入

点击首页「BUILD IT BY HAND」按钮，手动填写合同信息。

### 方式三：Demo 示例

首页底部有预置的示例合同，点击即可查看分析效果。

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── extract/     # AI 提取接口
│   │   └── interpret/   # AI 解读接口
│   ├── analysis/[id]/   # 分析结果页
│   └── compare/         # 多产品对比页
├── components/          # UI 组件
├── lib/
│   ├── ai/              # AI 提供商适配层
│   ├── irr/             # IRR 算法（Newton/Bisection/Brent）
│   ├── analysis.ts      # 分析管线
│   ├── cashflow.ts      # 现金流构建
│   ├── surrender.ts     # 退保分析 + 多时间点 IRR
│   ├── interpretation.ts # 规则版解读引擎
│   └── contract.ts      # 合同标准化 + OCR 校验
├── constants/           # 基准利率
├── store/               # Zustand 本地持久化
└── types/               # TypeScript 类型定义
```

## 技术栈

- Next.js 16 (App Router)
- React 19
- Tailwind 4
- Recharts
- Zustand (localStorage persist)

## 注意事项

- 所有分析数据仅保存在浏览器本地，清除浏览器数据后不可恢复
- AI 提取依赖 OCR，可能存在识别误差，请核对关键数值与原始文件
- 分析结果不构成保险销售建议或投资建议
- 分红、万能账户浮动收益等不确定利益不纳入 IRR 计算

## License

MIT
