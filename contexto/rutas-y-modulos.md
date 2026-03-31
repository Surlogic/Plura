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
- modulos Premium de multiequipo, fidelizacion, portfolio, tienda y automatizacion avanzada

## Web

Base: `apps/web/src/pages`

### Rutas publicas

- `/`: home SSR con hero + buscador unificado en variante simplificada, categorias visuales, top businesses, bloque compacto de `como funciona`, ReviewsSection (testimonios publicos de feedback de app via `GET /public/app-feedback`) y CTA final; `Reservar ahora` deriva a `/explorar` y `Soy profesional` al registro existente `/profesional/auth/register`; usa `getServerSideProps` con retry client-side si SSR falla.
- `/explorar`: buscador principal con filtros, lista y mapa.
- `/explorar/[slug]`: vista detallada de exploracion por slug.
- `/profesional/[slug]`: pagina publica del profesional.
- `/profesional/pagina/[slug]`: variante de pagina publica.
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
- `/explorar`, `/profesional/[slug]` y `/reservar` son parte del loop principal marketplace -> perfil -> reserva
- cuando una reserva prepaga genera `checkoutUrl`, tanto `/reservar` como `/cliente/reservas` abren Mercado Pago en la pestaña actual para asegurar una experiencia full-page consistente y evitar bloqueos de popup
- `/reservar` ya no mezcla toda la operacion en una sola pantalla larga: orquesta `5` pasos reales (`confirmar servicio -> elegir dia -> elegir horario -> revisar turno -> confirmar y reservar`)
- `/reservar` mantiene la misma creacion de reserva y el mismo checkout que antes, pero ahora no auto-selecciona el primer servicio ni el primer dia sin feedback visual
- `/reservar` sigue siendo compatible con `pendingReservation`: si el cliente cae en login al final del flujo, al volver retoma el resumen final listo para confirmar
- `/reservar` tambien refleja `serviceId`, `date`, `time` y `step` en la URL con `router.replace(..., { shallow: true })` para que un refresh del navegador no rompa el progreso local del flujo
- el paso final de `/reservar` no promete confirmacion falsa: la reserva sigue naciendo en `PENDING`; si hay pago online, la confirmacion final depende del backend y Mercado Pago
- `/explorar` y `/profesional/pagina/[slug]` ya no fuerzan auth refresh ni favoritos en 401 cuando el cliente no tiene una sesion conocida; las features auth-only se habilitan recien con hint de sesion valida
- cuando existe sesion conocida del cliente, `/explorar`, `/profesional/[slug]` y `/profesional/pagina/[slug]` tambien hidratan el perfil cliente para mantener navbar y favoritos coherentes en la navegacion publica
- `_app.tsx` ya usa un `session hint` con rol (`CLIENT` o `PROFESSIONAL`) para rehidratar el perfil correcto tambien en `/` y otras rutas publicas al reabrir navegador; si el hint viejo no tiene rol, el bootstrap puede intentar ambos perfiles de forma transitoria hasta que el usuario vuelva a iniciar sesion
- el logout web se unifico en un flujo comun (`useAuthLogout` + `LogoutTransitionProvider`): muestra overlay de `Cerrando sesión`, limpia perfiles/cache local y deriva al login especifico del rol real
- aunque no haya sync reciente en memoria, el toggle de favoritos en web revalida contra backend en la primera interaccion util para evitar dobles clicks o estados viejos del cache local
- `/explorar` ya usa la fecha como filtro real de disponibilidad y no solo como ordenador; `Disponible ahora` tambien se apoya en disponibilidad real
- en la geoseleccion de `/explorar`, el frontend ya no persiste la direccion completa de Mapbox como `city` para backend; prioriza una ciudad/zona mas amplia y deja las coordenadas como filtro fuerte
- al escribir manualmente en la barra de `/explorar`, si el usuario venia refinando una busqueda de `PROFESIONAL` o `LOCAL`, el frontend ya no pisa ese tipo automaticamente en cada tecla
- home, dashboard cliente y `/explorar` ahora reutilizan exactamente la misma barra base de busqueda (`components/search/UnifiedSearchBar`): misma logica, mismos dropdowns y mismos contratos; en home se renderiza una variante hero mas limpia con foco en `servicio + ubicacion + fecha + CTA`, mientras `/explorar` conserva el refinamiento completo y el rail interno de chips
- `/profesional/pagina/[slug]` y `/profesional/[slug]` ahora separan mejor perfil y reserva: hero editorial con CTA liviano, servicios en lista compacta, galeria contenida, bloque unificado de ubicacion/horarios y reseñas; la operacion completa de reserva queda derivada a `/reservar`
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
- `components/cliente/reservations`: timeline e historial sobrio dentro del panel de detalle de la reserva seleccionada.
- `context/ClientNotificationsContext.tsx`: token de refresh mas estado compartido del unread count para deduplicar requests entre campana e inbox sin cambiar la UX visible.
- `context/ClientProfileContext.tsx`: carga `GET /auth/me/cliente`.
- `hooks/useClientBookingTimeline.ts`: carga `GET /cliente/reservas/{bookingId}/timeline` con estados `loading / empty / error`.
- `hooks/useClientNotificationUnreadCount.ts` y `hooks/useClientNotificationPreview.ts`: contador y preview del dropdown cliente.
- `hooks/useClientNotificationInbox.ts`: filtros por estado y evento, carga incremental y acciones `mark read` / `read all` del inbox cliente.
- `hooks/useFavoriteProfessionals.ts`: favoritos del cliente.
- `services/clientBookings.ts`: reservas y pago del cliente.
- `services/clientBookings.ts`: reservas y pago del cliente; ahora cachea `actions` y `timeline` por booking y permite prefetch conservador del detalle para bajar waterfalls al entrar o cambiar de seleccion.
- `services/clientFeatures.ts`: features y entitlements del plan del cliente.
- `services/clientReviews.ts`: reseñas del cliente por booking; incluye creacion, lectura, elegibilidad y eliminacion con invalidacion de cache.
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
- reseñas implementadas: CTA en sidebar de reserva COMPLETED, formulario con rating 1-5 y texto opcional, review existente visible con opcion de eliminar; proteccion contra race conditions con patron `isActive`
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
- `/profesional/dashboard/configuracion`
- `/profesional/dashboard/resenas`
- `/profesional/dashboard/pagina-publica` — ahora incluye galería de fotos del negocio con upload vía `ImageUploader` (kind="gallery"), máximo según `maxBusinessPhotos` del plan (`BASIC=3`, `PROFESIONAL=6`, `ENTERPRISE=10`), preview en iframe; headline y about ya se editan también desde `BASIC`
- `/profesional/dashboard/perfil-negocio` — ahora soporta upload de logo (kind="logo", variant="circle") y banner (kind="banner", variant="banner") desde `BASIC`; también deja editar redes/contacto público sin bloquear por plan
- `/profesional/dashboard/billing`
- `/profesional/notificaciones`

Modulos relevantes:

- `components/profesional`: UI publica y dashboard.
- `components/profesional/notifications`: campana en sidebar, dropdown FE-1 e inbox FE-2 con toolbar, lista, items y acciones de lectura.
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
- `services/professionalReviews.ts`: gestion de reseñas recibidas por el profesional; incluye listado, ocultamiento de texto y eliminacion con invalidacion de cache.
- `services/publicReviews.ts`: reseñas publicas para perfil publico del profesional.

Lectura de producto:

- esta area concentra el valor de `Free` y buena parte de `Pro`
- `servicios`, `horarios`, `reservas`, `perfil-negocio` y `notificaciones` son el corazon operativo
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
- la web profesional ya no expone la accion manual `completar` para reservas; en la UX operativa quedaron confirmacion, cancelacion, no-show, reagendamiento y lectura de timeline
- `/profesional/dashboard` recorta trabajo de agenda en cliente: la grilla semanal y mensual quedaron separadas para evitar rerenders pesados al abrir el drawer, y la carga de reservas ya no expande fechas dispersas a un unico rango continuo cuando el dashboard combina semana actual con una semana o mes navegados
- `/profesional/dashboard` debe mostrar en agenda todas las reservas no canceladas del rango visible, incluyendo `pending`, `confirmed`, `completed` y `no_show`; `cancelled` queda fuera para no bloquear visualmente huecos liberados
- `/profesional/dashboard` ya no limita la carga de bookings a `today` cuando el plan es `DAILY/BASIC`; la agenda semanal y mensual queda visible tambien en `Free/BASIC` y usa los bookings reales del rango visible para evitar huecos falsos
- `services/professionalBookings.ts` ahora mapea `date/time` de reservas profesionales a claves operativas `YYYY-MM-DD` y `HH:mm`, no a labels humanizados; la presentacion visible de fechas queda en la UI para no romper la grilla de agenda
- `/profesional/dashboard` compacta el bloque de `Pulso semanal` para no empujar la agenda; cuando no hay analytics muestra una nota breve en lugar de tarjetas altas vacias
- `/profesional/dashboard` en vista semanal usa una base completa de `24h` con scroll vertical interno; el viewport visible muestra aproximadamente `12h`, el foco inicial se calcula en frontend con horarios configurados y reservas visibles de la semana, agrega margen corto y solo cae a fallback `09:00-18:00` para posicionamiento inicial si no hay datos suficientes; el eje horario visible marca horas de una en una y deja subdivisiones de `30m` como referencia sutil
- `/profesional/dashboard` agrega una toolbar compacta para saltar dentro del dia a `Madrugada`, `Mañana`, `Tarde`, `Noche` y `Ahora` sin romper navegacion semanal ni render de reservas
- `/profesional/dashboard` en desktop prioriza visibilidad y estabilidad de agenda sobre un shell full-height estricto: la pagina puede seguir scrolleando normalmente, mientras la vista semanal mantiene scroll interno solo en el cuerpo del calendario y una altura explicita para que la grilla no colapse ni quede truncada
- `/profesional/dashboard/pagina-publica` sigue editando textos y galería, pero la preview ya consume también el encuadre persistido de `logo` y `banner` definido en `perfil-negocio`

Notas recientes:

- feedback de app integrado en `/profesional/dashboard/configuracion` con formulario de rating, categoria opcional y texto libre; incluye historial paginado de feedback propio; modulo backend separado `core.feedback`
- `/profesional/dashboard/resenas` es la pagina de gestion de reseñas del profesional: muestra stats agregados (rating, total), lista paginada de reseñas recibidas con toggle de hide/show del texto publico y opcion de eliminar reseña; el texto oculto sigue visible para el profesional con indicador visual amarillo
- `/profesional/dashboard/configuracion` ahora requiere challenge OTP por email para eliminar cuenta; advierte sobre cancelacion de suscripcion y reservas pendientes
- `PublicReviewsList` ahora muestra un resumen visual de rating + total y una distribucion calculada sobre la muestra visible cargada, seguido por reseñas paginadas; sigue respetando ocultamiento del texto publico
- `/profesional/pagina/[slug]` y `/profesional/[slug]` ahora renderizan `logo` y `banner` con `object-position + zoom` persistidos desde perfil del negocio, manteniendo la misma composición visual que ve el profesional al editar

Huecos relevantes contra el objetivo:

- onboarding inicial del negocio
- ficha del cliente orientada a `Pro`
- analytics mas visibles
- chat interno
- soporte multiequipo propio de `Premium`

### Rutas internas de operaciones

- `/internal/feedback`: panel operativo de feedback interno de app con listado filtrable, analytics y archivo/desarchivo; protegido por token interno configurable desde localStorage, no por sesion de usuario; `<meta name="robots" content="noindex,nofollow" />`

Modulos relevantes:

- `services/internalOps.ts`: cliente HTTP con `X-Internal-Token` y URL base configurables desde localStorage
- `pages/internal/feedback.tsx`: pagina completa con configuracion, analytics, filtros y tabla de feedback

### Modulos transversales web

- `components/search`: sistema compartido del buscador web; incluye barra base, footer de filtros activos, sugerencias, fecha y location autocomplete con dropdowns visualmente unificados.
- `components/map`: wrapper de Mapbox.
- `hooks/useCategories.ts`: carga de categorias para el buscador.
- `hooks/usePublicProfessionals.ts`: carga de profesionales publicos para superficies de descubrimiento.
- `hooks/useUnifiedSearch.ts`: hook grande de busqueda unificada con filtros, resultados y estado.
- `hooks/useClientProfile.ts`: perfil del cliente autenticado.
- `services/search.ts`: integra search y suggest.
- `services/geo.ts`: geocoding y autocomplete.
- `services/api.ts`: auth, refresh y headers de plataforma `WEB`.
- `services/session.ts`: mantiene fallback token y un `known session hint` en storage para no disparar refresh/autofetch en rutas publicas cuando no hay sesion confirmada.
- `hooks/useAuthLogout.ts` + `context/LogoutTransitionContext.tsx`: cierre de sesion unificado con overlay global y redireccion por rol.
- `lib/auth/sessionErrors.ts`: clasifica `401/403` de auth aparte de errores transitorios para que la web no fuerce logout por fallas de red o `5xx`.
- `services/appFeedback.ts`: feedback de app del cliente y profesional; ahora incluye `getPublicAppFeedback(limit)` para testimonios publicos via `GET /public/app-feedback`.
- `middleware.ts`: CSP y headers de seguridad.
- `/oauth/mercadopago/callback`: ahora interpreta `result/reason` devueltos por el backend y consulta el estado real de conexion; ya no intenta llamar al callback backend con `code/state`.
- `pages/profesional/pagina/[slug].tsx`: compone la pagina publica con hero premium, CTA liviano hacia `/reservar`, servicios en lista compacta, galeria contenida, bloque unificado de ubicacion/horarios y reseñas; reutiliza el fetch cacheado del perfil publico y posterga geocoding fallback + mapa hasta que el bloque entra en viewport.
- `pages/reservar.tsx`: orquestador del flujo publico de reserva en `5` pasos reales; mantiene los mismos servicios/endpoints (`public profile`, `slots`, `create booking`, `payment-session`), compatibilidad con `pendingReservation` y la derivacion a `/cliente/reservas` para seguimiento post-creacion/post-checkout.
- `components/reservation/ReservationFlowHeader.tsx`: encabezado del flujo con resumen del profesional, progreso por pasos y servicio activo.
- `components/reservation/ReservationServiceSelector.tsx`: paso `1`; muestra el servicio elegido con su detalle completo y deja editar/cancelar o abrir el selector interno por categoria.
- `components/reservation/ReservationScheduleStep.tsx`: pasos `2` y `3`; separa en modo calendario (`dia`) y modo horarios (`time`) para no mezclar fecha con slots en la misma vista.
- `components/reservation/ReservationReviewStep.tsx`: paso `4`; resumen intermedio del turno con edicion explicita de servicio, dia u horario antes del cierre.
- `components/reservation/ReservationSummaryCard.tsx`: paso `5`; resumen final con CTA segun modalidad (`Reservar`, `Pagar seña y reservar`, `Pagar y reservar`), politica y nota operativa de estado `PENDING`.
- `components/reservation/ReservationProgressSidebar.tsx`: sidebar persistente con progreso del flujo, resumen de seleccion y datos utiles del profesional.
- `components/reservation/paymentDetails.ts`: helper de presentacion para monto a pagar ahora, saldo restante y CTA final segun `paymentType`.
- `components/profesional/public-page/PublicProfileHero.tsx`: hero publico con banner ancho, logo superpuesto, rating, ubicacion, about y favorito.
- `components/profesional/public-page/PublicServicesSection.tsx`: lista compacta de servicios con pills por categoria, metadata breve y CTA directo hacia el flujo dedicado de reserva.
- `components/profesional/public-page/servicePresentation.ts`: formateadores compartidos para precio, duracion, modalidad de pago y categoria publica.
- `components/profesional/ImageUploader.tsx`: componente reutilizable de subida de imágenes con variantes `square`, `circle` y `banner`; valida MIME (jpeg, png, webp) y tamaño (1MB); muestra preview blob inmediato y sube vía `professionalImageUpload` service.
- `utils/assetUrl.ts`: incluye `resolveR2Url()` para convertir URLs R2 (`r2://bucket/path`) a URLs CDN públicas usando `NEXT_PUBLIC_IMAGE_CDN_BASE_URL`.

Lectura de producto:

- search + mapa sostienen marketplace y descubrimiento
- `middleware.ts` y `services/api.ts` sostienen parte del bloque core de autenticacion y seguridad
- en rutas protegidas web, un fallo transitorio al refrescar sesion o cargar `/auth/me/*` ya no limpia la sesion local ni redirige a login; la redireccion queda reservada a `401/403` reales
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
- `/(tabs)/index` ya muestra un bloque de ubicacion del cliente para abrir exploracion ordenada por cercania y un CTA para activar permisos de notificaciones del dispositivo
- `/(tabs)/explore` ya puede reutilizar la ubicacion actual del cliente para pedir `/api/search` con `lat/lng`, `radiusKm` y `sort=DISTANCE`, mostrando tambien la zona actual y distancia aproximada por resultado cuando backend la devuelve
- `/(tabs)/notifications` ya refleja el permiso push del sistema y permite activarlo o derivar a ajustes del dispositivo; todavia no registra tokens push en backend

### Grupo `(auth)`

- `/(auth)/login`
- `/(auth)/login-client`
- `/(auth)/login-professional`
- `/(auth)/register`
- `/(auth)/register-client`
- `/(auth)/register-professional`
- `/(auth)/forgot-password`
- `/(auth)/reset-password`

Lectura de producto:

- cubre autenticacion base con flujos separados por rol (cliente y profesional)
- el login social con Google ya aparece en hooks y variables de entorno
- en mobile, `/(auth)/forgot-password` y `/(auth)/reset-password` siguen consumiendo el flujo legacy `email + token` (`/auth/password/forgot` y `/auth/password/reset`); todavia no replican la recuperacion web por `email + telefono + OTP`
- `/(auth)/reset-password` ahora tambien redirige al login especifico del rol (`/(auth)/login-client` o `/(auth)/login-professional`) cuando backend confirma el cambio de contraseña
- `/(auth)/register-client` y `/(auth)/register-professional` ya usan selector internacional de telefono con bandera + codigo y envian el numero final listo para backend

### Grupo `dashboard`

- `/dashboard`
- `/dashboard/agenda`
- `/dashboard/services`
- `/dashboard/business-profile`
- `/dashboard/billing`
- `/dashboard/notifications`
- `/dashboard/schedule`
- `/dashboard/settings`

Lectura de producto:

- reproduce parte del panel profesional en mobile
- responde bien al objetivo `Free` y `Pro` de operar una agenda desde el telefono
- `/dashboard` redirige segun sesion: profesional va a `/dashboard/agenda`; otros casos vuelven a tabs o login
- `dashboard/billing` ya no usa `payout-config`; muestra el plan de Plura y el estado de conexion OAuth de `Mercado Pago` como unico provider vigente para cobros
- `dashboard/billing` en mobile ya respeta el gating principal de web: si el perfil no tiene `allowOnlinePayments`, no intenta conectar `Mercado Pago` y deja la conexion reservada para `PROFESIONAL / ENTERPRISE`
- `dashboard/billing` refresca perfil + suscripcion al volver a foreground para bajar desfasajes despues del checkout del plan o del flujo OAuth
- `dashboard/billing` ahora abre el checkout del plan y la autorizacion OAuth de `Mercado Pago` dentro de un browser embebido de Expo; al cerrar esa vista vuelve a refrescar perfil + billing
- `dashboard/services` en mobile ya bloquea `DEPOSIT` y `FULL_PREPAY` cuando el perfil no tiene `allowOnlinePayments`, alineando la configuracion de servicios con web; ademas respeta el tope de servicios por plan (`15/30/ilimitado`)
- `dashboard/agenda` en mobile ya no expone las acciones manuales `completar` ni `retry payout`; queda alineado con la UX operativa web basada en confirmacion, cancelacion, no-show y reagendamiento
- `dashboard/agenda` ya usa selector internacional para el telefono opcional al crear reservas manuales desde mobile
- `dashboard/notifications` sigue siendo una pantalla transitoria de estado/configuracion para profesional; todavia no replica el inbox completo de web
- no expone aun el set completo de capacidades `Premium`
- `dashboard/business-profile` ya usa el mismo selector internacional de telefono que auth para editar el contacto del negocio sin pedir prefijo manual

### Otras pantallas mobile

- `/profesional/[slug]`: perfil publico del profesional.
- `/reservar`: flujo de reserva.

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
- `src/hooks/useGoogleOAuth.ts`
- `src/services/location.ts` y `src/hooks/useUserLocation.ts`
- `src/services/pushNotifications.ts` y `src/hooks/usePushNotifications.ts`

Lectura de producto:

- mobile cubre reserva, cuenta y operacion basica
- `/profesional/[slug]` en mobile ya muestra una seccion visual de ubicacion con mapa de `Mapbox`, usando coordenadas publicas cuando existen y geocoding fallback cuando faltan
- `/reservar` en mobile ya puede continuar reservas con pago online: crea la reserva, abre `Mercado Pago` dentro de la app con browser embebido y luego deriva a `/(tabs)/bookings` para seguir el estado de la reserva
- `/(tabs)/bookings` ahora tambien reabre pagos pendientes de `Mercado Pago` dentro de la app y refresca reservas al volver
- mobile cliente ya puede usar ubicacion real para experiencias de cercania dentro de `home` y `explore`
- la parte push mobile queda en estado intermedio: permiso del dispositivo y UX listos, pero el envio push server-side todavia no esta cableado en el repo
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
