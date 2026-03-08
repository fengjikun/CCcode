#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# DeepexiOS 升级脚本：SQLite → MySQL 全量数据迁移
#
# 功能：
#   1. 检查前置条件（MySQL 可达、SQLite 文件存在）
#   2. 备份 SQLite 数据库
#   3. 在 MySQL 上执行 Alembic migration 创建表结构
#   4. 从 SQLite 读取全部数据，写入 MySQL
#   5. 验证迁移结果
#   6. 更新 .env 配置
#
# 用法：
#   ./scripts/upgrade_to_mysql.sh                     # 交互模式
#   ./scripts/upgrade_to_mysql.sh --yes               # 跳过确认
#   ./scripts/upgrade_to_mysql.sh --env deploy/.env   # 指定 env 文件
#
# 环境变量（也可通过 .env 文件设置）：
#   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
#   SQLITE_PATH  —  SQLite 文件路径（默认 backend/data/devicedb.sqlite）
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── 颜色输出 ───────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

# ─── 参数解析 ───────────────────────────────────────────────────────────────
AUTO_YES=false
ENV_FILE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --yes|-y)   AUTO_YES=true; shift ;;
        --env)      ENV_FILE="$2"; shift 2 ;;
        -h|--help)
            echo "用法: $0 [--yes] [--env <env_file>]"
            echo ""
            echo "选项:"
            echo "  --yes, -y     跳过所有确认提示"
            echo "  --env FILE    指定 .env 文件路径"
            exit 0
            ;;
        *) fail "未知参数: $1" ;;
    esac
done

# ─── 定位项目根目录 ─────────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

# ─── 加载环境变量 ───────────────────────────────────────────────────────────
if [ -n "$ENV_FILE" ]; then
    if [ ! -f "$ENV_FILE" ]; then
        fail "指定的 env 文件不存在: $ENV_FILE"
    fi
    info "加载环境变量: $ENV_FILE"
    set -a; source "$ENV_FILE"; set +a
elif [ -f "$BACKEND_DIR/.env" ]; then
    info "加载环境变量: $BACKEND_DIR/.env"
    set -a; source "$BACKEND_DIR/.env"; set +a
fi

# ─── MySQL 连接参数 ─────────────────────────────────────────────────────────
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-cccode}"
DB_PASSWORD="${DB_PASSWORD:-CCcode@2024}"
DB_NAME="${DB_NAME:-cccode}"
SQLITE_PATH="${SQLITE_PATH:-$BACKEND_DIR/data/devicedb.sqlite}"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  DeepexiOS 数据库升级：SQLite → MySQL"
echo "═══════════════════════════════════════════════════════════"
echo ""
info "SQLite 路径 : $SQLITE_PATH"
info "MySQL 目标  : ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo ""

# ─── 前置检查 ───────────────────────────────────────────────────────────────
# 检查 SQLite 文件
if [ ! -f "$SQLITE_PATH" ]; then
    fail "SQLite 文件不存在: $SQLITE_PATH"
fi
ok "SQLite 文件存在 ($(du -h "$SQLITE_PATH" | cut -f1))"

# 检查 Python 依赖
cd "$BACKEND_DIR"
python -c "import pymysql" 2>/dev/null || fail "缺少 pymysql 依赖，请先执行: pip install -r requirements.txt"
ok "Python 依赖已就绪"

# 检查 MySQL 连通性
python -c "
import pymysql
try:
    conn = pymysql.connect(host='${DB_HOST}', port=${DB_PORT}, user='${DB_USER}', password='${DB_PASSWORD}', database='${DB_NAME}', charset='utf8mb4')
    conn.close()
    print('connected')
except Exception as e:
    print(f'FAIL:{e}')
    exit(1)
" || fail "无法连接 MySQL (${DB_HOST}:${DB_PORT})，请检查 MySQL 是否已启动并确认连接信息正确"
ok "MySQL 连接成功"

# ─── 确认 ───────────────────────────────────────────────────────────────────
if [ "$AUTO_YES" != "true" ]; then
    echo ""
    warn "即将执行以下操作："
    echo "  1. 备份 SQLite 数据库"
    echo "  2. 在 MySQL 中创建/更新表结构（Alembic）"
    echo "  3. 迁移全部数据到 MySQL"
    echo "  4. 更新 .env 配置为 DB_TYPE=mysql"
    echo ""
    read -p "确认继续？(y/N): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "已取消"
        exit 0
    fi
fi

# ─── Step 1: 备份 SQLite ────────────────────────────────────────────────────
BACKUP_NAME="devicedb_$(date +%Y%m%d_%H%M%S)_pre_mysql.sqlite"
BACKUP_PATH="$BACKEND_DIR/data/$BACKUP_NAME"
cp "$SQLITE_PATH" "$BACKUP_PATH"
ok "SQLite 已备份: $BACKUP_PATH"

# ─── Step 2: Alembic migration on MySQL ─────────────────────────────────────
info "在 MySQL 上执行 Alembic migration ..."
DB_TYPE=mysql DB_HOST="$DB_HOST" DB_PORT="$DB_PORT" DB_USER="$DB_USER" DB_PASSWORD="$DB_PASSWORD" DB_NAME="$DB_NAME" \
    python -c "
from alembic.config import Config
from alembic import command
from pathlib import Path

cfg = Config(str(Path('alembic.ini')))
command.upgrade(cfg, 'head')
print('Alembic migration 完成')
"
ok "MySQL 表结构已创建"

# ─── Step 3: 数据迁移 ───────────────────────────────────────────────────────
info "开始迁移数据 ..."

DB_TYPE=mysql DB_HOST="$DB_HOST" DB_PORT="$DB_PORT" DB_USER="$DB_USER" DB_PASSWORD="$DB_PASSWORD" DB_NAME="$DB_NAME" \
    python "$PROJECT_ROOT/scripts/migrate_sqlite_to_mysql.py" \
        --sqlite-path "$SQLITE_PATH"

# ─── Step 4: 更新 .env ─────────────────────────────────────────────────────
ENV_TARGET="$BACKEND_DIR/.env"
if [ -f "$ENV_TARGET" ]; then
    # 更新 DB_TYPE
    if grep -q "^DB_TYPE=" "$ENV_TARGET"; then
        sed -i 's/^DB_TYPE=.*/DB_TYPE=mysql/' "$ENV_TARGET"
    else
        echo "" >> "$ENV_TARGET"
        echo "DB_TYPE=mysql" >> "$ENV_TARGET"
    fi
    # 确保 DB_HOST 等配置存在
    for var in DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME; do
        if ! grep -q "^${var}=" "$ENV_TARGET"; then
            eval "val=\${$var}"
            echo "${var}=${val}" >> "$ENV_TARGET"
        fi
    done
    ok ".env 已更新: DB_TYPE=mysql"
fi

# ─── 完成 ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "  ${GREEN}升级完成！${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
info "SQLite 备份: $BACKUP_PATH"
info "现在可以重启应用: DB_TYPE=mysql uvicorn app.main:app --host 0.0.0.0 --port 9000"
echo ""
