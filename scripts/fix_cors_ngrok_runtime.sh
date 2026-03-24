#!/usr/bin/env bash
set -euo pipefail

SUFFIX=".bak_runtime_fix"
ROOT="$(pwd)"

API_FILE="apps/web/src/services/api.ts"
HOME_FILE="apps/web/src/pages/index.tsx"

changed=0

backup_file() {
  local file="$1"
  if [ -f "$file" ] && [ ! -f "${file}${SUFFIX}" ]; then
    cp "$file" "${file}${SUFFIX}"
  elif [ -f "$file" ]; then
    cp "$file" "${file}${SUFFIX}.$(date +%Y%m%d%H%M%S)"
  fi
}

ensure_file() {
  local file="$1"
  if [ ! -f "$file" ]; then
    echo "ERROR: no existe $file en $ROOT" >&2
    exit 1
  fi
}

ensure_file "$API_FILE"
ensure_file "$HOME_FILE"

backup_file "$API_FILE"
backup_file "$HOME_FILE"

python3 - <<'PY'
from pathlib import Path
import re

api_path = Path("apps/web/src/services/api.ts")
home_path = Path("apps/web/src/pages/index.tsx")

api = api_path.read_text(encoding="utf-8")
original_api = api

patterns_api = [
    r"\n\s*config\.headers\.set\(\s*['\"]ngrok-skip-browser-warning['\"]\s*,\s*['\"]1['\"]\s*\);?",
    r"\n\s*['\"]ngrok-skip-browser-warning['\"]\s*:\s*['\"]1['\"]\s*,?",
]
for pattern in patterns_api:
    api = re.sub(pattern, "", api)

api = re.sub(r"headers\s*:\s*\{\s*\}", "headers: {}", api)
api = re.sub(r"\n{3,}", "\n\n", api)
if api != original_api:
    api_path.write_text(api, encoding="utf-8")

home = home_path.read_text(encoding="utf-8")
original_home = home
home = re.sub(r",?\s*['\"]ngrok-skip-browser-warning['\"]\s*:\s*['\"]1['\"]", "", home)
home = re.sub(r"headers\s*:\s*\{\s*Accept\s*:\s*['\"]application/json['\"]\s*,\s*\}", "headers: { Accept: 'application/json' }", home)
home = re.sub(r"headers\s*:\s*\{\s*\}", "headers: {}", home)
home = re.sub(r"\n{3,}", "\n\n", home)
if home != original_home:
    home_path.write_text(home, encoding="utf-8")
PY

printf 'OK: runtime fix aplicado\n'
printf 'Archivo tocado: %s\n' "$API_FILE"
printf 'Archivo tocado: %s\n' "$HOME_FILE"
printf 'Backups: %s%s y %s%s\n' "$API_FILE" "$SUFFIX" "$HOME_FILE" "$SUFFIX"