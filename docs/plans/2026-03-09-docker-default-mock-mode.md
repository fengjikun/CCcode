# Docker Default Mock Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Docker deployment default to mock mode while preserving explicit `APP_MODE=prod` override support.

**Architecture:** Keep the backend runtime default unchanged and move the defaulting behavior into Docker configuration. `docker-compose.yml` becomes the effective default source, and `deploy/.env.example` plus docs explain how to opt into prod mode.

**Tech Stack:** Docker Compose, pytest, Markdown docs

---

### Task 1: Lock Docker default mode with a failing test

**Files:**
- Create: `backend/tests/test_docker_default_mode.py`
- Test: `backend/tests/test_docker_default_mode.py`

**Step 1: Write the failing test**

Add assertions that:
- `docker-compose.yml` contains `APP_MODE: ${APP_MODE:-mock}`
- `deploy/.env.example` contains `APP_MODE=mock`

**Step 2: Run test to verify it fails**

Run: `PYTHONPATH=backend pytest backend/tests/test_docker_default_mode.py -q`

Expected: FAIL because Docker defaults are not yet set to mock.

**Step 3: Write minimal implementation**

Update `docker-compose.yml` and `deploy/.env.example` only as needed to satisfy the test.

**Step 4: Run test to verify it passes**

Run: `PYTHONPATH=backend pytest backend/tests/test_docker_default_mode.py -q`

Expected: PASS

### Task 2: Update operator-facing docs

**Files:**
- Modify: `docs/docker-deployment.md`
- Modify: `README.md`

**Step 1: Update docs**

Document that Docker defaults to mock mode, and that prod mode requires setting `APP_MODE=prod`.

**Step 2: Verify docs reference the new default consistently**

Run:

```bash
rg -n "APP_MODE|mock mode|prod mode|默认.*mock" docs/docker-deployment.md README.md deploy/.env.example docker-compose.yml
```

Expected: the default mock behavior and prod override are both visible.
