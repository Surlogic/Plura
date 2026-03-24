from pathlib import Path

target = Path("apps/web/src/pages/cliente/configuracion/index.tsx")
if not target.exists():
    raise SystemExit(f"No existe {target}")

text = target.read_text(encoding="utf-8")

old = """            </div>
          ) : null}
        </article>
      </section>
        </article>
      </section>
    </ClientShell>
  );
}
"""

new = """            </div>
          ) : null}
        </article>
      </section>
    </ClientShell>
  );
}
"""

if old not in text:
    raise SystemExit("No se encontró el bloque exacto esperado. No se aplicó ningún cambio.")

target.write_text(text.replace(old, new, 1), encoding="utf-8")
print(f"Fix aplicado en {target}")