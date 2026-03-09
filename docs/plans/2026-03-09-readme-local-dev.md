# README Local Development Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the root README so local development is the primary startup path and Docker becomes supplementary documentation.

**Architecture:** Keep all changes in documentation. Rewrite the root README information architecture around the actual local startup script and explicit mock-mode configuration, while preserving Docker instructions later in the file.

**Tech Stack:** Markdown, bash startup script conventions, FastAPI backend, Vite frontend

---

### Task 1: Reframe the root README around local development

**Files:**
- Modify: `README.md`

**Step 1: Inspect the current quick-start wording**

Run: `sed -n '1,220p' README.md`
Expected: local development, Docker deployment, and rebuild instructions appear with similar prominence.

**Step 2: Rewrite the main startup path**

Update `README.md` so `快速开始` clearly recommends local development first, introduces `backend/.env` as a required local file, and shows a minimal `APP_MODE=mock` configuration.

**Step 3: Simplify the startup command**

Keep `./scripts/start.sh` as the primary startup command and move split frontend/backend commands out of the main path.

**Step 4: Demote Docker to a supplementary section**

Retain Docker commands, but move them after the local development guidance and fold rebuild instructions into that section.

**Step 5: Verify the final wording**

Run: `rg -n "推荐启动方式|APP_MODE=mock|./scripts/start.sh|补充部署方式|localhost:9002|localhost:9000" README.md`
Expected: all key local-development cues appear in the README.

**Step 6: Commit**

```bash
git add README.md docs/plans/2026-03-09-readme-local-dev-design.md docs/plans/2026-03-09-readme-local-dev.md
git commit -m "docs: prioritize local development in README"
```
