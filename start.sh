#!/usr/bin/env bash
# If invoked through `sh`, switch to bash before running bash-specific syntax.

set -u

PORT="${PORT:-9002}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${PORT}}"
MAX_RESTARTS="${MAX_RESTARTS:-3}"
STARTUP_TIMEOUT="${STARTUP_TIMEOUT:-20}"
CHECK_INTERVAL="${CHECK_INTERVAL:-2}"

kill_port_processes() {
  local pids

  pids="$(lsof -ti tcp:${PORT} -sTCP:LISTEN 2>/dev/null || true)"
  if [ -z "${pids}" ]; then
    return
  fi

  kill ${pids} 2>/dev/null || true
  sleep 1

  pids="$(lsof -ti tcp:${PORT} -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "${pids}" ]; then
    kill -9 ${pids} 2>/dev/null || true
  fi
}

wait_for_frontend() {
  local frontend_pid="$1"
  local elapsed=0

  while [ "${elapsed}" -lt "${STARTUP_TIMEOUT}" ]; do
    if curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; then
      echo "Frontend is healthy at ${HEALTH_URL} (pid: ${frontend_pid})"
      return 0
    fi

    if ! kill -0 "${frontend_pid}" >/dev/null 2>&1; then
      return 1
    fi

    sleep "${CHECK_INTERVAL}"
    elapsed=$((elapsed + CHECK_INTERVAL))
  done

  return 1
}

cd frontend
mkdir -p ./logs
npm install

attempt=1
while [ "${attempt}" -le "${MAX_RESTARTS}" ]; do
  kill_port_processes
  nohup npm run dev > ./logs/dev-frontend.log 2>&1 &
  frontend_pid=$!

  if wait_for_frontend "${frontend_pid}"; then
    exit 0
  fi

  echo "Frontend health check failed on attempt ${attempt}/${MAX_RESTARTS}, restarting..."
  kill_port_processes
  attempt=$((attempt + 1))
done

echo "Frontend failed to become healthy after ${MAX_RESTARTS} attempts. Check frontend/logs/dev-frontend.log." >&2
exit 1
