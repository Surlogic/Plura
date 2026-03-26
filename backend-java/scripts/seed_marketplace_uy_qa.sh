#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE=""

if [[ -f "${REPO_ROOT}/.env.backend" ]]; then
  ENV_FILE="${REPO_ROOT}/.env.backend"
elif [[ -f "${REPO_ROOT}/backend-java/.env" ]]; then
  ENV_FILE="${REPO_ROOT}/backend-java/.env"
else
  echo "No encontre .env.backend ni backend-java/.env" >&2
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

if [[ -z "${SPRING_DATASOURCE_URL:-}" ]]; then
  echo "SPRING_DATASOURCE_URL no esta configurada" >&2
  exit 1
fi

if [[ -z "${SPRING_DATASOURCE_USERNAME:-}" ]]; then
  echo "SPRING_DATASOURCE_USERNAME no esta configurada" >&2
  exit 1
fi

if [[ -z "${SPRING_DATASOURCE_PASSWORD:-}" ]]; then
  echo "SPRING_DATASOURCE_PASSWORD no esta configurada" >&2
  exit 1
fi

JDBC_URL="${SPRING_DATASOURCE_URL}"
if [[ "${JDBC_URL}" != jdbc:postgresql://* ]]; then
  echo "Solo se soporta jdbc:postgresql://..." >&2
  exit 1
fi

PSQL_URL="${JDBC_URL#jdbc:}"
if [[ "${PSQL_URL}" != *"sslmode="* ]] && [[ "${PSQL_URL}" != *"localhost"* ]] && [[ "${PSQL_URL}" != *"127.0.0.1"* ]]; then
  if [[ "${PSQL_URL}" == *\?* ]]; then
    PSQL_URL="${PSQL_URL}&sslmode=require"
  else
    PSQL_URL="${PSQL_URL}?sslmode=require"
  fi
fi

export PGPASSWORD="${SPRING_DATASOURCE_PASSWORD}"

psql \
  "${PSQL_URL}" \
  --username "${SPRING_DATASOURCE_USERNAME}" \
  --set ON_ERROR_STOP=1 \
  --file "${REPO_ROOT}/backend-java/db/qa_marketplace_uy_seed.sql"
