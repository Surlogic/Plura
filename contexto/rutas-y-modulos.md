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

- respuestas publicas del negocio a reseñas (reseñas ya cerradas con moderacion, ocultamiento, analytics y notificacion)
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
- UI y flujo completo Premium de multiequipo: ya existen el backend de equipo, login unificado con selector de contexto, pantalla de aceptacion de invitacion, dashboard admin de equipo y dashboard basico de trabajador (calendario y reservas). Pendiente: editor de horarios por trabajador en UI admin, calendario completo (no solo lista por dias) en UI trabajador y reserva publica que use `worker_id` con autoasignacion.
- modulos Premium de fidelizacion, portfolio, tienda y automatizacion avanzada

## Web

Base: `apps/web/src/pages`

### Rutas publicas

- `/`: home SSG con revalidacion de `5` minutos (`getStaticProps`) con hero + buscador unificado en variante simplificada, categorias visuales, top businesses, bloque editorial de `como funciona` en formato timeline de `4` pasos, ReviewsSection (testimonios publicos de feedback de app via `GET /public/app-feedback`) y CTA final centrado con titulo `¡Unite a nuestra comunidad!`; `Reservá ya` deriva a `/explorar` y `Registrá tu negocio` al registro existente `/profesional/auth/register`; si la regeneracion no trae data util, mantiene retry client-side. El hero ahora arma una composicion superior `texto + visual` y ubica la columna izquierda como `titulo/subtitulo -> buscador -> metricas`, con mas aire vertical entre buscador y stats para que no quede pegado a `Explorá por categoría`; la pieza visual es una sola card animada que rota automaticamente imagenes de todos los rubros publicos disponibles en `homeData.categories`, usando `category.imageUrl` cuando existe y placeholders SVG locales por slug/nombre como fallback, sin tocar la logica compartida del buscador. Las cards destacadas ya usan `banner` como media principal, `logo` superpuesto y fallback a foto real del negocio antes de cualquier placeholder.
- `/explorar`: buscador principal con vistas `Páginas` y `Mapa`. El selector principal `Páginas / Mapa` vive en el navbar solo dentro de esta ruta, conserva los filtros/query actuales al cambiar de modo, precarga el chunk del mapa para bajar la espera del primer cambio y muestra el estado visual de la vista apenas se toca el toggle. Si el navbar cliente se monta en esta ruta, el logo vuelve al home público `/` igual que en el resto de la navegación pública. Debajo del buscador queda solo `Ordenar`. En `Páginas`, navbar + buscador quedan visibles, el footer no se renderiza y el único scroll vertical vive dentro del contenedor de resultados/cards. En `Mapa`, también se oculta el footer y toda la pantalla usa un shell fijo de viewport: arriba quedan navbar + buscador + `Ordenar` y abajo un split estable con listado scrolleable a la izquierda (~`25%`) y mapa a la derecha (~`75%`) sin scroll vertical global. Las cards de resultados ya comparten la misma jerarquía visual del home (`banner + logo`, fallback a foto real del negocio, placeholder elegante si no hay assets) y tanto el popup del marcador como el listado lateral navegan primero a la landing pública `/profesional/pagina/{slug}`; recién desde esa landing los CTAs de cada servicio entran a `/reservar` con `serviceId`.
- `/explorar/[slug]`: vista detallada de exploracion por slug.
- `/profesional/pagina/[slug]`: ruta publica canonica de la pagina del profesional/local.
- `/profesional/[slug]`: redirect temporal de compatibilidad hacia `/profesional/pagina/[slug]`; no contiene implementacion propia.
- `/reservar`: flujo publico de reserva paso a paso desde el perfil publico.
- `/reserva-confirmada`: ruta legacy de confirmacion; hoy no forma parte del circuito principal de reserva web.
- `/login`: acceso general.
- `/oauth/callback`: callback de OAuth.
- `/oauth/mercadopago/callback`: retorno dedicado para conexion OAuth de Mercado Pago del profesional.
- `/auth/forgot-password`
- `/auth/reset-password`
- `/cliente/auth/complete-phone`
- `/profesional/auth/complete-phone`

Lectura de producto:

- estas rutas soportan el nucleo de `Usuario` y el `MVP`
- `/explorar`, `/profesional/pagina/[slug]` y `/reservar` son parte del loop principal marketplace -> perfil -> reserva
- cuando una reserva prepaga genera `checkoutUrl`, tanto `/reservar` como `/cliente/reservas` abren Mercado Pago en la pestaña actual para asegurar una experiencia full-page consistente y evitar bloqueos de popup
- `/reservar` ya no mezcla toda la operacion en una sola pantalla larga: ahora concentra el flujo en `3` etapas reales (`servicio -> fecha y horario -> revision y confirmacion final`) y mantiene `serviceId`, `date`, `time` y `step` sincronizados en URL sin romper refresh ni resumes previos
- `/reservar` mantiene la misma creacion de reserva y el mismo checkout que antes, pero ahora no auto-selecciona el primer servicio ni el primer dia sin feedback visual; si entra con `serviceId` valido desde la landing deja ese servicio preseleccionado desde el inicio y, si el `serviceId` es invalido o no corresponde al slug, deja el selector sin seleccion para que el usuario elija manualmente
- `/reservar` sigue siendo compatible con `pendingReservation`: en el paso final, si falta sesion cliente, primero abre una pantalla embebida de registro/login dentro del flujo para no sacar al usuario de la reserva; ese overlay hoy reutiliza credenciales propias y Google; si aun asi deriva a login, registro o `complete-phone` completos, al volver retoma el resumen final listo para confirmar, pero si la URL trae un `serviceId` explicito ese valor tiene prioridad sobre el servicio guardado en storage
- `/reservar` tambien refleja `serviceId`, `date`, `time` y `step` en la URL con `router.replace(..., { shallow: true })` para que un refresh del navegador no rompa el progreso local del flujo
- `/reservar` no debe bloquear el CTA final cuando el visitante es anonimo y no existe una sesion cliente conocida; en ese caso abre directo el acceso embebido del paso final
- `/reservar` ya prioriza un layout publico centrado y limpio: mantiene navbar, elimina el header superior grande y el sidebar de progreso, y deja un unico resumen final en la etapa de confirmacion
- el `Navbar` compartido de rutas publicas (`/`, `/explorar`, `/profesional/pagina/[slug]`, `/profesional/[slug]` como redirect temporal, `/reservar`) ya no muestra un pill `Cargando...` por bootstrap de auth: mientras el perfil se hidrata, degrada visualmente a la variante publica y luego promueve al estado real si encuentra sesion valida
- el paso final de `/reservar` no promete confirmacion falsa: la reserva sigue naciendo en `PENDING`; si hay pago online, la confirmacion final depende del backend y Mercado Pago
- `/explorar` y `/profesional/pagina/[slug]` ya no fuerzan auth refresh ni favoritos en 401 cuando el cliente no tiene una sesion conocida; las features auth-only se habilitan recien con hint de sesion valida
- cuando existe sesion conocida del cliente, `/explorar` y `/profesional/pagina/[slug]` hidratan el perfil cliente para mantener navbar y favoritos coherentes en la navegacion publica; `/profesional/[slug]` queda solo como redirect temporal de compatibilidad
- `_app.tsx` ya usa un `session hint` con rol (`CLIENT` o `PROFESSIONAL`) para rehidratar el perfil correcto tambien en `/` y otras rutas publicas al reabrir navegador; si falta ese hint pero queda un access token fallback en storage, deriva el rol desde el JWT antes de decidir que perfil hidratar y evita probar ambos `/auth/me/*` a ciegas. El bootstrap publico solo intenta hidratar si ese access token fallback sigue usable; si `auth/me` responde `401`, la web no fuerza `refresh` automatico y limpia el hint local para no entrar en loop con sesiones viejas
- el logout web se unifico en un flujo comun (`useAuthLogout` + `LogoutTransitionProvider`): muestra overlay de `Cerrando sesión`, limpia perfiles/cache local y deriva al login especifico del rol real
- aunque no haya sync reciente en memoria, el toggle de favoritos en web revalida contra backend en la primera interaccion util para evitar dobles clicks o estados viejos del cache local
- `/explorar` ya usa la fecha como filtro real de disponibilidad y no solo como ordenador; `Disponible ahora` tambien se apoya en disponibilidad real
- `/explorar` renderiza lista y mapa desde el mismo dataset normalizado de `/api/search`; aunque la query matchee servicios o rubros, la card y el marker representan siempre al local/perfil dueño del resultado. El titulo principal sale de `businessName/professionalName/displayName`, no de `serviceName`, `headline`, `about`, `description` ni `locationText`
- la URL canonica de `/explorar` ya no debe persistir `type=SERVICIO` como estado visible del marketplace: las búsquedas de servicio via texto o sugerencia viajan como `query` y las de categoría como `categorySlug` (+ `query` solo si aporta), dejando `type` reservado para refinamientos explícitos de `LOCAL` o `PROFESIONAL`
- en `/explorar?vista=mapa`, el mapa prioriza `Mapbox GL` con estilo claro (`light-v11`) cuando WebGL esta disponible y cae a un fallback interactivo con Leaflet/CARTO Light cuando ese navegador no puede inicializar WebGL. La vista mapa ya no reutiliza la paginacion chica de `Páginas`: fuerza internamente `page=0` y un `size` amplio para traer todos los resultados de QA del dataset actual sin achicarlos por pagina. Si la URL no trae `lat/lng`, la ubicacion del navegador se usa solo como centrado visual inicial y no dispara una búsqueda automática cerca del usuario ni reinyecta radios chicos; si la URL sí trae `lat/lng` o el usuario toca `Buscar cerca de mí` / `Usar centro del mapa`, recién ahí las coordenadas pasan a ser filtro real. La zona manual sigue pudiendo persistirse en `localStorage` (`plura:explore-manual-location`) cuando el usuario la elige explícitamente, pero ya no se reaplica sola al abrir la vista con URL limpia. Cuando la geolocalizacion del navegador es solo contextual y hay filtros reales de búsqueda (query/categoría/ciudad/fecha), el viewport no se queda anclado en esa posicion incidental: prioriza encuadrar los resultados para no vaciar mapa/listado visible por desalineacion de zona. La columna izquierda mantiene scroll propio, sigue sin disparar búsquedas nuevas por cada pan/zoom y ya no filtra la lista por el cuadrante visible: muestra todos los resultados cargados, estilo marketplace tipo Booking/Airbnb, aunque alguno no tenga coordenadas o quede fuera del viewport actual. El mapa recibe siempre el subconjunto estable `resultados con coordenadas`, no deriva marcadores desde `bounds`, y el CTA `Ver todo` hace solo `fitBounds` local sobre todos esos marcadores sin tocar backend ni URL. El popup del mapa quedo alineado entre Mapbox y Leaflet y ahora muestra tambien identidad `Local` vs `Perfil profesional`, ubicación y precio base cuando existen; el mapa sigue siendo draggable/clickeable
- en la geoseleccion de `/explorar`, el frontend ya no persiste la direccion completa de Mapbox como `city` para backend; prioriza una ciudad/zona mas amplia y deja las coordenadas como filtro fuerte
- al escribir manualmente en la barra de `/explorar`, si el usuario venia refinando una busqueda de `PROFESIONAL` o `LOCAL`, el frontend ya no pisa ese tipo automaticamente en cada tecla
- home, dashboard cliente y `/explorar` ahora reutilizan exactamente la misma barra base de busqueda (`components/search/UnifiedSearchBar`) y tambien la misma presentacion visual del home: mismo shell hero, mismos contratos y mismos dropdowns; la diferencia es que el home activa una prop especifica de la variante `hero` para expandir `Servicios` en desktop y compactar `Ubicacion/Fecha` a icono mientras ese campo queda activo, mientras `/explorar` conserva el refinamiento completo con chips activos dentro del mismo buscador sin esa animacion
- en ese dropdown compartido, cuando hay texto en el campo principal, la sugerencia visible ya prioriza `Categoría -> Local -> Profesional -> Servicio` con labels limpios por tipo; no debe usar `headline/about/descripciones` como texto principal y deduplica labels repetidos entre tipos
- `/profesional/pagina/[slug]` usa una landing publica mas ancha y continua: shell casi full-width (`max-w` alto + padding lateral corto), hero editorial dividido con direccion exacta, horarios, WhatsApp/telefono, redes y CTAs que bajan a `#servicios`, barra visual de confianza, servicios en cards comerciales, bloque `Sobre nosotros` debajo de servicios cuando existe `about/description` pública, galeria horizontal solo si hay fotos reales del negocio y cierre de reseñas + mapa/CTA a Google Maps; la galeria publica consume solo `photos` del perfil/negocio cargadas desde `pagina-publica` y no mezcla imagenes de servicios; `Favoritos` queda dentro del hero como accion secundaria y exige sesion cliente antes de tocar backend; ya no existe una seccion separada de `Ubicacion y horarios` ni se expone el email publico en la landing; la operacion completa de reserva queda derivada a `/reservar`. La implementacion real vive solo en `pages/profesional/pagina/[slug].tsx`.
- `/auth/forgot-password` y `/auth/reset-password` ahora redirigen automaticamente al login correcto (`/cliente/auth/login` o `/profesional/auth/login`) segun el `role` que devuelve backend al completar el reset
- `/cliente/auth/complete-phone` y `/profesional/auth/complete-phone` completan el telefono faltante despues de OAuth via `POST /auth/oauth/complete-phone`
- los formularios web que hoy piden telefono en auth (`/cliente/auth/register`, `/profesional/auth/register`, `/auth/forgot-password`, `/cliente/auth/complete-phone`, `/profesional/auth/complete-phone`) ya usan un selector de pais con bandera + codigo internacional y arman el `phoneNumber` final en formato internacional antes de enviarlo al backend

### Rutas del cliente

- `/cliente/auth/login`
- `/cliente/auth/register`
- `/cliente/auth/complete-phone`
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
- `components/cliente/reservations`: timeline e historial sobrio dentro del panel de detalle de la reserva seleccionada; ya etiqueta tambien `PAYMENT_REFUND_PENDING` como reembolso en proceso.
- `context/ClientNotificationsContext.tsx`: token de refresh mas estado compartido del unread count para deduplicar requests entre campana e inbox sin cambiar la UX visible.
- `context/ClientProfileContext.tsx`: carga `GET /auth/me/cliente`.
- `hooks/useClientBookingTimeline.ts`: carga `GET /cliente/reservas/{bookingId}/timeline` con estados `loading / empty / error`.
- `hooks/useClientNotificationUnreadCount.ts` y `hooks/useClientNotificationPreview.ts`: contador y preview del dropdown cliente.
- `hooks/useClientNotificationInbox.ts`: filtros por estado y evento, carga incremental y acciones `mark read` / `read all` del inbox cliente.
- `hooks/useFavoriteProfessionals.ts`: favoritos del cliente.
- `services/clientBookings.ts`: reservas y pago del cliente.
- `services/clientBookings.ts`: reservas y pago del cliente; ahora cachea `actions` y `timeline` por booking y permite prefetch conservador del detalle para bajar waterfalls al entrar o cambiar de seleccion.
- `services/clientFeatures.ts`: features y entitlements del plan del cliente.
- `services/clientReviews.ts`: reseñas del cliente por booking; incluye creacion, lectura con contrato `{ exists, review }`, elegibilidad y eliminacion con invalidacion de cache.
- `services/clientReviewReminders.ts`: reminder in-app de reseña; consulta la siguiente reserva elegible y registra la impresion real contra backend para respetar cadencia diaria y limite por booking.
- `services/cachedGet.ts`: capa de cache para GET requests reutilizable.
- `services/pendingReservation.ts`: persistencia local de reservas pendientes para continuidad de flujo.
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
- `/cliente/auth/register` ya no pide escribir manualmente el prefijo internacional: usa selector de pais con bandera y compone el telefono completo para backend
- `/cliente/inicio` ya conecta sus CTA de proxima reserva con la UX real de reservas: `Ver todas` navega a `/cliente/reservas` y `Ver detalle` abre `/cliente/reservas?bookingId={id}` cuando existe una reserva proxima
- `/cliente/reservas` ya usa su panel lateral de detalle como experiencia real de reserva e incluye timeline de actividad por `bookingId`
- `/cliente/reservas` mantiene el refresco de estados pendientes, pero el polling ya no corre en background y usa backoff conservador para bajar presion de red
- `/cliente/reservas` ahora prefetch-ea `actions + timeline` de la reserva seleccionada apenas entra el listado para reducir espera perceptible sin cambiar contratos
- reseñas implementadas: CTA en sidebar de reserva `COMPLETED`, formulario con rating `1-5` y texto opcional, review existente visible con opcion de eliminar; proteccion contra race conditions con patron `isActive`; la elegibilidad real sigue viniendo de backend y exige ownership + ausencia de reseña previa + `booking.status == COMPLETED` + ventana de `7` dias desde `completedAt`
- la web cliente ahora muestra un reminder in-app de reseña en `/cliente/inicio` y `/cliente/reservas` con `components/cliente/reviews/ClientReviewReminderCard`; la card navega a `/cliente/reservas?bookingId={id}`, deja `Mas tarde` como cierre local de la vista actual y delega toda la cadencia en backend: maximo `1` reminder por dia, `3` por reserva y solo dentro de la misma ventana de `7` dias
- feedback de app integrado en `/cliente/configuracion` con formulario de rating, categoria opcional y texto libre; incluye historial paginado de feedback propio
- `/cliente/configuracion` ahora requiere challenge OTP por email para eliminar cuenta; muestra codigo enmascarado y advierte sobre cancelacion de reservas e irreversibilidad
- `ClientNotificationsContext` ya no rompe fuera del provider; devuelve defaults seguros (unreadCount=0, noop callbacks) para degradar sin crash en rutas publicas
- todavia faltan piezas visibles para beneficios y settings de notificaciones

### Rutas del profesional

- `/profesional/auth/login`
- `/profesional/auth/register`
- `/profesional/auth/complete-phone`
- `/profesional/dashboard`
- `/profesional/dashboard/servicios`
- `/profesional/dashboard/horarios`
- `/profesional/dashboard/reservas`
- `/profesional/dashboard/acceso`
- `/profesional/dashboard/configuracion`
- `/profesional/dashboard/resenas`
- `/profesional/dashboard/pagina-publica` — ahora incluye galería de fotos del negocio con upload vía `ImageUploader` (kind="gallery"), máximo según `maxBusinessPhotos` del plan (`BASIC=3`, `PROFESIONAL=6`, `ENTERPRISE=10`), preview en iframe; esas fotos son las que consume la galería pública del perfil y ya no se mezclan con imágenes de servicios; headline y about ya se editan también desde `BASIC`
- `/profesional/dashboard/perfil-negocio` — ahora soporta upload de logo (kind="logo", variant="circle") y banner (kind="banner", variant="banner") desde `BASIC`; también deja editar redes/contacto público sin bloquear por plan
- `/profesional/dashboard/billing`
- `/profesional/notificaciones`

Modulos relevantes:

- `components/profesional`: UI publica y dashboard.
- `components/profesional/notifications`: campana en sidebar, dropdown FE-1 e inbox FE-2 con toolbar, lista, items y acciones de lectura; los eventos de refund nuevos ya no se emiten para profesional.
- `components/profesional/reservations`: timeline operativo dentro del panel de detalle de la reserva seleccionada.
- `context/ProfessionalNotificationsContext.tsx`: token de refresh mas estado compartido del unread count para sincronizar inbox, dropdown y contador sin duplicar requests.
- `context/ProfessionalProfileContext.tsx`: carga `/auth/me/profesional`.
- `hooks/useProfessionalNotificationInbox.ts`: filtros por estado y evento, carga incremental y acciones `mark read` / `read all`.
- `hooks/useProfessionalNotificationUnreadCount.ts` y `hooks/useProfessionalNotificationPreview.ts`: mantienen contador y preview de FE-1 en sync con acciones del inbox.
- `hooks/useProfessionalBookingTimeline.ts`: carga `GET /profesional/reservas/{bookingId}/timeline` con estados `loading / empty / error`.
- `services/professionalBookings.ts`
- `services/professionalBookings.ts`: cachea `actions` y `timeline` por booking y expone prefetch del detalle para bajar waterfalls en el dashboard operativo.
- `services/professionalImageUpload.ts`: servicio de subida de imágenes profesional; usa `POST /profesional/images/upload?kind={kind}` con tipos `logo`, `banner`, `gallery`, `service`; retorna URL pública de la imagen subida.
- `services/professionalNotifications.ts`
- `services/professionalBookingPolicy.ts`
- `hooks/useProfessionalMercadoPagoConnection.ts`: estado de conexion OAuth del profesional con Mercado Pago.
- `hooks/useProfessionalBilling.ts`
- `services/professionalAnalytics.ts`: analytics y metricas del profesional.
- `services/professionalMercadoPagoConnection.ts`: operaciones de conexion OAuth Mercado Pago del profesional.
- `services/professionalReviews.ts`: gestion de reseñas recibidas por el profesional; incluye listado, ocultamiento de texto, reporte por incumplimiento e invalidacion tambien de `/auth/me/profesional` para mantener KPIs sincronizados.
- `services/publicReviews.ts`: reseñas publicas para perfil publico del profesional.

Backend relacionado:

- `backend-java/src/main/java/com/plura/plurabackend/professional/worker`: base backend inicial de equipo/trabajadores para planes con multiequipo; expone `/profesional/team*` para listar, invitar, editar/suspender/eliminar trabajadores, configurar agenda propia y asignar servicios existentes del local.
- `backend-java/src/main/java/com/plura/plurabackend/professional/worker/dashboard`: endpoints `/trabajador/me`, `/trabajador/reservas`, `/trabajador/calendario` que requieren JWT con `ctx=WORKER` y consultan reservas filtradas por `worker_id`.
- `backend-java/src/main/java/com/plura/plurabackend/core/auth/context`: resolver y DTO de contextos de auth (`AuthContextType`, `AuthContextDescriptor`, `AuthContextResolver`); habilita el login unificado y el switch de contexto en `/auth/login`, `/auth/me`, `/auth/contexts`, `/auth/context/select`.
- `backend-java/src/main/resources/db/migration/V77__professional_workers_foundation.sql`: crea `professional_worker`, `professional_worker_service` y agrega `worker_id` opcional en `booking` y `available_slot`; hace backfill de un trabajador owner por cada profesional existente para mantener compatibilidad.
- `backend-java/src/main/resources/db/migration/V78__booking_worker_unique_constraint.sql`: reemplaza la unicidad legacy `(professional_id, start_date_time)` por una unicidad por trabajador (parcial sobre `worker_id` excluyendo `CANCELLED`) y elimina el unique legacy de `available_slot` para permitir slots concurrentes por trabajador.

Lectura de producto:

- esta area concentra el valor de `Free` y buena parte de `Pro`
- `servicios`, `horarios`, `reservas`, `perfil-negocio` y `notificaciones` son el corazon operativo
- `acceso`, `billing` y `configuracion` viven separados dentro del grupo `Cuenta` del sidebar; `acceso` concentra email, slug publico, sesion actual y logout, mientras `configuracion` queda para seguridad, politicas, apariencia y acciones sensibles
- el multiequipo ya tiene puntos clave armados en web y mobile:
  - backend de equipo (`/profesional/team*`)
  - pantalla aceptar invitacion `/trabajador/invitacion` (web) y `/(auth)/worker-invitation` (mobile)
  - dashboard admin `/profesional/dashboard/equipo` (web) y `/dashboard/equipo` (mobile) con listar/invitar/asignar servicios/suspender/reactivar/eliminar
  - dashboard trabajador `/trabajador/calendario`, `/trabajador/reservas` (web) y stack `/trabajador/{calendario,reservas,cuenta}` con bottom nav dedicada (mobile)
  - login unificado `/login` (web) y `/(auth)/login` (mobile) con selector de contexto cuando el email tiene mas de un acceso
  - pantalla de cuenta del trabajador en mobile permite cambiar de contexto (entrar como cliente o como dueno de otro local) sin volver a loguearse
  - Pendiente: editor de horarios por trabajador en UI admin (web/mobile), vista de calendario completo (no solo lista por dias) en UI trabajador y reserva publica con `worker_id` autoasignado.
- el login unificado expone `/auth/login` y permite que un mismo email use varios contextos (`CLIENT`, `PROFESSIONAL`, `WORKER`); el JWT lleva claim `ctx` con el contexto activo y `pid`/`wid` cuando aplica. Las pantallas legacy `/cliente/auth/login`, `/profesional/auth/login` y sus equivalentes mobile siguen funcionando como compatibilidad.
- el email de invitacion usa la ruta `/trabajador/invitacion?token=...`; en mobile el deep-link queda en `/(auth)/worker-invitation?token=...`. Ambas pantallas chequean si el email ya tiene cuenta en Plura y, si hace falta, piden nombre/telefono/password antes de aceptar.
- `/profesional/dashboard/perfil-negocio` ahora incluye constructor visual para `logo` y `banner` dentro de un modal: se abre al terminar una subida/reemplazo y también desde `Editar encuadre`; ese encuadre queda persistido y se aplica también en la ficha pública
- los autocompletes de ubicacion en `/profesional/auth/register` y `/profesional/dashboard/perfil-negocio` ya seleccionan sugerencias por click normal sin depender de `mouseDown`, evitando opciones que parecian clickeables pero no confirmaban bien al navegar con teclado o blur
- `/profesional/auth/register` y `/profesional/dashboard/perfil-negocio` ya comparten el mismo selector internacional de telefono con bandera + codigo; evita cargar el prefijo a mano y deja el numero persistido listo para backend
- `/profesional/dashboard/reservas` tambien usa selector internacional cuando el profesional carga una reserva manual con telefono de cliente opcional
- `billing` ya existe, pero el naming de codigo sigue siendo `BASIC / PROFESIONAL / ENTERPRISE`
- `/profesional/dashboard/billing` ya separa dos bloques: `Mi plan de Plura` y `Cobros de reservas con Mercado Pago`
- la web profesional ya consume `GET/POST/DELETE /profesional/payment-providers/mercadopago/*` y no usa `payout-config`
- el retorno OAuth de Mercado Pago mantiene pantalla propia en `/oauth/mercadopago/callback`, pero ya no procesa `code/state` en frontend: Mercado Pago vuelve al callback backend y este redirige a la web con un resultado final
- el frontend del billing profesional no implementa PKCE ni almacena `code_verifier`; todo el flujo PKCE de Mercado Pago queda resuelto en backend y la web solo inicia el onboarding y muestra el resultado final
- el callback OAuth backend tampoco depende ya de la sesion web del profesional para cerrar la vinculacion; esto evita `401` al volver desde Mercado Pago por dominios externos o tuneles tipo `ngrok`
- en `/profesional/dashboard/billing`, `BASIC` ya no intenta conectar Mercado Pago: muestra un bloque de upgrade y reserva la conexion OAuth solo para `PROFESIONAL / ENTERPRISE`
- `/profesional/dashboard/billing` no promociona visualmente `PROFESIONAL / ENTERPRISE` mientras la suscripcion siga en `TRIAL`; el plan visible solo cambia cuando el backend ya la ve `ACTIVE`, es decir, despues de la confirmacion via webhook
- `/profesional/dashboard/billing` evita cargar el estado de conexion de Mercado Pago cuando la pantalla ya va a redirigir al callback OAuth, difiere el montaje inicial de comparativa/planes y carga la conexion de cobros recien al acercarse a esa seccion para bajar trabajo al entrar; sus bloques principales de plan/comparativa/cobros quedan aislados para no rerenderizar toda la superficie ante banners o estados transitorios de billing
- `/profesional/notificaciones` ya funciona como centro real de inbox: lista paginada con `cargar mas`, filtros basicos y navegacion contextual por `actionUrl`
- la navegacion contextual de notificaciones profesional apunta a la UX real de reservas en `/profesional/dashboard/reservas?bookingId={id}` y el panel selecciona la reserva desde query string
- `/profesional/dashboard/reservas` ya usa su panel lateral de detalle como experiencia real de reserva e incluye timeline de actividad e historial por `bookingId`
- `/profesional/dashboard/reservas` mantiene auto-refresh para estados pendientes, pero ahora pausa polling con la pestaña oculta y aplica backoff para reducir trafico redundante
- `/profesional/dashboard/reservas` ahora paraleliza reservas y servicios al entrar, y prefetch-ea `actions + timeline` de la seleccion activa para acortar la cascada inicial
- `/profesional/dashboard/reservas` debe seguir disponible para `Free/BASIC` como modulo operativo de reservas
- la web profesional vuelve a exponer la accion manual `Marcar completada` para reservas `CONFIRMED` cuyo turno ya termino; convive con confirmacion, cancelacion, no-show, reagendamiento y timeline sin mezclar reglas
- `/profesional/dashboard/reservas` usa `GET /reservas/{id}/actions` para decidir acciones; ese contrato ahora expone tambien `canComplete`
- `/profesional/dashboard` recorta trabajo de agenda en cliente: la grilla semanal y mensual quedaron separadas para evitar rerenders pesados al abrir el drawer, y la carga de reservas ya no expande fechas dispersas a un unico rango continuo cuando el dashboard combina semana actual con una semana o mes navegados
- `/profesional/dashboard` debe mostrar en agenda todas las reservas no canceladas del rango visible, incluyendo `pending`, `confirmed`, `completed` y `no_show`; `cancelled` queda fuera para no bloquear visualmente huecos liberados
- `/profesional/dashboard` distingue visualmente el estado operativo de cada reserva en agenda: semanal usa tarjeta, acento lateral y badge por estado; mensual reutiliza chips por color para `pending`, `confirmed`, `completed` y `no_show`
- `/profesional/dashboard` ya no limita la carga de bookings a `today` cuando el plan es `DAILY/BASIC`; la agenda semanal y mensual queda visible tambien en `Free/BASIC` y usa los bookings reales del rango visible para evitar huecos falsos
- `services/professionalBookings.ts` ahora mapea `date/time` de reservas profesionales a claves operativas `YYYY-MM-DD` y `HH:mm`, no a labels humanizados; la presentacion visible de fechas queda en la UI para no romper la grilla de agenda
- `/profesional/dashboard` compacta el bloque de `Pulso semanal` para no empujar la agenda; cuando no hay analytics muestra una nota breve en lugar de tarjetas altas vacias
- `/profesional/dashboard` en vista semanal usa una base completa de `24h` con scroll vertical interno; el viewport visible muestra aproximadamente `12h`, el foco inicial se calcula en frontend con horarios configurados y reservas visibles de la semana, agrega margen corto y solo cae a fallback `09:00-18:00` para posicionamiento inicial si no hay datos suficientes; el eje horario visible marca horas de una en una y deja subdivisiones de `30m` como referencia sutil
- `/profesional/dashboard` agrega una toolbar compacta para saltar dentro del dia a `Madrugada`, `Mañana`, `Tarde`, `Noche` y `Ahora` sin romper navegacion semanal ni render de reservas
- `/profesional/dashboard` en desktop prioriza visibilidad y estabilidad de agenda sobre un shell full-height estricto: la pagina puede seguir scrolleando normalmente, mientras la vista semanal mantiene scroll interno solo en el cuerpo del calendario y una altura explicita para que la grilla no colapse ni quede truncada
- `/profesional/dashboard/pagina-publica` sigue editando textos y galería, pero la preview ya consume también el encuadre persistido de `logo` y `banner` definido en `perfil-negocio`
- la ficha pública web ahora degrada mejor cuando una foto pública o imagen de servicio apunta a un asset faltante en storage/CDN: la galería omite esa imagen rota y los cards/modales de servicios caen a placeholder sin romper el layout

Notas recientes:

- feedback de app integrado en `/profesional/dashboard/configuracion` con formulario de rating, categoria opcional y texto libre; incluye historial paginado de feedback propio; modulo backend separado `core.feedback`
- `/profesional/dashboard/resenas` es la pagina de gestion de reseñas del profesional: muestra stats agregados (rating, total), lista paginada de reseñas recibidas con toggle de hide/show del texto publico y flujo inline para reportar incumplimientos; ya no permite eliminar reseñas; el texto oculto sigue visible para el profesional con indicador visual amarillo y los KPIs se refrescan contra `ProfessionalProfileContext` despues de las mutaciones
- `/profesional/dashboard/configuracion` ahora requiere challenge OTP por email para eliminar cuenta; advierte sobre cancelacion de suscripcion y reservas pendientes
- `PublicReviewsList` resuelve el cierre `Confianza`: layout de dos columnas con rating, mini reseñas visibles cuando existen, modal paginado para ver todas y mapa/ubicación con CTA `Cómo llegar`; sigue respetando ocultamiento del texto publico
- `/profesional/pagina/[slug]` renderiza `logo` y `banner` con `object-position + zoom` persistidos desde perfil del negocio, manteniendo la misma composición visual que ve el profesional al editar; `/profesional/[slug]` redirige temporalmente a esta ruta canonica
- `apps/web/src/utils/publicBusinessMedia.ts`: presenter compartido para cards y superficies publicas; resuelve prioridad visual `banner -> foto real del negocio -> legacy image -> service image` (solo fallback extremo), deduplica URLs y reaplica `logo/bannerMedia` en web

Huecos relevantes contra el objetivo:

- onboarding inicial del negocio
- ficha del cliente orientada a `Pro`
- analytics mas visibles
- chat interno
- editor de horarios por trabajador en UI admin web/mobile (los endpoints `/profesional/team/{id}/schedule` ya existen)
- reserva publica que respete `worker_id`: hoy backend permite guardarlo, la migracion V78 ya cambio la unicidad de booking, pero la generacion de slots/checkout publico aun no autoasigna ni filtra por trabajador
- vista de calendario completo (no solo lista por dia) tanto en web como en mobile para trabajador

### Rutas internas de operaciones

- `/internal/feedback`: panel operativo exclusivo para feedback interno de app con listado filtrable, analytics y archivo/desarchivo; protegido por token interno configurable desde localStorage, no por sesion de usuario; `<meta name="robots" content="noindex,nofollow" />`
- `/internal/ops/reviews`: superficie interna dedicada a moderacion de reseñas publicas y reportes; lista paginada, analytics, badges de reportes y acciones de hide/show del texto; protegida por el mismo `X-Internal-Token`
- `/internal/ops/analytics`: tablero interno de negocio y marketplace para el equipo de Plura; consume un resumen agregado desde `/internal/ops/analytics/summary` y ahora muestra tambien funnel completo de reserva (`search -> profile -> flujo -> submit -> booking -> checkout -> confirmacion -> completion`), comparativa por plataforma (`WEB/MOBILE/INTERNAL`) y mix por modalidad de pago; en web ya no pide token manual para esta superficie: exige sesion cliente y habilita acceso solo a la cuenta interna `admin@surlogicuy.com`, con redirect al login cliente si falta sesion

Modulos relevantes:

- `services/internalOps.ts`: cliente HTTP con `X-Internal-Token` y URL base configurables desde localStorage
- `pages/internal/feedback.tsx`: pagina completa con configuracion, analytics, filtros y tabla de feedback de app; enlaza a la superficie separada de reseñas
- `pages/internal/ops/reviews.tsx`: pagina completa de moderacion de reseñas para internal ops; consume `/internal/ops/reviews*`, muestra reportes y mantiene hide/show del texto
- `pages/internal/ops/analytics.tsx`: pagina completa del tablero interno de negocio; ordena `overview`, funnel completo de reserva, rubros, servicios, plataformas, mix de pago, retencion, demanda, ciudades y profesionales top sin exponer esos datos en la UX del cliente o del profesional

### Modulos transversales web

- `components/search`: sistema compartido del buscador web; incluye barra base, footer de filtros activos, sugerencias, fecha y location autocomplete con dropdowns visualmente unificados.
- `components/ui/Button.tsx` y `components/ui/ToggleChip.tsx`: primitivas base de CTA y seleccion web; auth, pasos de reserva y acciones puntuales ya migraron a variantes semanticas compartidas (`brand`, `primary`, `secondary`, `contrast`, `danger`, chips `soft/solid`) para sostener identidad visual consistente.
- `components/map`: wrapper de Mapbox.
- `hooks/useCategories.ts`: carga de categorias para el buscador.
- `hooks/usePublicProfessionals.ts`: carga de profesionales publicos para superficies de descubrimiento.
- `hooks/useUnifiedSearch.ts`: hook grande de busqueda unificada con filtros, resultados y estado.
- `hooks/useUnifiedSearch.ts`: al mapear `/api/search/suggest`, prioriza `displayName/businessName/professionalName/serviceName` segun el tipo antes de caer a `name`, y descarta sugerencias sin label util
- `hooks/useClientProfile.ts`: perfil del cliente autenticado.
- `services/search.ts`: integra search y suggest.
- `services/geo.ts`: geocoding y autocomplete.
- `services/api.ts`: auth, refresh y headers de plataforma `WEB`; ahora tambien adjunta `X-Plura-Analytics-Session-Id` en requests client-side para correlacionar discovery + funnel de reserva.
- `services/session.ts`: mantiene fallback token y un `known session hint` en storage para no disparar refresh/autofetch en rutas publicas cuando no hay sesion confirmada.
- `hooks/useAuthLogout.ts` + `context/LogoutTransitionContext.tsx`: cierre de sesion unificado con overlay global y redireccion por rol.
- `lib/auth/sessionErrors.ts`: clasifica `401/403` de auth aparte de errores transitorios para que la web no fuerce logout por fallas de red o `5xx`.
- `services/appFeedback.ts`: feedback de app del cliente y profesional; ahora incluye `getPublicAppFeedback(limit)` para testimonios publicos via `GET /public/app-feedback`.
- `services/internalOps.ts`: ahora tambien tipa y consume `GET /internal/ops/analytics/summary` para la superficie interna de analytics.
- `middleware.ts`: CSP y headers de seguridad.
- `/oauth/mercadopago/callback`: ahora interpreta `result/reason` devueltos por el backend y consulta el estado real de conexion; ya no intenta llamar al callback backend con `code/state`.
- `pages/profesional/pagina/[slug].tsx`: compone la pagina publica con shell ancho (`max-w-[1500px]`), hero dividido con info util integrada (direccion exacta, horarios, WhatsApp/telefono y redes), CTAs de hero con scroll interno a `#servicios`, toggle de `Favoritos` con guard client-side para anónimos, barra de confianza, servicios en cards, sección `Sobre nosotros` usando `merged.about` cuando hay copy pública, galeria horizontal posterior a servicios solo con fotos reales y cierre `Confianza` con reseñas en modal + mapa o fallback de dirección; la galeria usa solo `merged.photos`/fotos publicas del negocio y excluye cualquier `imageUrl/photos` de servicios; ya no renderiza bloque aparte de `Ubicacion y horarios` ni email publico en esta landing.
- `pages/reservar.tsx`: orquestador del flujo publico de reserva en `3` etapas reales; mantiene los mismos servicios/endpoints (`public profile`, `slots`, `create booking`, `payment-session`), compatibilidad con `pendingReservation`, sync de `serviceId/date/time/step` en URL y la derivacion a `/cliente/reservas` para seguimiento post-creacion/post-checkout.
- `pages/reservar.tsx`: ademas del flujo operativo, ahora emite eventos internos del funnel (`RESERVATION_STEP_VIEWED`, servicio/fecha/horario confirmados, auth abierto/completado, submit, checkout bloqueado) hacia `POST /public/product-analytics/events` sin afectar la UX si el tracking falla.
- `components/reservation/ReservationServiceSelector.tsx`: paso `1`; muestra el servicio elegido con su detalle completo y deja editar/cancelar o abrir el selector interno por categoria.
- `components/reservation/ReservationScheduleStep.tsx`: paso `2`; combina calendario + horarios en la misma vista, mantiene la carga real de slots por `serviceId/date` y solo habilita continuar cuando hay fecha y hora.
- `components/reservation/ReservationSummaryCard.tsx`: paso `3`; unico resumen final con CTA segun modalidad (`Reservar`, `Pagar seña y reservar`, `Pagar y reservar`), politica, nota operativa de estado `PENDING` y atajos para volver a editar servicio o fecha/horario.
- `components/reservation/ReservationFlowHeader.tsx`, `ReservationReviewStep.tsx` y `ReservationProgressSidebar.tsx`: quedaron como componentes legacy en el repo, pero `/reservar` ya no los renderiza en el flujo publico actual.
- `components/reservation/paymentDetails.ts`: helper de presentacion para monto a pagar ahora, saldo restante y CTA final segun `paymentType`.
- `components/profesional/public-page/PublicProfileHero.tsx`: hero publico editorial con dos columnas en desktop, imagen principal fuerte, card flotante con logo/rating, CTAs que bajan a `#servicios`, accesos sociales y favorito como accion secundaria; mantiene fallbacks y encuadre persistido de logo/banner.
- `components/profesional/public-page/PublicServicesSection.tsx`: catalogo visual de servicios con pills por categoria, cards responsive con imagen, descripcion, duracion, precio, modalidad de pago y acciones (`Reservar` dominante + `Ver detalle` secundario), sin estado visual de servicio preseleccionado en la landing; cada `Reservar` empuja el flujo dedicado con el `serviceId` del item clickeado.
- `components/profesional/public-page/servicePresentation.ts`: formateadores compartidos para precio, duracion, modalidad de pago y categoria publica.
- `components/profesional/ImageUploader.tsx`: componente reutilizable de subida de imágenes con variantes `square`, `circle` y `banner`; valida MIME (jpeg, png, webp) y tamaño (1MB); muestra preview blob inmediato y sube vía `professionalImageUpload` service.
- `utils/assetUrl.ts`: incluye `resolveR2Url()` para convertir URLs R2 (`r2://bucket/path`) a URLs CDN públicas usando `NEXT_PUBLIC_IMAGE_CDN_BASE_URL`.

Lectura de producto:

- search + mapa sostienen marketplace y descubrimiento
- el repo ahora ya expone un backoffice interno de analytics separado de la experiencia de cliente/profesional: vive en `/internal/ops/analytics` y se apoya en agregados propios de reservas/pagos/reseñas mas tracking interno de marketplace y funnel de reserva persistido en `app_product_event`
- `middleware.ts` y `services/api.ts` sostienen parte del bloque core de autenticacion y seguridad
- en rutas protegidas web, un fallo transitorio al refrescar sesion o cargar `/auth/me/*` ya no limpia la sesion local ni redirige a login; la redireccion queda reservada a `401/403` reales
- `_app.tsx` mantiene globales los providers de perfil, pero ahora monta por ruta los providers de notificaciones y del shell profesional con cambios sin guardar solo en dashboard/notificaciones para bajar costo base fuera de esas superficies; ademas las campanas de notificaciones del shell difieren la primera carga del unread count hasta interaccion o idle en vez de pedirlo apenas monta la vista; los hooks de perfil ya no fuerzan un refetch extra cuando el provider aun no termino su carga inicial

## Mobile

Base: `apps/mobile/app`

### Entrada y layout

- `app/index.tsx`: si hay sesion profesional redirige a `/dashboard`, si hay sesion cliente entra al shell principal por `/(tabs)` para dejar que Expo Router resuelva la tab inicial sin exponer `index` en el deep link, y si no hay sesion muestra una portada mobile con logo Plura y CTAs `Iniciar como cliente` / `Iniciar como profesional`.
- `app/_layout.tsx`: monta `AuthSessionProvider` desde `src/context/auth/AuthSessionContext.tsx` y el stack principal.
- el logout mobile ahora deriva al login correcto por rol activo (`/(auth)/login-client` o `/(auth)/login-professional`) para no mezclar los accesos despues de limpiar sesion
- `app/+native-intent.tsx` y `app/+not-found.tsx` ahora normalizan entradas nativas vacias o stale (`plura:///`, `plura://index`, `plura:///(tabs)/index`) para que el arranque release no caiga en `Unmatched Route`

### Grupo `(tabs)`

- `/(tabs)/index`
- `/(tabs)/dashboard`
- `/(tabs)/explore`
- `/(tabs)/favorites`
- `/(tabs)/bookings`
- `/(tabs)/notifications`
- `/(tabs)/settings` — ruta cliente oculta de tabs para preferencias, seguridad y baja de cuenta; no aparece en la tab bar

Lectura de producto:

- la tab bar esta centrada en cliente
- `app/(tabs)` ya no contiene implementacion de negocio: queda como routing fino de Expo y delega en `src/features/client/navigation/ClientTabsLayout.tsx` + `src/features/client/screens/*`
- el layout de tabs cliente ahora expulsa sesiones profesionales hacia `/dashboard` para evitar cruces de shells o quedar atrapado en superficies cliente sin navegacion coherente
- la tab bar visible del cliente ahora queda en `5` accesos: `Inicio`, `MAPA` (ruta `explore`), `Favoritos`, `Reservas` y `Perfil`; `/(tabs)/notifications` sigue existiendo pero sale de la barra y se abre desde la campana del header del home
- `dashboard` dentro de tabs ya funciona como perfil cliente y deja de mezclar acceso con la superficie profesional
- `/(tabs)/index` ahora prioriza una home marketplace visual: header compacto con campana, search bar que deriva a `/(tabs)/explore`, rail de categorias, rail de destacados, rail personalizado desde reservas cuando existe data, favoritos reales y rail de `Nuevos en la app`; ya no muestra el hero grande ni las cards grandes separadas de ubicacion, notificaciones o proxima reserva
- `/(tabs)/explore` funciona como MAPA mobile de descubrimiento: al abrir carga un dataset base de marketplace desde `/api/search` y usa la ubicacion del cliente solo para centrar visualmente cuando existe, sin aplicar `lat/lng`, `radiusKm` ni `sort=DISTANCE` automaticamente. Las coordenadas pasan a ser filtro real solo por accion explicita del usuario (`Buscar cerca de mi`, ubicacion manual o `Buscar en esta zona`), el movimiento/drag del mapa cambia solo el centro local y no llama backend, los marcadores salen solo de resultados con coordenadas validas y el bottom sheet muestra el dataset completo sin filtrarlo por viewport. Como no hay libreria nativa de mapa instalada, la pantalla usa imagen estatica de Mapbox cuando hay token y cae a un panel visual aislado preparado para reemplazo por mapa real.
- `/(tabs)/notifications` ya refleja el permiso push del sistema y permite activarlo o derivar a ajustes del dispositivo; todavia no registra tokens push en backend
- las superficies cliente principales (`index`, `explore`, `favorites`, `bookings`, `notifications`, `dashboard`) rehidratan datos al volver a foco y tambien soportan gesto manual de pull-to-refresh desde `AppScreen`

### Grupo `(auth)`

- `/(auth)/login-client`
- `/(auth)/login-professional`
- `/(auth)/register-client`
- `/(auth)/register-professional`
- `/(auth)/complete-phone-client`
- `/(auth)/complete-phone-professional`
- `/(auth)/forgot-password`
- `/(auth)/reset-password`

Lectura de producto:

- cubre autenticacion base con flujos separados por rol (cliente y profesional); la portada publica `/` es el unico selector inicial de acceso
- login y registro por rol ya combinan credenciales propias y Google sobre el mismo backend `auth`
- las rutas reales de auth mobile ya no usan pantallas hibridas por `role`: cliente vive bajo `src/features/client/auth/*`, profesional bajo `src/features/professional/auth/*` y `src/features/shared/auth/*` queda reservado a entry point publico `/`, recovery y rutas comunes
- al completar login o OAuth, cliente y profesional ya salen por rutas distintas: cliente retoma `pendingReservation` o cae en `/(tabs)` como entrada principal con tabs visibles, mientras profesional entra directo a `/dashboard`
- si el flujo cliente recibe una cuenta OAuth profesional, mobile limpia la sesion y exige volver al acceso profesional en vez de dejar entrar al shell equivocado; el flujo profesional mantiene la misma separacion frente a cuentas cliente
- `src/hooks/useGoogleOAuth` usa `@react-native-google-signin/google-signin` en Android para abrir el selector nativo de cuentas y pedir `idToken` con `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`; en iOS/web mantiene `expo-auth-session`; sigue requiriendo development build fuera de `Expo Go`
- en mobile, cuando Google o backend devuelven un conflicto (`409`) dentro del flujo nativo, `useGoogleOAuth` ya intenta mostrar el `message` real de la API en vez del texto generico de Axios
- `/(auth)/forgot-password` ya replica la recuperacion web por `email -> telefono -> codigo` sobre `/auth/password/recovery/*`
- `/(auth)/complete-phone-client` y `/(auth)/complete-phone-professional` completan el telefono faltante despues de OAuth via `POST /auth/oauth/complete-phone`
- `/(auth)/reset-password` sigue como compatibilidad de deep links legacy por token y, al terminar, ya redirige al login especifico del rol o vuelve a `/` si backend no informa rol
- `/(auth)/register-client` y `/(auth)/register-professional` ya usan selector internacional de telefono con bandera + codigo y envian el numero final listo para backend
- `src/context/auth/AuthSessionContext.tsx` centraliza la sesion mobile y ya no hace doble fetch secuencial `profesional -> cliente` en cada refresh: usa el `role` del access token para pedir solo `/auth/me/profesional` o `/auth/me/cliente`, y reutiliza un unico refresh en vuelo cuando varias pantallas vuelven a foco al mismo tiempo

### Grupo `dashboard`

- `/dashboard`
- `/dashboard/agenda`
- `/dashboard/services`
- `/dashboard/business-profile`
- `/dashboard/billing`
- `/dashboard/schedule`
- `/dashboard/settings`

Lectura de producto:

- reproduce parte del panel profesional en mobile
- responde bien al objetivo `Free` y `Pro` de operar una agenda desde el telefono
- `app/dashboard` ya no contiene implementacion de negocio: queda como routing fino de Expo y delega en `src/features/professional/screens/*`
- `/dashboard` redirige segun sesion: profesional va a `/dashboard/agenda`; otros casos vuelven a tabs o login
- `app/dashboard/_layout.tsx` ahora reubica cualquier sesion no profesional autenticada en `/(tabs)` para evitar que cliente vea vistas operativas del profesional como `Turnos y reservas`
- el dashboard profesional mobile ahora monta una barra inferior persistente propia con accesos a `agenda`, `servicios`, `perfil`, `cobros` y `ajustes`; ya no depende de links sueltos dentro de cada pantalla para moverse entre modulos y su implementacion base ya vive bajo `src/features/professional/navigation/ProfessionalBottomNav.tsx`
- `dashboard/billing` ya no usa `payout-config`; muestra el plan de Plura y el estado de conexion OAuth de `Mercado Pago` como unico provider vigente para cobros
- `dashboard/billing` en mobile ya respeta el gating principal de web: si el perfil no tiene `allowOnlinePayments`, no intenta conectar `Mercado Pago` y deja la conexion reservada para `PROFESIONAL / ENTERPRISE`
- `dashboard/billing` refresca perfil + suscripcion al volver a foreground para bajar desfasajes despues del checkout del plan o del flujo OAuth
- `dashboard/billing` ahora abre el checkout del plan y la autorizacion OAuth de `Mercado Pago` dentro de un browser embebido de Expo; al cerrar esa vista vuelve a refrescar perfil + billing
- `dashboard/services` en mobile ya bloquea `DEPOSIT` y `FULL_PREPAY` cuando el perfil no tiene `allowOnlinePayments`, alineando la configuracion de servicios con web; ademas respeta el tope de servicios por plan (`15/30/ilimitado`)
- `dashboard/agenda` en mobile ya no expone las acciones manuales `completar` ni `retry payout`; queda alineado con la UX operativa web basada en confirmacion, cancelacion, no-show y reagendamiento
- `dashboard/agenda` ya usa selector internacional para el telefono opcional al crear reservas manuales desde mobile
- `dashboard/settings` ahora expone tambien el cierre de sesion visible dentro del propio dashboard profesional mobile y un acceso explicito a `dashboard/schedule`, sin depender de links legacy o de volver a la experiencia cliente
- no expone aun el set completo de capacidades `Premium`
- `dashboard/business-profile` ya usa el mismo selector internacional de telefono que auth para editar el contacto del negocio sin pedir prefijo manual

### Otras pantallas mobile

- `/profesional/[slug]`: redirect temporal al perfil publico canonico `/profesional/pagina/[slug]`.
- `/reservar`: flujo de reserva.
- `/(tabs)/settings`: configuración cliente dentro del shell cliente, con preferencias, push, seguridad y baja de cuenta, sin una rama `/client` aparte.

### Modulos transversales mobile

- `src/services/api.ts`: auth y refresh con headers `MOBILE`.
- `src/services/session.ts`: persistencia de tokens.
- `src/services/search.ts`
- `src/services/publicBookings.ts`
- `src/services/clientBookings.ts`
- `src/services/clientFeatures.ts`: features y entitlements del cliente.
- `src/services/professionalBookings.ts`
- `src/services/professionalConfig.ts`: configuracion del perfil profesional.
- `src/services/billing.ts`: suscripciones y plan del profesional.
- `src/services/bookingPolicy.ts`: politicas de reserva.
- `src/services/categories.ts`: categorias de servicios.
- `src/services/mercadoPagoBrowser.ts`: apertura de Mercado Pago en browser embebido.
- `src/services/oauth.ts`: OAuth helpers mobile.
- `src/services/pendingReservation.ts`: persistencia local de reservas pendientes.
- `src/services/errors.ts`: manejo centralizado de errores.
- `src/services/logger.ts`: logging mobile.
- `src/services/storage.ts`: persistencia local segura.
- `src/features/client/auth/*`: login, registro y complete-phone del cliente con navegacion post-auth propia (`pendingReservation -> /(tabs)/index`).
- `src/features/client/navigation/ClientTabsLayout.tsx`: barra inferior y guard de tabs cliente, separada del routing Expo.
- `src/features/client/screens/*`: implementaciones reales de `home`, `explore`, `favorites`, `bookings`, `notifications` y `profile` del cliente.
- `src/features/client/screens/SettingsScreen.tsx`: preferencias, push, verificaciones, seguridad y baja de cuenta del cliente.
- `src/features/client/hooks/useClientSettings.ts`: estado, efectos y mutaciones de configuración cliente fuera de la screen.
- `src/features/client/session/useClientSession.ts`: facade de sesion cliente; expone solo estado y acciones del lado usuario para no arrastrar `profile` profesional dentro de features cliente.
- `src/features/professional/auth/*`: login, registro y complete-phone profesional con salida directa a `/dashboard`.
- `src/features/professional/screens/*`: implementaciones reales de `agenda`, `services`, `business-profile`, `billing`, `schedule`, `settings`, `notifications` y redirect inicial del dashboard profesional.
- `src/features/professional/screens/SettingsScreen.tsx`: ya no toca preferencias cliente; queda reservado a seguridad/verificaciones del profesional y política de reservas.
- `src/features/professional/hooks/useProfessionalSettings.ts`: estado, efectos y mutaciones de configuración profesional fuera de la screen.
- `src/features/professional/hooks/useProfessionalAgenda.ts`: estado, carga, acciones y formularios operativos de agenda/reservas fuera de la screen.
- `src/features/professional/session/useProfessionalSession.ts`: facade de sesion profesional; expone solo estado y acciones del lado negocio para no arrastrar `clientProfile` dentro de features profesionales.
- `src/hooks/useGoogleOAuth.ts`: en Android usa `@react-native-google-signin/google-signin` para evitar `invalid_request` del flujo web y forzar chooser nativo de cuentas; en iOS/web mantiene `expo-auth-session` y soporta token directo o authorization code segun lo que devuelva Google
- `src/features/shared/auth/*`: namespace definitivo para auth compartida de mobile; ya contiene la entrada publica (`AuthWelcomeScreen`, `AuthEntryShowcase`), recovery (`PasswordRecoveryScreen`) y rutas comunes sin aliases legacy.
- `src/features/professional/navigation/ProfessionalBottomNav.tsx`: implementacion real de la barra inferior profesional; ya no depende del alias viejo en `src/components/professional`.
- `src/services/location.ts` y `src/hooks/useUserLocation.ts`
- `src/services/pushNotifications.ts` y `src/hooks/usePushNotifications.ts`: sincronizan permisos push del dispositivo, persisten preferencia local y, para cliente autenticado, registran o deshabilitan el `push token` contra backend
- `src/components/ui/AppScreen.tsx`: shell base mobile; cuando `scroll=true` ahora soporta `pull-to-refresh` comun mediante `refreshing + onRefresh`
- `src/components/ui/MobileSurface.tsx`: concentra primitives mobile de superficie (`SectionCard`, `StatusPill`) y tambien los CTA/chips reutilizables (`ActionButton`, `SelectionChip`); el tono primario ya quedo alineado con el verde de marca web y los filtros/acciones principales migran sobre esta base comun.

Lectura de producto:

- mobile cubre reserva, cuenta y operacion basica
- `/profesional/[slug]` en mobile ya muestra una seccion visual de ubicacion con mapa de `Mapbox`, usando coordenadas publicas cuando existen y geocoding fallback cuando faltan
- `/reservar` en mobile ya puede continuar reservas con pago online: crea la reserva, abre `Mercado Pago` dentro de la app con browser embebido y luego deriva a `/(tabs)/bookings` para seguir el estado de la reserva
- `/(tabs)/bookings` ahora tambien reabre pagos pendientes de `Mercado Pago` dentro de la app y refresca reservas al volver
- mobile cliente ya puede usar ubicacion real para experiencias de cercania dentro de `home` y `explore`
- la parte push mobile queda en estado intermedio: permiso del dispositivo, UX y registro backend del `push token` ya existen, pero el envio push server-side todavia no esta cableado en el repo
- todavia no se ve una capa madura para notificaciones transaccionales, fidelizacion o chat (reseñas base ya estan en backend y web, pendiente UI mobile)

## Shared

Base: `packages/shared/src`

Modulos compartidos actuales:

- `billing/plans.ts`
- `billing/planAccess.ts`
- `bookings/idempotency.ts`
- `bookings/mappers.ts`
- `bookings/professionalReservationActions.ts`
- `publicBookings/contracts.ts`
- `search/service.ts`
- `types/*` (search, professional, bookings, payout)

Uso actual:

- web y mobile importan estos archivos por rutas relativas directas
- no aparece un paquete workspace formalizado para `shared`

Lectura de producto:

- `billing/plans.ts` ya modela los planes, pero con naming tecnico `BASIC / PROFESIONAL / ENTERPRISE`
- `types/professional.ts` ya contiene entitlements como pagos online, client profile, portfolio, loyalty, last minute, store y shipping
- eso indica que parte del modelo de permisos para `Pro` y `Premium` ya esta pensado, aunque no toda la UX este cerrada
