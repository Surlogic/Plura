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

Lectura operativa actual:

- `auth_session` es la ruta principal de sesiones persistidas
- `auth_refresh_token` queda como compatibilidad legacy del modelo anterior, pero el fallback por default ya no viene habilitado en `application.yml`
- en web, el interceptor de refresh y los providers de perfil ya no degradan cualquier error a logout: solo `401/403` invalidan la sesion; errores de red, timeout o `5xx` quedan como fallas transitorias sin limpiar credenciales locales

### Marketplace, ubicacion y mapa

Necesario para:

- buscador y filtros
- perfil publico
- direccion y mapa
- disponibilidad con contexto geografico

Infra actual detectada:

- search propio con cache
- materialized views PostgreSQL para search y suggest
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
- el enum `PaymentProvider` mantiene compatibilidad con filas legacy `DLOCAL` solo para que lecturas historicas no rompan reservas ni mediciones
- el runtime operativo ya no acepta `DLOCAL` como input nuevo; cualquier operacion pendiente legacy se degrada a compatibilidad o se marca como provider retirado
- la semantica valida de pagos online actuales sigue centrada en `Mercado Pago`

Variables de backend para Mercado Pago de suscripciones:

- `BILLING_MERCADOPAGO_SUBSCRIPTIONS_ACCESS_TOKEN`
- `BILLING_MERCADOPAGO_SUBSCRIPTIONS_WEBHOOK_SECRET`

Variables de backend para Mercado Pago de reservas y OAuth profesional:

- `BILLING_MERCADOPAGO_RESERVATIONS_PLATFORM_ACCESS_TOKEN`
- `BILLING_MERCADOPAGO_RESERVATIONS_WEBHOOK_SECRET`
- `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_CLIENT_ID`
- `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_CLIENT_SECRET`
- `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_REDIRECT_URI`
- `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_FRONTEND_REDIRECT_URL`
- `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_AUTHORIZATION_URL`
- `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_TOKEN_URL`
- `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_STATE_SIGNING_SECRET`
- `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_TOKEN_ENCRYPTION_KEY`
- `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_PKCE_ENABLED`

Notas reales de binding local:

- el backend no depende solo del `.env` del cwd: ahora intenta leer `./.env` y tambien `./backend-java/.env`
- si se ejecuta el backend desde la raiz del monorepo, `backend-java/.env` sigue siendo tomado como fallback
- el backend mantiene fallback a los nombres legacy `BILLING_MERCADOPAGO_ACCESS_TOKEN`, `BILLING_MERCADOPAGO_WEBHOOK_SECRET` y `BILLING_MERCADOPAGO_OAUTH_*`, pero el naming operativo recomendado ya es explicito por dominio: `SUBSCRIPTIONS_*` para planes y `RESERVATIONS_*` para cobros/OAuth profesional
- para OAuth de Mercado Pago el error de `state` ya no implica adivinar secretos: el backend espera primero `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_STATE_SIGNING_SECRET`, y si no existe hace fallback a la clave de cifrado o al client secret
- en local, tener solo `BILLING_MERCADOPAGO_RESERVATIONS_PLATFORM_ACCESS_TOKEN` no alcanza para OAuth: para abrir el onboarding siguen siendo obligatorios `CLIENT_ID` y `REDIRECT_URI`; para completar el callback y persistir la conexion del profesional tambien se vuelve obligatorio `CLIENT_SECRET`
- con `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_PKCE_ENABLED=true`, el backend genera `code_verifier` y `code_challenge` con `S256`, persiste temporalmente el `verifier` cifrado en `professional_payment_provider_connection`, y en el token exchange manda `code_verifier` sin exponerlo al frontend
- `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_REDIRECT_URI` debe coincidir exactamente con el callback backend registrado en la app OAuth de Mercado Pago; ejemplos:
  `http://localhost:3000/profesional/payment-providers/mercadopago/oauth/callback`
  `https://plura-ir62.onrender.com/profesional/payment-providers/mercadopago/oauth/callback`
- `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_FRONTEND_REDIRECT_URL` es la pantalla web final de resultado y no debe registrarse en Mercado Pago como Redirect URL OAuth
- el storage de credenciales para miles de profesionales ya esta separado en tres capas: credenciales globales de suscripciones, credenciales globales de reservas/OAuth profesional y tokens por profesional cifrados en `professional_payment_provider_connection`
- `metadata_json` de la conexion OAuth no debe guardar la respuesta cruda del provider ni tokens en claro; solo metadata minima util como `scope`, `userId`, `publicKey` y flags operativos
- la misma fila `professional_payment_provider_connection` guarda ahora tambien el intento OAuth pendiente (`pending_oauth_state`, `pending_oauth_state_expires_at`, `pending_oauth_code_verifier_encrypted`) para resolver PKCE y correlacionar callbacks sin depender de memoria de proceso

Variable web nueva para Mercado Pago reservas:

- `NEXT_PUBLIC_MERCADOPAGO_RESERVATIONS_PUBLIC_KEY`

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
- para probar localmente OAuth profesional de Mercado Pago end-to-end, `.env.frontend` debe apuntar al backend local (`NEXT_PUBLIC_API_URL=http://localhost:3000`); si la web local apunta a Render, el onboarding usa el backend remoto aunque la UI corra en `localhost:3002`

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
- refresh de materialized views de search
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
- variables OAuth de Mercado Pago si se quiere conectar la cuenta del profesional desde billing

Notas operativas de performance hoy:

- `GET /cliente/reservas/me` queda mejor cubierto con el indice Flyway `idx_booking_user_start` sobre `booking(user_id, start_date_time)`
- search, perfil publico, slots, inbox y unread ya tienen timings tecnicos listos para enganchar a dashboards
- `QUERY_COUNT_HEADER_ENABLED=true` expone `X-Plura-Sql-Query-Count` para requests HTTP y cuenta sentencias Hibernate/JPA por request; no cubre consultas JDBC directas como search o el nuevo inbox read path
- `V50__scale_hardening_indexes.sql` limpia indices sin uso claro en `email_dispatch`, `provider_operation` y `booking`, y agrega cobertura para lecturas por `provider_operation(status, updated_at|lease_until)` y `payment_transaction(external_reference, created_at)`
- `provider_operation.findDueOperations()` ahora evita leer operaciones con `lease_until` todavia activo, para bajar churn del worker bajo concurrencia
- los defaults del backend quedaron mas conservadores para scale-out:
  - `HIKARI_MIN_IDLE` default `2`
  - `AUTH_ALLOW_LEGACY_REFRESH_FALLBACK` default `false`
  - `APP_SEARCH_SLOT_BOOTSTRAP_ENABLED` default `false`
  - `SEARCH_MV_REFRESH_ON_STARTUP` default `false`
- el script `backend-java/scripts/loadtests/perf_phase3_rollout.js` ahora acepta `SCENARIO_DURATION` y VUs por escenario via env para poder correr smoke/perf sin editar el archivo

Variables nuevas relevantes de performance:

- `SEARCH_MV_REFRESH_ENABLED`
- `SEARCH_MV_REFRESH_ON_STARTUP`
- `SEARCH_MV_REFRESH_CRON`
- `QUERY_COUNT_HEADER_ENABLED`

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

Notas reales de deploy en Render:

- `plura-api` debe declarar tambien `APP_PUBLIC_WEB_URL` para links/callbacks absolutos
- para OAuth Mercado Pago del profesional el servicio backend necesita exponer en Render:
  - `BILLING_MERCADOPAGO_RESERVATIONS_PLATFORM_ACCESS_TOKEN`
  - `BILLING_MERCADOPAGO_RESERVATIONS_WEBHOOK_SECRET`
  - `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_CLIENT_ID`
  - `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_CLIENT_SECRET`
  - `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_REDIRECT_URI`
  - `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_FRONTEND_REDIRECT_URL`
  - `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_AUTHORIZATION_URL`
  - `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_TOKEN_URL`
  - `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_STATE_SIGNING_SECRET`
  - `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_TOKEN_ENCRYPTION_KEY`
- para suscripciones Mercado Pago el backend debe exponer aparte:
  - `BILLING_MERCADOPAGO_SUBSCRIPTIONS_ACCESS_TOKEN`
  - `BILLING_MERCADOPAGO_SUBSCRIPTIONS_WEBHOOK_SECRET`
- `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_REDIRECT_URI` debe apuntar exactamente al callback backend del profesional:
  - local: `http://localhost:3000/profesional/payment-providers/mercadopago/oauth/callback`
  - deploy api actual: `https://plura-ir62.onrender.com/profesional/payment-providers/mercadopago/oauth/callback`
- `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_FRONTEND_REDIRECT_URL` es solo la pantalla final:
  - local: `http://localhost:3002/oauth/mercadopago/callback`
  - deploy web actual: `https://plura-web.onrender.com/oauth/mercadopago/callback`
- el backend compila para Render con Java 17; cualquier uso de APIs de virtual threads de Java 21 rompe el `bootJar` del deploy

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

- `docker-compose.yml` de raiz ya quedo alineado con el monorepo actual: levanta `backend-java` con Gradle y `apps/web` con `pnpm`, usando `.env.backend`, `backend-java/.env` y `.env.frontend`
- `packages/shared` no esta empaquetado como workspace package consumible.
- `apps/web/next.config.js` habilita `externalDir` para poder importar desde `packages/shared/src`.
- el backend contempla H2 como fallback de arranque, pero la app real esta pensada para PostgreSQL.
- el naming de planes en codigo sigue siendo `BASIC / PROFESIONAL / ENTERPRISE`; el contexto de producto actualizado usa `Free / Pro / Premium`.
- Flyway conserva migraciones historicas de dLocal (`V34`, `V37`) solo por continuidad de schema; el runtime vigente ya es Mercado Pago only y `V47` elimina los campos legacy del dominio profesional.
- billing de suscripciones requiere que el schema de `subscription` acepte `PLAN_BASIC`, `PLAN_PROFESIONAL` y `PLAN_ENTERPRISE`; `V51` alinea el constraint legacy que todavia admitia `PLAN_PRO` y `PLAN_PREMIUM`
- en local, `backend-java/.env` usa como retorno de suscripcion Mercado Pago una URL publica HTTPS de Render en vez de `localhost`, porque `preapproval` no acepta `localhost` y `plura.com` no estaba resolviendo un TLS util para el retorno
- en `render.yaml`, el servicio `plura-api` usa `rootDir=backend-java`, por lo que `dockerfilePath` y `dockerContext` deben mantenerse relativos a esa carpeta; hoy quedaron alineados a `./Dockerfile` y `.`
- el blueprint de Render ya expone tanto variables legacy de Mercado Pago como el naming explicito por dominio `SUBSCRIPTIONS_*` y `RESERVATIONS_*`, incluido el flag `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_PKCE_ENABLED`
