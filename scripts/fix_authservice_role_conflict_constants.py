#!/usr/bin/env python3
from pathlib import Path
import sys

TARGET = Path("backend-java/src/main/java/com/plura/plurabackend/core/auth/AuthService.java")

INSERT_AFTER = """    private static final Map<String, String> LEGACY_CATEGORY_ALIASES = Map.ofEntries(
        Map.entry("peluqueria", "cabello"),
        Map.entry("cejas", "pestanas-cejas"),
        Map.entry("pestanas", "pestanas-cejas"),
        Map.entry("faciales", "estetica-facial"),
        Map.entry("tratamientos-corporales", "tratamientos-corporales"),
        Map.entry("medicina-estetica", "medicina-estetica"),
        Map.entry("bienestar-holistico", "bienestar-holistico")
    );"""

INSERT_BLOCK = """
    private static final String CLIENT_ACCOUNT_EXISTS_FOR_PROFESSIONAL_MESSAGE =
        "Existe una cuenta como cliente con este email. Creá una nueva para profesional o eliminá la cuenta de cliente antes de continuar.";
    private static final String PROFESSIONAL_ACCOUNT_EXISTS_MESSAGE =
        "Ya existe una cuenta profesional con este email. Iniciá sesión o recuperá tu contraseña si la olvidaste.";"""

def fail(msg: str) -> int:
    print(msg, file=sys.stderr)
    return 1

def main() -> int:
    if not TARGET.is_file():
        return fail(f"No existe {TARGET}")

    original = TARGET.read_text(encoding="utf-8")

    if "CLIENT_ACCOUNT_EXISTS_FOR_PROFESSIONAL_MESSAGE" in original and "PROFESSIONAL_ACCOUNT_EXISTS_MESSAGE" in original:
        print(f"Sin cambios: {TARGET} ya contiene las constantes.")
        return 0

    if INSERT_AFTER not in original:
        return fail("No se encontró el bloque ancla de LEGACY_CATEGORY_ALIASES en AuthService.java")

    updated = original.replace(INSERT_AFTER, INSERT_AFTER + INSERT_BLOCK, 1)

    backup = TARGET.with_name(TARGET.name + ".bak_fix")
    backup.write_text(original, encoding="utf-8")
    TARGET.write_text(updated, encoding="utf-8")

    print("Archivo escrito:")
    print(f"- {TARGET}")
    print("Backup:")
    print(f"- {backup}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
