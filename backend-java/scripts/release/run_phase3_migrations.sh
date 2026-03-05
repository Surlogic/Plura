#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   SPRING_DATASOURCE_URL=... SPRING_DATASOURCE_USERNAME=... SPRING_DATASOURCE_PASSWORD=... \
#   backend-java/scripts/release/run_phase3_migrations.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB_DIR="${ROOT_DIR}/db"

if [[ -z "${SPRING_DATASOURCE_URL:-}" ]]; then
  echo "SPRING_DATASOURCE_URL is required"
  exit 1
fi

export PGPASSWORD="${SPRING_DATASOURCE_PASSWORD:-}"
PSQL=(psql "${SPRING_DATASOURCE_URL}" -v ON_ERROR_STOP=1)

if [[ -n "${SPRING_DATASOURCE_USERNAME:-}" ]]; then
  PSQL+=( -U "${SPRING_DATASOURCE_USERNAME}" )
fi

echo "[1/3] Applying baseline search scale prerequisites (idempotent)..."
"${PSQL[@]}" -f "${DB_DIR}/search_scale_foundation.sql"

echo "[2/3] Applying phase2 critical indexes (idempotent)..."
"${PSQL[@]}" -f "${DB_DIR}/phase2_critical_indexes_2026_03_05.sql"

echo "[3/3] Applying phase3 availability/cache migration (idempotent)..."
"${PSQL[@]}" -f "${DB_DIR}/phase3_cache_availability_2026_03_05.sql"

echo "Migration sequence completed successfully."
