#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

set -a
source "$ROOT_DIR/.env"
set +a

if [[ -z "${SPRING_DATASOURCE_URL:-}" || -z "${SPRING_DATASOURCE_USERNAME:-}" || -z "${SPRING_DATASOURCE_PASSWORD:-}" ]]; then
  echo "Faltan credenciales de base en backend-java/.env" >&2
  exit 1
fi

export PGPASSWORD="$SPRING_DATASOURCE_PASSWORD"

psql "${SPRING_DATASOURCE_URL#jdbc:}" \
  -U "$SPRING_DATASOURCE_USERNAME" \
  -f "$ROOT_DIR/scripts/qa_review_bookings_german_admin.sql"
