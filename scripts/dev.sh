#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
START_SCRIPT="$PROJECT_ROOT/scripts/start.sh"

usage() {
    cat <<EOF
用法:
  ./scripts/dev.sh
  ./scripts/dev.sh [start.sh dev 参数]

说明:
  独立的本地开发入口，不修改 start.sh。
  默认会调用: ./scripts/start.sh dev
EOF
}

case "${1:-}" in
    -h|--help|help)
        usage
        exit 0
        ;;
esac

if [ ! -f "$START_SCRIPT" ]; then
    echo "错误: 未找到 $START_SCRIPT"
    exit 1
fi

exec "$START_SCRIPT" dev "$@"
