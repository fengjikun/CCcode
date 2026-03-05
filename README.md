# 大族智控设备故障诊断系统

基于本体知识图谱的设备故障智能诊断系统，集成 Claude AI 进行故障分析，提供可视化本体编辑器和知识图谱展示。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + Ant Design 6 |
| 后端 | Python FastAPI + SQLAlchemy 2.0 |
| 数据库 | SQLite |
| AI | Anthropic Claude API (Tool Use Agent) |
| 可视化 | D3.js v7 力导向图 |

## 功能模块

- **设备管理** — 设备 CRUD、状态监控、搜索筛选
- **故障诊断** — AI 驱动的故障分析，支持诊断历史查询
- **本体编辑器** — 三步向导式本体建模（实体关系 → 动作定义 → 脚本编辑）
- **知识图谱** — D3 力导向图可视化展示本体关系网络

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+（推荐通过 nvm 管理）

### 1. 克隆项目

```bash
git clone https://github.com/fengjikun/CCcode.git
cd CCcode
```

### 2. 配置环境变量

在 `backend/` 目录下创建 `.env` 文件：

```env
CLAUDE_API_KEY=your_api_key_here
CLAUDE_MODEL=claude-opus-4-6
```

### 3. 安装依赖

```bash
# 后端
cd backend
pip install -r requirements.txt

# 前端
cd ../frontend
npm install
```

### 4. 启动服务

**一键启动（推荐）：**

```bash
./scripts/start.sh
```

Docker 启动（同一脚本入口）：

```bash
./scripts/start.sh docker
```

**分别启动：**

```bash
# 后端 (端口 9000)
cd backend
uvicorn app.main:app --reload --port 9000

# 前端 (端口 9002)
cd frontend
npm run dev
```

启动后访问：
- 前端界面：http://localhost:9002
- API 文档：http://localhost:9000/docs

### 5. Docker 部署（生产推荐）

项目生产态由 FastAPI 同时提供 API 和前端静态资源（`frontend/dist`），默认只暴露一个端口 `9000`。

```bash
# 1) 准备环境变量（LLM 可选）
cp deploy/.env.example deploy/.env

# 2) 构建并启动
./scripts/start.sh docker up deploy/.env

# 3) 查看状态/日志
./scripts/start.sh docker ps deploy/.env
./scripts/start.sh docker logs deploy/.env
```

访问地址：
- 应用入口（前端 + API）：http://localhost:9000
- API 文档：http://localhost:9000/docs

停止服务：

```bash
./scripts/start.sh docker down deploy/.env
```

数据持久化说明：
- 容器内数据库路径：`/app/backend/data/devicedb.sqlite`
- 已通过 `docker-compose.yml` 挂载到宿主机 `./backend/data`

## 项目结构

```
├── backend/                  # FastAPI 后端
│   └── app/
│       ├── main.py           # 应用入口，含 SPA 静态文件服务
│       ├── database.py       # 数据库连接与会话管理
│       ├── models/           # SQLAlchemy ORM 模型
│       ├── routers/          # API 路由 (devices, diagnosis, ontology_*)
│       ├── schemas/          # Pydantic v2 请求/响应模型
│       ├── services/         # 业务逻辑层
│       └── utils/            # 工具函数
├── frontend/                 # React + TypeScript 前端
│   └── src/
│       ├── pages/            # 页面组件 (Ontology, Devices, Diagnosis, Graph)
│       ├── components/       # UI 组件 (按功能模块组织)
│       ├── hooks/            # 数据获取 Hooks
│       ├── api/              # API 客户端
│       └── types/            # TypeScript 类型定义
├── scripts/                  # 脚本工具
│   └── start.sh              # 一键启动前后端服务
├── data/                     # 运行时数据 (SQLite 数据库、示例本体)
└── docs/                     # 项目文档
```

## API 概览

所有接口以 `/api/` 为前缀，主要路由：

| 模块 | 路径前缀 | 说明 |
|------|----------|------|
| 设备管理 | `/api/devices` | 设备 CRUD、状态更新 |
| 故障诊断 | `/api/diagnosis` | AI 诊断、记录查询 |
| 本体模式 | `/api/ontology/schema` | 对象类型、属性、关系类型 |
| 本体实例 | `/api/ontology/objects` | 对象实例与关联 |
| 本体动作 | `/api/ontology/actions` | 动作类型、参数、规则、执行 |
| 本体函数 | `/api/ontology/functions` | 函数定义与执行日志 |

完整 API 文档请访问启动后的 `/docs`（Swagger UI）。

## 开发约定

- UI 语言为中文（zh-CN）
- API 字段命名：JSON 使用 camelCase，Python 使用 snake_case
- 前端开发服务器自动代理 `/api` 请求到后端（Vite proxy）
- 数据库文件自动创建于 `./data/devicedb.sqlite`

## License

MIT
