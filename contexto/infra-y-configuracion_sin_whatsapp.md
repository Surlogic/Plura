# Infra Y Configuracion

Este documento cruza el stack tecnico actual con las necesidades del producto definido para `Usuario`, `Free`, `Pro` y `Premium`.

## Stack principal

- Monorepo `pnpm`
- Web: `Next.js 16`, `React 19`, `TypeScript`
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
- despues de OAuth, el backend puede exigir completar telefono con `POST /auth/oauth/complete-phone` antes de considerar cerrada la cuenta para ciertos flujos

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

- `Mercado Pago` esta conectado al billing de suscripciones de plataforma
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
- `BILLING_MERCADOPAGO_RESERVATIONS_PROCESSING_FEE_ENABLED`
- `BILLING_MERCADOPAGO_RESERVATIONS_PROCESSING_FEE_LABEL`
- `BILLING_MERCADOPAGO_RESERVATIONS_PROCESSING_FEE_INSTANT_PROVIDER_FEE_PERCENT`
- `BILLING_MERCADOPAGO_RESERVATIONS_PROCESSING_FEE_DELAYED_PROVIDER_FEE_PERCENT`
- `BILLING_MERCADOPAGO_RESERVATIONS_PROCESSING_FEE_TAX_PERCENT`
- `BILLING_MERCADOPAGO_RESERVATIONS_PROCESSING_FEE_PLATFORM_FEE_PERCENT`

Notas reales de binding local:

- el backend no depende solo del `.env` del cwd: ahora intenta leer `./.env` y tambien `./backend-java/.env`
- si se ejecuta el backend desde la raiz del monorepo, `backend-java/.env` sigue siendo tomado como fallback
- `backend-java/fly.toml` ya fija los env no secretos principales para Fly (`APP_PUBLIC_WEB_URL`, `CORS_ALLOWED_ORIGINS`, cookies auth, SMTP habilitado, storage `r2`, billing base y redirects OAuth/callback de Mercado Pago); los secretos sensibles siguen yendo por `fly secrets`
- para evitar desalineos entre placeholders de `application.yml` y beans que leen propiedades ya resueltas (`SecurityConfig`, `CookieOriginProtectionFilter`, rate limiting), `backend-java/fly.toml` expone tambien `APP_CORS_ALLOWED_ORIGINS` y `APP_SECURITY_TRUST_FORWARDED_HEADERS` ademas de los aliases legacy/no anidados; esto corrige preflights CORS reales contra `https://plura-web-a6ka.vercel.app`
- el backend acepta `X-Internal-Token` dentro de los headers CORS permitidos; esto es obligatorio para usar desde web los paneles internos `/internal/ops/*` (feedback, reviews, analytics) sin que falle el preflight
- el backend ahora tambien acepta `X-Plura-Analytics-Session-Id` dentro de los headers CORS permitidos; web lo manda en requests client-side para correlacionar search, profile, funnel de `/reservar` y `BOOKING_CREATED` dentro de una misma sesion anonima
- cuando Fly muestra `Proxy not finding machines to route requests` para este backend, el primer chequeo no deberia ser el puerto: el codigo ya expone `server.address=0.0.0.0` y `server.port=${PORT:3000}`; el fallo mas probable pasa por machine caida, `healthcheck` sin pasar o secrets faltantes de DB/JWT/R2
- el repo ahora incluye `backend-java/scripts/check_fly_runtime_env.sh` para validar desde shell las variables minimas de arranque segun el `fly.toml` actual y separar faltantes fatales de advertencias operativas
- la secuencia real de migraciones Flyway del backend llega a `V69`; `V68__service_processing_fee_mode.sql` agrega `processing_fee_mode` a `professional_service` y `prepaid_processing_fee_mode_snapshot` a `booking`; `V69__booking_prepaid_processing_fee_snapshot.sql` agrega en `booking` los snapshots `prepaid_processing_fee_amount_snapshot` y `prepaid_total_amount_snapshot`
- el repo ahora incluye `backend-java/src/test/java/com/plura/plurabackend/db/FlywayMigrationVersionUniquenessTest.java` para detectar versiones Flyway duplicadas antes de romper un deploy
- el backend mantiene fallback a los nombres legacy `BILLING_MERCADOPAGO_ACCESS_TOKEN`, `BILLING_MERCADOPAGO_WEBHOOK_SECRET` y `BILLING_MERCADOPAGO_OAUTH_*`, pero el naming operativo recomendado ya es explicito por dominio: `SUBSCRIPTIONS_*` para planes y `RESERVATIONS_*` para cobros/OAuth profesional
- para OAuth de Mercado Pago el error de `state` ya no implica adivinar secretos: el backend espera primero `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_STATE_SIGNING_SECRET`, y si no existe hace fallback a la clave de cifrado o al client secret
- en local, tener solo `BILLING_MERCADOPAGO_RESERVATIONS_PLATFORM_ACCESS_TOKEN` no alcanza para OAuth: para abrir el onboarding siguen siendo obligatorios `CLIENT_ID` y `REDIRECT_URI`; para completar el callback y persistir la conexion del profesional tambien se vuelve obligatorio `CLIENT_SECRET`
- con `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_PKCE_ENABLED=true`, el backend genera `code_verifier` y `code_challenge` con `S256`, persiste temporalmente el `verifier` cifrado en `professional_payment_provider_connection`, y en el token exchange manda `code_verifier` sin exponerlo al frontend
- `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_REDIRECT_URI` debe coincidir exactamente con el callback backend registrado en la app OAuth de Mercado Pago; ejemplos:
  `http://localhost:3000/profesional/payment-providers/mercadopago/oauth/callback`
  `https://plura-ir62.onrender.com/profesional/payment-providers/mercadopago/oauth/callback`
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
- automatizaciones Pro y Premium

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

- analytics basicos en `Pro`
- analytics avanzados en `Premium`
- entendimiento de embudo marketplace -> reserva -> retorno

Infra actual detectada:

- Prometheus y Actuator para observabilidad tecnica
- Micrometer ya registra timings utiles en search y ahora tambien en public profile, public slots, client bookings, notification inbox y unread count
- tracking funcional interno en PostgreSQL via tabla `app_product_event`; ademas de `SEARCH_PERFORMED` y `PROFESSIONAL_PROFILE_VIEWED`, ahora persiste eventos del funnel web de `/reservar`, `BOOKING_CREATED`, `PAYMENT_SESSION_CREATED` y cambios clave de lifecycle como `BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `BOOKING_RESCHEDULED`, `BOOKING_COMPLETED` y `BOOKING_NO_SHOW`
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
- `ANALYZE`

Lectura de producto:

- cubre API, mapa y login social en web
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
- mobile usa `expo-web-browser` para abrir checkout de reservas, checkout de plan y OAuth de `Mercado Pago` dentro de la app sin sacar al usuario a un navegador externo completo
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
- observabilidad via Actuator / Prometheus / Micrometer timers

Variables criticas sin las que el backend puede fallar o degradarse:

- `JWT_SECRET`
- `JWT_REFRESH_PEPPER`
- `OPS_INTERNAL_TOKEN` para paneles internos protegidos por token
- `OPS_ADMIN_CLIENT_EMAIL` si se quiere cambiar el email cliente habilitado para entrar al panel web `/internal/ops/analytics`; por default queda `admin@surlogicuy.com`
- credenciales DB productivas
- credenciales OAuth si se usa login social
- variables de billing si se habilitan pagos reales
- variables OAuth de Mercado Pago si se quiere conectar la cuenta del profesional desde billing
- SMTP operativo si se quiere usar recovery escalonado y otros OTP por email sin degradacion
- en Fly, ademas de los env no secretos versionados en `backend-java/fly.toml`, siguen siendo obligatorios como secrets al menos: `SPRING_DATASOURCE_PASSWORD`, `SPRING_FLYWAY_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_PEPPER`, `GOOGLE_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID` si se va a aceptar OAuth mobile iOS, `GOOGLE_CLIENT_SECRET`, `EMAIL_FROM_ADDRESS`, `EMAIL_SMTP_USERNAME`, `EMAIL_SMTP_PASSWORD`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `BILLING_MERCADOPAGO_SUBSCRIPTIONS_ACCESS_TOKEN`, `BILLING_MERCADOPAGO_SUBSCRIPTIONS_WEBHOOK_SECRET`, `BILLING_MERCADOPAGO_RESERVATIONS_PLATFORM_ACCESS_TOKEN`, `BILLING_MERCADOPAGO_RESERVATIONS_WEBHOOK_SECRET`, `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_CLIENT_ID`, `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_CLIENT_SECRET`, `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_STATE_SIGNING_SECRET`, `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_TOKEN_ENCRYPTION_KEY`
- para el pooler de Supabase hoy la dupla operativa recomendada queda fija y sin fallback silencioso: `SPRING_DATASOURCE_URL=jdbc:postgresql://aws-1-sa-east-1.pooler.supabase.com:5432/postgres` + `SPRING_DATASOURCE_USERNAME=postgres.owzzpcnuzzekqvqdimpr`; `SPRING_DATASOURCE_PASSWORD` y `SPRING_FLYWAY_PASSWORD` van como secret aparte
- Flyway ahora puede declararse explicito con `SPRING_FLYWAY_URL`, `SPRING_FLYWAY_USER`, `SPRING_FLYWAY_PASSWORD` y `SPRING_FLYWAY_DRIVER_CLASS_NAME`, pero si no vienen informados el bootstrap los alinea automaticamente al mismo datasource ya resuelto
- `backend-java/scripts/check_fly_runtime_env.sh` ya trata como faltante fatal cualquier deploy Fly donde la URL PostgreSQL no embeba credenciales y falten `SPRING_DATASOURCE_USERNAME` o `SPRING_DATASOURCE_PASSWORD`; esto refleja el patron real con Supabase pooler y evita falsos "bind errors" cuando en realidad el proceso cae antes de abrir Tomcat

Notas operativas de performance hoy:

- `GET /cliente/reservas/me` queda mejor cubierto con el indice Flyway `idx_booking_user_start` sobre `booking(user_id, start_date_time)`
- search, perfil publico, slots, inbox y unread ya tienen timings tecnicos listos para enganchar a dashboards
- `V65__internal_ops_business_analytics.sql` agrega la tabla `app_product_event` mas indices de reporting en `booking`; `V66__app_product_event_funnel_fields.sql` la amplia con ids/sesion/paso para dejar de mirar solo discovery y poder leer el funnel completo de reserva sin depender de proveedor externo
- `QUERY_COUNT_HEADER_ENABLED=true` expone `X-Plura-Sql-Query-Count` para requests HTTP y cuenta sentencias Hibernate/JPA por request; no cubre consultas JDBC directas como search o el nuevo inbox read path
- `V50__scale_hardening_indexes.sql` limpia indices sin uso claro en `email_dispatch`, `provider_operation` y `booking`, y agrega cobertura para lecturas por `provider_operation(status, updated_at|lease_until)` y `payment_transaction(external_reference, created_at)`
- `provider_operation.findDueOperations()` ahora evita leer operaciones con `lease_until` todavia activo, para bajar churn del worker bajo concurrencia
- los defaults del backend quedaron mas conservadores para scale-out:
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

Notas reales de deploy en Render:

- `plura-api` debe declarar tambien `APP_PUBLIC_WEB_URL` para links/callbacks absolutos
- `plura-web` debe usar el mismo `NEXT_BUILD_DIR` en build y start; el blueprint quedo alineado a `.next-build` en ambos comandos para que `next start` encuentre el artefacto correcto
- el blueprint ya no provisiona una base propia en Render: espera `Supabase PostgreSQL` por Session Pooler con `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver`, `SPRING_FLYWAY_URL`, `SPRING_FLYWAY_USER`, `SPRING_FLYWAY_PASSWORD` y `SPRING_FLYWAY_DRIVER_CLASS_NAME=org.postgresql.Driver`
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
- Apple OAuth conservado solo a nivel backend/auth module; hoy sin exposicion en web ni mobile
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
- el backend expone `server.port=${PORT:3000}` y ahora fija `server.address=0.0.0.0` por default para despliegues tipo Fly.io/Render
- `auth_refresh_token` sigue siendo una tabla legacy de soporte para refresh fallback, pero su schema real mantiene `id BIGSERIAL`; el modelo JPA ya quedo alineado a ese contrato para que `ddl-auto=validate` no tumbe el arranque
- el naming de planes en codigo sigue siendo `BASIC / PROFESIONAL / ENTERPRISE`; el contexto de producto actualizado usa `Free / Pro / Premium`.
- Flyway conserva migraciones historicas de dLocal (`V34`, `V37`) solo por continuidad de schema; el runtime vigente ya es Mercado Pago only y `V47` elimina los campos legacy del dominio profesional.
- billing de suscripciones requiere que el schema de `subscription` acepte `PLAN_BASIC`, `PLAN_PROFESIONAL` y `PLAN_ENTERPRISE`; `V51` alinea el constraint legacy que todavia admitia `PLAN_PRO` y `PLAN_PREMIUM`
- `V57` agrega columna `public_visible` (boolean, default false) a `app_feedback` con indice `idx_app_feedback_public` sobre `(public_visible, created_at DESC)`; backfill a `true` para feedback ACTIVE con texto existente
- `V60` alinea `app_feedback.rating` a `INTEGER`; `V54` lo habia creado como `SMALLINT`, pero el modelo JPA real de `core.feedback` usa `Integer` y con `ddl-auto=validate` el backend no llega a abrir puerto si esa correccion no corre
- `.env.backend` sigue siendo el archivo plano de importacion de env para local/docker y hoy ya usa `SPRING_DATASOURCE_*` + `SPRING_FLYWAY_*` apuntando al Session Pooler de Supabase; no deberia volver a cargar `DATABASE_URL` de una base vieja como fuente principal
- `backend-java/fly.toml` fija `primary_region = "gru"` para priorizar Sao Paulo mientras Fly presenta incidentes de provision en otras regiones; si la plataforma se estabiliza y conviene volver a otra region, hay que redeployar con esa region explicita
- el repo ahora incluye `.github/workflows/deploy-fly-backend.yml`: despliega el backend a Fly en cada `push` a `main` y tambien permite corrida manual (`workflow_dispatch`); usa `flyctl deploy --config backend-java/fly.toml --remote-only` y requiere el secret de GitHub Actions `FLY_API_TOKEN`
- `backend-java/fly.toml` expone `internal_port = 3000` y define `http_service.checks` sobre `GET /health` con `grace_period = 180s`; esto es necesario porque el backend puede tardar mas de 2 minutos en abrir Tomcat mientras inicializa DB, Flyway y JPA
- `backend-java/fly.toml` tambien deja explicito `BILLING_MERCADOPAGO_ENABLED=true`; `BILLING_ENABLED=true` solo no alcanza para dejar operativo Mercado Pago en runtime
- si Fly reporta `The app is not listening on the expected address` y en la VM solo aparece `/.fly/hallpass`, no asumir primero un problema de `PORT`: con la configuracion actual (`server.address=0.0.0.0`, `server.port=${PORT:3000}`) eso suele indicar que el proceso Java murio en startup por secrets faltantes o fallo temprano de datasource antes de bindear el socket
- en local, `backend-java/.env` sigue usando frontend remoto en Vercel y callback backend publico temporal (ngrok) para destrabar flujos de Mercado Pago que no aceptan `localhost`; las variables activas de storage son `IMAGE_STORAGE_PROVIDER` + `R2_*`, no los aliases legacy `APP_STORAGE_*`
- en `render.yaml`, el servicio `plura-api` usa `rootDir=backend-java`, por lo que `dockerfilePath` y `dockerContext` deben mantenerse relativos a esa carpeta; hoy quedaron alineados a `./Dockerfile` y `.`
- el blueprint de Render ya expone tanto variables legacy de Mercado Pago como el naming explicito por dominio `SUBSCRIPTIONS_*` y `RESERVATIONS_*`, incluido el flag `BILLING_MERCADOPAGO_RESERVATIONS_OAUTH_PKCE_ENABLED`; para DB ya no depende de una instancia `plura-db` administrada por Render
- para storage de imágenes en producción, el servicio backend debe exponer las variables `IMAGE_STORAGE_PROVIDER=r2`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` y opcionalmente `R2_BUCKET` y `R2_PUBLIC_BASE_URL`
- la web en Render necesita `NEXT_PUBLIC_IMAGE_CDN_BASE_URL` apuntando al dominio CDN de R2 para resolver URLs de imágenes
