# Backend Endpoints Y Dominios

Base de codigo: `backend-java/src/main/java/com/plura/plurabackend`

Este documento describe el backend desde dos capas:

- endpoints y dominios disponibles hoy
- lectura de producto segun `core`, `Usuario`, `Free`, `Pro` y `Premium`

## Lectura ejecutiva

El backend ya cubre gran parte del nucleo operativo del MVP:

- auth y sesiones
- perfiles
- servicios
- agenda y disponibilidad
- reservas
- busqueda
- geolocalizacion
- billing y pagos

Tambien hay senales de una base mas amplia que el MVP:

- OTP y auditoria auth
- payouts y provider operations
- cache, storage y jobs

Todavia no se ve como superficie publica madura todo el set de:

- notificaciones cliente en frontend web
- reseñas y respuestas
- analytics de producto
- fidelizacion y ultima hora
- multi-profesional avanzado

## Endpoints principales

### Salud y home

- `GET /health`
- `GET /api/home`
- `GET /categories`
- `GET /api/categories`

Lectura de producto:

- base para home, categorias y marketplace
- relevante para `Usuario` y para la visibilidad del plan `Free`

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

Lectura de producto:

- cubre el bloque `CORE` de autenticacion y seguridad
- soporta registro directo del profesional en `Free`
- ya da base para login social y gestion de sesiones

### Busqueda y geolocalizacion

- `GET /api/search`
- `GET /api/search/suggest`
- `GET /api/geo/autocomplete`
- `GET /api/geo/geocode`
- `GET /api/geo/suggest`

El backend soporta:

- busqueda desde DB
- cache de search y suggest
- engine externo opcional via Meilisearch
- indexacion y reindexado
- timers Micrometer para `search`
- materialized views denormalizadas `search_professional_document_mv` y `search_service_document_mv` para bajar joins por request sin cambiar `/api/search` ni `/api/search/suggest`
- refresh concurrente al startup y por cron de las materialized views de search
- atajo conservador en primera pagina para evitar `COUNT(*)` cuando el resultado completo entra en una sola pagina sin romper el total exacto
- suggest con menor sobrelectura antes del ordenado final para bajar costo del typeahead sin cambiar contrato

Lectura de producto:

- cubre marketplace, buscador y filtros
- tambien cubre ubicacion, direccion y mapa

### Profesionales publicos

Prefijo: `/public/profesionales`

- `GET /public/profesionales`
- `GET /public/profesionales/{slug}`
- `GET /public/profesionales/{slug}/slots`
- `POST /public/profesionales/{slug}/reservas`

Lectura de producto:

- circuito publico central del MVP
- soporta perfil publico, disponibilidad real y reserva sin pasar por panel privado
- es la base de `Usuario` y del valor visible de `Free`
- `GET /public/profesionales/{slug}` mantiene cache de perfil publico y ahora registra timing tecnico
- `GET /public/profesionales/{slug}/slots` mantiene el mismo calculo funcional de disponibilidad, pero usa un finder liviano del profesional y registra timing tecnico

### Configuracion del profesional

Prefijo: `/profesional`

- `GET /profesional/public-page`
- `PUT /profesional/public-page`
- `PUT /profesional/profile`
- `GET /profesional/schedule`
- `GET /profesional/booking-policy`
- `PUT /profesional/booking-policy`
- `PUT /profesional/schedule`
- `GET /profesional/services`
- `POST /profesional/services`
- `POST /profesional/services/image`
- `PUT /profesional/services/{id}`
- `DELETE /profesional/services/{id}`
- `GET /profesional/payment-providers/mercadopago/connection`
- `POST /profesional/payment-providers/mercadopago/oauth/start`
- `GET /profesional/payment-providers/mercadopago/oauth/callback`
- `DELETE /profesional/payment-providers/mercadopago/connection`
- `GET /profesional/reservas`
- `POST /profesional/reservas`
- `PUT /profesional/reservas/{id}`

Lectura de producto:

- cubre perfil editable del negocio o profesional
- cubre constructor de servicios, imagen principal, duracion y precio
- cubre horarios de trabajo y politicas de reserva
- cubre carga manual de turnos desde panel
- `GET /profesional/reservas` sostiene gestion operativa de reservas para `Free/BASIC` y no debe confundirse con gating de agenda semanal o mensual
- `POST /profesional/payment-providers/mercadopago/oauth/start` y `GET /profesional/payment-providers/mercadopago/oauth/callback` ahora exigen capacidad `ONLINE_PAYMENTS`; `BASIC` no puede iniciar ni completar la conexion OAuth
- `POST /profesional/payment-providers/mercadopago/oauth/start` solo necesita la configuracion minima para abrir Mercado Pago: `client-id`, `redirect-uri` y `authorization-url`
- `billing.mercadopago.oauth.redirect-uri` debe apuntar al callback backend exacto `/profesional/payment-providers/mercadopago/oauth/callback`; el frontend ya no recibe `code/state` crudos de Mercado Pago
- `GET /profesional/payment-providers/mercadopago/oauth/callback` sigue requiriendo `client-secret` y `token-url`, porque ahi recien se canjea el `code` y se guardan los tokens OAuth del profesional; despues redirige al frontend con un resultado resumido `connected / cancelled / error`
- el callback valida `state` firmado contra el profesional autenticado; si el `state` pertenece a otro profesional, responde `403`
- la misma cuenta Mercado Pago no puede quedar conectada simultaneamente a dos profesionales distintos; el backend rechaza esa reconexion con `409`
- si el navegador reintenta el callback despues de una conexion ya exitosa y Mercado Pago responde `invalid_grant` por reutilizacion del `code`, el backend conserva la conexion existente y trata ese replay como idempotente

Notas:

- `POST /profesional/services/image` confirma que el repo ya integra carga de imagenes en servicios
- la capa de categorias existe en el sistema, pero el nivel exacto de etiquetas y reglas por servicio requiere revisar dominio y UI puntual

### Reservas del cliente

- `GET /cliente/reservas`
- `GET /cliente/reservas/me`
- `GET /cliente/reservas/proxima`
- `GET /cliente/reservas/{bookingId}/timeline`
- `POST /cliente/reservas/{id}/cancel`
- `POST /cliente/reservas/{id}/reschedule`
- `POST /cliente/reservas/{id}/payment-session`

Lectura de producto:

- cubre historial y gestion de reservas del plan `Usuario`
- soporta cancelacion y reagendamiento segun politica
- `payment-session` es la base para reserva con pago online
- `payment-session` solo admite `MERCADOPAGO`; si existe una transaccion pendiente legacy `DLOCAL`, la sesion se reabre con Mercado Pago para no romper el checkout vigente
- `timeline` ya expone historial operativo de eventos de notification por reserva para el cliente autenticado
- `GET /cliente/reservas/me` conserva el mismo response shape, pero ahora batch-ea summary/refund/payout latest por booking ids y queda mejor cubierto por un indice Flyway `booking(user_id, start_date_time)`

### Notificaciones del cliente

Prefijo: `/cliente`

- `GET /cliente/notificaciones`
- `GET /cliente/notificaciones/unread-count`
- `GET /cliente/notificaciones/{id}`
- `PATCH /cliente/notificaciones/{id}/read`
- `PATCH /cliente/notificaciones/read-all`

Lectura de producto:

- ya existe inbox in-app y lectura para cliente a nivel backend
- la ownership queda scopeada por `recipientType=CLIENT` y `recipientId=userId autenticado`
- reutiliza el mismo modulo `core.notification` que profesional
- inbox y unread count registran timing tecnico para no seguir ciegos sobre latencia real
- el inbox paginado ahora sale por una ruta JDBC directa sobre `app_notification` + `notification_event` para evitar hidratacion JPA y parsing repetido del assembler en el listado

### Notificaciones del profesional

Prefijo: `/profesional`

- `GET /profesional/notificaciones`
- `GET /profesional/notificaciones/unread-count`
- `GET /profesional/notificaciones/{id}`
- `PATCH /profesional/notificaciones/{id}/read`
- `PATCH /profesional/notificaciones/read-all`
- `GET /profesional/reservas/{bookingId}/timeline`

Lectura de producto:

- el backend ya expone inbox, contador y timeline operativo para el profesional
- el ownership usa `recipientType=PROFESSIONAL` y `recipientId=professionalProfileId`
- inbox y unread count registran timing tecnico para observabilidad basica
- el inbox profesional comparte la misma ruta JDBC directa del inbox cliente para bajar costo del listado paginado

### Acciones sobre reservas

- `GET /reservas/{id}/actions`
- `GET /bookings/{id}/actions`

Lectura de producto:

- importante para mostrar que puede hacer cada actor segun estado y politica
- conecta con el modelo de estados: pendiente, confirmado, cancelado, completado y no-show

### Acciones del profesional sobre reservas

Prefijo: `/profesional/reservas`

- `POST /profesional/reservas/{id}/cancel`
- `POST /profesional/reservas/{id}/reschedule`
- `POST /profesional/reservas/{id}/no-show`
- `POST /profesional/reservas/{id}/complete`

Lectura de producto:

- confirma que el backend ya contempla estados operativos clave
- cubre buena parte de agenda diaria y gestion de reservas de `Free`
- `no-show` y `complete` son base para analytics y seguimiento posteriores

### Favoritos

Prefijo: `/cliente/favoritos`

- `GET /cliente/favoritos`
- `POST /cliente/favoritos/{slug}`
- `DELETE /cliente/favoritos/{slug}`

Lectura de producto:

- feature del plan `Usuario`
- entra fuerte en fase de retencion

### Billing

Prefijo: `/billing`

- `POST /billing/checkout`
- `POST /billing/subscription`
- `GET /billing/subscription`
- `POST /billing/cancel`

Webhooks:

- `POST /webhooks/mercadopago`

El dominio `billing` tambien incluye:

- suscripciones
- checkout
- ledger de eventos de pago
- provider clients
- payouts
- refunds
- verificacion de operaciones
- alertas y worker de provider ops

Estado real detectado en codigo:

- suscripciones de plataforma: `Mercado Pago`
- conexion OAuth del profesional a Mercado Pago: ya existe en `/profesional/payment-providers/mercadopago/*`
- `POST /billing/*` hoy resuelve billing mensual del profesional y no checkout de reservas
- pagos reales de reservas y refunds: `Mercado Pago` via `booking` + `providerops`
- `/webhooks/mercadopago` procesa suscripciones y reservas con routing interno por dominio
- `/cliente/reservas/{id}/payment-session` sigue siendo la entrada real para checkout de reservas
- si `Mercado Pago` responde `card_token_id is required` al crear el `preapproval`, el backend hace fallback al checkout hosted del `preapproval_plan` y devuelve igual una `checkoutUrl`

Lectura de producto:

- cubre el modelo comercial sin comision por reserva
- soporta suscripcion mensual del profesional
- soporta pagos online configurables del negocio

Nota de naming:

- el codigo actual usa `PLAN_BASIC`, `PLAN_PROFESIONAL` y `PLAN_ENTERPRISE`
- a nivel de producto la lectura objetivo es `Free`, `Pro` y `Premium`

### Endpoints internos de operaciones

- `GET /internal/ops/provider-operations/alerts`
- `GET /internal/ops/bookings/alerts`
- `GET /internal/ops/bookings/{id}/detail`
- `POST /internal/ops/bookings/{id}/refund/retry`
- `POST /internal/ops/bookings/{id}/financial/recompute`
- `POST /internal/ops/bookings/{id}/reconcile`

Lectura de producto:

- esto no es visible al usuario final, pero si es importante para operar pagos y reservas con confiabilidad
- refuerza la tesis de "infraestructura de confianza" mas alla del simple booking flow

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

## Lectura por fase de roadmap

### Fase 1 - MVP

Capacidad ya muy visible en backend:

- auth
- perfiles
- servicios
- agenda
- slots
- reservas
- marketplace publico
- favoritos

### Fase 2 - Operacion Pro

Capacidad ya visible o encaminada:

- billing y pagos
- politicas y acciones de reserva
- historial y operacion mas detallada
- payout config

Capacidad aun no consolidada como superficie clara:

- ficha de cliente
- analytics basicos
- automatizaciones transaccionales mas completas
- chat interno

### Fase 3 y 4 - Retencion / Premium

Capacidad que no aparece aun como dominio publico consolidado:

- reseñas fuertes y respuestas
- loyalty
- ultima hora
- portfolio visual
- gift cards y paquetes
- tienda y envios
- multi-profesional avanzado

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
