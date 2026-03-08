# MySQL 升级指南

本文档描述如何将 DeepexiOS 平台从 SQLite 升级到 MySQL，包括 MySQL 部署、数据迁移和验证。

---

## 1. 前置条件

| 依赖 | 要求 | 说明 |
|------|------|------|
| Docker | 20.x+ | 运行 MySQL 容器 |
| Python | 3.10+ | 执行迁移脚本 |
| pymysql | 已包含在 `requirements.txt` | MySQL 驱动 |
| 现有 SQLite 数据库 | `backend/data/devicedb.sqlite` | 迁移数据来源 |

---

## 2. 部署 MySQL

提供三种方式，按需选择。

### 方式一：主 docker-compose 一体化部署（推荐）

通过 `--profile mysql` 同时启动应用 + MySQL：

```bash
# 1. 准备环境变量
cp deploy/.env.example deploy/.env

# 2. 编辑 deploy/.env，设置数据库配置
DB_TYPE=mysql
MYSQL_IMAGE=docker.m.daocloud.io/mysql:8.0
DB_HOST=cccode-mysql
DB_PORT=3306
DB_USER=cccode
DB_PASSWORD=CCcode@2024
DB_NAME=cccode
MYSQL_ROOT_PASSWORD=CCcode@root2024

# 3. 启动
docker compose --env-file deploy/.env --profile mysql up -d

# 4. 确认 MySQL 健康
docker compose ps
# cccode-mysql 状态应为 healthy
```

### 方式二：独立部署 MySQL 容器

适用于 MySQL 运行在单独服务器或需要独立管理的场景：

```bash
cd deploy/mysql

# 1. 编辑 .env 配置密码
vim .env

# 2. 启动
docker compose -f docker-compose.mysql.yml --env-file .env up -d

# 3. 验证
docker exec -it cccode-mysql mysql -ucccode -p'CCcode@2024' cccode -e "SELECT 1"
```

### 方式三：使用已有 MySQL 实例

若已有外部 MySQL，确保满足：
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

---

## 3. 执行升级（一键脚本）

升级脚本会自动完成：备份 SQLite → 创建 MySQL 表结构 → 迁移数据 → 验证 → 更新配置。

### 3.1 配置 MySQL 连接

编辑 `backend/.env`，填写 MySQL 连接信息（此时 `DB_TYPE` 保持 `sqlite`，脚本执行完毕后会自动改为 `mysql`）：

```env
DB_HOST=127.0.0.1    # MySQL 地址（Docker 内部署用 cccode-mysql）
DB_PORT=3306
DB_USER=cccode
DB_PASSWORD=CCcode@2024
DB_NAME=cccode
```

### 3.2 运行升级脚本

```bash
# 交互模式（会提示确认）
./scripts/upgrade_to_mysql.sh

# 跳过确认（适合自动化流程）
./scripts/upgrade_to_mysql.sh --yes

# 使用指定 env 文件
./scripts/upgrade_to_mysql.sh --env deploy/.env
```

### 3.3 脚本执行流程

```
Step 1  检查前置条件
        ├─ SQLite 文件是否存在
        ├─ pymysql 依赖是否安装
        └─ MySQL 是否可连通

Step 2  备份 SQLite
        └─ 复制为 backend/data/devicedb_<时间戳>_pre_mysql.sqlite

Step 3  Alembic migration
        └─ 在 MySQL 上创建全部表结构（28 张表）

Step 4  数据迁移
        ├─ 按外键依赖顺序逐表迁移
        ├─ 批量插入（500 条/批）
        └─ 迁移前清空目标表（幂等，可重复执行）

Step 5  数据验证
        └─ 逐表对比 SQLite 与 MySQL 行数，确保一致

Step 6  更新 .env
        └─ 自动将 DB_TYPE 设为 mysql
```

### 3.4 示例输出

```
═══════════════════════════════════════════════════════════
  DeepexiOS 数据库升级：SQLite → MySQL
═══════════════════════════════════════════════════════════

[INFO]  SQLite 路径 : backend/data/devicedb.sqlite
[INFO]  MySQL 目标  : cccode@127.0.0.1:3306/cccode

[OK]    SQLite 文件存在 (156K)
[OK]    Python 依赖已就绪
[OK]    MySQL 连接成功
[OK]    SQLite 已备份: backend/data/devicedb_20260308_120000_pre_mysql.sqlite
[OK]    MySQL 表结构已创建

────────────────────────────────────────────────────────────
  发现 28 个表需要迁移
────────────────────────────────────────────────────────────
  ✓ users                                  OK     1 行
  ✓ pm_projects                            OK     19 行
  ✓ pm_schema_configs                      OK     19 行
  ...（其余表）
────────────────────────────────────────────────────────────
  总计: 28 个表成功, 0 个失败, 39 行数据已迁移
────────────────────────────────────────────────────────────

  ✓ 数据验证通过：所有表行数一致

═══════════════════════════════════════════════════════════
  升级完成！
═══════════════════════════════════════════════════════════
```

---

## 4. 重启应用

升级完成后，重启应用使其连接 MySQL：

```bash
# Docker 部署
docker compose --env-file deploy/.env --profile mysql up -d

# 本地开发
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload
```

验证应用是否正常：

```bash
# 检查健康状态
curl -s http://localhost:9000/docs | head -5

# 检查日志中数据库连接
docker logs cccode-app 2>&1 | grep "schema 已升级"
```

---

## 5. 仅检查（Dry Run）

如需在迁移前确认数据量，可以单独运行迁移脚本的 dry-run 模式：

```bash
cd backend
DB_TYPE=mysql DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=cccode DB_PASSWORD=CCcode@2024 DB_NAME=cccode \
    python ../scripts/migrate_sqlite_to_mysql.py \
        --sqlite-path data/devicedb.sqlite \
        --dry-run
```

输出每张表的行数但不执行任何写入。

---

## 6. 回滚

如果升级后遇到问题，可以快速回滚到 SQLite：

```bash
# 1. 修改 backend/.env
#    将 DB_TYPE=mysql 改回 DB_TYPE=sqlite

# 2. 重启应用
docker compose --env-file deploy/.env up -d
# 或本地重启 uvicorn
```

SQLite 备份文件位于 `backend/data/devicedb_*_pre_mysql.sqlite`，原数据不受影响。

---

## 7. 环境变量说明

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DB_TYPE` | `sqlite` | 数据库类型：`sqlite` 或 `mysql` |
| `DB_HOST` | `127.0.0.1` | MySQL 地址（Docker 内用 `cccode-mysql`） |
| `DB_PORT` | `3306` | MySQL 端口 |
| `DB_USER` | `cccode` | 数据库用户名 |
| `DB_PASSWORD` | `CCcode@2024` | 数据库密码 |
| `DB_NAME` | `cccode` | 数据库名 |
| `MYSQL_IMAGE` | `docker.m.daocloud.io/mysql:8.0` | MySQL 容器镜像（国内网络建议使用镜像站） |
| `MYSQL_ROOT_PASSWORD` | `CCcode@root2024` | MySQL root 密码（仅 Docker 部署时使用） |
| `MYSQL_PORT` | `3306` | MySQL 宿主机映射端口 |
| `SQLITE_PATH` | `backend/data/devicedb.sqlite` | 升级脚本使用的 SQLite 文件路径 |

---

## 8. 备份与恢复（MySQL）

### 手动备份

```bash
cd deploy/mysql

# 立即备份（默认保留 7 天旧备份）
./backup.sh

# 指定保留 30 天
./backup.sh 30
```

备份文件保存在 `deploy/mysql/backup/` 目录，格式为 `cccode_<时间戳>.sql.gz`。

### 定时备份

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 2 点自动备份，保留 7 天
0 2 * * * /path/to/deploy/mysql/backup.sh 7 >> /var/log/cccode-backup.log 2>&1
```

### 恢复数据

```bash
cd deploy/mysql

# 查看可用备份
ls -lh backup/

# 恢复指定备份（会提示确认）
./restore.sh backup/cccode_20260308_020000.sql.gz
```

---

## 9. 数据挂载

MySQL 数据通过 Docker named volume 持久化：

```bash
# 查看 volume
docker volume inspect cccode-mysql-data

# 数据实际存储路径
/var/lib/docker/volumes/cccode-mysql-data/_data/
```

MySQL 配置文件挂载：`deploy/mysql/conf/my.cnf` → 容器内 `/etc/mysql/conf.d/custom.cnf`

---

## 10. 生产环境注意事项

1. **修改所有默认密码** — `MYSQL_ROOT_PASSWORD`、`DB_PASSWORD`、`AUTH_SECRET_KEY`
2. **不暴露 3306 端口** — 生产环境移除 `docker-compose.yml` 中的 MySQL ports 映射，或使用防火墙限制
3. **配置定时备份** — 参考第 8 节设置 crontab
4. **调整 InnoDB 缓冲池** — 编辑 `deploy/mysql/conf/my.cnf`，将 `innodb_buffer_pool_size` 设为可用内存的 50-70%
5. **监控慢查询** — 慢查询日志默认开启（阈值 2 秒），容器内路径 `/var/lib/mysql/slow.log`
6. **迁移脚本幂等** — 可安全重复执行 `upgrade_to_mysql.sh`，每次会先清空 MySQL 表再重新导入

---

## 11. 故障排查

### MySQL 容器启动失败

```bash
docker logs cccode-mysql
# 常见原因：端口冲突、磁盘空间不足、配置文件语法错误
```

### 迁移脚本连接失败

```
[FAIL] 无法连接 MySQL (127.0.0.1:3306)
```

检查：
- MySQL 容器是否已启动且状态为 healthy
- Docker 网络内使用容器名 `cccode-mysql`，宿主机使用 `127.0.0.1`
- 防火墙是否放行 3306 端口

### 迁移后部分表数据为空

若 SQLite 中某些表原本就无数据，这是正常现象。可用 dry-run 模式核实：

```bash
python ../scripts/migrate_sqlite_to_mysql.py --sqlite-path data/devicedb.sqlite --dry-run
```

### Alembic 迁移报错

```bash
# 手动在 MySQL 上执行迁移
cd backend
DB_TYPE=mysql alembic upgrade head
```

---

## 12. 相关文件

| 文件 | 说明 |
|------|------|
| `scripts/upgrade_to_mysql.sh` | 一键升级脚本 |
| `scripts/migrate_sqlite_to_mysql.py` | 数据迁移 Python 脚本 |
| `deploy/mysql/docker-compose.mysql.yml` | MySQL 独立部署 compose |
| `deploy/mysql/conf/my.cnf` | MySQL 配置 |
| `deploy/mysql/backup.sh` | 备份脚本 |
| `deploy/mysql/restore.sh` | 恢复脚本 |
| `deploy/mysql/initdb/01-init.sql` | 初始化 SQL |
| `deploy/.env.example` | 环境变量模板 |
| `backend/app/database.py` | 数据库连接（支持 SQLite/MySQL 切换） |
