# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

大族智控设备故障诊断系统 — A full-stack device fault diagnosis system with an ontology-based knowledge graph. Backend is Python FastAPI, frontend is React + TypeScript + Ant Design. The system manages devices, runs AI-powered fault diagnosis (using OpenAI-compatible Responses API), and provides a visual ontology editor.

## Commands

### Backend (from `backend/`)
```bash
# Run dev server
uvicorn app.main:app --reload

# Install dependencies
pip install -r requirements.txt
```

### Frontend (from `frontend/`)
```bash
# Requires Node 18+. Use nvm if system node is old:
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22

# Dev server (proxies /api → localhost:9000)
npm run dev

# Type-check + production build
npm run build

# Lint
npm run lint
```

### Environment
Backend requires a `.env` file in `backend/` with `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` for AI diagnosis features. The database is SQLite at `./data/devicedb.sqlite`, auto-created on startup.

## Architecture

### Backend (`backend/app/`)

FastAPI with SQLAlchemy 2.0 ORM on SQLite. Layered as routers → services → models.

- **Routers** (`routers/`): 6 routers — `devices`, `diagnosis`, `ontology_schema`, `ontology_objects`, `ontology_actions`, `ontology_functions`. All under `/api/` prefix.
- **Services** (`services/`): Business logic. `diagnosis_service.py` integrates the OpenAI-compatible Responses API for AI-powered fault analysis. `fault_knowledge_service.py` loads the knowledge graph on startup.
- **Models** (`models/`): SQLAlchemy models. `ontology.py` has 11+ models forming the ontology system (ObjectType, Property, LinkType, Object, Link, ActionType, ActionParameter, ActionRule, ActionExecution, Function, FunctionLog).
- **Schemas** (`schemas/`): Pydantic v2 models with camelCase aliasing (`alias_generator=to_camel`) for JSON API contracts.
- **DB sessions**: Injected via `Depends(get_db)` from `database.py`.

In production, `main.py` serves the React build from `frontend/dist/` with SPA fallback routing (non-`/api` paths → `index.html`).

### Frontend (`frontend/src/`)

React 18 + TypeScript + Vite. Uses Ant Design 5 for UI components and D3.js v7 for graph visualizations.

**4 pages** mapped via React Router v6:
- `/ontology` — Ontology editor with 3-step wizard (Entities & Relations → Actions → Groovy Notebook)
- `/devices` — Device CRUD with stats, table, search/filter
- `/diagnosis` — Fault diagnosis form → AI analysis → results + history
- `/graph` — D3 force-directed knowledge graph visualization

**Key patterns:**
- `api/client.ts` provides `fetchJSON()` wrapper with Ant Design `message.error` notifications
- `hooks/` contain data-fetching hooks returning `{ data, loading, error, reload }`
- `types/` mirror backend Pydantic schemas as TypeScript interfaces
- D3 graphs use `useRef` + `useEffect` pattern with `simulation.stop()` cleanup
- `components/graph/ForceGraph.tsx` uses `forwardRef` + `useImperativeHandle` to expose zoom/layout controls

### Data Flow
Vite dev proxy (`/api` → `http://localhost:9000`) enables frontend dev without CORS issues. The backend has CORS `allow_origins=["*"]` as fallback.

## Conventions

- UI language is Chinese (zh-CN)
- API field naming: camelCase in JSON, snake_case in Python
- Complex ontology data (validation rules, trigger configs) stored as JSON strings in SQLite TEXT columns
- The `java/` directory is the legacy pre-migration codebase (Spring Boot + vanilla JS) — kept for reference only
