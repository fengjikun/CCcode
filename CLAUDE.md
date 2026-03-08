# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DeepexiOS v2.0** — 企业级 AI 智能业务运营平台（Intelligent Business Operating Platform）。参考 Palantir Foundry 五级流水线架构，提供从数据接入到智能体部署的端到端 L1-L7 流水线。Backend is Python FastAPI, frontend is React + TypeScript + Ant Design.

**核心流水线：**
- **L1 数据源接入** — 原始数据同步、清洗、标准化
- **L2 数据转换** — 跨源关联、聚合、规范化
- **L3 Deepology 本体语义层** — Object/Property/Link/Action/Function 定义，知识图谱
- **L4 Co-worker 平台** — Agent 设计、Skills 注册与管理、多智能体编排
- **L5 模型训练** — 数据准备、训练、评估、注册
- **L6 模型网关** — 统一推理入口、路由、限流、监控
- **L7 数字员工应用** — 业务数字员工空间、DIC 数字员工空间

## Commands

### Backend (from `backend/`)
```bash
# Run dev server（端口必须是 9000，与前端 vite proxy 对应）
uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload

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
Backend requires a `.env` file in `backend/` with `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` for AI diagnosis features. Auth config: `AUTH_SECRET_KEY`, `AUTH_TOKEN_EXPIRE_MINUTES`, `AUTH_DEFAULT_USERNAME`, `AUTH_DEFAULT_PASSWORD`. Database is controlled by `DB_TYPE` env var: `sqlite` (default, at `./data/devicedb.sqlite`) or `mysql` (requires `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`). Schema auto-created on startup via Alembic migrations. MySQL deployment docs at `deploy/mysql/README.md`.

## Architecture

### Backend (`backend/app/`)

FastAPI with SQLAlchemy 2.0 ORM on SQLite. Layered as routers → services → models. Alembic manages DB migrations (auto-upgraded on startup).

- **Routers** (`routers/`): 8 routers — `auth`, `diagnosis`, `ontology_schema`, `ontology_objects`, `ontology_actions`, `ontology_functions`, `projects`, `agent`. All under `/api/` prefix.
- **Services** (`services/`): Business logic. `diagnosis_service.py` integrates OpenAI-compatible Responses API for AI-powered fault analysis. `agent_service.py` provides SSE streaming chat with skill orchestration. `project_mgmt_service.py` manages full project lifecycle with AI schema extraction. `fault_knowledge_service.py` loads the knowledge graph on startup.
- **Models** (`models/`): SQLAlchemy models. `ontology.py` has 11 models forming the ontology system. `project_mgmt.py` has 13+ models for project management (Project, Document, DataSource, EntityType, RelationType, ExtractionRun, ReviewItem, OntologyVersion, Skill, AiInsightRun, ProjectAction, ProjectFunction). `user.py` for authentication.
- **Schemas** (`schemas/`): Pydantic v2 models with camelCase aliasing (`alias_generator=to_camel`) for JSON API contracts.
- **Security** (`security.py`): Custom HMAC-SHA256 token auth, PBKDF2 password hashing, `get_current_user` dependency.
- **DB sessions**: Injected via `Depends(get_db)` from `database.py`.

In production, `main.py` serves the React build from `frontend/dist/` with SPA fallback routing (non-`/api` paths → `index.html`).

### Frontend (`frontend/src/`)

React 18 + TypeScript + Vite. Uses Ant Design 5 for UI components and D3.js v7 for graph visualizations.

**Page structure** mapped via React Router v6 — organized by L1-L7 pipeline:

```
/dashboard                        — 总览：流水线全景 + 健康度监控
/digital-worker/business          — L7 业务数字员工列表（CRUD）
/digital-worker/business/:id      — L7 设备故障监控对话（SSE streaming）
/digital-worker/dic               — L7 DIC 数字员工空间
/coworker/agents                  — L4 智能体编排（Agent 表格 + 创建/详情弹窗）
/coworker/agents/logs             — L4 智能体执行日志
/coworker/skills                  — L4 Skills 广场（Action/Function/Query 表格）
/ontology/overview                — L3 本体概览（指标 + ObjectType 表格 + Action 示例）
/ontology/projects                — L3 本体项目管理（CRUD）
/ontology/projects/:projectId     — L3 本体工作台（5-tab: 文档/Schema/抽取/动作/函数）
/ontology/projects/:projectId/graph — L3 项目图谱可视化
/ontology/graph                   — L3 全局图谱检索
/transform                        — L2 数据转换（项目表格 + 目录树 + 代码示例）
/model-lab/gateway                — L6 模型网关（指标 + Registry 表格）
/model-lab/training               — L5 模型训练（目录树 + YAML 配置 + 创建弹窗）
/model-lab/datasets               — L5 训练数据集（表格 + 统计）
/datasource                       — L1 数据源管理（表格 + 目录树 + JSON 配置）
```

**Key patterns:**
- `api/client.ts` provides `fetchJSON()` / `fetchMultipart()` with Bearer token auth and error notifications
- `auth/session.ts` manages localStorage token/user persistence
- `components/auth/RequireAuth.tsx` guards protected routes
- `pages/platform/` contains L1-L7 pipeline pages with mock data UI
- D3 graphs use `useRef` + `useEffect` pattern with `simulation.stop()` cleanup
- `components/graph/ForceGraph.tsx` uses `forwardRef` + `useImperativeHandle` to expose zoom/layout controls

### Data Flow
Vite dev proxy (`/api` → `http://localhost:9000`) enables frontend dev without CORS issues. The backend has CORS `allow_origins=["*"]` as fallback.

### Deployment
Docker multi-stage build (Node 22 + Python 3.11), single container on port 9000. `docker-compose.yml` with env from `deploy/.env`. Health check on `/docs`.

## Conventions

- UI language is Chinese (zh-CN)
- API field naming: camelCase in JSON, snake_case in Python
- Complex ontology data (validation rules, trigger configs) stored as JSON strings in SQLite TEXT columns
- Platform pages in `frontend/src/pages/platform/` currently use mock data; will be connected to real APIs incrementally
- PRD reference: `docs/PRD_DeepexiOS平台.md`; HTML prototype: `docs/DeepexiOS原型.html`

## Branch Strategy

- `master` — stable release
- `dev` — development integration
- `mvp-platform-skeleton` — current working branch for platform UI restructuring
