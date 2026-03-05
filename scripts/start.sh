#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

BACKEND_PID=""
FRONTEND_PID=""

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
