# Insurance IRR Analyzer - Project Logic

## 1. Project Location

- Absolute path: `/Users/laige/insurance-irr-analyzer`
- Default local URL: `http://127.0.0.1:3089`
- Dev command: `npm run dev`
- Build command: `npm run build`
- Lint command: `npm run lint`

This project is a local-first insurance analysis app built with Next.js. It has no database. Analysis results are stored in browser `localStorage`.

---

## 2. Product Goal

This is not a generic OCR viewer. It has 2 business modes:

1. `IRR mode`
   When the uploaded material contains clear premium / payment period / benefit / cash value data, the app converts it into cashflows and computes IRR, break-even, surrender loss, and benchmark comparison.

2. `Clause / risk mode`
   When the uploaded material is mainly insurance clauses, coverage terms, exclusions, renewal rules, etc., and does not contain enough numeric data, the app should not fabricate numbers. It instead extracts:
   - `attentionPoints`
   - `riskWarnings`
   - `notes`

The system decides this mostly from the AI extraction result, especially `documentType`, numeric completeness, and extracted fields.

---

## 3. Stack

- Next.js 16 App Router
- React 19
- Zustand persist storage
- Recharts
- Tailwind 4 style environment
- AI extraction via `/api/extract`

---

## 4. Current Supported Inputs

The upload pipeline now supports:

- PDF
- JPG / JPEG
- PNG
- WEBP
- GIF

Core upload type definition is in [src/lib/uploadAssets.ts](/Users/laige/insurance-irr-analyzer/src/lib/uploadAssets.ts).

Important behavior:

- Users can upload multiple files.
- Files are staged first.
- They are only treated as one same insurance material after the user clicks confirm.
- Users can add manual context before analysis.

Example manual context:

- `每年 3 万，交 10 年`
- `这两张图属于同一张现金价值表，第一页是前半段，第二页是后半段`

That context is not just UI text. It is sent into AI extraction as parsing context.

---

## 5. Main User Flows

### 5.1 Demo Flow

Files:

- [src/data/demoProfiles.ts](/Users/laige/insurance-irr-analyzer/src/data/demoProfiles.ts)
- [src/components/HomeExperience.tsx](/Users/laige/insurance-irr-analyzer/src/components/HomeExperience.tsx)

Flow:

1. User clicks a demo card.
2. Demo contract is loaded from local demo data.
3. `createAnalysis()` is called.
4. Analysis is computed locally.
5. User is redirected to `/analysis/[id]`.

No AI involved.

### 5.2 Manual Input Flow

Files:

- [src/components/ManualForm.tsx](/Users/laige/insurance-irr-analyzer/src/components/ManualForm.tsx)
- [src/lib/analysis.ts](/Users/laige/insurance-irr-analyzer/src/lib/analysis.ts)

Flow:

1. User manually enters contract information.
2. UI builds an `InsuranceContract`.
3. `createAnalysis()` is called.
4. Analysis is computed locally.
5. User is redirected to `/analysis/[id]`.

### 5.3 Upload + AI Flow

Files:

- [src/components/UploadZone.tsx](/Users/laige/insurance-irr-analyzer/src/components/UploadZone.tsx)
- [src/components/HomeExperience.tsx](/Users/laige/insurance-irr-analyzer/src/components/HomeExperience.tsx)
- [src/app/api/extract/route.ts](/Users/laige/insurance-irr-analyzer/src/app/api/extract/route.ts)

Flow:

1. User drags or selects one or more files.
2. Frontend normalizes MIME type and filters unsupported files.
3. Files are staged in `pendingUploads`.
4. User optionally fills `MANUAL CONTEXT FOR AI`.
5. User clicks `CONFIRM AND ANALYZE`.
6. Frontend converts every file to base64.
7. Frontend POSTs to `/api/extract` with:
   - `files`
   - `userContext`
8. Backend selects AI provider from environment variables.
9. Provider sends files and instruction to the model.
10. Provider parses model JSON into `InsuranceContract`.
11. Backend normalizes contract fields.
12. Frontend stores the contract in Zustand and computes local analysis.
13. User is redirected to `/analysis/[id]`.

Important UI file:

- [src/components/HomeExperience.tsx](/Users/laige/insurance-irr-analyzer/src/components/HomeExperience.tsx)

---

## 6. API Contract

File:

- [src/app/api/extract/route.ts](/Users/laige/insurance-irr-analyzer/src/app/api/extract/route.ts)

Current request body type:

```ts
interface ExtractRequestBody {
  files?: UploadAsset[];
  pdfBase64?: string;
  fileName?: string;
  userContext?: string;
}
```

`pdfBase64` is legacy-compatible fallback. Current UI uses `files`.

`UploadAsset`:

```ts
interface UploadAsset {
  fileName: string;
  mimeType: string;
  base64Data: string;
}
```

Current behavior in the route:

1. Normalize request files.
2. Validate file name / mime type / base64.
3. Reject unsupported types.
4. Read `userContext`.
5. Create provider.
6. Call `provider.extractContract(files, userContext)`.
7. Normalize contract.
8. Return `{ contract }`.

Error policy:

- No valid file: `400`
- AI config missing: `503`
- Other errors: `500`

---

## 7. AI Layer

### 7.1 Provider Interface

File:

- [src/lib/ai/provider.ts](/Users/laige/insurance-irr-analyzer/src/lib/ai/provider.ts)

Current interface:

```ts
extractContract(assets: UploadAsset[], userContext?: string): Promise<InsuranceContract>
```

Providers:

- `openai`
- `zhipu`
- `qwen`
- `anthropic`
- `custom`

### 7.2 OpenAI-Compatible Provider

File:

- [src/lib/ai/openai.ts](/Users/laige/insurance-irr-analyzer/src/lib/ai/openai.ts)

This is the main provider family right now.

Important logic:

- Automatically normalizes endpoint to `v1/responses` or `chat/completions`.
- Uses `stream: false`.
- For PDF:
  - Responses API: `input_file`
  - Chat Completions: `file`
- For image:
  - Responses API: `input_image`
  - Chat Completions: `image_url`
- Manual context is added into the user instruction.

Multi-file logic:

- If multiple assets are uploaded, the instruction explicitly says the files were manually confirmed by the user to belong to the same material.
- The model is told to merge-read all pages/images together.

### 7.3 Anthropic Provider

File:

- [src/lib/ai/anthropic.ts](/Users/laige/insurance-irr-analyzer/src/lib/ai/anthropic.ts)

Current limitation:

- Only supports a single PDF.
- Does not support multi-image batch input.

Manual `userContext` is passed, but only inside the single-PDF flow.

### 7.4 Custom Provider

File:

- [src/lib/ai/custom.ts](/Users/laige/insurance-irr-analyzer/src/lib/ai/custom.ts)

Current behavior:

- Sends:
  - `model`
  - `prompt`
  - `files`
  - optional `userContext`
  - optional legacy `pdfBase64`

This provider is mainly a passthrough for custom OCR / LLM backends.

### 7.5 Prompt Rules

File:

- [src/lib/ai/prompt.ts](/Users/laige/insurance-irr-analyzer/src/lib/ai/prompt.ts)

The prompt requires the model to:

- Return strict JSON only.
- Extract guaranteed benefits and surrender values.
- Ignore non-guaranteed dividend / illustrated / floating yield.
- Detect `documentType`.
- For clause-like material:
  - do not fabricate premium or cash value
  - produce `attentionPoints`
  - produce `riskWarnings`
- Merge multiple files as one material.
- Use manual context only as helper context.
- If manual context conflicts with visible document content, prefer visible document content.

---

## 8. Core Domain Model

Main type file:

- [src/types/insurance.ts](/Users/laige/insurance-irr-analyzer/src/types/insurance.ts)

### 8.1 InsuranceContract

This is the unified extracted input model:

- `productName`
- `productType`
- `insuredAge`
- `premiumPerYear`
- `paymentYears`
- `policyYears`
- `benefits`
- `surrenderValues`
- `deathBenefit`
- `coverageAmount`
- `documentType`
- `attentionPoints`
- `riskWarnings`
- `notes`

### 8.2 AnalysisRecord

Stored per analysis:

- `id`
- `createdAt`
- `source`
- `contract`
- `result`

Sources:

- `demo`
- `manual`
- `upload`

---

## 9. Local Analysis Engine

Main file:

- [src/lib/analysis.ts](/Users/laige/insurance-irr-analyzer/src/lib/analysis.ts)

The analysis engine is fully local after extraction.

Pipeline:

1. `normalizeContract()`
2. `buildCashflows()`
3. `buildCumulativeCashflows()`
4. `computeIRR()`
5. `buildInsuranceValueSeries()`
6. `buildComparisonSeries()`
7. `buildBenchmarkComparison()`
8. `buildSurrenderAnalysis()`
9. `deriveVerdict()`
10. merge notes

Key submodules:

- [src/lib/cashflow.ts](/Users/laige/insurance-irr-analyzer/src/lib/cashflow.ts)
- [src/lib/benchmark.ts](/Users/laige/insurance-irr-analyzer/src/lib/benchmark.ts)
- [src/lib/surrender.ts](/Users/laige/insurance-irr-analyzer/src/lib/surrender.ts)
- [src/lib/verdict.ts](/Users/laige/insurance-irr-analyzer/src/lib/verdict.ts)

IRR implementation:

- [src/lib/irr/newton.ts](/Users/laige/insurance-irr-analyzer/src/lib/irr/newton.ts)
- [src/lib/irr/bisection.ts](/Users/laige/insurance-irr-analyzer/src/lib/irr/bisection.ts)
- [src/lib/irr/brent.ts](/Users/laige/insurance-irr-analyzer/src/lib/irr/brent.ts)
- [src/lib/irr/crossValidate.ts](/Users/laige/insurance-irr-analyzer/src/lib/irr/crossValidate.ts)

The app cross-validates multiple IRR algorithms rather than trusting one single method.

---

## 10. Storage Model

File:

- [src/store/analysisStore.ts](/Users/laige/insurance-irr-analyzer/src/store/analysisStore.ts)

Storage behavior:

- Zustand store with `persist`
- Uses browser `localStorage`
- Storage key:
  - `insurance-irr-analyzer-store`

Important implications:

- There is no server-side persistence.
- Results exist only on the current browser/device.
- `/analysis/[id]` depends on local store unless the record is a demo fallback.

---

## 11. Main Pages

### Home

- [src/app/page.tsx](/Users/laige/insurance-irr-analyzer/src/app/page.tsx)
- [src/components/HomeExperience.tsx](/Users/laige/insurance-irr-analyzer/src/components/HomeExperience.tsx)

Responsibilities:

- Demo entry
- Manual input entry
- Staged upload entry
- Multi-file confirmation
- Manual context input
- Analysis progress UI

### Analysis Page

- [src/app/analysis/[id]/page.tsx](/Users/laige/insurance-irr-analyzer/src/app/analysis/[id]/page.tsx)
- [src/components/AnalysisPageClient.tsx](/Users/laige/insurance-irr-analyzer/src/components/AnalysisPageClient.tsx)
- [src/components/ResultDashboard.tsx](/Users/laige/insurance-irr-analyzer/src/components/ResultDashboard.tsx)

Responsibilities:

- Read analysis record
- Show IRR, break-even, surrender, benchmark, notes, clause warnings

### Compare Page

- [src/app/compare/page.tsx](/Users/laige/insurance-irr-analyzer/src/app/compare/page.tsx)
- [src/components/CompareBoard.tsx](/Users/laige/insurance-irr-analyzer/src/components/CompareBoard.tsx)

Responsibilities:

- Show local analysis records in one table
- Compare IRR / payment structure / break-even / leverage
- Delete local records

Note:

- `CompareBoard` now reads `order` and `records` separately from Zustand and recombines them with `useMemo` to avoid `getSnapshot` infinite-loop style warnings.

---

## 12. Environment Variables

The app chooses AI provider entirely from server env vars.

Used in code:

- `AI_PROVIDER`
- `AI_API_URL`
- `AI_API_KEY`
- `AI_MODEL`

Current code expectation:

- `openai` provider can point to an OpenAI-compatible backend.
- If using Responses API style backend, endpoint should be compatible with file/image multimodal input.
- `stream: false` is currently important for compatibility with the current proxy behavior.

Do not hardcode secrets into repository files.

---

## 13. What Another AI Should Inspect First

If another AI is taking over repairs, these are the highest-value entry files:

1. [src/components/HomeExperience.tsx](/Users/laige/insurance-irr-analyzer/src/components/HomeExperience.tsx)
   This is the upload orchestration center.

2. [src/app/api/extract/route.ts](/Users/laige/insurance-irr-analyzer/src/app/api/extract/route.ts)
   This is the request normalization and provider dispatch point.

3. [src/lib/ai/openai.ts](/Users/laige/insurance-irr-analyzer/src/lib/ai/openai.ts)
   This is the main multimodal extraction implementation.

4. [src/lib/ai/prompt.ts](/Users/laige/insurance-irr-analyzer/src/lib/ai/prompt.ts)
   This determines extraction behavior and anti-fabrication rules.

5. [src/lib/analysis.ts](/Users/laige/insurance-irr-analyzer/src/lib/analysis.ts)
   This is the local calculation pipeline after extraction.

6. [src/store/analysisStore.ts](/Users/laige/insurance-irr-analyzer/src/store/analysisStore.ts)
   This is where browser persistence and analysis record lifecycle live.

---

## 14. Current Known Constraints

- No backend database
- No cloud sync
- Clause-only documents may still produce sparse numeric fields, which is expected
- Anthropic path is still single-PDF only
- Extraction quality depends heavily on model multimodal quality
- Manual context helps, but prompt explicitly prevents it from overriding visible document content

---

## 15. Repair Checklist

If another AI needs to debug the current system, test in this order:

1. `npm run lint`
2. `npm run build`
3. Start dev server on `3089`
4. Test `/api/extract` with:
   - one PDF
   - one image
   - multiple images
   - multiple files plus `userContext`
5. Verify analysis page renders for:
   - numeric illustration document
   - clause-only document
6. Verify compare page reads persisted local records without React snapshot warnings

---

## 16. Short Summary

In one sentence:

This project takes insurance PDFs or screenshots, optionally merges multiple files with user-provided context, extracts a structured `InsuranceContract` via AI, then computes IRR and risk analysis locally in the browser.
