# Mock Login Credentials Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restrict mock login so only `admin` / `admin123456` can authenticate in both frontend and backend mock flows.

**Architecture:** Keep the existing auth flow and tighten only the mock-mode branches. Backend becomes the source of truth for accepted mock credentials, and the frontend mock helper mirrors the same rule so direct frontend-only usage cannot bypass it.

**Tech Stack:** FastAPI, pytest, TypeScript

---

### Task 1: Lock backend mock login credentials

**Files:**
- Modify: `backend/tests/test_app_mock_mode.py`
- Modify: `backend/app/routers/auth.py`

**Step 1: Write the failing test**

Add a test asserting `/api/auth/login` returns `401` in mock mode when username/password are not `admin` / `admin123456`.

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=backend pytest backend/tests/test_app_mock_mode.py -q`

Expected: FAIL because mock mode currently accepts arbitrary credentials.

**Step 3: Write minimal implementation**

In the mock branch of `backend/app/routers/auth.py`, compare incoming credentials against the fixed pair and raise `401` on mismatch.

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=backend pytest backend/tests/test_app_mock_mode.py -q`

Expected: PASS

### Task 2: Lock frontend mock login credentials

**Files:**
- Modify: `frontend/src/api/auth.ts`

**Step 1: Implement minimal frontend guard**

Update the frontend mock login helper to throw `Error("用户名或密码错误")` unless the credentials match the fixed pair.

**Step 2: Verify the frontend still builds**

Run: `npm run build --prefix frontend`

Expected: build succeeds.
