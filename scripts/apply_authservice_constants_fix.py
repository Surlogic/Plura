#!/usr/bin/env python3
from pathlib import Path
import re
import sys

FILE = Path("backend-java/src/main/java/com/plura/plurabackend/core/auth/AuthService.java")

CLIENT_CONST = '''
    private static final String CLIENT_ACCOUNT_EXISTS_FOR_PROFESSIONAL_MESSAGE =
        "Existe una cuenta como cliente con este email. Creá una nueva para profesional o eliminá la cuenta de cliente antes de continuar.";
'''.strip("\n")

PRO_CONST = '''
    private static final String PROFESSIONAL_ACCOUNT_EXISTS_MESSAGE =
        "Ya existe una cuenta profesional con este email. Iniciá sesión o recuperá tu contraseña si la olvidaste.";
'''.strip("\n")

def fail(msg: str) -> int:
    print(msg, file=sys.stderr)
    return 1

def main() -> int:
    if not FILE.exists():
        return fail(f"No existe {FILE}")

    original = FILE.read_text(encoding="utf-8")

    if "CLIENT_ACCOUNT_EXISTS_FOR_PROFESSIONAL_MESSAGE" in original and "PROFESSIONAL_ACCOUNT_EXISTS_MESSAGE =" in original:
        print("Sin cambios: las constantes ya están declaradas correctamente.")
        return 0

    anchor = '''    private static final Map<String, String> LEGACY_CATEGORY_ALIASES = Map.ofEntries(
        Map.entry("peluqueria", "cabello"),
        Map.entry("cejas", "pestanas-cejas"),
        Map.entry("pestanas", "pestanas-cejas"),
        Map.entry("faciales", "estetica-facial"),
        Map.entry("tratamientos-corporales", "tratamientos-corporales"),
        Map.entry("medicina-estetica", "medicina-estetica"),
        Map.entry("bienestar-holistico", "bienestar-holistico")
    );
'''.rstrip("\n")

    if anchor not in original:
        return fail("No encontré el bloque LEGACY_CATEGORY_ALIASES exacto. No apliqué cambios.")

    insertion = anchor + "\n" + CLIENT_CONST + "\n" + PRO_CONST
    updated = original.replace(anchor, insertion, 1)

    backup = FILE.with_name(FILE.name + ".bak_fix")
    backup.write_text(original, encoding="utf-8")
    FILE.write_text(updated, encoding="utf-8")

    print(f"Archivo actualizado: {FILE}")
    print(f"Backup: {backup}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
