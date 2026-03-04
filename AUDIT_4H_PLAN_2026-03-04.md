# Auditoria 4h - Baseline y criterios (2026-03-04)

## 1) Baseline congelado
- Commit base observado: `767fdcb`.
- Estado del repo: worktree sucio con cambios amplios en frontend y backend (sin reset ni revert).
- Validaciones iniciales:
  - `pnpm -C apps/web lint`: OK
  - `pnpm -C apps/web build`: OK
  - `./gradlew test --no-daemon` (backend-java): OK

## 2) Criterios de exito y metricas
### Performance frontend
- Metrica principal: salida de `next build` (First Load JS por ruta) y ausencia de logs debug innecesarios en runtime.
- Objetivo:
  - mantener build en verde en cada ciclo;
  - no aumentar First Load JS en rutas criticas (`/`, `/explorar`, `/reservar`, `/cliente/*`, `/profesional/dashboard*`);
  - reducir costos obvios (imports pesados no lazy, logs debug permanentes).

### Performance backend
- Metrica principal: latencia y estabilidad bajo concurrencia en reservas publicas.
- Objetivo:
  - evitar timeouts;
  - mantener respuestas consistentes bajo contencion;
  - reducir trabajo sincrono en request path y evitar configuraciones redundantes costosas.

### Seguridad frontend
- Metrica principal: superficie de riesgo (headers, CSP, dependencias, exposicion de debug/data).
- Objetivo:
  - minimizar superficie en `next.config.js`;
  - subir versiones con CVEs en dependencias directas cuando sea viable;
  - eliminar exposicion innecesaria de informacion en cliente.

### Seguridad backend
- Metrica principal: hardening HTTP/security config, CORS/CSRF/cookies y dependencias.
- Objetivo:
  - evitar configuraciones ambiguas o duplicadas;
  - definir headers de seguridad y comportamiento consistente;
  - mantener autenticacion/autorizacion sin regresiones.

### Deployabilidad Render
- Metrica principal: build reproducible + config de runtime valida.
- Objetivo:
  - web build OK;
  - backend test/build OK;
  - variables/arranque alineados a Render.

## Hallazgos iniciales (backlog)
1. Dependencias front con CVEs reportadas por `pnpm audit`, especialmente `next@14.2.18` (incluye advisory critico resuelto en >=14.2.25).
2. CSP frontend actual usa `script-src 'unsafe-eval' 'unsafe-inline'` (riesgo alto en produccion).
3. Logs debug temporales en frontend (`[TEMP SEARCH DEBUG]`, logs de reserva) aun presentes.
4. Backend tiene CORS configurado en dos lugares (`SecurityConfig` y `WebConfig`), riesgo de comportamiento inconsistente.

## Evidencia
- Archivo generado desde ejecuciones locales del 2026-03-04 en `/home/german/Escritorio/Plura`.
