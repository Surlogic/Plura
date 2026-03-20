# Rutas Y Modulos

Este documento mezcla dos lecturas:

- que rutas y modulos existen hoy en el repo
- como se relacionan con `usuario`, `Free`, `Pro` y `Premium`

## Resumen de producto por superficie

### Usuario

Experiencia esperada:

- descubrir profesionales o negocios
- ver perfil publico
- reservar, pagar si aplica y gestionar cambios
- revisar historial, favoritos, notificaciones y reseñas

Cobertura actual visible:

- marketplace y exploracion
- pagina publica del profesional
- flujo de reserva
- historial y favoritos del cliente
- login, registro y recovery
- backend de notificaciones cliente con inbox y timeline por reserva

Huecos o maduracion pendiente:

- reseñas completas y respuestas del negocio
- beneficios tipo puntos, gift cards o ultima hora
- settings y preferencias visibles para cliente

### Free / Pro / Premium

Experiencia esperada:

- perfil y pagina publica
- servicios, agenda, bloqueos y reservas
- configuracion operativa y comercial
- upgrade con features bloqueadas visibles

Cobertura actual visible:

- dashboard profesional
- servicios
- horarios y reservas
- perfil del negocio y pagina publica
- billing

Huecos o maduracion pendiente:

- onboarding inicial guiado
- gating completo por plan en toda la UX
- modulos Premium de multiequipo, fidelizacion, portfolio, tienda y automatizacion avanzada

## Web

Base: `apps/web/src/pages`

### Rutas publicas

- `/`: home con hero, categorias, top professionals y FAQ.
- `/explorar`: buscador principal con filtros, lista y mapa.
- `/explorar/[slug]`: vista detallada de exploracion por slug.
- `/profesional/[slug]`: pagina publica del profesional.
- `/profesional/pagina/[slug]`: variante de pagina publica.
- `/reservar`: flujo de reserva desde perfil publico.
- `/reserva-confirmada`: confirmacion post reserva o pago.
- `/login`: acceso general.
- `/oauth/callback`: callback de OAuth.
- `/oauth/mercadopago/callback`: retorno dedicado para conexion OAuth de Mercado Pago del profesional.
- `/auth/forgot-password`
- `/auth/reset-password`

Lectura de producto:

- estas rutas soportan el nucleo de `Usuario` y el `MVP`
- `/explorar`, `/profesional/[slug]` y `/reservar` son parte del loop principal marketplace -> perfil -> reserva
- `/explorar` y `/profesional/pagina/[slug]` ya no fuerzan auth refresh ni favoritos en 401 cuando el cliente no tiene una sesion conocida; las features auth-only se habilitan recien con hint de sesion valida

### Rutas del cliente

- `/cliente/auth/login`
- `/cliente/auth/register`
- `/cliente/inicio`
- `/cliente/dashboard`
- `/cliente/reservas`
- `/cliente/notificaciones`
- `/cliente/favoritos`
- `/cliente/perfil`
- `/cliente/configuracion`

Modulos relevantes:

- `components/cliente`: shell y sidebar del area cliente.
- `components/cliente/notifications`: campana en navbar cliente, dropdown preview e inbox FE-C2 con toolbar, lista, items y acciones de lectura.
- `components/cliente/reservations`: timeline e historial sobrio dentro del panel de detalle de la reserva seleccionada.
- `context/ClientNotificationsContext.tsx`: token de refresh mas estado compartido del unread count para deduplicar requests entre campana e inbox sin cambiar la UX visible.
- `context/ClientProfileContext.tsx`: carga `GET /auth/me/cliente`.
- `hooks/useClientBookingTimeline.ts`: carga `GET /cliente/reservas/{bookingId}/timeline` con estados `loading / empty / error`.
- `hooks/useClientNotificationUnreadCount.ts` y `hooks/useClientNotificationPreview.ts`: contador y preview del dropdown cliente.
- `hooks/useClientNotificationInbox.ts`: filtros por estado y evento, carga incremental y acciones `mark read` / `read all` del inbox cliente.
- `hooks/useFavoriteProfessionals.ts`: favoritos del cliente.
- `services/clientBookings.ts`: reservas y pago del cliente.
- `services/clientBookings.ts`: reservas y pago del cliente; ahora cachea `actions` y `timeline` por booking y permite prefetch conservador del detalle para bajar waterfalls al entrar o cambiar de seleccion.
- `types/clientBookingTimeline.ts` y `utils/clientBookingTimeline.ts`: contrato y formateo del historial operativo de reservas cliente.
- `services/clientNotifications.ts`: unread count, preview y acciones de lectura del inbox cliente.

Backend relacionado:

- `backend-java/src/main/java/com/plura/plurabackend/usuario/notification`: wrappers API cliente para inbox, unread/read y timeline de reserva.
- `backend-java/src/main/java/com/plura/plurabackend/core/notification`: modulo transaccional compartido entre profesional y cliente.
- `backend-java/src/main/java/com/plura/plurabackend/professional/paymentprovider`: endpoints OAuth de Mercado Pago para conectar la cuenta del profesional.
- `backend-java/src/main/java/com/plura/plurabackend/core/billing/providerconnection`: persistencia y servicio de conexiones OAuth del provider.

Lectura de producto:

- cubre la base del plan `Usuario`
- el historial de reservas y favoritos ya tiene estructura
- la web cliente ya tiene campana, unread badge, dropdown preview e inbox real en `/cliente/notificaciones`
- `/cliente/reservas` ya usa su panel lateral de detalle como experiencia real de reserva e incluye timeline de actividad por `bookingId`
- `/cliente/reservas` mantiene el refresco de estados pendientes, pero el polling ya no corre en background y usa backoff conservador para bajar presion de red
- `/cliente/reservas` ahora prefetch-ea `actions + timeline` de la reserva seleccionada apenas entra el listado para reducir espera perceptible sin cambiar contratos
- todavia faltan piezas visibles para reseñas, beneficios y settings de notificaciones

### Rutas del profesional

- `/profesional/auth/login`
- `/profesional/auth/register`
- `/profesional/dashboard`
- `/profesional/dashboard/servicios`
- `/profesional/dashboard/horarios`
- `/profesional/dashboard/reservas`
- `/profesional/dashboard/configuracion`
- `/profesional/dashboard/pagina-publica`
- `/profesional/dashboard/perfil-negocio`
- `/profesional/dashboard/billing`
- `/profesional/notificaciones`

Modulos relevantes:

- `components/profesional`: UI publica y dashboard.
- `components/profesional/notifications`: campana en sidebar, dropdown FE-1 e inbox FE-2 con toolbar, lista, items y acciones de lectura.
- `components/profesional/reservations`: timeline operativo dentro del panel de detalle de la reserva seleccionada.
- `context/ProfessionalNotificationsContext.tsx`: token de refresh mas estado compartido del unread count para sincronizar inbox, dropdown y contador sin duplicar requests.
- `context/ProfessionalProfileContext.tsx`: carga `/auth/me/profesional` o fallback `/auth/me/professional`.
- `hooks/useProfessionalNotificationInbox.ts`: filtros por estado y evento, carga incremental y acciones `mark read` / `read all`.
- `hooks/useProfessionalNotificationUnreadCount.ts` y `hooks/useProfessionalNotificationPreview.ts`: mantienen contador y preview de FE-1 en sync con acciones del inbox.
- `hooks/useProfessionalBookingTimeline.ts`: carga `GET /profesional/reservas/{bookingId}/timeline` con estados `loading / empty / error`.
- `services/professionalBookings.ts`
- `services/professionalBookings.ts`: cachea `actions` y `timeline` por booking y expone prefetch del detalle para bajar waterfalls en el dashboard operativo.
- `services/professionalNotifications.ts`
- `services/professionalBookingPolicy.ts`
- `hooks/useProfessionalBilling.ts`

Lectura de producto:

- esta area concentra el valor de `Free` y buena parte de `Pro`
- `servicios`, `horarios`, `reservas`, `perfil-negocio` y `notificaciones` son el corazon operativo
- `billing` ya existe, pero el naming de codigo sigue siendo `BASIC / PROFESIONAL / ENTERPRISE`
- `/profesional/dashboard/billing` ya separa dos bloques: `Mi plan de Plura` y `Cobros de reservas con Mercado Pago`
- la web profesional ya consume `GET/POST/DELETE /profesional/payment-providers/mercadopago/*` y no usa `payout-config`
- el retorno OAuth de Mercado Pago ya tiene pantalla propia en `/oauth/mercadopago/callback` y luego vuelve a `/profesional/dashboard/billing`
- en `/profesional/dashboard/billing`, `BASIC` ya no intenta conectar Mercado Pago: muestra un bloque de upgrade y reserva la conexion OAuth solo para `PROFESIONAL / ENTERPRISE`
- `/profesional/dashboard/billing` evita cargar el estado de conexion de Mercado Pago cuando la pantalla ya va a redirigir al callback OAuth, difiere el montaje inicial de comparativa/planes y carga la conexion de cobros recien al acercarse a esa seccion para bajar trabajo al entrar; sus bloques principales de plan/comparativa/cobros quedan aislados para no rerenderizar toda la superficie ante banners o estados transitorios de billing
- `/profesional/notificaciones` ya funciona como centro real de inbox: lista paginada con `cargar mas`, filtros basicos y navegacion contextual por `actionUrl`
- la navegacion contextual de notificaciones profesional apunta a la UX real de reservas en `/profesional/dashboard/reservas?bookingId={id}` y el panel selecciona la reserva desde query string
- `/profesional/dashboard/reservas` ya usa su panel lateral de detalle como experiencia real de reserva e incluye timeline de actividad e historial por `bookingId`
- `/profesional/dashboard/reservas` mantiene auto-refresh para estados pendientes, pero ahora pausa polling con la pestaña oculta y aplica backoff para reducir trafico redundante
- `/profesional/dashboard/reservas` ahora paraleliza reservas y servicios al entrar, y prefetch-ea `actions + timeline` de la seleccion activa para acortar la cascada inicial
- `/profesional/dashboard/reservas` debe seguir disponible para `Free/BASIC` como modulo operativo de reservas
- la web profesional ya no expone la accion manual `completar` para reservas; en la UX operativa quedaron confirmacion, cancelacion, no-show, reagendamiento y lectura de timeline
- `/profesional/dashboard` recorta trabajo de agenda en cliente: la grilla semanal y mensual quedaron separadas para evitar rerenders pesados al abrir el drawer, y la carga de reservas ya no expande fechas dispersas a un unico rango continuo cuando el dashboard combina semana actual con una semana o mes navegados
- `/profesional/dashboard` debe mostrar en agenda todas las reservas no canceladas del rango visible, incluyendo `pending`, `confirmed`, `completed` y `no_show`; `cancelled` queda fuera para no bloquear visualmente huecos liberados
- `/profesional/dashboard` ya no limita la carga de bookings a `today` cuando el plan es `DAILY/BASIC`; la agenda semanal y mensual queda visible tambien en `Free/BASIC` y usa los bookings reales del rango visible para evitar huecos falsos
- `services/professionalBookings.ts` ahora mapea `date/time` de reservas profesionales a claves operativas `YYYY-MM-DD` y `HH:mm`, no a labels humanizados; la presentacion visible de fechas queda en la UI para no romper la grilla de agenda
- `/profesional/dashboard` compacta el bloque de `Pulso semanal` para no empujar la agenda; cuando no hay analytics muestra una nota breve en lugar de tarjetas altas vacias
- `/profesional/dashboard` en vista semanal usa una base completa de `24h` con scroll vertical interno; el viewport visible muestra aproximadamente `12h`, el foco inicial se calcula en frontend con horarios configurados y reservas visibles de la semana, agrega margen corto y solo cae a fallback `09:00-18:00` para posicionamiento inicial si no hay datos suficientes; el eje horario visible marca horas de una en una y deja subdivisiones de `30m` como referencia sutil
- `/profesional/dashboard` agrega una toolbar compacta para saltar dentro del dia a `Madrugada`, `Mañana`, `Tarde`, `Noche` y `Ahora` sin romper navegacion semanal ni render de reservas
- `/profesional/dashboard` en desktop prioriza visibilidad y estabilidad de agenda sobre un shell full-height estricto: la pagina puede seguir scrolleando normalmente, mientras la vista semanal mantiene scroll interno solo en el cuerpo del calendario y una altura explicita para que la grilla no colapse ni quede truncada

Huecos relevantes contra el objetivo:

- onboarding inicial del negocio
- ficha del cliente orientada a `Pro`
- analytics mas visibles
- chat interno
- soporte multiequipo propio de `Premium`

### Modulos transversales web

- `components/search`: barra unificada, sugerencias, fecha y location autocomplete.
- `components/map`: wrapper de Mapbox.
- `services/search.ts`: integra search y suggest.
- `services/geo.ts`: geocoding y autocomplete.
- `services/api.ts`: auth, refresh y headers de plataforma `WEB`.
- `services/session.ts`: mantiene fallback token y un `known session hint` en storage para no disparar refresh/autofetch en rutas publicas cuando no hay sesion confirmada.
- `middleware.ts`: CSP y headers de seguridad.
- `pages/profesional/pagina/[slug].tsx`: reutiliza fetch cacheado del perfil publico, difiere quick slots hasta interaccion real con servicios y posterga tanto el geocoding fallback como la carga del mapa hasta que el bloque entra en viewport para bajar costo inicial en la pagina publica.

Lectura de producto:

- search + mapa sostienen marketplace y descubrimiento
- `middleware.ts` y `services/api.ts` sostienen parte del bloque core de autenticacion y seguridad
- `_app.tsx` mantiene globales los providers de perfil, pero ahora monta por ruta los providers de notificaciones y del shell profesional con cambios sin guardar solo en dashboard/notificaciones para bajar costo base fuera de esas superficies; ademas las campanas de notificaciones del shell difieren la primera carga del unread count hasta interaccion o idle en vez de pedirlo apenas monta la vista; los hooks de perfil ya no fuerzan un refetch extra cuando el provider aun no termino su carga inicial

## Mobile

Base: `apps/mobile/app`

### Entrada y layout

- `app/index.tsx`: redirige a `/(tabs)`.
- `app/_layout.tsx`: monta `ProfessionalProfileProvider` y stack principal.

### Grupo `(tabs)`

- `/(tabs)/index`
- `/(tabs)/dashboard`
- `/(tabs)/explore`
- `/(tabs)/favorites`
- `/(tabs)/bookings`
- `/(tabs)/notifications`

Lectura de producto:

- la tab bar esta centrada en cliente
- `explore`, `favorites`, `bookings` y `notifications` reflejan el nucleo del plan `Usuario`
- `dashboard` mezcla acceso de cliente y profesional, lo que puede servir al MVP pero puede requerir separacion mas adelante

### Grupo `(auth)`

- `/(auth)/login`
- `/(auth)/register`
- `/(auth)/forgot-password`
- `/(auth)/reset-password`

Lectura de producto:

- cubre autenticacion base
- el login social con Google ya aparece en hooks y variables de entorno

### Grupo `dashboard`

- `/dashboard/agenda`
- `/dashboard/services`
- `/dashboard/business-profile`
- `/dashboard/billing`
- `/dashboard/schedule`
- `/dashboard/settings`

Lectura de producto:

- reproduce parte del panel profesional en mobile
- responde bien al objetivo `Free` y `Pro` de operar una agenda desde el telefono
- `dashboard/billing` ya no usa `payout-config`; muestra el plan de Plura y el estado de conexion OAuth de `Mercado Pago` como unico provider vigente para cobros
- no expone aun el set completo de capacidades `Premium`

### Otras pantallas mobile

- `/profesional/[slug]`: perfil publico del profesional.
- `/reservar`: flujo de reserva.

### Modulos transversales mobile

- `src/services/api.ts`: auth y refresh con headers `MOBILE`.
- `src/services/session.ts`: persistencia de tokens.
- `src/services/search.ts`
- `src/services/publicBookings.ts`
- `src/services/clientBookings.ts`
- `src/services/professionalBookings.ts`
- `src/hooks/useGoogleOAuth.ts`

Lectura de producto:

- mobile cubre reserva, cuenta y operacion basica
- todavia no se ve una capa madura para notificaciones transaccionales, reseñas, fidelizacion o chat

## Shared

Base: `packages/shared/src`

Modulos compartidos actuales:

- `billing/plans.ts`
- `billing/planAccess.ts`
- `bookings/idempotency.ts`
- `bookings/mappers.ts`
- `publicBookings/contracts.ts`
- `search/service.ts`
- `types/*`

Uso actual:

- web y mobile importan estos archivos por rutas relativas directas
- no aparece un paquete workspace formalizado para `shared`

Lectura de producto:

- `billing/plans.ts` ya modela los planes, pero con naming tecnico `BASIC / PROFESIONAL / ENTERPRISE`
- `types/professional.ts` ya contiene entitlements como pagos online, client profile, portfolio, loyalty, last minute, store y shipping
- eso indica que parte del modelo de permisos para `Pro` y `Premium` ya esta pensado, aunque no toda la UX este cerrada
