from pathlib import Path

target = Path("apps/web/src/pages/cliente/configuracion/index.tsx")
if not target.exists():
    raise SystemExit(f"No existe {target}")

text = target.read_text(encoding="utf-8")

old = """  const handleSendPhoneVerification = async () => {
  const handleSendPhoneVerification = async () => {
"""

new = """  const handleSendPhoneVerification = async () => {
"""

if old not in text:
    raise SystemExit("No se encontró el bloque duplicado esperado. No se aplicó ningún cambio.")

target.write_text(text.replace(old, new, 1), encoding="utf-8")
print(f"Fix aplicado en {target}")