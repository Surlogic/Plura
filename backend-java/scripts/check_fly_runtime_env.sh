#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
FLY_TOML="${BACKEND_DIR}/fly.toml"

if [[ ! -f "${FLY_TOML}" ]]; then
  echo "No se encontro ${FLY_TOML}" >&2
  exit 1
fi

declare -A FLY_ENV=()

while IFS='=' read -r key value; do
  [[ -n "${key}" ]] || continue
  FLY_ENV["${key}"]="${value}"
done < <(
  sed -n '/^\[env\]$/,/^\[/p' "${FLY_TOML}" \
    | sed '1d;$d' \
    | sed -n 's/^[[:space:]]*\([A-Z0-9_][A-Z0-9_]*\)[[:space:]]*=[[:space:]]*"\(.*\)"[[:space:]]*$/\1=\2/p'
)

resolve_var() {
  local key="$1"
  if [[ -n "${!key-}" ]]; then
    printf '%s' "${!key}"
    return
  fi
  if [[ -n "${FLY_ENV[$key]-}" ]]; then
    printf '%s' "${FLY_ENV[$key]}"
  fi
}

lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

declare -a fatal_missing=()
declare -a warnings=()

require_present() {
  local key="$1"
  local label="${2:-$1}"
  if [[ -z "$(resolve_var "${key}")" ]]; then
    fatal_missing+=("${label}")
  fi
}

warn_if_blank() {
  local key="$1"
  local message="$2"
  if [[ -z "$(resolve_var "${key}")" ]]; then
    warnings+=("${message}")
  fi
}

require_present "JWT_SECRET"
require_present "JWT_REFRESH_PEPPER"

db_url="$(resolve_var "SPRING_DATASOURCE_URL")"
if [[ -z "${db_url}" ]]; then
  db_url="$(resolve_var "DATABASE_URL")"
fi
if [[ -z "${db_url}" ]]; then
  fatal_missing+=("SPRING_DATASOURCE_URL o DATABASE_URL")
fi
if [[ "${db_url}" == jdbc:h2:* || "${db_url}" == h2:* ]]; then
  fatal_missing+=("SPRING_DATASOURCE_URL productiva no puede apuntar a H2")
fi

db_user="$(resolve_var "SPRING_DATASOURCE_USERNAME")"
if [[ -z "${db_user}" ]]; then
  db_user="$(resolve_var "DATABASE_USERNAME")"
fi
db_password="$(resolve_var "SPRING_DATASOURCE_PASSWORD")"
if [[ -z "${db_password}" ]]; then
  db_password="$(resolve_var "DATABASE_PASSWORD")"
fi
db_driver="$(resolve_var "SPRING_DATASOURCE_DRIVER_CLASS_NAME")"
db_url_has_credentials="false"
if [[ "${db_url}" == postgres://* || "${db_url}" == postgresql://* ]]; then
  if [[ "${db_url}" =~ ^[^:]+://[^/@:]+(:[^/@]*)?@ ]]; then
    db_url_has_credentials="true"
  fi
fi
if [[ "${db_url_has_credentials}" != "true" && ( -z "${db_user}" || -z "${db_password}" ) ]]; then
  warnings+=("Revisa credenciales PostgreSQL: si la URL no lleva usuario y password embebidos, falta definir SPRING_DATASOURCE_USERNAME/SPRING_DATASOURCE_PASSWORD o DATABASE_USERNAME/DATABASE_PASSWORD.")
fi
if [[ -n "${db_driver}" && "${db_driver}" != "org.postgresql.Driver" ]]; then
  fatal_missing+=("SPRING_DATASOURCE_DRIVER_CLASS_NAME debe ser org.postgresql.Driver")
fi

flyway_url="$(resolve_var "SPRING_FLYWAY_URL")"
if [[ -z "${flyway_url}" ]]; then
  flyway_url="${db_url}"
fi
flyway_user="$(resolve_var "SPRING_FLYWAY_USER")"
if [[ -z "${flyway_user}" ]]; then
  flyway_user="${db_user}"
fi
flyway_password="$(resolve_var "SPRING_FLYWAY_PASSWORD")"
if [[ -z "${flyway_password}" ]]; then
  flyway_password="${db_password}"
fi
flyway_driver="$(resolve_var "SPRING_FLYWAY_DRIVER_CLASS_NAME")"
if [[ -z "${flyway_driver}" ]]; then
  flyway_driver="${db_driver}"
fi
if [[ "${flyway_url}" == jdbc:h2:* || "${flyway_url}" == h2:* ]]; then
  fatal_missing+=("SPRING_FLYWAY_URL productiva no puede apuntar a H2")
fi
if [[ -n "${flyway_driver}" && "${flyway_driver}" != "org.postgresql.Driver" ]]; then
  fatal_missing+=("SPRING_FLYWAY_DRIVER_CLASS_NAME debe ser org.postgresql.Driver")
fi
if [[ -n "${db_url}" && -n "${flyway_url}" && "${flyway_url}" != "${db_url}" ]]; then
  warnings+=("SPRING_FLYWAY_URL difiere de SPRING_DATASOURCE_URL; valida que datasource y migraciones apunten a la misma base.")
fi
if [[ -n "${db_user}" && -n "${flyway_user}" && "${flyway_user}" != "${db_user}" ]]; then
  warnings+=("SPRING_FLYWAY_USER difiere de SPRING_DATASOURCE_USERNAME; valida permisos y coherencia de migraciones.")
fi

image_provider="$(lower "$(resolve_var "IMAGE_STORAGE_PROVIDER")")"
if [[ -z "${image_provider}" ]]; then
  image_provider="local"
fi
if [[ "${image_provider}" == "r2" ]]; then
  require_present "R2_ENDPOINT"
  require_present "R2_ACCESS_KEY_ID"
  require_present "R2_SECRET_ACCESS_KEY"
  warn_if_blank "R2_BUCKET" "R2_BUCKET no esta definido; el backend cae en el default plura-images, valida que sea el bucket correcto en Fly."
fi

billing_enabled="$(lower "$(resolve_var "BILLING_ENABLED")")"
mercadopago_enabled="$(lower "$(resolve_var "BILLING_MERCADOPAGO_ENABLED")")"
if [[ "${billing_enabled}" == "true" && "${mercadopago_enabled}" == "true" ]]; then
  require_present "BILLING_MERCADOPAGO_SUBSCRIPTIONS_ACCESS_TOKEN"
  require_present "BILLING_MERCADOPAGO_SUBSCRIPTIONS_WEBHOOK_SECRET"
  warn_if_blank "BILLING_MERCADOPAGO_RESERVATIONS_PLATFORM_ACCESS_TOKEN" "Falta BILLING_MERCADOPAGO_RESERVATIONS_PLATFORM_ACCESS_TOKEN; el backend arranca, pero checkout/refunds de reservas no quedan operativos."
  warn_if_blank "BILLING_MERCADOPAGO_RESERVATIONS_WEBHOOK_SECRET" "Falta BILLING_MERCADOPAGO_RESERVATIONS_WEBHOOK_SECRET; los webhooks de reservas no quedan verificados."
  warn_if_blank "BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_CLIENT_ID" "Falta BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_CLIENT_ID; el onboarding OAuth profesional no se puede iniciar."
  warn_if_blank "BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_CLIENT_SECRET" "Falta BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_CLIENT_SECRET; el callback OAuth profesional no se puede completar."
  warn_if_blank "BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_STATE_SIGNING_SECRET" "Falta BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_STATE_SIGNING_SECRET; el backend hace fallback, pero no es la configuracion recomendada."
  warn_if_blank "BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_TOKEN_ENCRYPTION_KEY" "Falta BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_TOKEN_ENCRYPTION_KEY; no deberias dejar OAuth productivo sin esta clave."
elif [[ "${billing_enabled}" == "true" ]]; then
  warnings+=("BILLING_ENABLED=true pero BILLING_MERCADOPAGO_ENABLED no esta en true; el backend puede arrancar, pero Mercado Pago no queda operativo.")
fi

email_delivery_enabled="$(lower "$(resolve_var "EMAIL_DELIVERY_ENABLED")")"
if [[ "${email_delivery_enabled}" == "true" ]]; then
  warn_if_blank "EMAIL_FROM_ADDRESS" "Falta EMAIL_FROM_ADDRESS; los envios reales de email quedan incompletos."
  warn_if_blank "EMAIL_SMTP_HOST" "Falta EMAIL_SMTP_HOST; email delivery esta habilitado pero sin host SMTP."
  warn_if_blank "EMAIL_SMTP_USERNAME" "Falta EMAIL_SMTP_USERNAME; email delivery esta habilitado pero sin usuario SMTP."
  warn_if_blank "EMAIL_SMTP_PASSWORD" "Falta EMAIL_SMTP_PASSWORD; email delivery esta habilitado pero sin password SMTP."
fi

echo "Chequeo Fly runtime para ${FLY_TOML}"
echo "PORT efectivo: $(resolve_var "PORT")"
echo "SERVER_ADDRESS efectivo: $(resolve_var "SERVER_ADDRESS")"
echo "IMAGE_STORAGE_PROVIDER efectivo: ${image_provider}"
echo "BILLING_ENABLED efectivo: ${billing_enabled:-false}"
echo "BILLING_MERCADOPAGO_ENABLED efectivo: ${mercadopago_enabled:-false}"
echo "SPRING_DATASOURCE_URL efectivo: ${db_url}"
echo "SPRING_FLYWAY_URL efectivo: ${flyway_url}"
echo

if [[ ${#fatal_missing[@]} -gt 0 ]]; then
  echo "Faltantes de arranque:"
  for item in "${fatal_missing[@]}"; do
    echo "- ${item}"
  done
  echo
fi

if [[ ${#warnings[@]} -gt 0 ]]; then
  echo "Advertencias operativas:"
  for item in "${warnings[@]}"; do
    echo "- ${item}"
  done
  echo
fi

if [[ ${#fatal_missing[@]} -gt 0 ]]; then
  echo "Resultado: FAIL"
  exit 1
fi

echo "Resultado: OK para arranque base"
