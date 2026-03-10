# Model Center LLM/VL Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refocus the `model-lab` module into an LLM/VL-only experience by replacing traditional-ML types, mock data, and page semantics with large-model training, evaluation, gateway, and dataset workflows.

**Architecture:** Keep the existing `model-lab/*` routes and page shells, but redefine the frontend domain model around `LLM` and `VL`, rebuild the four mock API modules with large-model sample data, and then update each page to consume the new types and interaction patterns. Use a shared constants/types layer so the four pages render from one consistent vocabulary.

**Tech Stack:** React 19, TypeScript 5, Ant Design 6, Vite, existing frontend mock-store helpers.

---

### Task 1: Lock the New Domain Vocabulary with Type-Level Tests

**Files:**
- Create: `frontend/src/types/modelCenter.test.ts`
- Create: `frontend/src/types/modelCenter.ts`
- Modify: `frontend/src/types/modelTraining.ts`
- Modify: `frontend/src/types/modelEvaluation.ts`
- Modify: `frontend/src/types/modelGateway.ts`
- Modify: `frontend/src/types/trainingDataset.ts`
- Test: `frontend/src/types/modelCenter.test.ts`

**Step 1: Write the failing test**

Add a small `vitest` suite that locks the new shared vocabulary:
- `LLM` and `VL` are the only supported model families
- large-model train stages include `sft`, `lora`, `qlora`, `dpo`
- dataset types include `instruction`, `conversation`, `preference`, `image-caption`, `vqa`
- helper labels for families and modalities return the expected Chinese UI copy

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- src/types/modelCenter.test.ts`  
Expected: FAIL because `frontend/src/types/modelCenter.ts` does not exist yet.

**Step 3: Write minimal implementation**

Create `frontend/src/types/modelCenter.ts` to hold:
- shared unions for `ModelFamily`, `ModelModality`, `TrainStage`, `DatasetType`
- label maps reused across pages

Then update:
- `frontend/src/types/modelTraining.ts:5`
- `frontend/src/types/modelEvaluation.ts:5`
- `frontend/src/types/modelGateway.ts:5`
- `frontend/src/types/trainingDataset.ts:5`

to reference the shared vocabulary instead of traditional-ML enums.

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- src/types/modelCenter.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/types/modelCenter.test.ts frontend/src/types/modelCenter.ts frontend/src/types/modelTraining.ts frontend/src/types/modelEvaluation.ts frontend/src/types/modelGateway.ts frontend/src/types/trainingDataset.ts
git commit -m "test: lock model center llm vl domain vocabulary"
```

### Task 2: Rewrite Training and Dataset Mock Models Around LLM/VL

**Files:**
- Modify: `frontend/src/api/modelTraining.ts:1`
- Modify: `frontend/src/api/trainingDataset.ts:1`
- Modify: `frontend/src/types/modelTraining.ts:10`
- Modify: `frontend/src/types/trainingDataset.ts:9`
- Test: `frontend/src/types/modelCenter.test.ts`

**Step 1: Write the failing test**

Extend `frontend/src/types/modelCenter.test.ts` with assertions that sample factory helpers or exported defaults:
- contain no legacy names such as `demand-forecaster`
- include at least one `LLM` project and one `VL` project
- produce dataset samples with prompt/conversation or image-text structures

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- src/types/modelCenter.test.ts`  
Expected: FAIL because current mock data still contains traditional model names and dataset shapes.

**Step 3: Write minimal implementation**

Refactor:
- `frontend/src/types/modelTraining.ts:10-58`
- `frontend/src/types/trainingDataset.ts:9-29`

so they model large-model projects/jobs/datasets.

Rewrite:
- `frontend/src/api/modelTraining.ts:33-255`
- `frontend/src/api/trainingDataset.ts:10-132`

to provide:
- LLM/VL training projects and runs
- large-model logs with tokenizer/adapter/checkpoint wording
- dataset records for instruction, conversation, preference, and VQA/image-caption data
- stats derived from the new dataset fields

Keep create/build/start/stop/delete interactions working.

**Step 4: Run focused verification**

Run:
- `cd frontend && npm test -- src/types/modelCenter.test.ts`
- `cd frontend && npm run build`

Expected:
- tests PASS
- build may still fail later on page usage, but type definitions and mock modules should compile cleanly enough to expose the next set of UI errors

**Step 5: Commit**

```bash
git add frontend/src/api/modelTraining.ts frontend/src/api/trainingDataset.ts frontend/src/types/modelTraining.ts frontend/src/types/trainingDataset.ts frontend/src/types/modelCenter.test.ts
git commit -m "feat: rewrite model center training and dataset mock domain"
```

### Task 3: Rewrite Evaluation and Gateway Mock Models Around LLM/VL

**Files:**
- Modify: `frontend/src/api/modelEvaluation.ts:1`
- Modify: `frontend/src/api/modelGateway.ts:1`
- Modify: `frontend/src/types/modelEvaluation.ts:8`
- Modify: `frontend/src/types/modelGateway.ts:7`
- Test: `frontend/src/types/modelCenter.test.ts`

**Step 1: Write the failing test**

Extend the shared test to assert:
- evaluation task types include large-model tasks such as `instruction-following`, `hallucination`, `grounded-vqa`, `document-understanding`
- gateway samples expose family/modality/context-window semantics
- gateway route samples expose unified inference paths instead of legacy predictor endpoints

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- src/types/modelCenter.test.ts`  
Expected: FAIL because evaluation and gateway mocks still use classification/regression semantics.

**Step 3: Write minimal implementation**

Refactor:
- `frontend/src/types/modelEvaluation.ts:8-64`
- `frontend/src/types/modelGateway.ts:7-51`

Rewrite:
- `frontend/src/api/modelEvaluation.ts:4-169`
- `frontend/src/api/modelGateway.ts:4-184`

to model:
- Judge-style evaluation tasks and samples
- comparison rows for LLM/VL variants
- gateway registry rows for LLM/VL services
- capability endpoints like `/chat/completions`, `/responses`, `/vl/understand`
- monitoring errors that match large-model serving failures

Retain create/promote/rollback/update-traffic mock flows.

**Step 4: Run focused verification**

Run:
- `cd frontend && npm test -- src/types/modelCenter.test.ts`
- `cd frontend && npm run build`

Expected:
- tests PASS
- build surfaces remaining page-level adaptation work

**Step 5: Commit**

```bash
git add frontend/src/api/modelEvaluation.ts frontend/src/api/modelGateway.ts frontend/src/types/modelEvaluation.ts frontend/src/types/modelGateway.ts frontend/src/types/modelCenter.test.ts
git commit -m "feat: rewrite model center evaluation and gateway mock domain"
```

### Task 4: Update Navigation and Shared Labels to the New Information Architecture

**Files:**
- Modify: `frontend/src/components/layout/AppLayout.tsx:36-110`
- Modify: `frontend/src/types/modelCenter.ts`
- Test: `frontend/src/types/modelCenter.test.ts`

**Step 1: Write the failing test**

Add assertions for shared label maps in `frontend/src/types/modelCenter.test.ts` that lock the new Chinese UI copy:
- `训练与微调`
- `评测与对齐`
- `推理网关`
- `训练语料`

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- src/types/modelCenter.test.ts`  
Expected: FAIL before labels are added.

**Step 3: Write minimal implementation**

Update:
- `frontend/src/components/layout/AppLayout.tsx:71-80`
- `frontend/src/components/layout/AppLayout.tsx:106-109`

to use the new navigation labels and page titles while keeping the existing route keys.

**Step 4: Run verification**

Run:
- `cd frontend && npm test -- src/types/modelCenter.test.ts`
- `cd frontend && npm run build`

Expected: PASS for tests; build may still fail until page components are updated.

**Step 5: Commit**

```bash
git add frontend/src/components/layout/AppLayout.tsx frontend/src/types/modelCenter.ts frontend/src/types/modelCenter.test.ts
git commit -m "feat: relabel model center navigation for llm and vl"
```

### Task 5: Adapt `ModelTrainingPage` into `训练与微调`

**Files:**
- Modify: `frontend/src/pages/platform/ModelTrainingPage.tsx:1-260`
- Modify: `frontend/src/api/modelTraining.ts`
- Modify: `frontend/src/types/modelTraining.ts`
- Test: `frontend/src/types/modelCenter.test.ts`

**Step 1: Write the failing test**

Use the build as the red signal after type refactors, and add one small helper-level test if needed for new train-stage label mapping.

**Step 2: Run test/build to verify it fails**

Run:
- `cd frontend && npm test -- src/types/modelCenter.test.ts`
- `cd frontend && npm run build`

Expected: build FAILS because `ModelTrainingPage.tsx` still renders legacy fields like `framework`, `Accuracy`, and old create-form inputs.

**Step 3: Write minimal implementation**

Update `frontend/src/pages/platform/ModelTrainingPage.tsx:126-260` to:
- rename page copy to `训练与微调`
- show `LLM/VL` family and `trainStage`
- render base model, dataset type, token/image scale, and checkpoint info
- update create modal fields to large-model semantics
- keep loss/log drawer behavior with new data fields

**Step 4: Run verification**

Run: `cd frontend && npm run build`  
Expected: `ModelTrainingPage` compiles with the new types.

**Step 5: Commit**

```bash
git add frontend/src/pages/platform/ModelTrainingPage.tsx frontend/src/api/modelTraining.ts frontend/src/types/modelTraining.ts
git commit -m "feat: rebuild model training page for llm and vl"
```

### Task 6: Adapt `TrainingDatasetsPage` into `训练语料`

**Files:**
- Modify: `frontend/src/pages/platform/TrainingDatasetsPage.tsx:42-260`
- Modify: `frontend/src/api/trainingDataset.ts`
- Modify: `frontend/src/types/trainingDataset.ts`
- Test: `frontend/src/types/modelCenter.test.ts`

**Step 1: Write the failing test**

Use the build as the red signal after the dataset type rewrite.

**Step 2: Run test/build to verify it fails**

Run: `cd frontend && npm run build`  
Expected: FAIL because `TrainingDatasetsPage.tsx` still expects fields like `trainSplit`, `schemaFields`, and table-shaped sample rows.

**Step 3: Write minimal implementation**

Update `frontend/src/pages/platform/TrainingDatasetsPage.tsx:147-260` to:
- rename page copy to `训练语料`
- show dataset type, modality, token count, image count, quality score, linked runs
- adapt create modal to large-model dataset fields
- replace generic table-only sample rendering with sections for conversation, preference, and VQA/image-text examples
- keep build timers and mock build flow intact

**Step 4: Run verification**

Run: `cd frontend && npm run build`  
Expected: `TrainingDatasetsPage` compiles with the new dataset shape.

**Step 5: Commit**

```bash
git add frontend/src/pages/platform/TrainingDatasetsPage.tsx frontend/src/api/trainingDataset.ts frontend/src/types/trainingDataset.ts
git commit -m "feat: rebuild model datasets page for llm and vl corpora"
```

### Task 7: Adapt `ModelEvaluationPage` into `评测与对齐`

**Files:**
- Modify: `frontend/src/pages/platform/ModelEvaluationPage.tsx:77-260`
- Modify: `frontend/src/api/modelEvaluation.ts`
- Modify: `frontend/src/types/modelEvaluation.ts`
- Test: `frontend/src/types/modelCenter.test.ts`

**Step 1: Write the failing test**

Use the build as the red signal, because current UI still assumes `accuracy`, `f1`, and confusion-matrix-first rendering.

**Step 2: Run test/build to verify it fails**

Run: `cd frontend && npm run build`  
Expected: FAIL because `ModelEvaluationPage.tsx` still references the legacy evaluation shape.

**Step 3: Write minimal implementation**

Update `frontend/src/pages/platform/ModelEvaluationPage.tsx:124-260` to:
- rename page copy to `评测与对齐`
- replace task-type labels with large-model tasks
- render pass rate, win rate, hallucination rate, grounded score, OCR/doc/VQA scores
- replace confusion-matrix-first detail view with metric cards, judge summary, and sample comparison list
- keep create/delete/detail flows working

**Step 4: Run verification**

Run: `cd frontend && npm run build`  
Expected: `ModelEvaluationPage` compiles and no longer depends on legacy evaluation fields.

**Step 5: Commit**

```bash
git add frontend/src/pages/platform/ModelEvaluationPage.tsx frontend/src/api/modelEvaluation.ts frontend/src/types/modelEvaluation.ts
git commit -m "feat: rebuild model evaluation page for llm and vl alignment"
```

### Task 8: Adapt `ModelGatewayPage` into `推理网关`

**Files:**
- Modify: `frontend/src/pages/platform/ModelGatewayPage.tsx:42-260`
- Modify: `frontend/src/api/modelGateway.ts`
- Modify: `frontend/src/types/modelGateway.ts`
- Test: `frontend/src/types/modelCenter.test.ts`

**Step 1: Write the failing test**

Use the build as the red signal after the gateway type rewrite.

**Step 2: Run test/build to verify it fails**

Run: `cd frontend && npm run build`  
Expected: FAIL because `ModelGatewayPage.tsx` still expects `accuracy`, `framework`, and legacy predictor endpoint fields.

**Step 3: Write minimal implementation**

Update `frontend/src/pages/platform/ModelGatewayPage.tsx:76-260` to:
- rename page copy to `推理网关`
- show family, modality, context window, max output tokens, image-input support, RPM/TPM, and latency
- switch route table rows to large-model capability endpoints
- preserve deploy/promote/rollback/traffic flows with updated wording

**Step 4: Run verification**

Run: `cd frontend && npm run build`  
Expected: `ModelGatewayPage` compiles with the new registry and route types.

**Step 5: Commit**

```bash
git add frontend/src/pages/platform/ModelGatewayPage.tsx frontend/src/api/modelGateway.ts frontend/src/types/modelGateway.ts
git commit -m "feat: rebuild model gateway page for llm and vl serving"
```

### Task 9: Run End-to-End Frontend Verification

**Files:**
- Modify: `frontend/src/pages/platform/ModelTrainingPage.tsx`
- Modify: `frontend/src/pages/platform/TrainingDatasetsPage.tsx`
- Modify: `frontend/src/pages/platform/ModelEvaluationPage.tsx`
- Modify: `frontend/src/pages/platform/ModelGatewayPage.tsx`
- Modify: `frontend/src/components/layout/AppLayout.tsx`

**Step 1: Run the build and tests**

Run:
- `cd frontend && npm test -- src/types/modelCenter.test.ts`
- `cd frontend && npm run build`

Expected:
- shared domain tests PASS
- full frontend build PASS

**Step 2: Perform a manual smoke checklist**

Check locally in dev mode if needed:
- navigation labels show the new information architecture
- each page loads with no blank sections
- create/delete/build/stop/deploy/promote/rollback interactions still update mock-backed state
- dataset drawer renders the new sample structures correctly

**Step 3: Commit**

```bash
git add frontend/src/components/layout/AppLayout.tsx frontend/src/pages/platform/ModelTrainingPage.tsx frontend/src/pages/platform/TrainingDatasetsPage.tsx frontend/src/pages/platform/ModelEvaluationPage.tsx frontend/src/pages/platform/ModelGatewayPage.tsx
git commit -m "test: verify llm and vl model center refactor"
```

---

Plan complete and saved to `docs/plans/2026-03-10-model-center-llm-vl.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
