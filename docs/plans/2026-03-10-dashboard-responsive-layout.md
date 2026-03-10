# Dashboard Responsive Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate awkward inner scrolling and inconsistent card sizing on the platform dashboard when the viewport is narrow.

**Architecture:** Keep the existing dashboard content and visual language intact, but replace fixed desktop-only spans and widths with breakpoint-aware layout props and page-specific responsive class hooks. Shared card styling stays in `frontend/src/styles/global.css`, while page structure changes remain in `frontend/src/pages/platform/DashboardPage.tsx`.

**Tech Stack:** React, TypeScript, Ant Design 5, shared global CSS

---

### Task 1: Add a regression-focused responsive test plan

**Files:**
- Modify: `frontend/src/pages/platform/DashboardPage.tsx`
- Modify: `frontend/src/styles/global.css`

**Step 1: Define the failing behaviors**

- Pipeline section creates an inner horizontal scroll region on narrow dashboard widths.
- Top stat cards use fixed 4-column spans, causing compressed cards and uneven heights.
- Health/activity and resource cards stay in desktop columns too long, making the layout cramped.

**Step 2: Verify RED with a targeted UI check**

Run: `npm run build --prefix frontend`
Expected: Build passes before and after the change; manual regression remains focused on viewport widths around tablet and small laptop sizes.

### Task 2: Implement the responsive layout adjustments

**Files:**
- Modify: `frontend/src/pages/platform/DashboardPage.tsx`
- Modify: `frontend/src/styles/global.css`

**Step 1: Add page-scoped class names**

- Introduce dashboard-specific wrappers for the pipeline rail, stat grid rows, stat cards, and lower content rows.
- Keep existing content and data bindings unchanged.

**Step 2: Replace fixed spans with responsive breakpoints**

- Update `Col` props for stat cards, health/activity columns, and resource cards to collapse gracefully from 4 columns to 2 columns to 1 column as width shrinks.

**Step 3: Remove the inner scroll feel from the pipeline**

- Allow the pipeline rail to wrap on medium screens.
- Hide decorative arrows when the layout wraps to stacked cards.

**Step 4: Normalize card heights**

- Make stat/resource columns stretch and cards fill their column height.
- Tighten typography and padding slightly on narrower breakpoints.

### Task 3: Verify the change

**Files:**
- Modify: `frontend/src/pages/platform/DashboardPage.tsx`
- Modify: `frontend/src/styles/global.css`

**Step 1: Run the verification command**

Run: `npm run build --prefix frontend`
Expected: Successful production build with no TypeScript or bundling errors.

**Step 2: Review the diff**

Run: `git diff -- frontend/src/pages/platform/DashboardPage.tsx frontend/src/styles/global.css docs/plans/2026-03-10-dashboard-responsive-layout.md`
Expected: Only dashboard-responsive layout updates and the plan file are present.
