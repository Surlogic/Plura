#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-3000}"

mapfile -t pids < <(
  ss -ltnp "sport = :${PORT}" 2>/dev/null \
    | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' \
    | sort -u
)

if [ "${#pids[@]}" -eq 0 ]; then
  exit 0
fi

for pid in "${pids[@]}"; do
  cmd="$(ps -p "${pid}" -o args= 2>/dev/null || true)"

  if [[ "${cmd}" == *"plurabackend"* || "${cmd}" == *"/backend-java/"* || "${cmd}" == *"next dev -p 3002"* || "${cmd}" == *"next-server"* || "${cmd}" == *"/apps/web/"* ]]; then
    echo "[predev] Terminando proceso previo en :${PORT} (pid ${pid})"
    kill "${pid}" || true
  fi
done
