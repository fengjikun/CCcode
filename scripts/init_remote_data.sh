#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEFAULT_LOCAL_DATA_DIR="$PROJECT_ROOT/backend/data"
DEFAULT_REMOTE_ENV_FILE="deploy/.env"

REMOTE_HOST=""
REMOTE_USER="root"
REMOTE_DIR=""
REMOTE_ENV_FILE="$DEFAULT_REMOTE_ENV_FILE"
LOCAL_DATA_DIR="$DEFAULT_LOCAL_DATA_DIR"
SSH_PORT=22
SSH_IDENTITY=""
DRY_RUN=0
AUTO_YES=0

usage() {
  cat <<'EOF'
用法:
  ./scripts/init_remote_data.sh \
    --host <remote_host> \
    --remote-dir <remote_project_dir> \
    [--user root] \
    [--port 22] \
    [--identity ~/.ssh/id_rsa] \
    [--local-data-dir backend/data] \
    [--remote-env-file deploy/.env] \
    [--dry-run] \
    [--yes]

功能:
  将本地 backend/data（含 sqlite + project_assets）导入远端部署目录。
  远端会先备份当前 backend/data，再覆盖导入，然后重启 Docker 服务。

示例:
  ./scripts/init_remote_data.sh \
    --host 172.31.32.239 \
    --user root \
    --remote-dir /opt/CCcode \
    --identity ~/.ssh/id_rsa \
    --yes
EOF
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "错误: 未找到命令 $cmd" >&2
    exit 1
  fi
}

die() {
  echo "错误: $*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      REMOTE_HOST="${2:-}"
      shift 2
      ;;
    --user)
      REMOTE_USER="${2:-}"
      shift 2
      ;;
    --remote-dir)
      REMOTE_DIR="${2:-}"
      shift 2
      ;;
    --remote-env-file)
      REMOTE_ENV_FILE="${2:-}"
      shift 2
      ;;
    --local-data-dir)
      if [[ "${2:-}" = /* ]]; then
        LOCAL_DATA_DIR="${2:-}"
      else
        LOCAL_DATA_DIR="$PROJECT_ROOT/${2:-}"
      fi
      shift 2
      ;;
    --port)
      SSH_PORT="${2:-}"
      shift 2
      ;;
    --identity)
      SSH_IDENTITY="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --yes|-y)
      AUTO_YES=1
      shift
      ;;
    -h|--help|help)
      usage
      exit 0
      ;;
    *)
      die "不支持的参数: $1"
      ;;
  esac
done

[[ -n "$REMOTE_HOST" ]] || die "请通过 --host 指定远端主机"
[[ -n "$REMOTE_DIR" ]] || die "请通过 --remote-dir 指定远端项目目录"
[[ -d "$LOCAL_DATA_DIR" ]] || die "本地数据目录不存在: $LOCAL_DATA_DIR"
[[ -f "$LOCAL_DATA_DIR/devicedb.sqlite" ]] || die "未找到数据库文件: $LOCAL_DATA_DIR/devicedb.sqlite"

require_cmd tar
require_cmd ssh
require_cmd scp

if [[ -n "$SSH_IDENTITY" && ! -f "$SSH_IDENTITY" ]]; then
  die "SSH 私钥不存在: $SSH_IDENTITY"
fi

ts="$(date +%F-%H%M%S)"
bundle_local="/tmp/cccode-data-${ts}.tar.gz"
bundle_remote="/tmp/cccode-data-${ts}.tar.gz"
remote_target="${REMOTE_USER}@${REMOTE_HOST}"

echo "== 数据初始化确认 =="
echo "本地数据目录: $LOCAL_DATA_DIR"
echo "远端主机: $remote_target:$SSH_PORT"
echo "远端项目目录: $REMOTE_DIR"
echo "远端环境文件: $REMOTE_ENV_FILE"
echo "临时打包文件: $bundle_local"
echo "模式: $([[ "$DRY_RUN" -eq 1 ]] && echo "dry-run" || echo "execute")"
echo ""

if [[ "$AUTO_YES" -ne 1 ]]; then
  read -r -p "将覆盖远端 backend/data，是否继续? [y/N] " ans
  if [[ ! "$ans" =~ ^[Yy]$ ]]; then
    echo "已取消。"
    exit 0
  fi
fi

echo "1) 打包本地数据..."
tar -C "$LOCAL_DATA_DIR" -czf "$bundle_local" .

SSH_OPTS=(-p "$SSH_PORT" -o StrictHostKeyChecking=accept-new)
SCP_OPTS=(-P "$SSH_PORT" -o StrictHostKeyChecking=accept-new)
if [[ -n "$SSH_IDENTITY" ]]; then
  SSH_OPTS+=(-i "$SSH_IDENTITY")
  SCP_OPTS+=(-i "$SSH_IDENTITY")
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "2) dry-run: 跳过上传与远端执行"
  echo "将执行: scp ${bundle_local} ${remote_target}:${bundle_remote}"
  echo "将执行: 在远端备份 backend/data -> backups/backend-data-<ts>.tar.gz，导入新数据并重启容器"
  rm -f "$bundle_local"
  exit 0
fi

echo "2) 上传数据包到远端..."
scp "${SCP_OPTS[@]}" "$bundle_local" "${remote_target}:${bundle_remote}"

echo "3) 远端备份+导入+重启服务..."
ssh "${SSH_OPTS[@]}" "$remote_target" bash -s -- "$REMOTE_DIR" "$REMOTE_ENV_FILE" "$bundle_remote" <<'EOF'
set -euo pipefail

REMOTE_DIR="$1"
REMOTE_ENV_FILE="$2"
REMOTE_BUNDLE="$3"
ts="$(date +%F-%H%M%S)"

cd "$REMOTE_DIR"

if [[ ! -f docker-compose.yml ]]; then
  echo "错误: $REMOTE_DIR 中未找到 docker-compose.yml" >&2
  exit 1
fi

mkdir -p backups
if [[ -d backend/data ]]; then
  tar -C backend -czf "backups/backend-data-${ts}.tar.gz" data
  echo "已备份旧数据: backups/backend-data-${ts}.tar.gz"
fi

mkdir -p backend/data
rm -rf backend/data/*
tar -xzf "$REMOTE_BUNDLE" -C backend/data
rm -f "$REMOTE_BUNDLE"

./scripts/start.sh docker down "$REMOTE_ENV_FILE" || true
./scripts/start.sh docker up "$REMOTE_ENV_FILE"
./scripts/start.sh docker ps "$REMOTE_ENV_FILE"
EOF

echo "4) 清理本地临时包..."
rm -f "$bundle_local"
echo "完成: 远端数据已初始化并重启服务。"
