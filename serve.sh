#!/usr/bin/env bash
set -e

PORT="${1:-8080}"
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
    echo "需要 python3 才能启动本地服务" >&2
    exit 1
fi

echo "本地服务：http://localhost:${PORT}/"
exec python3 -m http.server "${PORT}"
