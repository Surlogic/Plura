# Auditoría 4h - Reporte final (2026-03-04)

## Resultado ejecutivo
- Estado general: **completado** (18/18 pasos).
- Objetivo cumplido: se verificaron y consolidaron mejoras de performance, seguridad, estabilidad de reservas y deployabilidad en Render **sin cambiar la lógica funcional del producto**.

## Validaciones finales (evidencia)
- Frontend:
  - `pnpm -C apps/web lint` -> OK
  - `pnpm -C apps/web build` -> OK
  - `PORT=4010 pnpm -C apps/web start` -> OK
  - `curl http://localhost:4010` -> `200`
- Backend:
  - `cd backend-java && ./gradlew test --no-daemon` -> OK
  - `cd backend-java && ./gradlew bootJar --no-daemon` -> OK
  - `docker build -t plura-api-test:local backend-java` -> OK
  - Smoke deploy en contenedor (Postgres + API):
    - `/health` -> `200`
    - body -> `{"status":"ok"}`

## Estado de los hallazgos críticos iniciales
1. Timeout/bloqueo real en `POST /public/profesionales/{slug}/reservas` por contención de locks en `available_slot`.
- Estado: **mitigado**.
- Cambios aplicados:
  - bootstrap inicial de slots ahora se encola async y no bloquea startup;
  - scheduler nocturno encola async;
  - rebuild de disponibilidad fuera del camino síncrono del request (`afterCommit` + dispatcher async);
  - transacciones de rebuild segmentadas por lote/perfil con `TransactionTemplate`.

2. Falsos 409 por mapear cualquier `DataIntegrityViolationException` a conflicto de negocio.
- Estado: **corregido**.
- Cambio aplicado:
  - el controller ahora devuelve 409 solo si la violación corresponde a la constraint de booking (`uq_professional_start`);
  - otras violaciones de integridad pasan a 500 controlado.

3. Bootstrap de disponibilidad pesado y síncrono en startup.
- Estado: **corregido**.
- Cambio aplicado:
  - se encola en segundo plano al `ApplicationReadyEvent`.

4. Trabajo pesado dentro de la transacción HTTP de reserva.
- Estado: **corregido**.
- Cambio aplicado:
  - la reserva persiste y luego dispara rebuild de slots en `afterCommit`, async.

5. UX de timeout/percepción de flujo roto.
- Estado: **mejorado**.
- Cambios observados:
  - flujo de login con auto-reserva reencamina a `/reservar?resume=1` ante fallo;
  - se eliminaron logs debug ruidosos;
  - cliente de Mapbox incorpora abort/timeout defensivo.

## Hardening de seguridad aplicado
- Frontend:
  - `next` y `eslint-config-next` actualizados a `14.2.35`;
  - CSP productiva sin `unsafe-eval`;
  - headers COOP/CORP añadidos;
  - sanitización de imágenes evita protocolos inseguros (`data:` fuera);
  - enlaces externos con `rel="noopener noreferrer"`.
- Backend:
  - eliminada configuración CORS duplicada (`WebConfig` eliminado);
  - `SecurityConfig` con hardening de headers y auth defaults deshabilitados (`httpBasic`, `formLogin`, `logout`);
  - filtro de wildcard CORS (`*`) para evitar combinación insegura con credenciales.

## Deployabilidad Render
- Ajustes aplicados:
  - backend usa `server.port: ${PORT:3000}`;
  - `render.yaml` agregado con servicios `plura-api` (Docker) y `plura-web` (Node);
  - comandos de web robustecidos con `corepack` + `pnpm@10.23.0` para evitar fallos por falta de `pnpm` en runtime.

## Riesgos residuales
- Quedan hallazgos de seguridad de dependencias transitorias (moderate/high) reportables por auditoría de ecosistema JS; no bloquean build actual pero conviene plan de actualización incremental.
- En este entorno local hubo limitaciones del daemon Docker para detener ciertos contenedores de prueba (`permission denied`), sin impacto en la configuración de deploy entregada.

## Archivos clave tocados para estas correcciones
- `backend-java/src/main/java/com/plura/plurabackend/availability/AvailableSlotBootstrap.java`
- `backend-java/src/main/java/com/plura/plurabackend/availability/AvailableSlotScheduler.java`
- `backend-java/src/main/java/com/plura/plurabackend/availability/AvailableSlotService.java`
- `backend-java/src/main/java/com/plura/plurabackend/config/AsyncConfig.java`
- `backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalPublicPageService.java`
- `backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalPublicController.java`
- `backend-java/src/main/java/com/plura/plurabackend/config/security/SecurityConfig.java`
- `backend-java/src/main/resources/application.yml`
- `apps/web/next.config.js`
- `apps/web/package.json`
- `apps/web/src/services/mapbox.ts`
- `apps/web/src/pages/profesional/pagina/[slug].tsx`
- `apps/web/src/pages/profesional/dashboard/pagina-publica.tsx`
- `render.yaml`

## 3) Código corregido (buscador marketplace)
- Backend (causa raíz 500):
  - `backend-java/src/main/java/com/plura/plurabackend/search/SearchNativeRepository.java`
  - Se corrigió el armado SQL para respetar el orden válido: `FROM + LEFT JOIN + WHERE`.
  - Antes: la consulta armaba `WHERE ... LEFT JOIN ...` y PostgreSQL devolvía `syntax error at or near LEFT`.
- Frontend (robustez de filtros):
  - `apps/web/src/components/search/UnifiedSearchBar.tsx`
  - Se evita enviar `query` duplicado cuando `type=RUBRO` y `query` equivale al `categorySlug` (ej: `Barbería` + `barberia`).

## 4) Mejora estructural del buscador
- Normalización centralizada:
  - `apps/web/src/utils/searchQuery.ts` (nuevo)
  - Funciones compartidas: `slugToLabel`, `normalizeSearchText`, `shouldOmitRubroQuery`.
- Capa de servicio más consistente:
  - `apps/web/src/services/search.ts`
  - Se agregó saneamiento único de parámetros (`sanitizeSearchParams`) antes de llamar a `/api/search`.
  - Esto evita divergencias entre componentes y reduce errores por combinaciones de filtros redundantes.
