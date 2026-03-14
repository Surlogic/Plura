# Backend Endpoints Y Dominios

Base de codigo: `backend-java/src/main/java/com/plura/plurabackend`

## Endpoints principales

### Salud y home

- `GET /health`
- `GET /api/home`
- `GET /categories`
- `GET /api/categories`

### Auth y sesiones

Prefijo: `/auth`

- `POST /auth/register`
- `POST /auth/register/cliente`
- `POST /auth/register/profesional`
- `POST /auth/login`
- `POST /auth/login/cliente`
- `POST /auth/login/profesional`
- `POST /auth/oauth`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `POST /auth/password/change`
- `POST /auth/password/forgot`
- `POST /auth/password/reset`
- `POST /auth/verify/email/send`
- `POST /auth/verify/email/confirm`
- `POST /auth/verify/phone/send`
- `POST /auth/verify/phone/confirm`
- `POST /auth/challenge/send`
- `POST /auth/challenge/verify`
- `GET /auth/sessions`
- `DELETE /auth/sessions/{sessionId}`
- `DELETE /auth/me`
- `GET /auth/audit`
- `GET /auth/me/profesional`
- `GET /auth/me/professional`
- `GET /auth/me/cliente`

El dominio `auth` incluye:

- JWT + refresh tokens
- sesiones persistidas
- auditoria auth
- password reset
- verificacion email y telefono
- OTP challenge
- OAuth Google y Apple
- proteccion anti abuso

### Busqueda y geolocalizacion

- `GET /api/search`
- `GET /api/search/suggest`
- `GET /api/geo/autocomplete`
- `GET /api/geo/geocode`
- `GET /api/geo/suggest`

El backend soporta:

- busqueda desde DB
- cache de search/suggest
- engine externo opcional via Meilisearch
- indexacion y reindexado

### Profesionales publicos

Prefijo: `/public/profesionales`

- `GET /public/profesionales`
- `GET /public/profesionales/{slug}`
- `GET /public/profesionales/{slug}/slots`
- `POST /public/profesionales/{slug}/reservas`

### Configuracion del profesional

Prefijo: `/profesional`

- `GET /profesional/public-page`
- `PUT /profesional/public-page`
- `PUT /profesional/profile`
- `GET /profesional/payout-config`
- `PUT /profesional/payout-config`
- `GET /profesional/schedule`
- `GET /profesional/booking-policy`
- `PUT /profesional/booking-policy`
- `PUT /profesional/schedule`
- `GET /profesional/services`
- `POST /profesional/services`
- `POST /profesional/services/image`
- `PUT /profesional/services/{id}`
- `DELETE /profesional/services/{id}`
- `GET /profesional/reservas`
- `POST /profesional/reservas`
- `PUT /profesional/reservas/{id}`

### Reservas del cliente

- `GET /cliente/reservas`
- `GET /cliente/reservas/me`
- `GET /cliente/reservas/proxima`
- `POST /cliente/reservas/{id}/cancel`
- `POST /cliente/reservas/{id}/reschedule`
- `POST /cliente/reservas/{id}/payment-session`

### Acciones sobre reservas

- `GET /reservas/{id}/actions`
- `GET /bookings/{id}/actions`

### Acciones del profesional sobre reservas

Prefijo: `/profesional/reservas`

- `POST /profesional/reservas/{id}/cancel`
- `POST /profesional/reservas/{id}/reschedule`
- `POST /profesional/reservas/{id}/no-show`
- `POST /profesional/reservas/{id}/complete`
- `POST /profesional/reservas/{id}/payout/retry`

### Favoritos

Prefijo: `/cliente/favoritos`

- `GET /cliente/favoritos`
- `POST /cliente/favoritos/{slug}`
- `DELETE /cliente/favoritos/{slug}`

### Billing

Prefijo: `/billing`

- `POST /billing/checkout`
- `POST /billing/subscription`
- `GET /billing/subscription`
- `POST /billing/cancel`

Webhooks:

- `POST /webhooks/mercadopago`
- `POST /webhooks/dlocal`

El dominio `billing` tambien incluye:

- suscripciones
- checkout
- ledger de eventos de pago
- provider clients
- payouts
- refunds
- verificacion de operaciones
- alertas y worker de provider ops

### Endpoints internos de operaciones

- `GET /internal/ops/provider-operations/alerts`
- `GET /internal/ops/bookings/alerts`
- `GET /internal/ops/bookings/{id}/detail`
- `POST /internal/ops/bookings/{id}/refund/retry`
- `POST /internal/ops/bookings/{id}/payout/retry`
- `POST /internal/ops/bookings/{id}/financial/recompute`
- `POST /internal/ops/bookings/{id}/reconcile`

## Paquetes backend mas importantes

- `auth`: autenticacion, sesiones, auditoria, OAuth y verificaciones.
- `professional`: perfil, pagina publica, servicios, agenda y payout.
- `booking`: reserva, acciones, comandos, pagos y politica.
- `billing`: suscripciones, checkout, webhooks y operaciones del proveedor.
- `availability`: slots disponibles y resumenes de agenda.
- `search`: busqueda, suggest, indexacion y sync.
- `cache`: cache in-memory y Redis.
- `storage`: upload de imagenes y thumbnails.
- `jobs`: integracion opcional con SQS.

## Persistencia

- Flyway usa `backend-java/src/main/resources/db/migration`
- hay `40` migraciones versionadas
- los nombres muestran evolucion fuerte en:
  - billing
  - booking
  - auth sessions
  - search hardening
  - availability
  - service categories
