#!/usr/bin/env bash
set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
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

LIMIT="${1:-500}"
if ! [[ "${LIMIT}" =~ ^[0-9]+$ ]]; then
  echo "Usage: $0 [limit]" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ ! -f "${BACKEND_DIR}/.env" ]]; then
  echo "Missing ${BACKEND_DIR}/.env" >&2
  exit 1
fi

set -a
source "${BACKEND_DIR}/.env"
set +a

MAPBOX_TOKEN="${NEXT_PUBLIC_MAPBOX_TOKEN:-}"
if [[ -z "${MAPBOX_TOKEN}" ]]; then
  echo "NEXT_PUBLIC_MAPBOX_TOKEN is required (export it before running)." >&2
  exit 1
fi

PG_URL="${SPRING_DATASOURCE_URL#jdbc:postgresql://}"
PSQL_URL="postgresql://${SPRING_DATASOURCE_USERNAME}@${PG_URL}"

readarray -t ROWS < <(
  PGPASSWORD="${SPRING_DATASOURCE_PASSWORD}" psql "${PSQL_URL}" -At -F $'\t' -c "
    SELECT id::text, COALESCE(NULLIF(location_text, ''), location)
    FROM professional_profile
    WHERE COALESCE(NULLIF(location_text, ''), location) IS NOT NULL
      AND btrim(COALESCE(NULLIF(location_text, ''), location)) <> ''
      AND (latitude IS NULL OR longitude IS NULL OR geom IS NULL)
    ORDER BY id
    LIMIT ${LIMIT};
  "
)

if [[ ${#ROWS[@]} -eq 0 ]]; then
  echo "No profiles pending geocoding."
  exit 0
fi

ok=0
failed=0
skipped=0

for row in "${ROWS[@]}"; do
  IFS=$'\t' read -r profile_id raw_location <<<"${row}"
  location="$(echo "${raw_location}" | xargs)"

  if [[ -z "${location}" ]]; then
    skipped=$((skipped + 1))
    continue
  fi

  encoded_location="$(printf '%s' "${location}" | jq -sRr @uri)"
  geocode_url="https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded_location}.json?access_token=${MAPBOX_TOKEN}&limit=1&autocomplete=true&types=address,place,locality,neighborhood&language=es&country=uy,ar"

  if ! response="$(curl -fsS "${geocode_url}")"; then
    echo "WARN profile ${profile_id}: geocoding request failed" >&2
    failed=$((failed + 1))
    continue
  fi

  lat="$(printf '%s' "${response}" | jq -r '.features[0].center[1] // empty')"
  lng="$(printf '%s' "${response}" | jq -r '.features[0].center[0] // empty')"

  if [[ -z "${lat}" || -z "${lng}" ]]; then
    echo "WARN profile ${profile_id}: no coordinates for '${location}'" >&2
    failed=$((failed + 1))
    continue
  fi

  if ! PGPASSWORD="${SPRING_DATASOURCE_PASSWORD}" psql "${PSQL_URL}" -q -c "
      UPDATE professional_profile
      SET latitude = ${lat},
          longitude = ${lng},
          geom = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      WHERE id = ${profile_id};
    " >/dev/null; then
    echo "WARN profile ${profile_id}: db update failed" >&2
    failed=$((failed + 1))
    continue
  fi

  ok=$((ok + 1))
  echo "OK profile ${profile_id}: ${location} -> ${lat},${lng}"
done

echo
echo "Geocoding finished: ok=${ok}, failed=${failed}, skipped=${skipped}, total=${#ROWS[@]}"

