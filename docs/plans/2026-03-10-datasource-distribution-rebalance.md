# Datasource Distribution Rebalance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the datasource seed data look less synthetic by replacing the per-ontology one-database-one-bucket pairing with an industry-biased distribution where databases clearly outnumber object storage sources.

**Architecture:** Keep the existing datasource page and CRUD flow intact, but rework the deterministic generator in `frontend/src/api/dataSource.ts` to emit variable source bundles by industry and ontology index. Use the existing `_v` store migration path to force seeded stores onto the new distribution. Update tests to assert realistic properties rather than exact one-to-one counts.

**Tech Stack:** React 19, TypeScript 5.9, Ant Design 6, Vitest, mock-store API

---

### Task 1: Write distribution regression tests

**Files:**
- Modify: `frontend/src/api/dataSource.test.ts`
- Test: `frontend/src/api/dataSource.test.ts`

**Step 1: Write the failing test**

Add assertions that the seeded datasource store:

```ts
expect(dbCount).toBeGreaterThan(storageCount)
expect(storageCount).toBeGreaterThan(0)
expect(dbCount).toBeGreaterThan(ONTOLOGY_DEFS.length)
```

Add one assertion that at least one ontology has multiple database sources.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/api/dataSource.test.ts`
Expected: FAIL because the current generator still emits one database plus one object storage source per ontology.

**Step 3: Write minimal implementation**

Do not change production code in this task.

**Step 4: Run test to verify it still fails**

Run: `npm test -- --run src/api/dataSource.test.ts`
Expected: FAIL with distribution mismatch.

**Step 5: Commit**

```bash
git add frontend/src/api/dataSource.test.ts
git commit -m "test: capture datasource distribution realism rules"
```

### Task 2: Rework datasource generation bundles

**Files:**
- Modify: `frontend/src/api/dataSource.ts`
- Test: `frontend/src/api/dataSource.test.ts`

**Step 1: Implement deterministic bundle rules**

Replace:

```ts
return ONTOLOGY_DEFS.flatMap(() => [db, bucket])
```

With a rule-based bundle generator like:

```ts
return ONTOLOGY_DEFS.flatMap((def, index) => buildDatasourceBundle(def, index))
```

Where `buildDatasourceBundle`:

- always emits one primary database
- sometimes emits a second database
- only sometimes emits object storage

**Step 2: Add industry-biased heuristics**

Use deterministic rules by industry and index, for example:

- manufacturing: secondary DB on every 3rd ontology, storage on every 5th
- retail: secondary DB on every 5th ontology, storage on every 4th
- medical: secondary DB on every 6th ontology, storage on every 3rd
- transport: secondary DB on every 7th ontology, storage on every 6th
- general: secondary DB on every 8th ontology, storage on every 7th

The exact numbers may be tuned, but the end result must keep databases clearly ahead.

**Step 3: Add naming variation**

Generate display suffixes from small deterministic pools:

```ts
const DB_LABELS = ['主库', '业务库', '分析库', '台账库', '归档库']
const STORAGE_LABELS = ['文档仓', '资料桶', '归档桶', '附件仓']
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/api/dataSource.test.ts`
Expected: PASS with realistic distribution assertions.

**Step 5: Commit**

```bash
git add frontend/src/api/dataSource.ts frontend/src/api/dataSource.test.ts
git commit -m "feat: rebalance datasource seed distribution"
```

### Task 3: Force seeded store migration

**Files:**
- Modify: `frontend/src/api/dataSource.ts`
- Test: `frontend/src/api/dataSource.test.ts`

**Step 1: Bump datasource store version**

Update:

```ts
const DATA_VERSION = 3
```

So existing seeded stores are replaced by the new bundle distribution.

**Step 2: Verify migration test**

Run: `npm test -- --run src/api/dataSource.test.ts`
Expected: PASS for the legacy migration test and the new distribution rules.

**Step 3: Commit**

```bash
git add frontend/src/api/dataSource.ts frontend/src/api/dataSource.test.ts
git commit -m "feat: migrate datasource store to rebalanced seed data"
```

### Task 4: Final verification

**Files:**
- Modify: none
- Test: `frontend/src/api/dataSource.test.ts`

**Step 1: Run focused tests**

Run: `npm test -- --run src/api/dataSource.test.ts`
Expected: PASS

**Step 2: Run build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit docs if changed**

```bash
git add docs/plans/2026-03-10-datasource-distribution-rebalance-design.md docs/plans/2026-03-10-datasource-distribution-rebalance.md
git commit -m "docs: add datasource distribution rebalance plan"
```
