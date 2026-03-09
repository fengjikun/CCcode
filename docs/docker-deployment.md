# Docker 部署指南

## 架构概述

本项目采用**单容器多阶段构建**方案：

```
Dockerfile (多阶段)
├── Stage 1: node:22-alpine      — 构建 React 前端 (npm run build)
└── Stage 2: python:3.11-slim    — 运行 FastAPI 后端 + 静态前端
```

容器内 FastAPI（端口 9000）同时承担：
- API 服务：`/api/*` 路由
- 前端静态文件：React SPA（`/assets/*` + SPA fallback）
- API 文档：`/docs`

Docker Compose 部署默认以 `prod` 模式运行，并依赖 `mysql` 服务。

启动时会执行：
1. 初始化默认管理员账号（仅用户表为空时）
2. 加载故障知识图谱

数据库迁移不再在应用启动时自动执行。首次部署或升级数据库 schema 后，需要手动执行 `alembic upgrade head`。

---

## 前置条件

| 依赖 | 最低版本 | 说明 |
|------|---------|------|
| Docker | 20.x+ | 容器运行时 |
| docker-compose / docker compose | v1.29+ / v2+ | 编排工具，二者均支持 |

---

## 快速启动

### 方式一：使用统一脚本（推荐）

```bash
# 首次启动（自动创建 deploy/.env）
./scripts/start.sh docker

# 等价于
./scripts/start.sh docker up deploy/.env
```

### 方式二：直接使用 docker compose

```bash
# 确保 deploy/.env 存在
cp deploy/.env.example deploy/.env
# 编辑 deploy/.env，填写 LLM 和认证配置

docker compose --env-file deploy/.env up -d --build
```

启动成功后访问：
- **应用入口**：`http://localhost:9000`
- **API 文档**：`http://localhost:9000/docs`

首次部署或升级后，执行数据库迁移：

```bash
docker compose --env-file deploy/.env exec app alembic upgrade head
```

如果 `app` 容器尚未处于可 `exec` 状态，可改用：

```bash
docker compose --env-file deploy/.env run --rm app alembic upgrade head
```

---

## 环境变量配置

配置文件位于 `deploy/.env`（从 `deploy/.env.example` 复制）。

### LLM 配置（可选）

不配置时，AI 诊断功能退化为纯知识图谱模式，其余功能正常可用。

| 变量 | 说明 | 示例 |
|------|------|------|
| `LLM_API_KEY` | LLM API 密钥 | `sk-xxx` |
| `LLM_BASE_URL` | OpenAI 兼容接口地址 | `https://api.openai.com/v1` |
| `LLM_MODEL` | 使用的模型名称 | `gpt-4o` |

### 认证配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `AUTH_SECRET_KEY` | `replace-with-a-strong-random-secret` | HMAC-SHA256 签名密钥，**生产环境必须修改** |
| `AUTH_TOKEN_EXPIRE_MINUTES` | `480` | Token 有效期（分钟），默认 8 小时 |
| `AUTH_PASSWORD_HASH_ITERATIONS` | `200000` | 密码哈希迭代次数 |
| `AUTH_DEFAULT_USERNAME` | `admin` | 初始管理员用户名 |
| `AUTH_DEFAULT_PASSWORD` | `admin123456` | 初始管理员密码，**生产环境必须修改** |

> **安全提示**：生产部署时务必修改 `AUTH_SECRET_KEY` 和 `AUTH_DEFAULT_PASSWORD`。可用以下命令生成随机密钥：
> ```bash
> python3 -c "import secrets; print(secrets.token_hex(32))"
> ```

### 配置示例

```env
# LLM 配置
LLM_API_KEY=sk-your-api-key-here
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o

# 认证配置
AUTH_SECRET_KEY=a1b2c3d4e5f6...（32字节随机十六进制）
AUTH_TOKEN_EXPIRE_MINUTES=480
AUTH_PASSWORD_HASH_ITERATIONS=200000
AUTH_DEFAULT_USERNAME=admin
AUTH_DEFAULT_PASSWORD=your-strong-password
```

---

## 常用命令

### 统一脚本方式

```bash
# 启动（构建镜像 + 后台运行）
./scripts/start.sh docker up

# 查看容器状态
./scripts/start.sh docker ps

# 实时查看日志
./scripts/start.sh docker logs

# 停止并移除容器
./scripts/start.sh docker down
```

### 直接 docker compose 方式

```bash
# 构建并启动
docker compose --env-file deploy/.env up -d --build

# 仅重新构建镜像（不启动）
docker compose --env-file deploy/.env build

# 查看运行状态
docker compose --env-file deploy/.env ps

# 实时跟踪日志
docker compose --env-file deploy/.env logs -f app

# 停止并移除容器（保留数据卷）
docker compose --env-file deploy/.env down

# 停止并移除容器及数据卷（⚠️ 会删除数据库）
docker compose --env-file deploy/.env down -v
```

### 单独 docker 命令（仅调试已有外部 MySQL 时使用）

> 这一方式不会自动提供 MySQL。若没有现成数据库，请使用 `docker compose` 方式部署。

```bash
# 手动构建镜像
docker build -t cccode-app:latest .

# 手动运行容器（需自行提供可访问的 MySQL）
docker run -d \
  --name cccode-app \
  -p 9000:9000 \
  -v $(pwd)/deploy/backend/data:/app/backend/data \
  -e LLM_API_KEY=your-key \
  -e AUTH_SECRET_KEY=your-secret \
  -e DB_HOST=your-mysql-host \
  -e DB_PORT=3306 \
  -e DB_USER=cccode \
  -e DB_PASSWORD=your-db-password \
  -e DB_NAME=cccode \
  cccode-app:latest

# 进入容器调试
docker exec -it cccode-app bash

# 查看容器日志
docker logs -f cccode-app
```

---

## 数据持久化

MySQL 数据通过 Docker named volume `cccode-mysql-data` 持久化，项目资产通过 bind mount 挂载：

| 宿主机路径 | 容器路径 | 内容 |
|-----------|---------|------|
| `./deploy/backend/data` | `/app/backend/data/` | 项目资产文件 |
| Docker volume `cccode-mysql-data` | `/var/lib/mysql` | MySQL 数据 |

> 停止/重建容器不会丢失数据。执行 `docker compose down -v` 才会清除数据卷（包括 MySQL 数据）。

**备份数据库**：
```bash
cd deploy/mysql && ./backup.sh
```

**恢复数据库**：
```bash
cd deploy/mysql && ./restore.sh backup/cccode_<timestamp>.sql.gz
```

---

## 远端初始化导入（本地数据 -> 远端）

当你本地已有最新 `agent` / 本体数据（含 `project_assets`）时，可使用：

```bash
./scripts/init_remote_data.sh \
  --host <远端IP或域名> \
  --user root \
  --remote-dir <远端项目目录> \
  --identity ~/.ssh/id_rsa \
  --yes
```

脚本会自动执行：

1. 打包本地 `backend/data`
2. 上传到远端 `/tmp`
3. 远端备份旧数据到 `backups/backend-data-<timestamp>.tar.gz`
4. 覆盖导入新数据
5. 重启 Docker 服务并输出状态

先演练（不实际上传/覆盖）：

```bash
./scripts/init_remote_data.sh \
  --host <远端IP或域名> \
  --remote-dir <远端项目目录> \
  --dry-run \
  --yes
```

---

## 健康检查

容器内置健康检查（`HEALTHCHECK`），每 30 秒探测一次 `/docs` 端点：

```
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=5
```

查看健康状态：
```bash
docker inspect --format='{{.State.Health.Status}}' cccode-app
```

状态说明：
- `starting`：容器启动中（最长等待 25s × 5 = 125s）
- `healthy`：服务正常
- `unhealthy`：服务异常，检查日志排查

---

## 端口说明

| 端口 | 说明 |
|------|------|
| `9000` | 统一入口（前端页面 + API + API文档） |

如需修改宿主机端口（例如改为 8080），编辑 `docker-compose.yml`：
```yaml
ports:
  - "8080:9000"
```

---

## 生产部署建议

1. **修改默认密码和密钥**：`AUTH_SECRET_KEY`、`AUTH_DEFAULT_PASSWORD` 必须更换。
2. **配置反向代理**：建议在容器前部署 Nginx/Caddy，处理 HTTPS 和域名绑定。
3. **定期备份数据库**：使用 `deploy/mysql/backup.sh` 定期备份 MySQL。
4. **固定镜像版本**：生产镜像打 tag，避免 `latest` 导致的不可预期更新。
   ```bash
   docker tag cccode-app:latest cccode-app:v1.0.0
   ```
5. **资源限制**：按需在 `docker-compose.yml` 中添加 `mem_limit` / `cpus` 限制。

### Nginx 反向代理示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # SSE 流式响应（Agent 对话）需关闭缓冲
        proxy_buffering off;
        proxy_cache off;
    }
}
```

---

## 故障排查

### 容器启动失败

```bash
# 查看详细日志
docker compose --env-file deploy/.env logs app

# 常见原因：
# - deploy/.env 不存在 → cp deploy/.env.example deploy/.env
# - 端口 9000 被占用 → lsof -i :9000
```

### 数据库迁移失败

应用启动时不会自动执行 Alembic 迁移。首次部署、升级 schema 或排查数据库结构问题时，请手动执行迁移。

```bash
# 容器已启动时
docker compose --env-file deploy/.env exec app alembic upgrade head

# 容器未启动或需要一次性执行时
docker compose --env-file deploy/.env run --rm app alembic upgrade head
```

### AI 功能无响应

检查环境变量是否正确配置：
```bash
docker exec cccode-app env | grep LLM_
```

### 前端页面空白

前端资源由后端静态文件服务提供，构建时已打包进镜像。若页面空白：
1. 检查浏览器控制台错误
2. 确认 `http://localhost:9000/assets/` 可访问
3. 重新构建镜像（`--build` 参数）

---

## 目录结构参考

```
ontology_poc/
├── Dockerfile              # 多阶段构建文件
├── docker-compose.yml      # 服务编排配置
├── .dockerignore           # 构建排除文件
├── deploy/
│   ├── .env.example        # 环境变量模板
│   └── .env                # 实际配置（不提交 git）
├── scripts/
│   └── start.sh            # 统一管理脚本
└── backend/
    └── data/               # 持久化数据目录（Volume 挂载点）
```
