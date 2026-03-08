#!/bin/bash
# ─────────────────────────────────────────────────────────────
# MySQL 恢复脚本
# 用法: ./restore.sh <备份文件路径>
# 示例: ./restore.sh backup/cccode_20240101_020000.sql.gz
# ─────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ $# -lt 1 ]; then
    echo "用法: $0 <备份文件路径>"
    echo "示例: $0 backup/cccode_20240101_020000.sql.gz"
    echo ""
    echo "可用备份:"
    ls -lh "$SCRIPT_DIR/backup/"*.sql.gz 2>/dev/null || echo "  无备份文件"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "错误: 备份文件不存在: $BACKUP_FILE"
    exit 1
fi

# 加载环境变量
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

CONTAINER_NAME="${MYSQL_CONTAINER:-cccode-mysql}"
DB_NAME="${MYSQL_DATABASE:-cccode}"
DB_USER="${MYSQL_USER:-cccode}"
DB_PASSWORD="${MYSQL_PASSWORD:-CCcode@2024}"

echo "⚠️  即将恢复数据库 '$DB_NAME'，当前数据将被覆盖！"
read -p "确认恢复？(y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "已取消"
    exit 0
fi

echo "[$(date)] 开始恢复数据库: $DB_NAME ..."
echo "[$(date)] 备份文件: $BACKUP_FILE"

gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" \
    mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"

echo "[$(date)] 数据库恢复完成"
