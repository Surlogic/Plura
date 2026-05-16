# Infra Y Configuracion

Este documento cruza el stack tecnico actual con las necesidades del producto definido para `Usuario`, `Profesional`, `Local` y `Enterprise`.

## Stack principal

- Monorepo `pnpm`
- Web: `Next.js 16`, `React 19`, `TypeScript`
- Mobile: `Expo 54`, `React Native 0.81`, `expo-router`
- el `package.json` raiz usa `pnpm.overrides` para fijar versiones parcheadas de dependencias transitivas auditadas por seguridad sin subir de SDK Expo ni cambiar contratos de runtime
- Backend: `Spring Boot 3.5`, `Java 25 LTS`, `JPA`, `Spring Security`
- Base de datos: PostgreSQL
- Migraciones: Flyway
- hardening Supabase Data API aplicado desde Flyway (`V70`): `public` deja de ser el schema expuesto por PostgREST y se reserva `api_public` para futuras vistas/funciones publicas auditadas
- cleanup de indices Supabase Advisor aplicado desde Flyway (`V71`): se limpian indices duplicados o sin uso real en el codigo actual y se agregan indices faltantes para FKs activas de billing/reviews
- ajuste de indices FK posteriores al rerun de Supabase Advisor aplicado desde Flyway (`V72`): se reponen coberturas para `booking_payout_record.professional_id`, `booking_review_reminder.user_id`, `client_favorite_professional.professional_id`, `client_push_device.user_id`, `payment_event.professional_id` y `payment_transaction.professional_id`

## Lectura de infraestructura por eje de producto

### Auth, seguridad y sesiones

Necesario para:

- registro y login
- recuperacion de cuenta
- sesiones
- login social con Google en frontend
- roles `cliente` y `profesional`

Infra actual detectada:

- JWT
- refresh tokens
- cookies y bearer tokens segun plataforma
- OAuth Google expuesto en frontend; soporte OAuth adicional conservado en backend auth
- rate limiting
- auditoria auth

Lectura operativa actual:

- `auth_session` es la ruta principal de sesiones persistidas
- `auth_refresh_token` queda como compatibilidad legacy del modelo anterior, pero el fallback por default ya no viene habilitado en `application.yml`
- en web, el interceptor de refresh y los providers de perfil ya no degradan cualquier error a logout: solo `401/403` invalidan la sesion; errores de red, timeout o `5xx` quedan como fallas transitorias sin limpiar credenciales locales
- `apps/web/src/services/session.ts` ahora persiste tambien `plura_auth_session_role` (`CLIENT` o `PROFESSIONAL`) para bootstrap de sesion en rutas publicas sin adivinar el perfil a cargar
- el backend soporta dos recuperaciones de contraseña en paralelo: legacy por token (`/auth/password/forgot` + `/auth/password/reset`) y recovery escalonado (`/auth/password/recovery/start|verify-phone|confirm`)
- el recovery escalonado por OTP depende de entrega real de email: si SMTP falla o no esta operativo, `verify-phone` devuelve error y no deja challenges activos a medias
- el registro por email ya tiene flujo OTP previo al alta con Twilio Verify (`/auth/register/phone/send|confirm`); al activar `AUTH_REGISTRATION_PHONE_VERIFICATION_REQUIRED=true`, cliente y profesional solo se crean con telefono verificado una vez y ese telefono verificado no se reutiliza en otra cuenta activa
- despues de OAuth, el backend puede exigir completar telefono con `POST /auth/oauth/complete-phone`; ese cierre ya acepta el mismo `phoneVerificationToken` emitido tras Twilio Verify para dejar el numero validado en el acto
- las invitaciones de trabajadores usan endpoints publicos bajo `/auth/worker-invitations`; el token se guarda hasheado en `professional_worker`, vence a los `14` dias y al aceptarlo vincula o crea un `app_user` de base `USER` para que luego pueda entrar por el futuro login unificado/contextual

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
- refresh de materialized views de search tambien al startup con lock distribuido para evitar vistas stale despues de deploys o reinicios

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

- storage local o Cloudflare R2 según `IMAGE_STORAGE_PROVIDER` (default: `local`)
- modulo `storage` con `CloudflareR2ImageStorageService` como provider principal para producción
- endpoint genérico `POST /profesional/images/upload?kind=` para logo, banner, galería y servicios
- endpoint legacy `POST /profesional/services/image` para imágenes de servicio
- validación server-side de content type (jpeg, png, webp, avif) y tamaño máximo 5MB
- organización en R2 por `professionals/{professionalId}/{kind}/UUID.ext`
- tabla `business_photo` para galería del negocio con tipos LOCAL, SERVICE y WORK
- columna `banner_url` en `professional_profile` (V58)
- frontend resuelve URLs R2 (`r2://bucket/path`) a CDN público vía `NEXT_PUBLIC_IMAGE_CDN_BASE_URL`
- backend canoniza al guardar `logoUrl`, `bannerUrl`, `photos` de galería e `imageUrl` de servicios: si la UI round-tripea una URL pública del CDN o `/uploads`, la convierte de nuevo a referencia interna de storage antes de persistirla
- cleanup de media compara y borra assets sobre esa referencia canonizada, evitando tratar como distintas una `r2://...` y su URL pública equivalente

Nota:

- el storage de objetos está operativo con Cloudflare R2 + CDN; metadata de galería persiste en PostgreSQL (`business_photo`)
- si se piensa en portfolio, looks o tienda, la base actual de R2 + metadata en PostgreSQL ya da soporte

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

- el modelo comercial visible para profesionales/locales es `Plura Core` unico; `Profesional`, `Local` y `Enterprise` no son planes tecnicos activos
- `POST /billing/subscription` permite iniciar solo `PLAN_CORE`; Local/Enterprise/Pro/Premium se aceptan solo como aliases legacy de entrada y se normalizan a `PLAN_CORE`
- `Plura Core` persiste prueba gratuita local de `2` meses en `subscription.trial_start_at`, `subscription.trial_end_at`, `subscription.payment_method_attached_at` y `subscription.trial_source`
- el backend usa estados de suscripcion `CHECKOUT_PENDING`, `TRIALING`, `ACTIVE`, `PAST_DUE`, `CANCELLED`, `EXPIRED`; `TRIAL` queda como compatibilidad de lectura para datos historicos
- el checkout de cambio de plan a Local/Enterprise no se ofrece en UI ni backend durante el MVP
- `Enterprise` queda futuro/personalizado para empresas con varios locales y no requiere configuracion de compra actual ni enum/capacidad activa

- `Mercado Pago` esta conectado al billing de suscripciones de plataforma
- para suscripciones Core, cuando backend crea un `preapproval_plan` remoto agrega `auto_recurring.free_trial = { frequency: 2, frequency_type: "months" }`
- si se usa un `BILLING_MERCADOPAGO_PLAN_*`/plan remoto preconfigurado, el trial real de Mercado Pago depende de como este creado ese plan remoto; backend no puede modificarlo y mantiene de todos modos el trial local de Plura
- `Mercado Pago` ya tiene ademas configuracion OAuth para conectar cuentas de profesionales
- `Mercado Pago` tambien esta conectado al checkout real de reservas y refunds usando OAuth del profesional
- ya existe storage de OAuth para cuentas Mercado Pago de profesionales en `professional_payment_provider_connection`
- `payment_event`, `payment_transaction` y `provider_operation` ya funcionan como base de auditoria y conciliacion compartida
- el checkout de reservas puede sumar un `cargo de procesamiento` separado al cliente; backend lo calcula server-side y lo snapshot-ea en `booking.prepaid_processing_fee_amount_snapshot`, `booking.prepaid_total_amount_snapshot` y `booking.prepaid_processing_fee_mode_snapshot` para no depender de redondeos ni del modo vigente al momento de ver la reserva despues
- cada servicio online guarda su preferencia de acreditacion Mercado Pago en `professional_service.processing_fee_mode`; hoy puede elegir `INSTANT` (`5,99% + IVA`) o `DELAYED_21_DAYS` (`4,99% + IVA`)
- el `cargo de procesamiento` de checkout hoy combina el fee de Mercado Pago segun ese modo, el `IVA` sobre ese fee y un `1%` adicional de plataforma; con la arquitectura OAuth actual ese `1%` queda incluido en el total cobrado al cliente, pero no se liquida a Plura como split separado dentro de Mercado Pago
- cuando un refund de reserva queda iniciado pero Mercado Pago no lo confirma en el mismo response, la `provider_operation` de tipo `BOOKING_REFUND` permanece en seguimiento (`UNCERTAIN`) hasta webhook o reconciliacion; no debe darse por exitosa solo por haber recibido un `pending`
- al despachar refunds de reservas, backend resuelve la cuenta OAuth del profesional con el `professionalId` propio del booking/charge; ya no depende de que Mercado Pago devuelva ese dato otra vez al consultar el pago original
- si SMTP esta operativo, ese estado `refund pendiente` tambien dispara email transaccional solo para el cliente con texto de acreditacion sujeto a tiempos de Mercado Pago y del emisor
- si el refund queda completado sin pasar por webhook posterior, el backend ahora igual emite `PAYMENT_REFUNDED` y despacha email transaccional solo para el cliente con la misma leyenda de acreditacion
- para mejorar ese copy, backend ahora persiste `paymentTypeId` y `paymentMethodId` cuando Mercado Pago los devuelve en verificacion/webhook, y con eso ajusta el mensaje entre `dinero en cuenta` vs `tarjeta`
- el enum `PaymentProvider` mantiene compatibilidad con filas legacy `DLOCAL` solo para que lecturas historicas no rompan reservas ni mediciones
- el runtime operativo ya no acepta `DLOCAL` como input nuevo; cualquier operacion pendiente legacy se degrada a compatibilidad o se marca como provider retirado
- la semantica valida de pagos online actuales sigue centrada en `Mercado Pago`

Variables de backend para Mercado Pago de suscripciones:

- `BILLING_MERCADOPAGO_SUBSCRIPTIONS_ACCESS_TOKEN`
- `BILLING_MERCADOPAGO_SUBSCRIPTIONS_WEBHOOK_SECRET`

Variables de backend para suscripcion Core:

- `BILLING_CORE_PRICE`
- `BILLING_CORE_CURRENCY`

Estas variables deben estar configuradas con precio positivo cuando billing/Mercado Pago esta habilitado; si `BILLING_CORE_PRICE` queda ausente o en `0`, Mercado Pago puede rechazar el `preapproval_plan` por monto invalido. Tienen fallback a `BILLING_PLAN_PROFESSIONAL_PRICE` / `BILLING_PLAN_PROFESSIONAL_CURRENCY` y luego a los nombres legacy `BILLING_PLAN_BASIC_*`. El fallback compatible usa `PROFESSIONAL` con doble `S`; `BILLING_PLAN_PROFESIONAL_PRICE` esta mal escrito y no debe usarse. Las variables legacy de Local/Enterprise pueden quedar en ambientes existentes, pero no impulsan checkout visible del MVP.

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

Variables de backend para OTP SMS de registro con Twilio Verify:

- `TWILIO_VERIFY_ENABLED`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`
- `AUTH_REGISTRATION_PHONE_VERIFICATION_REQUIRED`
- `AUTH_REGISTRATION_PHONE_VERIFICATION_TOKEN_SECRET`
- `AUTH_REGISTRATION_PHONE_VERIFICATION_TOKEN_TTL_MINUTES`
- `AUTH_REGISTRATION_PHONE_VERIFICATION_COOLDOWN_SECONDS`
- `BILLING_MERCADOPAGO_RESERVATIONS_PROCESSING_FEE_ENABLED`
- `BILLING_MERCADOPAGO_RESERVATIONS_PROCESSING_FEE_LABEL`
- `BILLING_MERCADOPAGO_RESERVATIONS_PROCESSING_FEE_INSTANT_PROVIDER_FEE_PERCENT`
- `BILLING_MERCADOPAGO_RESERVATIONS_PROCESSING_FEE_DELAYED_PROVIDER_FEE_PERCENT`
- `BILLING_MERCADOPAGO_RESERVATIONS_PROCESSING_FEE_TAX_PERCENT`
- `BILLING_MERCADOPAGO_RESERVATIONS_PROCESSING_FEE_PLATFORM_FEE_PERCENT`

Notas reales de binding local:

- el backend no depende solo del `.env` del cwd: ahora intenta leer `./.env` y tambien `./backend-java/.env`
- si se ejecuta el backend desde la raiz del monorepo, `backend-java/.env` sigue siendo tomado como fallback
- el script local `pnpm dev:backend-java` carga `.env.backend` y despues `backend-java/.env`, manteniendo la misma precedencia que `docker-compose.yml` y evitando diferencias entre Windows nativo y Docker
- `backend-java/fly.toml` ya no versiona variables productivas en `[env]`; la configuracion runtime de Fly, incluidas variables no secretas y secretas, se administra fuera del repo mediante `fly secrets`/entorno de la app.
- para evitar exponer configuracion de produccion en el repo, aliases como `APP_CORS_ALLOWED_ORIGINS` y `APP_SECURITY_TRUST_FORWARDED_HEADERS` tambien deben mantenerse en Fly y no en `backend-java/fly.toml`.
- el backend acepta `X-Internal-Token` dentro de los headers CORS permitidos; esto es obligatorio para usar desde web los paneles internos `/internal/ops/*` (feedback, reviews) sin que falle el preflight
- el backend ya no expone el tracking interno de analytics de producto ni el header `X-Plura-Analytics-Session-Id`.
- cuando Fly muestra `Proxy not finding machines to route requests` para este backend, el primer chequeo no deberia ser el puerto: el codigo ya expone `server.address=0.0.0.0` y `server.port=${PORT:3000}`; el fallo mas probable pasa por machine caida, `healthcheck` sin pasar o secrets faltantes de DB/JWT/R2
- `backend-java/fly.toml` ahora fuerza un pool mas chico en Fly (`HIKARI_MAX_POOL_SIZE=4`, `HIKARI_MIN_IDLE=0`), desactiva `SEARCH_MV_REFRESH_ON_STARTUP` y usa `[deploy].strategy = "immediate"` para no agotar el Session Pooler de Supabase durante updates donde una machine nueva compite por conexiones con la release anterior
- el repo ahora incluye `backend-java/scripts/check_fly_runtime_env.sh` para validar desde shell las variables minimas de arranque segun el `fly.toml` actual y separar faltantes fatales de advertencias operativas
- `V68__service_processing_fee_mode.sql` agrega `processing_fee_mode` a `professional_service` y `prepaid_processing_fee_mode_snapshot` a `booking`; `V69__booking_prepaid_processing_fee_snapshot.sql` agrega en `booking` los snapshots `prepaid_processing_fee_amount_snapshot` y `prepaid_total_amount_snapshot`
- la secuencia real de migraciones Flyway del backend llega a `V83`; `V79__remove_internal_product_analytics.sql` elimina la tabla vieja `app_product_event`, `V80__rename_subscription_plan_contracts.sql` normaliza codigos legacy de planes si existe la tabla `subscription`, `V81__active_user_unique_identity.sql` ajusta unicidad de usuarios activos, `V82__subscription_core_trial_fields.sql` agrega columnas de trial/Core y `V83__normalize_subscription_plan_core.sql` normaliza `subscription.plan` a `PLAN_CORE` y deja el constraint aceptando solo `PLAN_CORE` cuando la tabla existe.
- el backend fija `search_path=public,extensions` en `spring.datasource.hikari.connection-init-sql` para que funciones y casts PostGIS sigan resolviendo despues de mover `postgis` fuera de `public`
- el repo ahora incluye `backend-java/src/test/java/com/plura/plurabackend/db/FlywayMigrationVersionUniquenessTest.java` para detectar versiones Flyway duplicadas antes de romper un deploy
- el backend mantiene fallback a los nombres legacy `BILLING_MERCADOPAGO_ACCESS_TOKEN`, `BILLING_MERCADOPAGO_WEBHOOK_SECRET` y `BILLING_MERCADOPAGO_OAUTH_*`, pero el naming operativo recomendado ya es explicito por dominio: `SUBSCRIPTIONS_*` para planes y `RESERVATIONS_*` para cobros/OAuth profesional
- para OAuth de Mercado Pago el error de `state` ya no implica adivinar secretos: el backend espera primero `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_STATE_SIGNING_SECRET`, y si no existe hace fallback a la clave de cifrado o al client secret
- en local, tener solo `BILLING_MERCADOPAGO_RESERVATIONS_PLATFORM_ACCESS_TOKEN` no alcanza para OAuth: para abrir el onboarding siguen siendo obligatorios `CLIENT_ID` y `REDIRECT_URI`; para completar el callback y persistir la conexion del profesional tambien se vuelve obligatorio `CLIENT_SECRET`
- con `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_PKCE_ENABLED=true`, el backend genera `code_verifier` y `code_challenge` con `S256`, persiste temporalmente el `verifier` cifrado en `professional_payment_provider_connection`, y en el token exchange manda `code_verifier` sin exponerlo al frontend
- `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_REDIRECT_URI` debe coincidir exactamente con el callback backend registrado en la app OAuth de Mercado Pago; ejemplos:
  `http://localhost:3000/profesional/payment-providers/mercadopago/oauth/callback`
  `https://plura.fly.dev/profesional/payment-providers/mercadopago/oauth/callback`
- `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_FRONTEND_REDIRECT_URL` es la pantalla web final de resultado y no debe registrarse en Mercado Pago como Redirect URL OAuth
- el cargo de procesamiento de reservas se parametriza con `INSTANT_PROVIDER_FEE_PERCENT`, `DELAYED_PROVIDER_FEE_PERCENT`, `TAX_PERCENT` y `PLATFORM_FEE_PERCENT`; backend elige el porcentaje Mercado Pago segun `processingFeeMode` del servicio, calcula `fee_efectiva = fee_provider * (1 + IVA) + fee_plataforma`, luego `total = neto / (1 - fee_efectiva)` y redondea hacia arriba a 2 decimales para no subcobrar el neto del servicio
- por compatibilidad, `BILLING_MERCADOPAGO_RESERVATIONS_PROCESSING_FEE_PROVIDER_FEE_PERCENT` sigue funcionando como fallback legacy del porcentaje `INSTANT`
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
- automatizaciones futuras fuera de Core

Infra actual detectada:

- email SMTP
- jobs opcionales con SQS
- mobile cliente ya puede pedir permiso de notificaciones del dispositivo y conservar el estado local del permiso/preferencia

Capacidad pendiente o no claramente documentada:

- despacho push nativo desde eventos transaccionales de reserva
- motor de eventos de producto mas visible
- extensiones de preferencias de notificaciones mas finas por canal o evento

### Analytics y eventos del producto

Necesario para:

- analytics profesional como add-on futuro fuera de Core
- reporting avanzado personalizado para Enterprise futuro
- entendimiento de embudo marketplace -> reserva -> retorno

Infra actual detectada:

- Actuator queda limitado a health; se removio el stack Prometheus/Grafana local.
- Micrometer ya registra timings utiles en search y ahora tambien en public profile, public slots, client bookings, notification inbox y unread count
- no queda tracking funcional interno de analytics de producto en PostgreSQL; el flujo operativo de reservas mantiene sus eventos de dominio y notificaciones.
- snapshots adicionales en `booking` (`serviceCategory*`, `professionalRubro/City/Country`, `sourcePlatform`) para que el reporting interno no dependa de joins inestables contra estado actual del servicio o del perfil

Pendiente a nivel de producto:

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
- `NEXT_PUBLIC_IMAGE_CDN_BASE_URL` — dominio CDN para imágenes R2 (default: `https://img.surlogicuy.com`)
- `NEXT_PUBLIC_SITE_URL` — URL canonica publica para metadata SEO y sitemap (default: `https://pluraapp.com`)
- `ANALYZE`

Lectura de producto:

- cubre API, mapa y login social en web
- la metadata SEO publica usa `NEXT_PUBLIC_SITE_URL` si existe; si no, cae a `https://pluraapp.com`
- el repo ya trae `pnpm -C apps/web analyze` para abrir el analisis de chunks sin agregar tooling nuevo
- `.env.frontend` quedo alineado a despliegue `Vercel -> Fly` con `NEXT_PUBLIC_API_URL=https://plura.fly.dev`; para probar localmente OAuth profesional de Mercado Pago end-to-end hay que sobreescribir temporalmente esa variable a `http://localhost:3000`

### Mobile

Variables detectadas en uso:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_MAPBOX_TOKEN`
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
- el login Google mobile hoy es mixto: Android usa `@react-native-google-signin/google-signin` y necesita especialmente `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` para pedir `idToken`; iOS/web usan `expo-auth-session`; `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` y `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` siguen siendo las variables recomendadas, mientras `EXPO_PUBLIC_GOOGLE_CLIENT_ID` queda como fallback general
- para el mapa del perfil publico mobile, la variable operativa recomendada pasa a ser `EXPO_PUBLIC_MAPBOX_TOKEN`; `MAPBOX_TOKEN` queda como fallback legacy local
- mobile usa `expo-web-browser` para abrir checkout de reservas y OAuth de `Mercado Pago` dentro de la app sin sacar al usuario a un navegador externo completo; no abre checkout de cambio de plan durante el MVP
- mobile ahora tambien depende de `expo-location` y `expo-notifications` para pedir permisos nativos de ubicacion y notificaciones
- `app.json` ya declara el plugin `expo-location` con texto de permiso foreground y habilita `expo-notifications` para el permiso del sistema en runtime
- mobile ya no consume `Ionicons` directo desde `@expo/vector-icons`: usa un wrapper local en `apps/mobile/src/lib/icons.ts` con `Ionicons.ttf` embebido en `apps/mobile/assets/fonts/Ionicons.ttf`, y `apps/mobile/app/_layout.tsx` lo precarga antes de renderizar pantallas para evitar fallas de `ExpoAsset.downloadAsync` en dev client
- `EXPO_PUBLIC_API_URL` ya no tiene fallback silencioso en release mobile: si falta fuera de `__DEV__`, el bundle falla temprano para evitar builds que apunten accidentalmente a localhost
- el estado local de permiso push se persiste junto con preferencias del cliente en storage seguro y, cuando existe sesion cliente autenticada, mobile sincroniza el `push token` contra `PUT /cliente/notificaciones/push-token`
- si el cliente desactiva push desde la app pero el permiso del sistema sigue en `granted`, mobile respeta ese opt-out local y no lo reactiva solo al volver a foreground
- si Expo rota el `push token`, mobile deshabilita primero el token anterior antes de sincronizar el nuevo para no dejar devices viejos activos por la misma instalacion
- para release mobile, Google OAuth ya depende de configurar `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` y los client IDs nativos correspondientes (`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`); `EXPO_PUBLIC_GOOGLE_CLIENT_ID` queda solo como fallback legacy
- el bootstrap auth mobile ya usa el `role` embebido en el JWT para resolver el endpoint correcto de `/auth/me/*`; eso evita un request extra por refresh para cuentas cliente y reduce el costo cuando varias pantallas disparan `refreshProfile` en paralelo
- el request de `POST /auth/refresh` en mobile ya no reenvia el access token vencido en `Authorization`; manda solo headers de plataforma/sesion y el `refreshToken` en body
- `apps/mobile/eas.json` ya fija `environment` por profile (`development`, `preview`, `production`) para que EAS Build tome las variables correctas sin depender de `--environment`; ademas `preview` fuerza `android.buildType=apk` para pruebas instalables fuera de store

### Backend

Areas de configuracion principales en `application.yml`:

- server y compresion
- datasource PostgreSQL obligatorio en runtime (`SPRING_DATASOURCE_URL` o `DATABASE_URL`), hoy alineado a `Supabase PostgreSQL` por `Session Pooler`
- Flyway
- JWT y refresh token
- OAuth Google expuesto en frontend; soporte OAuth adicional conservado en backend auth
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
- healthcheck via Actuator y timers tecnicos internos con Micrometer

Variables criticas sin las que el backend puede fallar o degradarse:

- `JWT_SECRET`
- `JWT_REFRESH_PEPPER`
- `OPS_INTERNAL_TOKEN` para paneles internos protegidos por token
- credenciales DB productivas
- credenciales OAuth si se usa login social
- variables de billing si se habilitan pagos reales
- variables OAuth de Mercado Pago si se quiere conectar la cuenta del profesional desde billing
- SMTP operativo si se quiere usar recovery escalonado y otros OTP por email sin degradacion
- en Fly, ademas de los env no secretos gestionados fuera del repo, siguen siendo obligatorios como secrets al menos: `SPRING_DATASOURCE_PASSWORD`, `SPRING_FLYWAY_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_PEPPER`, `GOOGLE_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID` si se va a aceptar OAuth mobile iOS, `GOOGLE_CLIENT_SECRET`, `EMAIL_FROM_ADDRESS`, `EMAIL_SMTP_USERNAME`, `EMAIL_SMTP_PASSWORD`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `BILLING_CORE_PRICE`, `BILLING_CORE_CURRENCY`, `BILLING_MERCADOPAGO_SUBSCRIPTIONS_ACCESS_TOKEN`, `BILLING_MERCADOPAGO_SUBSCRIPTIONS_WEBHOOK_SECRET`, `BILLING_MERCADOPAGO_RESERVATIONS_PLATFORM_ACCESS_TOKEN`, `BILLING_MERCADOPAGO_RESERVATIONS_WEBHOOK_SECRET`, `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_CLIENT_ID`, `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_CLIENT_SECRET`, `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_STATE_SIGNING_SECRET`, `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_TOKEN_ENCRYPTION_KEY`
- para el pooler de Supabase hoy la dupla operativa recomendada queda fija y sin fallback silencioso: `SPRING_DATASOURCE_URL=jdbc:postgresql://aws-1-sa-east-1.pooler.supabase.com:5432/postgres` + `SPRING_DATASOURCE_USERNAME=postgres.owzzpcnuzzekqvqdimpr`; `SPRING_DATASOURCE_PASSWORD` y `SPRING_FLYWAY_PASSWORD` van como secret aparte
- Flyway ahora puede declararse explicito con `SPRING_FLYWAY_URL`, `SPRING_FLYWAY_USER`, `SPRING_FLYWAY_PASSWORD` y `SPRING_FLYWAY_DRIVER_CLASS_NAME`, pero si no vienen informados el bootstrap los alinea automaticamente al mismo datasource ya resuelto
- `backend-java/scripts/check_fly_runtime_env.sh` ya trata como faltante fatal cualquier deploy Fly donde la URL PostgreSQL no embeba credenciales y falten `SPRING_DATASOURCE_USERNAME` o `SPRING_DATASOURCE_PASSWORD`; esto refleja el patron real con Supabase pooler y evita falsos "bind errors" cuando en realidad el proceso cae antes de abrir Tomcat

Notas operativas de performance hoy:

- web monta `@vercel/speed-insights` desde `apps/web/src/pages/_app.tsx` para recolectar Speed Insights en despliegues Vercel
- `GET /cliente/reservas/me` queda mejor cubierto con el indice Flyway `idx_booking_user_start` sobre `booking(user_id, start_date_time)`
- search, perfil publico, slots, inbox y unread ya tienen timings tecnicos listos para enganchar a dashboards
- `V65__internal_ops_business_analytics.sql` y `V66__app_product_event_funnel_fields.sql` quedan como historial Flyway aplicado; `V79__remove_internal_product_analytics.sql` remueve la tabla `app_product_event`.
- `QUERY_COUNT_HEADER_ENABLED=true` expone `X-Plura-Sql-Query-Count` para requests HTTP y cuenta sentencias Hibernate/JPA por request; no cubre consultas JDBC directas como search o el nuevo inbox read path
- `V50__scale_hardening_indexes.sql` limpia indices sin uso claro en `email_dispatch`, `provider_operation` y `booking`, y agrega cobertura para lecturas por `provider_operation(status, updated_at|lease_until)` y `payment_transaction(external_reference, created_at)`
- `provider_operation.findDueOperations()` ahora evita leer operaciones con `lease_until` todavia activo, para bajar churn del worker bajo concurrencia
- `V70__supabase_data_api_hardening.sql` ya dejo `public` bloqueado para Data API (`authenticator -> pgrst.db_schemas=api_public`), con RLS y policy deny-all sobre tablas propias del proyecto en `public`
- `V73__move_relocatable_extensions_out_of_public.sql` mueve `pg_trgm` y `unaccent` al schema `extensions` y redefine `public.immutable_unaccent()` para dejar de depender de `public.unaccent`
- `postgis` sigue siendo el unico hallazgo de extensiones que no se puede cerrar solo con Flyway normal: en Supabase viene no relocatable y moverlo fuera de `public` requiere privilegio sobre `pg_extension` o intervención de soporte, por lo que `public.spatial_ref_sys` puede seguir apareciendo en Advisor hasta completar ese paso
- los defaults del backend quedaron mas conservadores para scale-out:
  - `HIKARI_MAX_POOL_SIZE` default `10`
  - `HIKARI_MIN_IDLE` default `2`
  - `AUTH_ALLOW_LEGACY_REFRESH_FALLBACK` default `false`
  - `APP_SEARCH_SLOT_BOOTSTRAP_ENABLED` default `false`
  - `SEARCH_MV_REFRESH_ON_STARTUP` default `false`
- el script `backend-java/scripts/loadtests/perf_phase3_rollout.js` ahora acepta `SCENARIO_DURATION` y VUs por escenario via env para poder correr smoke/perf sin editar el archivo

Variables de backend para storage de imágenes y Cloudflare R2:

- `IMAGE_STORAGE_PROVIDER` (o `STORAGE_PROVIDER`) — `local` o `r2` (default: `local`)
- `R2_ENDPOINT` — URL del endpoint Cloudflare R2
- `R2_BUCKET` — nombre del bucket (default: `plura-images`)
- `R2_REGION` — región R2 (default: `auto`)
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BASE_URL` — URL pública del bucket R2
- `IMAGE_UPLOAD_URL_EXPIRATION_MINUTES` — expiración de presigned URLs (default: `10`)
- `STORAGE_PUBLIC_BASE_URL` — base URL pública para resolver imágenes (default: `/uploads`)

Variables nuevas relevantes de performance:

- `SEARCH_MV_REFRESH_ENABLED`
- `SEARCH_MV_REFRESH_ON_STARTUP`
- `SEARCH_MV_REFRESH_CRON`
- `QUERY_COUNT_HEADER_ENABLED`

## Desarrollo local

Comandos esperados:

```bash
corepack enable
pnpm install
pnpm dev
pnpm dev:web
pnpm dev:backend-java
pnpm dev:backend:remote
```

En Windows, ejecutar desde PowerShell o CMD en la raiz del repo. `pnpm dev` levanta web y backend, pero no crea una base PostgreSQL local; el backend necesita `SPRING_DATASOURCE_URL` o `DATABASE_URL` en `.env.backend`, `backend-java/.env` o variables del entorno.

El script `scripts/predev.cjs`:

- limpia artefactos de Next en web
- mata procesos previos ocupando `3000` o `3002` cuando corresponde

## Deploy

Deploy vigente:

- backend: Fly.io con `backend-java/fly.toml`, imagen Docker desde `backend-java/Dockerfile` y healthcheck `GET /health`
- web: Vercel, con variables públicas `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_MAPBOX_TOKEN` y `NEXT_PUBLIC_IMAGE_CDN_BASE_URL`
- base de datos: Supabase PostgreSQL por Session Pooler
- imágenes: Cloudflare R2 con CDN público

Notas reales de deploy:

- la rama `prod` queda reservada para produccion futura; `test` es la rama de integracion estable y del ambiente de prueba actual mientras no exista un ambiente productivo separado
- `.github/workflows/deploy-fly-backend.yml` conserva el deploy automatico del backend de test actual cuando un `push` a `test` toca `backend-java/**` o el propio workflow
- `.github/workflows/backend-ci.yml` corre `./gradlew test` en PRs hacia `test` o `prod` y en pushes a `test`, para validar antes de promover cambios
- la metodologia operativa completa de ramas, features, fixes y hotfixes vive en `contexto/metodologia-git-y-produccion.md`
- el backend Fly debe declarar `APP_PUBLIC_WEB_URL` apuntando a la URL pública de Vercel para links/callbacks absolutos
- `backend-java/fly.toml` no debe versionar secretos ni valores productivos de billing; la configuracion runtime se carga con `fly secrets`/entorno de la app
- para Supabase PostgreSQL se usan `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `SPRING_FLYWAY_URL`, `SPRING_FLYWAY_USER`, `SPRING_FLYWAY_PASSWORD` y drivers PostgreSQL
- para OAuth Mercado Pago del profesional, el backend Fly necesita `BILLING_MERCADOPAGO_RESERVATIONS_*`, incluido `OAUTH_REDIRECT_URI=https://plura.fly.dev/profesional/payment-providers/mercadopago/oauth/callback` y `OAUTH_FRONTEND_REDIRECT_URL=https://plura-web-a6ka.vercel.app/oauth/mercadopago/callback`
- para suscripciones Mercado Pago, el backend Fly necesita `BILLING_MERCADOPAGO_SUBSCRIPTIONS_ACCESS_TOKEN` y `BILLING_MERCADOPAGO_SUBSCRIPTIONS_WEBHOOK_SECRET`
- para Core/trial, el backend Fly necesita `BILLING_CORE_PRICE` positivo y `BILLING_CORE_CURRENCY=UYU`; si se conserva fallback compatible, usar `BILLING_PLAN_PROFESSIONAL_PRICE` / `BILLING_PLAN_PROFESSIONAL_CURRENCY` con `PROFESSIONAL` de doble `S`
- comando operativo recomendado para precio Core de sandbox/test:
  `fly secrets set BILLING_CORE_PRICE=100 BILLING_CORE_CURRENCY=UYU BILLING_PLAN_PROFESSIONAL_PRICE=100 BILLING_PLAN_PROFESSIONAL_CURRENCY=UYU -a <NOMBRE_APP_BACKEND>`
- el backend compila para Java 25 LTS; Docker local y deploy usan imagenes `eclipse-temurin:25-*`, y Gradle usa `org.gradle.toolchains.foojay-resolver-convention` para resolver el toolchain si la maquina local no tiene JDK 25 instalado

## Integraciones externas detectadas

- Google OAuth
- Apple OAuth conservado solo a nivel backend/auth module; hoy sin exposicion en web ni mobile
- Mapbox
- Mercado Pago
- Redis
- Meilisearch
- AWS S3 SDK / Cloudflare R2
- AWS SQS
- SMTP
- Actuator limitado a health

## Integraciones importantes para roadmap que no aparecen cerradas

- proveedor de email transaccional para automatizaciones operativas
- sistema de eventos de producto para analytics y notificaciones
- servicio de reseñas o media mas rico para portfolio y fotos destacadas

## Scripts operativos utiles

- `backend-java/scripts/geocode_professional_profiles.sh`
  - geocodifica perfiles profesionales sin coordenadas
- `backend-java/scripts/audit_public_consistency.sh`
  - compara servicios y agenda publicados contra DB
- `backend-java/scripts/seed_marketplace_uy_qa.sh`
  - ejecuta `backend-java/db/qa_marketplace_uy_seed.sql` usando `.env.backend` o `backend-java/.env`
  - crea un dataset QA idempotente de marketplace con `24` profesionales de Uruguay, `1` cliente QA y refresco inmediato de search/suggest via materialized views
  - password comun del dataset: `PluraQA2026!`
- `backend-java/scripts/release/run_phase3_migrations.sh`
- `backend-java/scripts/release/run_phase4_migrations.sh`

## Observaciones de mantenimiento

- `docker-compose.yml` de raiz ya quedo alineado con el monorepo actual: levanta `backend-java` con Gradle y `apps/web` con `pnpm`, usando `.env.backend`, `backend-java/.env` y `.env.frontend`
- `packages/shared` no esta empaquetado como workspace package consumible.
- `apps/web/next.config.js` habilita `externalDir` para poder importar desde `packages/shared/src`.
- el backend ya no contempla H2 como fallback de arranque en runtime; si falta `SPRING_DATASOURCE_URL` o `DATABASE_URL`, la aplicacion debe fallar temprano para no ocultar una configuracion rota de PostgreSQL
- datasource y Flyway quedaron cerrados sobre la misma base por default: si el backend recibe `DATABASE_URL` en formato `postgres://` o `postgresql://`, el bootstrap la normaliza a JDBC, extrae credenciales embebidas y rellena tambien `SPRING_FLYWAY_*` para evitar que migraciones y JPA apunten a bases distintas
- el backend expone `server.port=${PORT:3000}` y ahora fija `server.address=0.0.0.0` por default para Fly.io y contenedores locales
- `auth_refresh_token` sigue siendo una tabla legacy de soporte para refresh fallback, pero su schema real mantiene `id BIGSERIAL`; el modelo JPA ya quedo alineado a ese contrato para que `ddl-auto=validate` no tumbe el arranque
- el naming comercial visible y tecnico activo quedo en `CORE` / `PLAN_CORE`; `PROFESSIONAL / LOCAL / ENTERPRISE` se conservan solo como aliases legacy de entrada.
- Flyway conserva migraciones historicas de dLocal (`V34`, `V37`) solo por continuidad de schema; el runtime vigente ya es Mercado Pago only y `V47` elimina los campos legacy del dominio profesional.
- billing de suscripciones requiere que el schema de `subscription` acepte solo `PLAN_CORE` como valor persistido; `V83` migra datos legacy desde `PLAN_BASIC`, `PLAN_PRO`, `PLAN_PROFESIONAL`, `PLAN_PREMIUM`, `PLAN_PROFESSIONAL`, `PLAN_LOCAL` y `PLAN_ENTERPRISE` a `PLAN_CORE`, quedando como no-op seguro donde `subscription` o `subscription.plan` no exista
- `V57` agrega columna `public_visible` (boolean, default false) a `app_feedback` con indice `idx_app_feedback_public` sobre `(public_visible, created_at DESC)`; backfill a `true` para feedback ACTIVE con texto existente
- `V60` alinea `app_feedback.rating` a `INTEGER`; `V54` lo habia creado como `SMALLINT`, pero el modelo JPA real de `core.feedback` usa `Integer` y con `ddl-auto=validate` el backend no llega a abrir puerto si esa correccion no corre
- `.env.backend` sigue siendo el archivo plano de importacion de env para local/docker y hoy ya usa `SPRING_DATASOURCE_*` + `SPRING_FLYWAY_*` apuntando al Session Pooler de Supabase; no deberia volver a cargar `DATABASE_URL` de una base vieja como fuente principal
- `backend-java/fly.toml` fija `primary_region = "gru"` para priorizar Sao Paulo mientras Fly presenta incidentes de provision en otras regiones; si la plataforma se estabiliza y conviene volver a otra region, hay que redeployar con esa region explicita
- `backend-java/fly.toml` ya no declara `processes = ["app"]` bajo `[http_service]`; se removio como workaround del incidente de Fly.io "flyctl deploy creating new app instances" sin tocar otros valores del deploy
- el repo ahora incluye `.github/workflows/deploy-fly-backend.yml`: despliega el backend de test actual a Fly cuando el `push` a `test` toca `backend-java/**` o el propio workflow, y tambien permite corrida manual (`workflow_dispatch`); antes del deploy corre `./gradlew test` con Temurin 25 y despues usa `flyctl deploy backend-java --config backend-java/fly.toml --remote-only`; requiere el secret de GitHub Actions `FLY_API_TOKEN`
- `backend-java/fly.toml` expone `internal_port = 3000` y define `http_service.checks` sobre `GET /health` con `grace_period = 180s`; esto es necesario porque el backend puede tardar mas de 2 minutos en abrir Tomcat mientras inicializa DB, Flyway y JPA
- `backend-java/fly.toml` tambien deja explicito `BILLING_MERCADOPAGO_ENABLED=true`; `BILLING_ENABLED=true` solo no alcanza para dejar operativo Mercado Pago en runtime
- si Fly reporta `The app is not listening on the expected address` y en la VM solo aparece `/.fly/hallpass`, no asumir primero un problema de `PORT`: con la configuracion actual (`server.address=0.0.0.0`, `server.port=${PORT:3000}`) eso suele indicar que el proceso Java murio en startup por secrets faltantes o fallo temprano de datasource antes de bindear el socket
- en local, `backend-java/.env` sigue usando frontend remoto en Vercel y callback backend publico temporal (ngrok) para destrabar flujos de Mercado Pago que no aceptan `localhost`; las variables activas de storage son `IMAGE_STORAGE_PROVIDER` + `R2_*`, no los aliases legacy `APP_STORAGE_*`
- Fly.io despliega el backend desde `backend-java/fly.toml` usando `backend-java/Dockerfile`; los secrets de Mercado Pago, Supabase y storage deben mantenerse en Fly, no en archivos versionados
- para storage de imágenes en producción, el servicio backend debe exponer las variables `IMAGE_STORAGE_PROVIDER=r2`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` y opcionalmente `R2_BUCKET` y `R2_PUBLIC_BASE_URL`
- la web en Vercel necesita `NEXT_PUBLIC_IMAGE_CDN_BASE_URL` apuntando al dominio CDN de R2 para resolver URLs de imágenes
