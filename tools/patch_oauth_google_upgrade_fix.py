from pathlib import Path
import re
import sys

target = Path("backend-java/src/main/java/com/plura/plurabackend/core/auth/AuthService.java")
if not target.exists():
    raise SystemExit(f"No existe {target}")

text = target.read_text(encoding="utf-8")

old = """            if (authAction == OAuthAuthAction.REGISTER) {
                if (desiredRole == UserRole.PROFESSIONAL && !isProfessionalUser(user)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, CLIENT_ACCOUNT_EXISTS_FOR_PROFESSIONAL_MESSAGE);
                }
                if (desiredRole == UserRole.USER && !isClientUser(user)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, PROFESSIONAL_ACCOUNT_EXISTS_MESSAGE);
                }
                if (isProfessionalUser(user)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, PROFESSIONAL_ACCOUNT_EXISTS_MESSAGE);
                }
                throw new ResponseStatusException(HttpStatus.CONFLICT, CLIENT_ACCOUNT_EXISTS_MESSAGE);
            }

            if (desiredRole == UserRole.PROFESSIONAL && !isProfessionalUser(user)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, CLIENT_ACCOUNT_EXISTS_FOR_PROFESSIONAL_MESSAGE);
            }
            boolean changed = false;"""

new = """            boolean promoteExistingClientToProfessional =
                authAction == OAuthAuthAction.REGISTER
                    && desiredRole == UserRole.PROFESSIONAL
                    && isClientUser(user)
                    && !isProfessionalUser(user);

            boolean changed = false;
            if (promoteExistingClientToProfessional) {
                user.setRole(UserRole.PROFESSIONAL);
                changed = true;
                ensureProfessionalProfile(user);
            } else if (authAction == OAuthAuthAction.REGISTER) {
                if (desiredRole == UserRole.USER && !isClientUser(user)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, PROFESSIONAL_ACCOUNT_EXISTS_MESSAGE);
                }
                if (isProfessionalUser(user)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, PROFESSIONAL_ACCOUNT_EXISTS_MESSAGE);
                }
                throw new ResponseStatusException(HttpStatus.CONFLICT, CLIENT_ACCOUNT_EXISTS_MESSAGE);
            }

            if (desiredRole == UserRole.PROFESSIONAL && !isProfessionalUser(user)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, CLIENT_ACCOUNT_EXISTS_FOR_PROFESSIONAL_MESSAGE);
            }"""

if old not in text:
    raise SystemExit("No se encontró el bloque esperado en AuthService.java. No se aplicó ningún cambio.")

updated = text.replace(old, new, 1)
target.write_text(updated, encoding="utf-8")
print(f"Patch aplicado en {target}")