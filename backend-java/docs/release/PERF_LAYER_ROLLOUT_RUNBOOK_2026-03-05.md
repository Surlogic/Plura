# Performance Layer Rollout Runbook (Fase 3)

## 1) Flags obligatorias
Todos los cambios son reversibles por flags de entorno.

- `CACHE_ENABLED` (default: `false`)
- `REDIS_ENABLED` (default: `false`)
- `SEARCH_CACHE_ENABLED` (default: `false`)
- `SUGGEST_CACHE_ENABLED` (default: `false`)
- `PROFILE_CACHE_ENABLED` (default: `false`)
- `SLOTS_CACHE_ENABLED` (default: `false`)
- `SEARCH_NO_COUNT_MODE` (default: `false`)
- `HAS_AVAILABILITY_TODAY_ENABLED` (default: `false`)

Notas:
- `CACHE_ENABLED=false` fuerza bypass total de cache.
- `REDIS_ENABLED=false` mantiene fallback in-memory sin usar Redis.
- `SEARCH_NO_COUNT_MODE=false` vuelve a `COUNT(*)` clásico.
- `HAS_AVAILABILITY_TODAY_ENABLED=false` vuelve a `available_slot` en búsqueda.

## 2) Orden de migraciones y despliegue
### SQL (antes de activar flags)
1. `search_scale_foundation.sql` (si no está aplicado en entorno)
2. `phase2_critical_indexes_2026_03_05.sql`
3. `phase3_cache_availability_2026_03_05.sql`

Comando recomendado:

```bash
SPRING_DATASOURCE_URL='postgres://...' \
SPRING_DATASOURCE_USERNAME='...' \
SPRING_DATASOURCE_PASSWORD='...' \
backend-java/scripts/release/run_phase3_migrations.sh
```

### Orden operativo
1. `migrate` (scripts SQL)
2. `deploy` con todos los flags OFF
3. habilitar flags por etapas (sección 4)

## 3) Observabilidad y alertas mínimas

### Endpoints críticos
- `/api/search`
- `/api/search/suggest`
- `/public/profesionales/{slug}`
- `/public/profesionales/{slug}/slots`

### Métricas requeridas
- `p95`, `p99` por endpoint
- cache hit-rate por endpoint: `hit / (hit + miss)`
  - métricas: `plura.cache.hit`, `plura.cache.miss`
- redis latency: `plura.redis.latency`
- redis errors: `plura.redis.errors`
- db pool utilization (Hikari)
- slow queries + rechazos por `statement_timeout`

### Thresholds objetivo
- search: `p95 < 250ms` y hit-rate `> 70%`
- suggest: `p95 < 80ms` y hit-rate `> 80%`
- profile: `p95 < 80ms` y hit-rate `> 70%`
- slots: `p95 < 120ms` y hit-rate `> 60%`

### Alertas recomendadas
- Redis errors > 1% durante 5m
- p95 sobre threshold durante 10m
- Hikari active connections > 85% del pool durante 5m
- `statement_timeout` rejects > baseline x2

## 4) Rollout por etapas

### Etapa 0 — Deploy seguro (solo métricas)
Flags:
- `CACHE_ENABLED=false`
- `REDIS_ENABLED=false`
- resto en `false`

Validar:
- smoke tests API
- dashboards base (latencia, errores, DB)

### Etapa 1 — Redis ON, cache OFF
Flags:
- `CACHE_ENABLED=false`
- `REDIS_ENABLED=true`

Validar:
- conectividad Redis
- `plura.redis.latency` estable
- `plura.redis.errors` ~ 0

### Etapa 2 — Suggest cache ON
Flags:
- `CACHE_ENABLED=true`
- `REDIS_ENABLED=true`
- `SUGGEST_CACHE_ENABLED=true`

Validar:
- `/api/search/suggest` p95 y hit-rate
- descenso de QPS SQL suggest

### Etapa 3 — Profile cache ON
Flags:
- + `PROFILE_CACHE_ENABLED=true`

Validar:
- `/public/profesionales/{slug}` p95 y hit-rate
- invalidación en update profile/services/photos/schedule

### Etapa 4 — Slots cache ON
Flags:
- + `SLOTS_CACHE_ENABLED=true`

Validar:
- `/public/profesionales/{slug}/slots` p95 y hit-rate
- invalidación en create/cancel/update booking y schedule

### Etapa 5 — Search cache + no count
Flags:
- + `SEARCH_CACHE_ENABLED=true`
- + `SEARCH_NO_COUNT_MODE=true`

Validar:
- `/api/search` p95/p99
- caída de CPU/IO de DB
- payload/contrato intacto

### Etapa 6 — Availability flag en search
Flags:
- + `HAS_AVAILABILITY_TODAY_ENABLED=true`

Validar:
- caída de lecturas a `available_slot`
- consistencia funcional de ordenamiento/filtrado

## 5) Smoke tests por etapa
- `GET /health`
- `GET /api/search?query=...`
- `GET /api/search/suggest?q=...`
- `GET /public/profesionales/{slug}`
- `GET /public/profesionales/{slug}/slots?...`
- flujo mínimo de booking (si token disponible)

## 6) Rollback inmediato por flag (sin redeploy)

### Matriz síntoma -> flag
- Redis latency alta / timeouts Redis:
  - apagar `REDIS_ENABLED=false`
- hit-rate bajo con overhead de cache:
  - apagar `SEARCH_CACHE_ENABLED` / `SUGGEST_CACHE_ENABLED` / `PROFILE_CACHE_ENABLED` / `SLOTS_CACHE_ENABLED`
- regresión de search por total/paginación:
  - apagar `SEARCH_NO_COUNT_MODE=false`
- resultados de disponibilidad inconsistentes:
  - apagar `HAS_AVAILABILITY_TODAY_ENABLED=false`
- incidente severo en capa cache:
  - apagar `CACHE_ENABLED=false`

### Orden de rollback recomendado
1. `HAS_AVAILABILITY_TODAY_ENABLED=false`
2. `SEARCH_NO_COUNT_MODE=false`
3. caches endpoint-specific OFF
4. `CACHE_ENABLED=false`
5. `REDIS_ENABLED=false`

## 7) Validación de seguridad (rate limiting + WAF-ready)

### Rate limiting
- Verificar límites activos por endpoint:
  - login/register/search/suggest/booking
- Validar respuestas `429` con `Retry-After`.

### WAF-ready checklist
- conservar headers de seguridad en respuestas públicas
- propagar `X-Forwarded-For` y `X-Real-IP` en LB/WAF
- reglas recomendadas WAF:
  - burst sobre `/auth/login*`, `/auth/register*`
  - patrones SQLi/XSS básicos
  - límite body size para reservas/profile updates
- logs con correlación:
  - request id
  - client ip
  - endpoint
  - status code

## 8) Load test reproducible (k6)
Script:
- `backend-java/scripts/loadtests/perf_phase3_rollout.js`

Escenario (10 min):
- 50 VUs suggest
- 30 VUs search
- 20 VUs profile
- 20 VUs slots
- 5 VUs booking create

Comando:

```bash
k6 run backend-java/scripts/loadtests/perf_phase3_rollout.js \
  -e BASE_URL="https://api.tu-dominio.com" \
  -e PUBLIC_SLUG="slug-real" \
  -e SERVICE_ID="service-id-real" \
  -e BOOKING_DATE="2026-03-20" \
  -e BOOKING_BEARER_TOKEN="<jwt-opcional>"
```

Thresholds en script:
- `http_req_failed < 0.5%`
- `checks > 99.5%`
- p95 endpoint-specific según objetivos de esta fase.
