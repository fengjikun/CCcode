#!/bin/bash
# ─────────────────────────────────────────────────────────────
# MySQL 备份脚本
# 用法: ./backup.sh [备份保留天数，默认 7]
# 可通过 crontab 定时执行:
#   0 2 * * * /path/to/deploy/mysql/backup.sh 7
# ─────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

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
BACKUP_DIR="$SCRIPT_DIR/backup"
RETAIN_DAYS="${1:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] 开始备份数据库: $DB_NAME ..."

# 通过 docker exec 执行 mysqldump，压缩后保存到宿主机
docker exec "$CONTAINER_NAME" \
    mysqldump \
    -u"$DB_USER" \
    -p"$DB_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    --set-gtid-purged=OFF \
    "$DB_NAME" \
    | gzip > "$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] 备份完成: $BACKUP_FILE ($FILESIZE)"

# 清理过期备份
DELETED=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +"$RETAIN_DAYS" -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
    echo "[$(date)] 已清理 $DELETED 个超过 ${RETAIN_DAYS} 天的旧备份"
fi

echo "[$(date)] 备份任务结束"
