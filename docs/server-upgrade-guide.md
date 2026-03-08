# 服务器升级指南

本文档描述如何在已部署的服务器上升级 DeepexiOS 平台代码，确保数据库结构与新代码同步。

---

## 升级流程概览

```
拉取最新代码 → 停止服务 → 备份数据库 → 执行 Alembic 迁移 → 重建并启动服务 → 验证
```

> **核心要点**：每次代码更新后，必须执行 `alembic upgrade head` 将数据库 schema 升级到最新版本。
> 新代码中的 Model 可能包含新增字段或索引变更，若跳过此步骤，应用启动后查询将报错（如 `Unknown column`）。

---

## 1. 拉取最新代码

```bash
cd /path/to/CCcode
git pull origin master    # 或对应的部署分支
```

## 2. 停止当前服务

### Docker 部署

```bash
docker compose --env-file deploy/.env down
```

### 裸机部署

```bash
# 停止 uvicorn 进程
kill $(lsof -t -i :9000)
```

## 3. 备份 MySQL 数据库

升级前务必备份，万一迁移异常可快速回滚。

```bash
# 方式一：使用项目自带备份脚本
cd deploy/mysql && ./backup.sh

# 方式二：手动 mysqldump
mysqldump -h 127.0.0.1 -P 3306 -u cccode -p'CCcode@2024' cccode | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

## 4. 执行数据库迁移（关键步骤）

```bash
cd backend

# 查看当前数据库版本
alembic current

# 查看待执行的迁移
alembic history --indicate-current

# 执行迁移
alembic upgrade head
```

**常见迁移内容示例：**
- 新增字段（如 `pm_projects.sort_order`）
- 新增表
- 新增索引或约束
- 数据初始化（如设置默认排序值）

**如果迁移失败：**

```bash
# 查看详细错误
alembic upgrade head --sql    # 仅打印 SQL，不执行

# 手动检查 MySQL 当前状态
mysql -u cccode -p cccode -e "DESCRIBE pm_projects;"

# 若需回退到上一版本
alembic downgrade -1
```

## 5. 重建并启动服务

### Docker 部署（推荐）

```bash
cd /path/to/CCcode

# 重建镜像并启动（包含前后端）
docker compose --env-file deploy/.env up -d --build

# 查看启动日志
docker compose --env-file deploy/.env logs -f app
```

### 裸机部署

```bash
# 后端
cd backend
pip install -r requirements.txt    # 安装可能新增的依赖
uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload &

# 前端（如需重新构建）
cd frontend
npm install && npm run build
```

## 6. 验证升级结果

```bash
# 检查应用健康
curl -s http://localhost:9000/docs | head -3

# 检查 API 正常响应
curl -s http://localhost:9000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123456"}'

# 检查数据库版本与代码一致
cd backend && alembic current
```

---

## 快速参考：一键升级命令

适用于 Docker 部署的服务器，可直接复制执行：

```bash
cd /path/to/CCcode

# 1. 拉取代码
git pull origin master

# 2. 备份数据库
cd deploy/mysql && ./backup.sh && cd ../..

# 3. 执行数据库迁移
cd backend && alembic upgrade head && cd ..

# 4. 重建并启动
docker compose --env-file deploy/.env up -d --build

# 5. 查看日志确认启动正常
docker compose --env-file deploy/.env logs -f app
```

---

## 注意事项

1. **不要跳过 Alembic 迁移** — 这是最常见的升级故障原因。代码中的 SQLAlchemy Model 变更（新字段、新表）必须通过 `alembic upgrade head` 同步到数据库，否则运行时会报 `Unknown column` 等错误。

2. **Docker 容器启动时也会自动执行迁移** — `main.py` 中包含启动时自动 `alembic upgrade head` 的逻辑，但建议在启动前手动执行一次以便观察迁移输出，确认无异常。

3. **迁移是增量的** — Alembic 会记录已执行的版本号（存储在 `alembic_version` 表中），只执行未运行过的迁移脚本，可安全重复执行。

4. **环境变量** — 确保 `backend/.env` 中的 MySQL 连接信息（`DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD`、`DB_NAME`）正确，Alembic 读取同一份配置。

5. **前端变更** — 如果本次升级包含前端代码变更，Docker 部署时 `--build` 会自动重新构建前端。裸机部署需手动 `npm run build`。

---

## 故障排查

| 现象 | 原因 | 解决方案 |
|------|------|----------|
| `Unknown column 'xxx' in 'field list'` | 数据库未执行迁移 | `cd backend && alembic upgrade head` |
| `Target database is not up to date` | 有未执行的迁移 | `alembic upgrade head` |
| `Can't connect to MySQL server` | MySQL 未启动或连接信息错误 | 检查 MySQL 服务状态和 `.env` 配置 |
| `Alembic revision not found` | 迁移文件缺失（代码未拉取完整） | `git pull` 确保代码完整 |
| 容器启动后立即退出 | 启动时自动迁移失败 | `docker logs cccode-app` 查看详细错误 |
