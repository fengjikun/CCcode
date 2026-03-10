# Workspace Polling Removal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove automatic polling from the project workspace so demo sessions do not repeatedly surface transient backend `502` failures.

**Architecture:** Keep the existing workspace data-loading flow and remove only the interval-based refresh path. Manual refresh remains the only way to reload task state after a run starts.

**Tech Stack:** React 19, TypeScript, Vitest

---

### Task 1: Add regression coverage for interval polling removal

**Files:**
- Create: `frontend/src/pages/workspace/useProjectWorkspace.test.ts`
- Modify: none
- Test: `frontend/src/pages/workspace/useProjectWorkspace.test.ts`

**Step 1: Write the failing test**

Write a source-level regression test that reads `useProjectWorkspace.ts` and asserts it does not contain `setInterval(`.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run frontend/src/pages/workspace/useProjectWorkspace.test.ts`
Expected: FAIL because the hook still contains interval polling.

**Step 3: Write minimal implementation**

Remove the polling `useEffect` from `frontend/src/pages/workspace/useProjectWorkspace.ts`.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run frontend/src/pages/workspace/useProjectWorkspace.test.ts`
Expected: PASS

**Step 5: Run related verification**

Run: `npm test -- --run frontend/src/pages/workspace/useProjectWorkspace.test.ts frontend/src/pages/workspace/navigation.test.ts frontend/src/pages/platform/DashboardPage.layout.test.ts`
Expected: PASS
