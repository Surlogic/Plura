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

- respuestas publicas del negocio a reseñas (reseñas ya cerradas con moderacion, ocultamiento por profesional e internal ops, analytics y notificacion)
- analytics de producto avanzados (ya existe `GET /profesional/analytics/summary` como base operativa)
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
- `GET /api/home` ahora se consume via SSR (`getServerSideProps`); devuelve categorias, stats (usuarios, profesionales, categorias, reservas mensuales) y top professionals rankeados por volumen de reservas confirmadas/completadas de los ultimos 3 meses
- estas superficies publicas ya no deben caer en `401` si el navegador arrastra un access token o cookie auth invalido/vencido; backend degrada a anonimo y responde el payload publico igual

### Auth y sesiones

Prefijo: `/auth`

- `POST /auth/register/cliente`
- `POST /auth/register/profesional`
- `POST /auth/login/cliente`
- `POST /auth/login/profesional`
- `POST /auth/oauth`
- `POST /auth/oauth/complete-phone`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `POST /auth/password/change`
- `POST /auth/password/forgot`
- `POST /auth/password/reset`
- `POST /auth/password/recovery/start`
- `POST /auth/password/recovery/verify-phone`
- `POST /auth/password/recovery/confirm`
- `POST /auth/verify/email/send`
- `POST /auth/verify/email/confirm`
- `POST /auth/verify/phone/send`
- `POST /auth/verify/phone/confirm`
- `POST /auth/challenge/send`
- `POST /auth/challenge/verify`
- `GET /auth/sessions`
- `DELETE /auth/sessions/{sessionId}`
- `DELETE /auth/me` — ahora requiere `challengeId` + `code` OTP en el body; el challenge se obtiene previamente con `POST /auth/challenge/send` (purpose `ACCOUNT_DELETION`, channel `EMAIL`)
- `GET /auth/audit`
- `GET /auth/me/profesional`
- `GET /auth/me/cliente`

El dominio `auth` incluye:

- JWT + refresh tokens
- sesiones persistidas
- auditoria auth
- password reset legacy por token y recovery escalonado email + telefono + OTP por email
- verificacion email y telefono
- OTP challenge
- OAuth Google y Apple
- proteccion anti abuso

Lectura de producto:

- cubre el bloque `CORE` de autenticacion y seguridad
- soporta registro directo del profesional en `Free`
- ya da base para login social y gestion de sesiones
- `POST /auth/oauth/complete-phone` cierra el faltante de telefono cuando el alta/login OAuth no lo trae y hoy tiene pantallas web dedicadas para cliente y profesional
- `POST /auth/password/forgot` + `POST /auth/password/reset` siguen como flujo legacy por token y todavia los consume mobile
- `POST /auth/password/recovery/start|verify-phone|confirm` son el flujo mas nuevo de recuperacion escalonada que hoy usa la web
- `POST /auth/password/reset` y `POST /auth/password/recovery/confirm` ya no cierran con `204` vacio: ahora devuelven `200` con `role` (`USER` o `PROFESSIONAL`) y limpian cookies/sesion para que frontend redirija al login correcto segun la cuenta recuperada
- en el recovery escalonado, `verify-phone` solo responde exito si el email con el OTP pudo salir realmente; si SMTP falla o queda en fallback incompleto, el backend devuelve `503` y revierte el challenge
- el rate limiting de borde ya cubre tambien `/auth/password/recovery/start|verify-phone|confirm`, no solo el flujo legacy

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
- `GET /api/search` ya aplica el filtro de fecha en el `WHERE`; no queda solo como señal de ordenamiento
- `GET /api/search?availableNow=true` ya valida disponibilidad real contra `available_slot`; no usa la bandera agregada `has_availability_today` como aproximacion
- cuando `/api/search` recibe `lat/lng` junto con `city`, el radio geografico prevalece y el texto de ciudad no debe vaciar resultados por mismatch de address-string

Lectura de producto:

- cubre marketplace, buscador y filtros
- tambien cubre ubicacion, direccion y mapa
- `/api/search`, `/api/search/suggest` y `/api/geo/*` deben seguir funcionando sin login incluso si el browser manda credenciales auth viejas; el filtro JWT no debe bloquear exploracion publica por ese motivo

### Profesionales publicos

Prefijo: `/public/profesionales`

- `GET /public/profesionales`
- `GET /public/profesionales/{slug}`
- `GET /public/profesionales/{slug}/slots`
- `POST /public/profesionales/{slug}/reservas`
- `GET /public/profesionales/{slug}/reviews` — listado paginado de reseñas publicas (text null si oculto por profesional o internal ops)

### Feedback publico de app

- `GET /public/app-feedback?limit=6` — listado publico de feedback de app con `publicVisible=true` y texto no vacio; sin autenticacion; incluye `authorRole`, `authorDisplayName` (abreviado por privacidad), rating, text, category y fecha

Lectura de producto:

- permite mostrar testimonios reales de clientes y profesionales en superficies publicas como el home
- separado de reseñas entre clientes y profesionales (`core.review`); esto es feedback hacia la plataforma (`core.feedback`)
- como el resto de `/public/**`, si llega auth invalida se degrada a anonimo en vez de devolver `401`

### Profesionales publicos

Lectura de producto:

- circuito publico central del MVP
- soporta perfil publico, disponibilidad real y reserva sin pasar por panel privado
- es la base de `Usuario` y del valor visible de `Free`
- `GET /public/profesionales/{slug}` mantiene cache de perfil publico y ahora registra timing tecnico. Devuelve `rating` y `reviewsCount` reales
- `GET /public/profesionales/{slug}` ahora devuelve también `logoMedia` y `bannerMedia` con `{ positionX, positionY, zoom }` para reproducir el encuadre persistido de identidad visual en frontend
- `GET /public/profesionales/{slug}` ordena `photos` priorizando primero la galería pública del negocio (`LOCAL/WORK` y fallback `publicPhotos`) y recién después las fotos de servicios para que la sección de galería no repita primero assets ya visibles dentro de cada servicio
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
- `POST /profesional/images/upload?kind={kind}` — endpoint genérico de subida de imágenes; acepta `kind` como query param: `logo` → `logos/`, `banner` → `banners/`, `gallery`/`public-gallery`/`public_photo` → `gallery/`, `service` → `services/`, default → `misc/`; almacena en R2 o local según `IMAGE_STORAGE_PROVIDER`; retorna `{ imageUrl }` con la URL pública o R2 del archivo subido
- `PUT /profesional/services/{id}`
- `DELETE /profesional/services/{id}`
- `GET /profesional/payment-providers/mercadopago/connection`
- `POST /profesional/payment-providers/mercadopago/oauth/start`
- `GET /profesional/payment-providers/mercadopago/oauth/callback`
- `DELETE /profesional/payment-providers/mercadopago/connection`
- `GET /profesional/reservas`
- `POST /profesional/reservas`
- `PUT /profesional/reservas/{id}`
- `GET /profesional/reviews` — listado paginado de reseñas recibidas (texto completo siempre visible para el profesional, aunque este oculto publicamente)
- `PATCH /profesional/reviews/{reviewId}/hide-text` — oculta texto de la reseña publicamente (el rating sigue visible y cuenta en el promedio)
- `PATCH /profesional/reviews/{reviewId}/show-text` — restaura visibilidad del texto de la reseña
- `POST /profesional/reviews/{reviewId}/report` — reporta una reseña recibida por incumplimiento; valida ownership del profesional, evita duplicados abiertos y no altera rating/reviewsCount
- el backend ahora distingue tres variantes de respuesta de reseña: publica (respeta ocultamiento por profesional e internal ops), profesional (siempre ve texto), cliente (ve su propia reseña)
- al crear una reseña se notifica automaticamente al profesional via `ReviewNotificationIntegrationService`
- existe `recomputeAllAggregates()` para batch-update de rating y reviewsCount de todos los profesionales en una sola query nativa, incluyendo perfiles sin reseñas que deben quedar en `0`

Lectura de producto:

- cubre perfil editable del negocio o profesional
- cubre constructor de servicios, imagen principal, duracion y precio
- cubre horarios de trabajo y politicas de reserva
- cubre carga manual de turnos desde panel
- `PUT /profesional/profile` y `PUT /profesional/public-page` ya permiten que `Free/BASIC` gestione logo, banner, headline y about del perfil publico; la diferencia entre planes para la pagina publica queda en limites de capacidad, no en bloqueo de esos textos/base visual
- `PUT /profesional/profile` ahora acepta opcionalmente `logoMedia` y `bannerMedia` con `{ positionX, positionY, zoom }` para persistir el encuadre visual del logo y del banner; `GET /auth/me/profesional` y `GET /profesional/public-page` exponen esos mismos metadatos normalizados para rehidratar el editor y la preview
- `POST /profesional/services` ahora corta por capacidad de plan: `BASIC` hasta `15` servicios, `PROFESIONAL` hasta `30`, `ENTERPRISE` sin tope practico; cada servicio mantiene una sola imagen publica
- `GET /profesional/reservas` sostiene gestion operativa de reservas para `Free/BASIC` y no debe confundirse con gating de agenda semanal o mensual
- `POST /profesional/payment-providers/mercadopago/oauth/start` y `GET /profesional/payment-providers/mercadopago/oauth/callback` ahora exigen capacidad `ONLINE_PAYMENTS`; `BASIC` no puede iniciar ni completar la conexion OAuth
- `POST /profesional/payment-providers/mercadopago/oauth/start` solo necesita la configuracion minima para abrir Mercado Pago: `client-id`, `redirect-uri` y `authorization-url`
- si `billing.mercadopago.reservations.oauth.pkce-enabled=true`, `POST /profesional/payment-providers/mercadopago/oauth/start` genera ademas `code_verifier`, `code_challenge` y `code_challenge_method=S256`; el `verifier` queda almacenado temporalmente en backend y nunca pasa por frontend
- `billing.mercadopago.reservations.oauth.redirect-uri` debe apuntar al callback backend exacto `/profesional/payment-providers/mercadopago/oauth/callback`; el frontend ya no recibe `code/state` crudos de Mercado Pago
- `GET /profesional/payment-providers/mercadopago/oauth/callback` sigue requiriendo `client-secret` y `token-url`, porque ahi recien se canjea el `code` y se guardan los tokens OAuth del profesional; con PKCE activo tambien exige recuperar el `code_verifier` pendiente desde backend antes del token exchange
- el callback backend ya no depende de la sesion/cookie del profesional para completarse; resuelve el `professionalId` desde el `state` firmado y luego exige que ese `state` coincida con el onboarding pendiente guardado en `professional_payment_provider_connection`
- por eso `GET /profesional/payment-providers/mercadopago/oauth/callback` queda expuesto como `permitAll` en Spring Security; la seguridad del cierre OAuth ya no depende de JWT sino de `state` firmado + correlacion backend
- si el `state` es valido pero pertenece a otro profesional respecto del intento pendiente, el backend rechaza el callback
- la misma cuenta Mercado Pago no puede quedar conectada simultaneamente a dos profesionales distintos; el backend rechaza esa reconexion con `409`
- `DELETE /profesional/payment-providers/mercadopago/connection` ahora limpia no solo los tokens OAuth sino tambien `provider_user_id`, `provider_account_id`, `scope`, metadata y el onboarding pendiente para dejar la conexion realmente desvinculada
- si el navegador reintenta el callback despues de una conexion ya exitosa y Mercado Pago responde `invalid_grant` por reutilizacion del `code`, el backend conserva la conexion existente y trata ese replay como idempotente
- si el callback falla durante el token exchange u otra validacion posterior, el backend intenta persistir `last_error` y limpiar el onboarding pendiente en una transaccion separada para no perder el motivo real del fallo
- el callback tambien cubre errores inesperados fuera de `ResponseStatusException` para no perderlos como `500` mudos: los persiste como `unexpected_callback_error` y redirige frontend con `oauth_failed`
- las credenciales globales de Mercado Pago ya no son un bloque unico: suscripciones usa `billing.mercadopago.subscriptions.*` y reservas/OAuth profesional usa `billing.mercadopago.reservations.*`

Notas:

- `POST /profesional/services/image` confirma que el repo ya integra carga de imagenes en servicios
- `POST /profesional/images/upload` es el endpoint genérico recomendado para subir logos, banners, galería y fotos de servicio; organiza los archivos por `professionals/{professionalId}/{kind}/` en R2 o filesystem local
- `GET /profesional/public-page` y `PUT /profesional/public-page` incluyen campo `photos` para la galería pública; el request admite hasta `10` por validación estructural, pero el límite efectivo se aplica por plan en runtime (`3 / 6 / 10`); en la página pública la resolución final prioriza `business_photo` de galería (`LOCAL`, `WORK`) y fallback `publicPhotos`, y deja después las fotos ligadas a servicios (`SERVICE` + imagen principal del servicio), deduplicando sin cambiar el contrato
- `PUT /profesional/profile` soporta `logoUrl` y `bannerUrl` para la identidad pública del negocio desde cualquier plan actual
- la capa de categorias existe en el sistema, pero el nivel exacto de etiquetas y reglas por servicio requiere revisar dominio y UI puntual

### Reservas del cliente

- `GET /cliente/reservas`
- `GET /cliente/reservas/me`
- `GET /cliente/reservas/proxima`
- `GET /cliente/reservas/{bookingId}/timeline`
- `POST /cliente/reservas/{id}/cancel`
- `POST /cliente/reservas/{id}/reschedule`
- `POST /cliente/reservas/{id}/payment-session`
- `GET /cliente/reservas/{bookingId}/review-eligibility` — chequea si el cliente puede dejar reseña
- `POST /cliente/reservas/{bookingId}/review` — crea reseña (rating obligatorio 1-5, text opcional max 2000 chars)
- `GET /cliente/reservas/{bookingId}/review` — contrato estable: devuelve `{ exists: false }` o `{ exists: true, review: ... }`
- `DELETE /cliente/reservas/{bookingId}/review` — elimina la reseña del cliente; verifica ownership, recomputa agregados del profesional

Lectura de producto:

- cubre historial y gestion de reservas del plan `Usuario`
- soporta cancelacion y reagendamiento segun politica
- `payment-session` es la base para reserva con pago online
- `payment-session` solo admite `MERCADOPAGO`; si existe una transaccion pendiente legacy `DLOCAL`, la sesion se reabre con Mercado Pago para no romper el checkout vigente
- en el alta inicial del checkout, `POST /cliente/reservas/{id}/payment-session` ya no dispara `worker async + polling` interno para obtener la URL: procesa la `provider_operation` de checkout en linea despues del commit para recortar espera perceptible antes de abrir Mercado Pago
- si esa resolucion en linea falla, `POST /cliente/reservas/{id}/payment-session` conserva el `status/reason` concreto del fallo upstream en vez de taparlo siempre con un `502` generico
- `GET /cliente/reservas` y `GET /cliente/reservas/proxima` siguen intentando sincronizar cobros pendientes antes de responder, pero esa sync ahora corre en transaccion aislada y si falla de forma transitoria no tumba el listado: el endpoint responde con el snapshot actual de la reserva
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

### Feedback de app del cliente

Prefijo: `/cliente/app-feedback`

- `POST /cliente/app-feedback` — crea feedback interno hacia la plataforma (rating 1-5, text opcional, category opcional, contextSource opcional)
- `GET /cliente/app-feedback/mine` — historial paginado de feedback propio del cliente

Lectura de producto:

- feedback interno de producto, no publico
- no impacta search, rating ni perfil publico del profesional
- modulo separado `core.feedback`, sin dependencia de `core.review`

### Feedback de app del profesional

Prefijo: `/profesional/app-feedback`

- `POST /profesional/app-feedback` — crea feedback interno hacia la plataforma (rating 1-5, text opcional, category opcional, contextSource opcional)
- `GET /profesional/app-feedback/mine` — historial paginado de feedback propio del profesional

Lectura de producto:

- misma mecanica que feedback de cliente, scopeado por rol `PROFESSIONAL`
- categorias disponibles: `BUG`, `UX`, `PAYMENTS`, `BOOKING`, `DISCOVERY`, `OTHER`

### Analytics del profesional

Prefijo: `/profesional/analytics`

- `GET /profesional/analytics/summary?view={view}` — resumen de metricas del profesional autenticado; acepta parametro `view` para acotar la ventana temporal

Lectura de producto:

- base de analytics basicos para `Pro`
- el servicio `ProfessionalAnalyticsService` calcula el resumen por profesional
- requiere autenticacion y rol profesional via `RoleGuard`

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

Lectura de producto:

- confirma que el backend ya contempla estados operativos clave
- cubre buena parte de agenda diaria y gestion de reservas de `Free`
- `no-show` sigue expuesto como accion operativa dedicada; la completitud de reservas ya no vive como endpoint publico separado en esta superficie

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

### Endpoints internos de feedback de app

Prefijo: `/internal/ops/app-feedback`

- `GET /internal/ops/app-feedback` — listado paginado con filtros (authorRole, category, rating, status, from, to)
- `GET /internal/ops/app-feedback/{id}` — detalle completo de un feedback
- `PATCH /internal/ops/app-feedback/{id}/archive` — archiva un feedback
- `PATCH /internal/ops/app-feedback/{id}/unarchive` — desarchiva un feedback
- `GET /internal/ops/app-feedback/analytics` — totales, promedios, conteos por rol/categoria/rating y evolucion diaria

Lectura de producto:

- backoffice minimo para operar feedback interno de producto
- protegido por `X-Internal-Token`, no por sesion de usuario
- separado completamente de `core.review` (reseñas publicas entre clientes y profesionales)
- analytics permiten rango de fechas opcional
- feedback analytics ahora incluyen conteos por `authorRole`, `category` y `rating`, y evolucion diaria

### Endpoints internos de reseñas

Prefijo: `/internal/ops/reviews`

- `GET /internal/ops/reviews` — listado paginado con filtros (professionalId, rating, hasText, textHidden, from, to)
- `GET /internal/ops/reviews/{id}` — detalle completo de una reseña, incluyendo estado de reportes
- `PATCH /internal/ops/reviews/{id}/hide-text` — oculta texto de una reseña (con nota opcional)
- `PATCH /internal/ops/reviews/{id}/show-text` — restaura visibilidad del texto
- `GET /internal/ops/reviews/analytics` — analytics de reseñas con rango de fechas opcional

Lectura de producto:

- backoffice de moderacion de reseñas para internal ops
- protegido por `X-Internal-Token`, no por sesion de usuario
- permite moderar contenido de reseñas independientemente del profesional y detectar reseñas reportadas desde el dashboard profesional
- analytics incluyen `findAllFiltered`, `countFiltered`, `averageRatingFiltered`, `countByRating`, `countWithText/WithoutText/TextHidden`, `topProfessionalsByVolume/ByRating` y `dailyStats`

## Paquetes backend mas importantes

- `auth`: autenticacion, sesiones, auditoria, OAuth y verificaciones.
- `professional`: perfil, pagina publica, servicios, agenda y payout.
- `booking`: reserva, acciones, comandos, pagos y politica.
- `billing`: suscripciones, checkout, webhooks y operaciones del proveedor.
- `availability`: slots disponibles y resumenes de agenda.
- `search`: busqueda, suggest, indexacion y sync.
- `cache`: cache in-memory y Redis.
- `storage`: upload de imagenes y thumbnails; ahora incluye `CloudflareR2ImageStorageService` como provider real de storage con presigned URLs, validación de content type (jpeg, png, webp, avif) y límite configurable de 5MB; las imágenes se organizan por `professionals/{professionalId}/{kind}/` en R2.
- `feedback`: feedback interno de producto desde clientes y profesionales; ahora con visibilidad publica opcional (`publicVisible`) y endpoint publico para testimonios.
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

- respuestas publicas del negocio a reseñas (reseñas ya cerradas con moderacion, ocultamiento, analytics y notificacion)
- loyalty
- ultima hora
- portfolio visual
- gift cards y paquetes
- tienda y envios
- multi-profesional avanzado

## Persistencia

- Flyway usa `backend-java/src/main/resources/db/migration`
- hay `58` migraciones versionadas
- los nombres muestran evolucion fuerte en:
  - billing
  - booking
  - auth sessions
  - search hardening
  - availability
  - service categories
  - galería de fotos del negocio (`business_photo`) y banner del perfil (`V58`)
