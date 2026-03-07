#!/usr/bin/env bash
# If invoked through `sh`, switch to bash before running bash-specific syntax.
if [ -z "${BASH_VERSION:-}" ]; then
    exec /usr/bin/env bash "$0" "$@"
fi

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
DEFAULT_ENV_FILE="$PROJECT_ROOT/deploy/.env"
ENV_EXAMPLE_FILE="$PROJECT_ROOT/deploy/.env.example"

BACKEND_PID=""
FRONTEND_PID=""

usage() {
    cat <<EOF
用法:
  ./scripts/start.sh
  ./scripts/start.sh dev
  ./scripts/start.sh docker [up|down|logs|ps] [env_file]

示例:
  ./scripts/start.sh docker
  ./scripts/start.sh docker logs
  ./scripts/start.sh docker down
  ./scripts/start.sh docker up deploy/.env
EOF
}

resolve_path() {
    local path="$1"
    if [[ "$path" = /* ]]; then
        echo "$path"
    else
        echo "$PROJECT_ROOT/$path"
    fi
}

ensure_compose_cmd() {
    if command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD=(docker-compose)
        return
    fi
    if docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD=(docker compose)
        return
    fi
    echo "错误: 未检测到 docker-compose 或 docker compose 命令"
    exit 1
}

run_dev() {
    cleanup() {
        echo ""
        echo "正在停止服务..."
        [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
        [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
        wait 2>/dev/null
        echo "所有服务已停止"
    }
    trap cleanup EXIT INT TERM

    # 检查后端依赖
    if [ ! -f "$BACKEND_DIR/requirements.txt" ]; then
        echo "错误: 未找到 backend/requirements.txt"
        exit 1
    fi

    # 检查前端依赖
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo "前端依赖未安装，正在执行 npm install..."
        (cd "$FRONTEND_DIR" && npm install)
    fi

    # 启动后端 (FastAPI)
    echo "启动后端服务 (http://localhost:9000)..."
    (cd "$BACKEND_DIR" && uvicorn app.main:app --reload --host 0.0.0.0 --port 9000) &
    BACKEND_PID=$!

    # 加载 nvm（前端需要 Node 18+）
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    nvm use 22 2>/dev/null || echo "警告: 未找到 Node 22，使用当前版本"

    # 启动前端 (React + Vite)
    echo "启动前端服务 (http://localhost:9002)..."
    (cd "$FRONTEND_DIR" && npm run dev) &
    FRONTEND_PID=$!

    echo ""
    echo "====================================="
    echo "  后端: http://localhost:9000"
    echo "  前端: http://localhost:9002"
    echo "  API文档: http://localhost:9000/docs"
    echo "====================================="
    echo "按 Ctrl+C 停止所有服务"
    echo ""

    wait
}

run_docker() {
    local action="${1:-up}"
    local env_file_raw="${2:-$DEFAULT_ENV_FILE}"
    local env_file

    env_file="$(resolve_path "$env_file_raw")"
    ensure_compose_cmd

    case "$action" in
        up)
            if [ ! -f "$env_file" ]; then
                if [ -f "$ENV_EXAMPLE_FILE" ]; then
                    cp "$ENV_EXAMPLE_FILE" "$env_file"
                    echo "未找到环境文件，已自动创建: $env_file"
                else
                    echo "错误: 未找到环境文件 $env_file"
                    exit 1
                fi
            fi
            "${COMPOSE_CMD[@]}" --env-file "$env_file" up -d --build
            "${COMPOSE_CMD[@]}" --env-file "$env_file" ps
            ;;
        down)
            if [ -f "$env_file" ]; then
                "${COMPOSE_CMD[@]}" --env-file "$env_file" down
            else
                "${COMPOSE_CMD[@]}" down
            fi
            ;;
        logs)
            if [ -f "$env_file" ]; then
                "${COMPOSE_CMD[@]}" --env-file "$env_file" logs -f app
            else
                "${COMPOSE_CMD[@]}" logs -f app
            fi
            ;;
        ps)
            if [ -f "$env_file" ]; then
                "${COMPOSE_CMD[@]}" --env-file "$env_file" ps
            else
                "${COMPOSE_CMD[@]}" ps
            fi
            ;;
        *)
            echo "错误: 不支持的 docker 操作 '$action'"
            usage
            exit 1
            ;;
    esac
}

MODE="${1:-dev}"
case "$MODE" in
    dev)
        run_dev
        ;;
    docker)
        run_docker "${2:-up}" "${3:-$DEFAULT_ENV_FILE}"
        ;;
    -h|--help|help)
        usage
        ;;
    *)
        echo "错误: 不支持的模式 '$MODE'"
        usage
        exit 1
        ;;
esac
