# Infra Y Configuracion

Este documento cruza el stack tecnico actual con las necesidades del producto definido para `Usuario`, `Free`, `Pro` y `Premium`.

## Stack principal

- Monorepo `pnpm`
- Web: `Next.js 15`, `React 19`, `TypeScript`
- Mobile: `Expo 54`, `React Native 0.81`, `expo-router`
- Backend: `Spring Boot 3.5`, `Java 17`, `JPA`, `Spring Security`
- Base de datos: PostgreSQL
- Migraciones: Flyway

## Lectura de infraestructura por eje de producto

### Auth, seguridad y sesiones

Necesario para:

- registro y login
- recuperacion de cuenta
- sesiones
- login social con Google y Apple
- roles `cliente` y `profesional`

Infra actual detectada:

- JWT
- refresh tokens
- cookies y bearer tokens segun plataforma
- OAuth Google y Apple
- rate limiting
- auditoria auth

### Marketplace, ubicacion y mapa

Necesario para:

- buscador y filtros
- perfil publico
- direccion y mapa
- disponibilidad con contexto geografico

Infra actual detectada:

- search propio con cache
- Meilisearch opcional
- geocoding y suggest
- Mapbox en frontend

### Servicios, agenda, reservas y operaciones

Necesario para:

- constructor de servicios
- horarios de trabajo
- bloqueos manuales
- motor de disponibilidad
- estados de reserva
- carga manual de turnos

Infra actual detectada:

- dominio `professional`
- dominio `booking`
- dominio `availability`
- persistencia via PostgreSQL + Flyway

### Imagenes y media

Necesario para:

- fotos de perfil
- fotos de servicios
- portfolio visual futuro

Infra actual detectada:

- storage local o Cloudflare R2
- modulo `storage`
- endpoint de imagen para servicios

Nota:

- el texto de producto habla de "conectar con bd de imagenes", pero en el repo la decision visible hoy es `object storage`, no una base de datos de imagenes dedicada
- si se piensa en portfolio, looks o tienda, conviene mantener storage de objetos + metadata en PostgreSQL

### Pagos, suscripciones y cobros

Necesario para:

- suscripcion mensual sin comision por reserva
- pagos online configurables
- cobro al reservar o en local
- webhooks y conciliacion

Infra actual detectada:

- Mercado Pago
- checkout y subscription
- provider operations
- payouts y refunds

Lectura real del backend hoy:

- `Mercado Pago` esta conectado al billing de suscripciones de plataforma
- `Mercado Pago` ya tiene ademas configuracion OAuth para conectar cuentas de profesionales
- `Mercado Pago` tambien esta conectado al checkout real de reservas y refunds usando OAuth del profesional
- ya existe storage de OAuth para cuentas Mercado Pago de profesionales en `professional_payment_provider_connection`
- `payment_event`, `payment_transaction` y `provider_operation` ya funcionan como base de auditoria y conciliacion compartida

Variables nuevas de backend para Mercado Pago OAuth:

- `BILLING_MERCADOPAGO_OAUTH_CLIENT_ID`
- `BILLING_MERCADOPAGO_OAUTH_CLIENT_SECRET`
- `BILLING_MERCADOPAGO_OAUTH_REDIRECT_URI`
- `BILLING_MERCADOPAGO_OAUTH_AUTHORIZATION_URL`
- `BILLING_MERCADOPAGO_OAUTH_TOKEN_URL`
- `BILLING_MERCADOPAGO_OAUTH_TOKEN_ENCRYPTION_KEY`

Variables nuevas de backend para reservas y refunds Mercado Pago:

- `BILLING_MERCADOPAGO_RESERVATION_PREFERENCE_PATH`
- `BILLING_MERCADOPAGO_RESERVATION_PAYMENT_STATUS_PATH`
- `BILLING_MERCADOPAGO_RESERVATION_PAYMENT_SEARCH_PATH`
- `BILLING_MERCADOPAGO_RESERVATION_REFUND_PATH`

### Notificaciones y automatizaciones

Necesario para:

- confirmaciones
- recordatorios
- cambios de estado
- pedido de reseñas
- automatizaciones Pro y Premium

Infra actual detectada:

- email SMTP
- jobs opcionales con SQS

Capacidad pendiente o no claramente documentada:

- centro de notificaciones persistente
- motor de eventos de producto mas visible
- integracion operativa por email e in-app

### Analytics y eventos del producto

Necesario para:

- analytics basicos en `Pro`
- analytics avanzados en `Premium`
- entendimiento de embudo marketplace -> reserva -> retorno

Infra actual detectada:

- Prometheus y Actuator para observabilidad tecnica
- Micrometer ya registra timings utiles en search y ahora tambien en public profile, public slots, client bookings, notification inbox y unread count

Pendiente a nivel de producto:

- capa clara de eventos funcionales
- definicion de KPIs de negocio y plan
- reporting por profesional y por local

## Variables relevantes por capa

### Web

Variables detectadas en uso:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_APPLE_CLIENT_ID`
- `NEXT_PUBLIC_APPLE_REDIRECT_URI`
- `NEXT_PUBLIC_APPLE_REDIRECT`
- `NEXT_PUBLIC_SEARCH_DEFAULT_CITY_SUGGESTIONS`
- `NEXT_IMAGE_REMOTE_HOSTS`
- `NEXT_BUILD_DIR`
- `ANALYZE`
- `SKIP_HOME_SSG_FETCH`
- `ANALYZE`

Lectura de producto:

- cubre API, mapa y login social en web
- el repo ya trae `pnpm -C apps/web analyze` para abrir el analisis de chunks sin agregar tooling nuevo

### Mobile

Variables detectadas en uso:

- `EXPO_PUBLIC_API_URL`
- `MAPBOX_TOKEN`
- `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`

Archivo ejemplo:

- `apps/mobile/.env.example`

Lectura de producto:

- mobile ya tiene base para API, mapa y login Google

### Backend

Areas de configuracion principales en `application.yml`:

- server y compresion
- datasource PostgreSQL y H2 fallback
- Flyway
- JWT y refresh token
- OAuth Google y Apple
- mail SMTP
- cache y Redis
- feature flags de search, profile y slots
- CORS
- auth cookies y password reset
- rate limiting
- storage local o R2
- SQS
- search engine externo
- billing
- observabilidad via Actuator / Prometheus / Micrometer timers

Variables criticas sin las que el backend puede fallar o degradarse:

- `JWT_SECRET`
- `JWT_REFRESH_PEPPER`
- credenciales DB productivas
- credenciales OAuth si se usa login social
- variables de billing si se habilitan pagos reales

Notas operativas de performance hoy:

- `GET /cliente/reservas/me` queda mejor cubierto con el indice Flyway `idx_booking_user_start` sobre `booking(user_id, start_date_time)`
- search, perfil publico, slots, inbox y unread ya tienen timings tecnicos listos para enganchar a dashboards

## Desarrollo local

Comandos esperados:

```bash
pnpm install
pnpm dev
pnpm dev:web
pnpm dev:backend-java
```

El script `scripts/predev.sh`:

- limpia artefactos de Next en web
- mata procesos previos ocupando `3000` o `3002` cuando corresponde

## Deploy

`render.yaml` define:

- `plura-api`: backend Docker
- `plura-web`: app Next.js
- `plura-db`: base PostgreSQL gestionada

## Integraciones externas detectadas

- Google OAuth
- Apple OAuth
- Mapbox
- Mercado Pago
- Redis
- Meilisearch
- AWS S3 SDK / Cloudflare R2
- AWS SQS
- SMTP
- Prometheus / Actuator

## Integraciones importantes para roadmap que no aparecen cerradas

- proveedor de email transaccional para automatizaciones operativas
- sistema de eventos de producto para analytics y notificaciones
- servicio de reseñas o media mas rico para portfolio y fotos destacadas

## Scripts operativos utiles

- `backend-java/scripts/geocode_professional_profiles.sh`
  - geocodifica perfiles profesionales sin coordenadas
- `backend-java/scripts/audit_public_consistency.sh`
  - compara servicios y agenda publicados contra DB
- `backend-java/scripts/release/run_phase3_migrations.sh`
- `backend-java/scripts/release/run_phase4_migrations.sh`

## Observaciones de mantenimiento

- `docker-compose.yml` de raiz parece de una estructura anterior y no coincide con `backend-java`.
- `packages/shared` no esta empaquetado como workspace package consumible.
- `apps/web/next.config.js` habilita `externalDir` para poder importar desde `packages/shared/src`.
- el backend contempla H2 como fallback de arranque, pero la app real esta pensada para PostgreSQL.
- el naming de planes en codigo sigue siendo `BASIC / PROFESIONAL / ENTERPRISE`; el contexto de producto actualizado usa `Free / Pro / Premium`.
- Flyway conserva migraciones historicas de dLocal (`V34`, `V37`) solo por continuidad de schema; el runtime vigente ya es Mercado Pago only y `V47` elimina los campos legacy del dominio profesional.
