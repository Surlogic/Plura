#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <professional-slug> [api-base-url]" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi

SLUG="$1"
API_BASE_URL="${2:-http://localhost:3000}"
ESCAPED_SLUG="${SLUG//\'/\'\'}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ ! -f "${BACKEND_DIR}/.env" ]]; then
  echo "Missing ${BACKEND_DIR}/.env" >&2
  exit 1
fi

set -a
source "${BACKEND_DIR}/.env"
set +a

PG_URL="${SPRING_DATASOURCE_URL#jdbc:}"
PSQL_URL="postgresql://${SPRING_DATASOURCE_USERNAME}@${PG_URL#postgresql://}"

DB_PROFILE_ID="$(PGPASSWORD="${SPRING_DATASOURCE_PASSWORD}" \
  psql "${PSQL_URL}" -At -c \
  "SELECT id::text FROM professional_profile WHERE slug = '${ESCAPED_SLUG}' LIMIT 1;")"

if [[ -z "${DB_PROFILE_ID}" ]]; then
  echo "FAIL: professional slug not found in DB (${SLUG})." >&2
  exit 2
fi

DB_ACTIVE_SERVICES="$(
  PGPASSWORD="${SPRING_DATASOURCE_PASSWORD}" \
    psql "${PSQL_URL}" -At -c \
      "SELECT s.id
       FROM professional_service s
       JOIN professional_profile p ON p.id = s.professional_id
       WHERE p.slug = '${ESCAPED_SLUG}' AND COALESCE(s.active, true) = true
       ORDER BY s.id;"
)"

DB_SCHEDULE_JSON="$(
  PGPASSWORD="${SPRING_DATASOURCE_PASSWORD}" \
    psql "${PSQL_URL}" -At -c \
      "SELECT COALESCE(schedule_json, '{\"days\":[],\"pauses\":[]}')
       FROM professional_profile
       WHERE slug = '${ESCAPED_SLUG}'
       LIMIT 1;"
)"

API_RESPONSE="$(curl -fsS "${API_BASE_URL}/public/profesionales/${SLUG}")"

API_SERVICE_IDS="$(echo "${API_RESPONSE}" | jq -r '.services[]?.id // empty' | sort || true)"
API_SCHEDULE_JSON="$(echo "${API_RESPONSE}" | jq -c '.schedule // {"days":[],"pauses":[]}' )"
DB_SCHEDULE_NORMALIZED="$(echo "${DB_SCHEDULE_JSON}" | jq -c '.')"

DB_SERVICE_SORTED="$(echo "${DB_ACTIVE_SERVICES}" | sed '/^$/d' | sort || true)"

echo "Professional ID: ${DB_PROFILE_ID}"
echo "Slug: ${SLUG}"
echo

if [[ "${DB_SERVICE_SORTED}" == "${API_SERVICE_IDS}" ]]; then
  echo "PASS: public services == active DB services"
else
  echo "FAIL: service mismatch (DB active vs API public)" >&2
  echo "DB active services:"
  echo "${DB_SERVICE_SORTED:-<none>}"
  echo "API public services:"
  echo "${API_SERVICE_IDS:-<none>}"
  exit 3
fi

if [[ "${DB_SCHEDULE_NORMALIZED}" == "${API_SCHEDULE_JSON}" ]]; then
  echo "PASS: public schedule matches professional_profile.schedule_json"
else
  echo "FAIL: schedule mismatch (DB vs API)" >&2
  echo "DB schedule:"
  echo "${DB_SCHEDULE_NORMALIZED}"
  echo "API schedule:"
  echo "${API_SCHEDULE_JSON}"
  exit 4
fi

echo "PASS: integrity checks completed for ${SLUG}"
