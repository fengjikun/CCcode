# 大族智控设备故障诊断系统

基于本体知识图谱的设备故障诊断平台，包含 AI 诊断、本体建模和图谱可视化。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + Ant Design 6 |
| 后端 | FastAPI + SQLAlchemy 2.0 |
| 数据库 | MySQL 8.0 |
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

### 推荐启动方式

推荐新用户优先使用本地开发模式启动项目，不建议把 Docker 作为第一次运行仓库的默认入口。

### 启动前准备

```bash
git clone https://github.com/fengjikun/CCcode.git
cd CCcode

cd backend && pip install -r requirements.txt
cd ../frontend && npm install
```

本地开发请创建 `backend/.env`。最小可运行配置如下：

```env
APP_MODE=mock
AUTH_DEFAULT_USERNAME=admin
AUTH_DEFAULT_PASSWORD=admin123456
```

`APP_MODE=mock` 时，本地启动不依赖 MySQL，适合首次运行和前后端联调。

如需接入真实 LLM 或生产数据库模式，可在此基础上继续补充：

```env
LLM_API_KEY=your_key
LLM_BASE_URL=https://your-openai-compatible-endpoint/v1
LLM_MODEL=your_model
AUTH_SECRET_KEY=replace-with-a-strong-random-secret
AUTH_TOKEN_EXPIRE_MINUTES=480

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=cccode
DB_PASSWORD=CCcode@2024
DB_NAME=cccode
```

首次启动时如 `users` 表为空，会自动创建默认管理员账号（可通过上述环境变量覆盖）。

### 启动命令

```bash
./scripts/start.sh
```

### 访问地址

- 前端：http://localhost:9002
- 后端：http://localhost:9000
- API 文档：http://localhost:9000/docs
- 默认登录账号：`admin` / `admin123456`（请在生产环境修改）

### 常见问题

- Node 版本异常时，优先执行 `nvm use 22` 后再运行 `./scripts/start.sh`。脚本会尝试切换到 Node 22；如果本机未安装，则继续使用当前版本。
- 如果未在 `backend/.env` 中设置 `APP_MODE=mock`，后端会按 `prod` 模式启动，并依赖 MySQL 配置。

### 补充部署方式（Docker）

```bash
cp deploy/.env.example deploy/.env
# Docker 默认以 mock 模式启动；如需真实数据库模式，设置 APP_MODE=prod
./scripts/start.sh docker up deploy/.env
./scripts/start.sh docker ps deploy/.env
./scripts/start.sh docker logs deploy/.env
```

将本地最新数据导入远端部署（本体/项目资产）：

```bash
./scripts/init_remote_data.sh --host <远端IP> --remote-dir <远端项目目录> --yes
```

如需重新构建并重启 Docker 服务：

```bash
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
