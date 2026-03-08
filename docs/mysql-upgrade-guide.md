# MySQL 部署与运维指南

> **注意**：本项目已移除 SQLite 支持，MySQL 是唯一的数据库。
> 代码升级相关流程请参阅 **[server-upgrade-guide.md](./server-upgrade-guide.md)**。

---

## 1. 部署 MySQL

提供两种方式，按需选择。

### 方式一：docker-compose 一体化部署（推荐）

项目根目录的 `docker-compose.yml` 包含应用 + MySQL 两个服务，MySQL 会自动启动：

```bash
cp deploy/.env.example deploy/.env
# 编辑 deploy/.env，按需修改密码

docker compose --env-file deploy/.env up -d
```

### 方式二：使用已有 MySQL 实例

确保满足：
- 版本 5.7+ 或 8.0+
- 字符集 `utf8mb4`，排序规则 `utf8mb4_unicode_ci`
- 应用用户拥有目标数据库的 `ALL PRIVILEGES`

创建数据库（如尚未创建）：

```sql
CREATE DATABASE cccode CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cccode'@'%' IDENTIFIED BY 'CCcode@2024';
GRANT ALL PRIVILEGES ON cccode.* TO 'cccode'@'%';
FLUSH PRIVILEGES;
```

然后在 `backend/.env` 中配置连接信息：

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=cccode
DB_PASSWORD=CCcode@2024
DB_NAME=cccode
```

---

## 2. 环境变量说明

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DB_HOST` | `127.0.0.1` | MySQL 地址（Docker 内用 `cccode-mysql`） |
| `DB_PORT` | `3306` | MySQL 端口 |
| `DB_USER` | `cccode` | 数据库用户名 |
| `DB_PASSWORD` | `CCcode@2024` | 数据库密码 |
| `DB_NAME` | `cccode` | 数据库名 |
| `MYSQL_IMAGE` | `mysql:8.0` | MySQL 容器镜像（国内可改为镜像站） |
| `MYSQL_ROOT_PASSWORD` | `CCcode@root2024` | MySQL root 密码（仅 Docker 部署） |
| `MYSQL_PORT` | `3306` | MySQL 宿主机映射端口 |

---

## 3. 备份与恢复

### 备份

```bash
cd deploy/mysql

# 立即备份（默认保留 7 天旧备份）
./backup.sh

# 指定保留 30 天
./backup.sh 30
```

备份文件保存在 `deploy/mysql/backup/`，格式为 `cccode_<时间戳>.sql.gz`。

### 定时备份

```bash
crontab -e

# 每天凌晨 2 点自动备份，保留 7 天
0 2 * * * /path/to/deploy/mysql/backup.sh 7 >> /var/log/cccode-backup.log 2>&1
```

### 恢复

```bash
cd deploy/mysql

# 查看可用备份
ls -lh backup/

# 恢复指定备份（会提示确认）
./restore.sh backup/cccode_20260308_020000.sql.gz
```

---

## 4. 生产环境注意事项

1. **修改所有默认密码** — `MYSQL_ROOT_PASSWORD`、`DB_PASSWORD`、`AUTH_SECRET_KEY`
2. **不暴露 3306 端口** — 生产环境移除 `docker-compose.yml` 中的 MySQL ports 映射，或使用防火墙限制
3. **配置定时备份** — 参考第 3 节设置 crontab
4. **调整 InnoDB 缓冲池** — 编辑 `deploy/mysql/conf/my.cnf`，将 `innodb_buffer_pool_size` 设为可用内存的 50-70%
5. **监控慢查询** — 慢查询日志默认开启（阈值 2 秒），容器内路径 `/var/lib/mysql/slow.log`

---

## 5. 故障排查

| 现象 | 解决方案 |
|------|----------|
| MySQL 容器启动失败 | `docker logs cccode-mysql` 检查日志，常见原因：端口冲突、磁盘空间不足 |
| 应用连接 MySQL 失败 | 检查 `.env` 中的连接信息；Docker 内部用 `cccode-mysql`，宿主机用 `127.0.0.1` |
| `Unknown column` 错误 | 未执行数据库迁移，运行 `cd backend && alembic upgrade head` |
| Alembic 迁移报错 | 参考 [server-upgrade-guide.md](./server-upgrade-guide.md) 故障排查章节 |

---

## 6. 相关文件

| 文件 | 说明 |
|------|------|
| `deploy/mysql/conf/my.cnf` | MySQL 配置 |
| `deploy/mysql/backup.sh` | 备份脚本 |
| `deploy/mysql/restore.sh` | 恢复脚本 |
| `deploy/mysql/initdb/01-init.sql` | 初始化 SQL |
| `deploy/.env.example` | 环境变量模板 |
| `backend/app/database.py` | 数据库连接配置 |
| `docs/server-upgrade-guide.md` | 服务器升级流程 |
