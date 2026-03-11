# Backend Java

## Timezone del sistema (MVP)
- Zona fija: `APP_TIMEZONE` (default `America/Montevideo`).
- Endpoint de slots y creación de reservas usan esta zona para:
  - calcular "horas pasadas";
  - validar fecha futura;
  - interpretar `startDateTime` recibido.
- Recomendación de contrato frontend:
  - enviar `date` como `YYYY-MM-DD` para slots;
  - enviar `startDateTime` en ISO (`YYYY-MM-DDTHH:mm` o con offset, ej. `2026-02-27T13:00:00Z`).

## Search de escala (PostGIS + trigram)
- Migración versionada: `backend-java/src/main/resources/db/migration/V9__search_scale_foundation.sql`
- Extensiones: `postgis`, `pg_trgm`, `unaccent`, `pgcrypto`.
- Crea/actualiza:
  - columnas geo y ranking en `professional_profile`;
  - tabla `available_slot` (precomputada);
  - tabla `geo_location_seed` para autocomplete;
  - índices GIST/GIN y de filtros.

## Migraciones (Flyway)

Flyway corre al iniciar la app (startup) y mantiene historial en `flyway_schema_history`.

Variables relevantes:

- `SPRING_FLYWAY_ENABLED=true`
- `SPRING_FLYWAY_BASELINE_ON_MIGRATE=true`
- `SPRING_FLYWAY_LOCATIONS=classpath:db/migration`

Legacy/manual (solo fallback operativo):

```bash
psql \"$SPRING_DATASOURCE_URL\" -f backend-java/db/search_scale_foundation.sql
psql \"$SPRING_DATASOURCE_URL\" -f backend-java/db/professional_coordinates.sql
```

## Geocodificación de direcciones existentes
- Script: `backend-java/scripts/geocode_professional_profiles.sh`
- Requisitos:
  - `NEXT_PUBLIC_MAPBOX_TOKEN` exportado en el entorno.
  - `.env` del backend con `SPRING_DATASOURCE_*`.

Ejemplo:

```bash
export NEXT_PUBLIC_MAPBOX_TOKEN=pk...
backend-java/scripts/geocode_professional_profiles.sh 500
```

## Billing de suscripciones (profesionales)
- Endpoints:
  - `POST /billing/subscription` (JWT `ROLE_PROFESSIONAL`)
  - `GET /billing/subscription` (JWT `ROLE_PROFESSIONAL`)
  - `POST /billing/cancel` (JWT `ROLE_PROFESSIONAL`)
  - `POST /webhooks/mercadopago` (público, firma obligatoria)
  - `POST /webhooks/dlocal` (público, firma obligatoria)
- Alias legacy:
  - `POST /billing/checkout` sigue disponible solo por compatibilidad y redirige internamente a `createSubscription`.
- Migración Flyway:
  - `backend-java/src/main/resources/db/migration/V13__billing_subscriptions.sql`

Variables requeridas (ejemplo placeholders):

```env
BILLING_ENABLED=true
BILLING_MODE=sandbox
BILLING_WEBHOOK_BASE_URL=https://api.tudominio.com

BILLING_PLAN_BASIC_PRICE=990
BILLING_PLAN_BASIC_CURRENCY=UYU
BILLING_PLAN_PRO_PRICE=1990
BILLING_PLAN_PRO_CURRENCY=UYU
BILLING_PLAN_PREMIUM_PRICE=2990
BILLING_PLAN_PREMIUM_CURRENCY=UYU

BILLING_MERCADOPAGO_ENABLED=true
BILLING_MERCADOPAGO_ACCESS_TOKEN=mp_test_xxx
BILLING_MERCADOPAGO_WEBHOOK_SECRET=mp_webhook_secret

BILLING_DLOCAL_ENABLED=false
BILLING_DLOCAL_X_LOGIN=dl_x_login
BILLING_DLOCAL_X_TRANS_KEY=dl_x_trans_key
BILLING_DLOCAL_WEBHOOK_SECRET=dl_webhook_secret
```

Notas de seguridad:
- No loguear secretos (`ACCESS_TOKEN`, `WEBHOOK_SECRET`, `X_TRANS_KEY`).
- El estado de suscripción se confirma por webhook, no por frontend.
- Webhooks son idempotentes por `UNIQUE(provider, provider_event_id)`.

Sandbox rápido:
1. Verificar que Flyway esté habilitado y levantar backend.
2. Configurar `BILLING_*` en `.env` local con credenciales sandbox.
3. Levantar backend y llamar `POST /billing/subscription`.
4. Configurar URL pública de webhook hacia:
   - `/webhooks/mercadopago`
   - `/webhooks/dlocal`

Simular webhook (local):

```bash
curl -X POST http://localhost:3000/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: req-1" \
  -H "X-Signature: ts=1700000000,v1=<firma_hmac>" \
  -d '{"id":"evt-1","type":"payment","status":"approved","external_reference":"1","data":{"id":"pay-1"}}'
```
