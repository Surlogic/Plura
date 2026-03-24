#!/usr/bin/env python3
from pathlib import Path

ROOT = Path.cwd()

TEXT_REPLACEMENTS = [
    ("useProfessionalProfileContext", "useAuthSession"),
    ("ProfessionalProfileProvider", "AuthSessionProvider"),
    ("getProfessionalToken", "getAccessToken"),
    ("getProfessionalRefreshToken", "getRefreshToken"),
    ("setProfessionalSession", "setSession"),
    ("setProfessionalToken", "setAccessToken"),
    ("setProfessionalRefreshToken", "setRefreshToken"),
    ("clearProfessionalToken", "clearSession"),
]

PATH_REPLACEMENTS = [
    ("../src/context/ProfessionalProfileContext", "../src/context/ProfessionalProfileContext"),
    ("../../src/context/ProfessionalProfileContext", "../../src/context/ProfessionalProfileContext"),
    ("../../context/ProfessionalProfileContext", "../../context/ProfessionalProfileContext"),
    ("../context/ProfessionalProfileContext", "../context/ProfessionalProfileContext"),
]

DOC_REPLACEMENTS = [
    (
        "`app/_layout.tsx`: monta `ProfessionalProfileProvider` y stack principal.",
        "`app/_layout.tsx`: monta `AuthSessionProvider` y stack principal.",
    ),
    (
        "`dashboard` mezcla acceso de cliente y profesional, lo que puede servir al MVP pero puede requerir separacion mas adelante",
        "`dashboard` funciona como cuenta del cliente dentro de tabs; el profesional opera por `app/dashboard` con proteccion propia.",
    ),
]

def process_file(path: Path) -> bool:
    if not path.is_file():
        return False
    original = path.read_text(encoding="utf-8")
    updated = original

    for old, new in TEXT_REPLACEMENTS:
        updated = updated.replace(old, new)

    for old, new in PATH_REPLACEMENTS:
        updated = updated.replace(old, new)

    if path.name in {"README_sin_whatsapp.md", "rutas-y-modulos.md"}:
        for old, new in DOC_REPLACEMENTS:
            updated = updated.replace(old, new)

    if updated == original:
        return False

    backup = path.with_name(path.name + ".bak_runtime_fix")
    if not backup.exists():
        backup.write_text(original, encoding="utf-8")
    path.write_text(updated, encoding="utf-8")
    return True

touched = []
for base in [
    ROOT / "apps/mobile",
    ROOT / "contexto",
]:
    if not base.exists():
        continue
    for path in base.rglob("*"):
        if ".bak_fix" in path.name or ".bak_runtime_fix" in path.name:
            continue
        if path.suffix not in {".ts", ".tsx", ".md"}:
            continue
        if process_file(path):
            touched.append(str(path.relative_to(ROOT)))

print("Archivos ajustados:")
for item in touched:
    print("-", item)