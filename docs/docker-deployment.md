# Docker 启动与部署说明

本文档说明如何通过统一脚本 `scripts/start.sh` 管理 Docker 部署。

## 前置条件

- 已安装 Docker
- 已安装 `docker-compose`（或 `docker compose`）

## 环境变量准备

首次部署前执行：

```bash
cp deploy/.env.example deploy/.env
```

按需填写以下变量（可留空）：

- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`

## 启动服务

推荐使用统一脚本：

```bash
./scripts/start.sh docker
```

等价命令：

```bash
./scripts/start.sh docker up deploy/.env
```

## 查看状态与日志

```bash
./scripts/start.sh docker ps deploy/.env
./scripts/start.sh docker logs deploy/.env
```

## 停止服务

```bash
./scripts/start.sh docker down deploy/.env
```

## 访问地址

- 应用入口（前端 + API）：`http://localhost:9000`
- API 文档：`http://localhost:9000/docs`

## 数据持久化

- 宿主机目录：`./backend/data`
- 容器目录：`/app/backend/data`
- SQLite 文件：`/app/backend/data/devicedb.sqlite`
