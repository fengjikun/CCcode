# 大族智控设备故障诊断系统

基于本体知识图谱的设备故障诊断平台，包含 AI 诊断、本体建模和图谱可视化。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + Ant Design 6 |
| 后端 | FastAPI + SQLAlchemy 2.0 |
| 数据库 | SQLite |
| AI | OpenAI-Compatible Responses API |
| 可视化 | D3.js v7 |

## 核心功能

- 故障诊断：基于知识图谱 + LLM 的诊断分析与历史记录
- 本体编辑：对象类型、关系、动作、函数管理
- 图谱展示：D3 力导向图可视化
- 项目抽取：支持 `.docx/.md/.xlsx` 上传，基于 xlsx 推断实体/关系并生成图谱候选

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+

### 本地开发

```bash
git clone https://github.com/fengjikun/CCcode.git
cd CCcode

cd backend && pip install -r requirements.txt
cd ../frontend && npm install
```

`backend/.env`（可选，未配置时走本地知识图谱诊断模式）：

```env
LLM_API_KEY=your_key
LLM_BASE_URL=https://your-openai-compatible-endpoint/v1
LLM_MODEL=your_model

# 认证配置（可选）
AUTH_SECRET_KEY=replace-with-a-strong-random-secret
AUTH_TOKEN_EXPIRE_MINUTES=480
AUTH_DEFAULT_USERNAME=admin
AUTH_DEFAULT_PASSWORD=admin123456
```

首次启动时如 `users` 表为空，会自动创建默认管理员账号（可通过上述环境变量覆盖）。

启动：

```bash
# 推荐：一键启动前后端（9000/9002）
./scripts/start.sh

# 或分别启动
cd backend && uvicorn app.main:app --reload --port 9000
cd frontend && npm run dev
```

访问：
- 前端：http://localhost:9002
- API 文档：http://localhost:9000/docs
- 默认登录账号：`admin` / `admin123456`（请在生产环境修改）

### Docker 部署

```bash
cp deploy/.env.example deploy/.env
./scripts/start.sh docker up deploy/.env
./scripts/start.sh docker ps deploy/.env
./scripts/start.sh docker logs deploy/.env
```

### 重新构建并重启（前后端）

```bash
# 进入项目目录
cd CCcode

# 方案1：直接重建并重启（推荐）
./scripts/start.sh docker up deploy/.env

# 方案2：先停止，再重建并启动（更彻底）
./scripts/start.sh docker down deploy/.env
./scripts/start.sh docker up deploy/.env

# 检查服务状态
./scripts/start.sh docker ps deploy/.env
```

如果需要查看启动日志：

```bash
./scripts/start.sh docker logs deploy/.env
```

访问：
- 应用入口（前端 + API）：http://localhost:9000
- API 文档：http://localhost:9000/docs

## 目录简览

```text
backend/    FastAPI 后端
frontend/   React 前端
data/       运行数据与示例本体
scripts/    启动与部署脚本
docs/       项目文档
```

## API 路由

所有接口以 `/api/` 为前缀，主要模块：

- `/api/diagnosis`
- `/api/ontology/schema`
- `/api/ontology/objects`
- `/api/ontology/actions`
- `/api/ontology/functions`
- `/api/auth`

## License

MIT
