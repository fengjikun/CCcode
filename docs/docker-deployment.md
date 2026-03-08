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

## 远端初始化导入（本地数据 -> 远端）

当你本地已有最新 `agent` / 本体数据（含 `backend/data/devicedb.sqlite` 与 `project_assets`）时，可使用：

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
