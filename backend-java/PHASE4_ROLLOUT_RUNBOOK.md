# PHASE4_ROLLOUT_RUNBOOK

## Objetivo
Desplegar Fase 4 (R2 real, SQS dual-mode, Meilisearch y availability summary) sin downtime, sin romper endpoints, con rollback inmediato por flags.

## Go-Live Gate (obligatorio)

### 1) Base de datos (RDS/Postgres)
- Backups + PITR habilitado (mínimo 7 días).
- `max_connections` alineado con pool total de todas las instancias.
- Timeouts obligatorios por conexión:
  - `statement_timeout=5s`
  - `idle_in_transaction_session_timeout=30s`
  - `lock_timeout=2s`
- Verificar migraciones aplicadas: `phase2`, `phase3`, `phase4`.

### 2) Runtime Spring Boot
- JVM para contenedor:
  - `-XX:MaxRAMPercentage=75`
  - `-XX:+UseG1GC`
  - `-XX:+ExitOnOutOfMemoryError`
- Actuator no público (auth/VPN/WAF private routing).
- Logs estructurados JSON, sin PII (tokens/refresh).

### 3) Redis
- TTLs confirmados:
  - Search: 30s
  - Suggest: 60s
  - Profile/Slots: 5m
- Hit-rate baseline en pico:
  - Search > 70%
  - Suggest > 80%
  - Profile > 70%
- Alarmas:
  - Redis errors > 1%
  - Redis latency p95 > 10ms

### 4) Meilisearch
- Reindex inicial completo y validado.
- Alarmas:
  - `plura.search.engine.errors > 0.5%`
  - `plura.search.engine.latency p95 > 80ms`
- Fallback SQL probado (simular Meili down).

### 5) SQS + Workers
- DLQ configurada (cualquier mensaje en DLQ dispara alerta).
- Idempotencia validada (reproceso mismo `jobId` no duplica efectos).
- Concurrencia limitada para no saturar DB/Redis/Meili.

### 6) R2 + CDN
- Signed URL:
  - expiración 10 min
  - validación de MIME y tamaño.
- CDN headers:
  - thumbnails con cache largo
  - imágenes de perfil versionadas.
- Validar que frontend no acepte `javascript:` ni esquemas no permitidos.

## Flags nuevas y defaults

### Storage
- `IMAGE_STORAGE_PROVIDER=local` (`local|r2`)
- `IMAGE_UPLOAD_URL_EXPIRATION_MINUTES=10`
- `IMAGE_MAX_UPLOAD_BYTES=5242880`
- `IMAGE_ALLOWED_CONTENT_TYPES=image/jpeg,image/png,image/webp,image/avif`
- `R2_ENDPOINT=`
- `R2_BUCKET=plura-images`
- `R2_REGION=auto`
- `R2_ACCESS_KEY_ID=`
- `R2_SECRET_ACCESS_KEY=`
- `R2_PUBLIC_BASE_URL=`

### SQS
- `SQS_ENABLED=false`
- `THUMBNAIL_SQS_ENABLED=false`
- `SCHEDULE_SUMMARY_SQS_ENABLED=false`
- `SEARCH_INDEX_SQS_ENABLED=false`
- `SQS_ENDPOINT=`
- `SQS_REGION=us-east-1`
- `SQS_ACCESS_KEY_ID=`
- `SQS_SECRET_ACCESS_KEY=`
- `SQS_QUEUE_URL=`
- `SQS_DLQ_URL=`

### Search Engine
- `SEARCH_ENGINE_ENABLED=false`
- `SEARCH_ENGINE_SUGGEST_ENABLED=false`
- `SEARCH_ENGINE_HYDRATE_FROM_DB=true`
- `SEARCH_ENGINE_PROVIDER=MEILI`
- `MEILI_HOST=http://localhost:7700`
- `MEILI_API_KEY=`
- `MEILI_INDEX_NAME=professional_profile`
- `MEILI_TIMEOUT_MILLIS=2000`
- `MEILI_REINDEX_ON_STARTUP=false`

### Availability escalable
- `AVAILABLE_SLOT_REBUILD_ENABLED=true`
- `SEARCH_AVAILABILITY_SOURCE=AVAILABLE_SLOT` (`AVAILABLE_SLOT|FLAG`)
- `SCHEDULE_SUMMARY_ENABLED=false`
- `NEXT_AVAILABLE_AT_ENABLED=false`
- `SCHEDULE_SUMMARY_LOOKAHEAD_DAYS=14`
- `SCHEDULE_SUMMARY_CRON=0 */30 * * * *`

## Orden recomendado de flags (y qué mirar)

### Etapa 1: R2
- Flag:
  - `IMAGE_STORAGE_PROVIDER=r2`
- Monitoreo:
  - `plura.image.r2.errors`
  - p95 `/public/profesionales/{slug}`
  - bytes/req y efectividad de thumbnails
- Rollback:
  - `IMAGE_STORAGE_PROVIDER=local`

### Etapa 2: SQS jobs
- Flags:
  - `SQS_ENABLED=true`
  - `THUMBNAIL_SQS_ENABLED=true`
  - `SCHEDULE_SUMMARY_SQS_ENABLED=true`
  - `SEARCH_INDEX_SQS_ENABLED=true`
- Monitoreo:
  - `plura.sqs.dlq.count`
  - queue lag (visible messages)
  - errores del worker
  - CPU/mem de workers
- Rollback:
  - apagar flag del job afectado (si hace falta, `SQS_ENABLED=false`)

### Etapa 3: Meili search
- Flags:
  - `SEARCH_ENGINE_ENABLED=true`
  - `SEARCH_ENGINE_SUGGEST_ENABLED=true`
- Monitoreo:
  - p95 `/api/search` y `/api/search/suggest`
  - latencia/errores del motor
  - QPS de DB (debe bajar)
- Rollback:
  - `SEARCH_ENGINE_ENABLED=false`
  - `SEARCH_ENGINE_SUGGEST_ENABLED=false`

### Etapa 4: Availability summary como fuente
- Flags:
  - `SCHEDULE_SUMMARY_ENABLED=true`
  - `NEXT_AVAILABLE_AT_ENABLED=true`
  - `SEARCH_AVAILABILITY_SOURCE=FLAG`
- Monitoreo:
  - `plura.schedule.summary.next_available_at.null.ratio`
  - muestreo disponible-hoy vs slots reales
  - errores de rebuild
- Rollback:
  - `SEARCH_AVAILABILITY_SOURCE=AVAILABLE_SLOT`

### Etapa final: apagar rebuild masivo de `available_slot`
- Flag:
  - `AVAILABLE_SLOT_REBUILD_ENABLED=false`
- Monitoreo:
  - crecimiento DB
  - ausencia de dependencias activas en tabla legacy

## SLA targets (p95)
- `/api/search` (cache hit): `<200ms`
- `/api/search` (cache miss): `<600ms`
- `/api/search/suggest`: `<80ms`
- `/public/profesionales/{slug}`: `<80ms`
- `/public/profesionales/{slug}/slots`: `<150ms`
- `POST /reservas`: `<400ms`, error rate `<0.5%`

## Riesgos que siguen siendo críticos
- Abuso/DDoS lento en search/suggest (WAF + bot protection).
- Saturación DB por hidratación de IDs sin batching eficiente.
- Cardinalidad alta de cache keys y presión de memoria Redis.
- Backlog de jobs (thumbnails/index/summaries) por falta de workers.

## Orden técnico de despliegue (sin downtime)
1. Ejecutar migraciones:
   - `scripts/release/run_phase4_migrations.sh`
2. Deploy backend con flags default seguros (OFF donde aplique).
3. Smoke tests + dashboard baseline.
4. Activar etapas 1..4 gradualmente.
5. Apagar rebuild masivo al final (`AVAILABLE_SLOT_REBUILD_ENABLED=false`).

## Local dev

### Dependencias locales
- Redis + Meili:
  - `docker compose -f docker-compose.phase4.yml up -d redis meilisearch`
- LocalStack (SQS opcional):
  - `docker compose -f docker-compose.phase4.yml --profile sqs up -d`

### Test suite
- `./gradlew test`
