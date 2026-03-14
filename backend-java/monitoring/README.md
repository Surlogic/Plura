# Monitoring Local

Stack mínima para observar `provider_operation` con Prometheus y Grafana.

## Requisitos
- Backend corriendo en `localhost:3000`
- `OPS_INTERNAL_TOKEN` configurado en backend
- Docker Compose disponible

## Variables
- `GRAFANA_ADMIN_USER`
  Default: `admin`
- `GRAFANA_ADMIN_PASSWORD`
  Default: `admin`

## Secret requerido
Crear `backend-java/monitoring/secrets/prometheus_internal_token` con el mismo valor que `OPS_INTERNAL_TOKEN`.

Por defecto Prometheus scrapea `host.docker.internal:3000`. Si tu backend expone métricas en otro host/puerto, editá [prometheus/prometheus.yml](/home/german/Escritorio/Plura/backend-java/monitoring/prometheus/prometheus.yml).

## Levantar stack
```bash
cd backend-java/monitoring
mkdir -p secrets
printf '%s' 'tu-token' > secrets/prometheus_internal_token
docker compose -f docker-compose.monitoring.yml up -d
```

## URLs
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

## Qué queda configurado
- Scrape de `GET /internal/ops/actuator/prometheus` con header `X-Internal-Token`
- Reglas de alerta para:
  - leases vencidos
  - `UNCERTAIN` viejas
  - exceso de `RETRYABLE`
- Dashboard `Plura Provider Operation Overview`

## Reglas incluidas
- `PluraProviderOperationExpiredLeases`
- `PluraProviderOperationStaleUncertain`
- `PluraProviderOperationExcessiveRetryable`
