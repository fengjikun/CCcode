#!/usr/bin/env bash
# If invoked through `sh`, switch to bash before running bash-specific syntax.
if [ -z "${BASH_VERSION:-}" ]; then
    exec /usr/bin/env bash "$0" "$@"
fi

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$SCRIPT_DIR/scripts/start.sh" docker up "$SCRIPT_DIR/deploy/.env"
