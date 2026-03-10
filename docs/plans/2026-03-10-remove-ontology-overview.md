# Remove Ontology Overview Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the ontology overview feature completely from the frontend, including its navigation entry, route, page, and directly associated client support files.

**Architecture:** This is a hard deletion of a self-contained frontend feature. Remove the menu and route first, then delete the page and its support modules, and verify there are no dangling references with `rg` and a clean frontend build.

**Tech Stack:** React 19, TypeScript 5.9, React Router 7, Ant Design 6, Vite

---

### Task 1: Capture the removal surface

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/AppLayout.tsx`
- Test: none

**Step 1: Write the failing check**

Run:

```bash
rg -n "OntologyOverviewPage|/ontology/overview|本体概览" frontend/src -S
```

Expected: multiple matches across route, layout, and page files.

**Step 2: Verify the removal target**

Confirm the route and menu are directly referenced in:

- `frontend/src/App.tsx`
- `frontend/src/components/layout/AppLayout.tsx`

**Step 3: Commit**

No commit in this discovery task.

### Task 2: Remove route and navigation references

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/AppLayout.tsx`

**Step 1: Write the failing test/check**

Run:

```bash
rg -n "OntologyOverviewPage|/ontology/overview|本体概览" frontend/src/App.tsx frontend/src/components/layout/AppLayout.tsx -S
```

Expected: matches present before removal.

**Step 2: Implement minimal change**

In `frontend/src/App.tsx`:

- remove the `OntologyOverviewPage` import
- remove the `/ontology/overview` route

In `frontend/src/components/layout/AppLayout.tsx`:

- remove the menu item with key `/ontology/overview`
- remove the breadcrumb mapping entry for `/ontology/overview`

**Step 3: Run check to verify removal**

Run:

```bash
rg -n "OntologyOverviewPage|/ontology/overview|本体概览" frontend/src/App.tsx frontend/src/components/layout/AppLayout.tsx -S
```

Expected: no matches.

**Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/layout/AppLayout.tsx
git commit -m "refactor: remove ontology overview navigation"
```

### Task 3: Delete the page and support modules

**Files:**
- Delete: `frontend/src/pages/platform/OntologyOverviewPage.tsx`
- Delete: `frontend/src/api/ontologyOverview.ts`
- Delete: `frontend/src/types/ontologyOverview.ts`

**Step 1: Write the failing check**

Run:

```bash
rg -n "ontologyOverview|OntologyOverviewPage" frontend/src -S
```

Expected: matches present in the page and support files.

**Step 2: Implement minimal change**

Delete the three feature files listed above.

**Step 3: Run check to verify deletion**

Run:

```bash
rg -n "ontologyOverview|OntologyOverviewPage" frontend/src -S
```

Expected: no matches.

**Step 4: Commit**

```bash
git add -A frontend/src/pages/platform/OntologyOverviewPage.tsx frontend/src/api/ontologyOverview.ts frontend/src/types/ontologyOverview.ts
git commit -m "refactor: delete ontology overview feature files"
```

### Task 4: Verify no residual references and build

**Files:**
- Modify: none

**Step 1: Run global reference check**

Run:

```bash
rg -n "OntologyOverviewPage|/ontology/overview|ontologyOverview|本体概览" frontend/src -S
```

Expected: no matches.

**Step 2: Run frontend build**

Run:

```bash
cd frontend && npm run build
```

Expected: build passes.

**Step 3: Commit docs if desired**

```bash
git add docs/plans/2026-03-10-remove-ontology-overview-design.md docs/plans/2026-03-10-remove-ontology-overview.md
git commit -m "docs: add ontology overview removal plan"
```
