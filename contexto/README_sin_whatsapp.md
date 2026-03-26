# Contexto General De Plura

Generado el `2026-03-18`.

## Que es esta app

Plura es un monorepo para una plataforma de reservas orientada a belleza y bienestar en LATAM.

La propuesta de producto no es solo "agenda online". El objetivo es convertirse en infraestructura digital de confianza para profesionales y negocios que hoy operan con mensajería, Instagram, llamadas, papel y herramientas sueltas.

El nucleo de valor validado hoy es:

- agenda y disponibilidad real
- confirmacion y gestion de cambios de turno
- seguimiento del cliente despues de la reserva

## Modelo de negocio y roles

Plura tiene dos grandes actores:

- `usuario` o `cliente`: siempre gratis; descubre, reserva, reprograma, cancela segun politica y deja reseñas.
- `negocio` o `profesional`: entra por un plan gratuito y luego destraba operacion y crecimiento con planes pagos.

Definicion cerrada de monetizacion:

- el profesional se registra directo en `Free`
- el upgrade aparece dentro del producto cuando necesita una funcion bloqueada
- `Pro` se activa con `30` dias gratis desde la app
- si deja de pagar, conserva cuenta y datos, pero vuelve al comportamiento base de `Free`
- no hay comision por reserva; el modelo es suscripcion mensual

## Planes de producto

Naming objetivo de negocio:

- `Usuario`: gratis
- `Free`: puerta de entrada operativa
- `Pro`: operar mejor con una sola agenda activa
- `Premium`: crecer con equipo, fidelizacion y automatizacion avanzada

Naming actual detectado en el repo:

- `Free` <-> `BASIC`
- `Pro` <-> `PROFESIONAL`
- `Premium` <-> `ENTERPRISE`

Esta diferencia de naming hoy es importante para leer codigo, billing y permisos sin mezclar la narrativa de producto con la implementacion actual.

## Alcance por plan

### Usuario

Siempre gratis. Objetivo: bajar friccion para reservar y volver.

- registro, login y perfil
- marketplace, busqueda y filtros
- perfil publico del profesional o negocio
- reserva con disponibilidad real
- historial, favoritos y reseñas
- cancelacion y reprogramacion segun politica
- notificaciones de reserva y cambios en app con email de respaldo
- acceso a beneficios activados por el negocio como puntos, gift cards, paquetes o ultima hora

### Free

Plan de entrada para validar valor real sin regalar toda la operacion.

- una sola agenda activa
- un solo profesional activo
- un solo local
- perfil publico basico
- hasta `5` fotos
- servicios con nombre, duracion, precio y foto principal
- agenda completa en dashboard web
- bloqueo de horarios
- confirmacion y cancelacion desde panel
- carga manual de turnos
- aparicion en marketplace
- recepcion de reservas desde Plura
- notificaciones in-app y recordatorio basico

Lectura operativa actual:

- `Free/BASIC` ya puede usar la agenda del dashboard sin bloqueos de vista semanal o mensual
- `Free/BASIC` debe poder entrar a `/profesional/dashboard/reservas`, ver reservas operativas y ejecutar acciones base desde panel segun estado y politica
- en `/profesional/dashboard`, incluso con `scheduleTier=DAILY`, la semana visible debe cargar y mostrar todas las reservas no canceladas del rango visible para no marcar huecos falsos ni permitir lectura engañosa de disponibilidad
- la agenda semanal del dashboard usa base completa de `24h` con scroll vertical interno, pero el viewport visible muestra aproximadamente `12h`; el foco inicial inteligente usa horario laboral y reservas visibles, y el fallback solo define a que franja abrir si faltan datos
- en desktop, `/profesional/dashboard` prioriza layout estable y agenda visible: mantiene scroll de pagina normal para la pantalla completa y reserva el scroll interno al cuerpo de la agenda semanal, evitando truncar la grilla por un shell full-height demasiado estricto

Bloqueos esperados en producto:

- sin pagos online
- sin ficha de cliente
- sin analytics
- sin chat interno
- sin multiequipo
- sin automatizaciones avanzadas
- sin portfolio avanzado (galería básica ya existe), puntos, ultima hora, paquetes, tienda ni badge verificado

### Pro

Plan para ahorrar tiempo y profesionalizar una sola agenda activa. Precio objetivo actual: `$590 UYU / mes`.

- todo lo de `Free`
- perfil mejorado con portada, logo, descripcion larga, mapa y metodos de pago
- pagos online configurables y cobro en local o al reservar
- historial completo y reprogramacion mas completa
- ficha del cliente, notas, historial de visitas y seguimiento basico
- analytics basicos
- automatizaciones transaccionales in-app y email
- chat interno cliente-negocio

Limite clave:

- sigue siendo un plan para una sola agenda activa

### Premium

Plan para crecimiento, reputacion visual y operacion multiequipo. Precio objetivo actual: `$1.290 UYU / mes`.

- todo lo de `Pro`
- multiples profesionales y multiples locales
- agenda maestra
- reportes por profesional y por local
- portfolio visual
- reseñas destacadas con foto
- programa de puntos y fidelizacion
- promociones de ultima hora
- paquetes, combos y gift cards
- analytics avanzados
- badge verificado
- tienda de productos y gestion de envios

## Features core cerradas para la version actual

Base transversal que ordena el producto y la arquitectura:

- autenticacion y seguridad: registro, login, recuperacion, sesiones, OAuth Google y Apple; hoy conviven dos recuperaciones de contraseña (`/auth/password/forgot` + `/auth/password/reset` como flujo legacy por token y `/auth/password/recovery/*` como flujo escalonado email + telefono + OTP por email); login OAuth puede requerir completar telefono via `POST /auth/oauth/complete-phone`; eliminacion de cuenta requiere challenge OTP por email (`/auth/challenge/send` con purpose `ACCOUNT_DELETION`) antes de ejecutar `DELETE /auth/me` con `challengeId + code`
- onboarding inicial del negocio o profesional cuando este listo
- roles y permisos
- perfil editable del negocio o profesional
- ubicacion, direccion y mapa
- almacenamiento y gestion de imagenes con Cloudflare R2 como storage principal en producción; endpoint genérico `POST /profesional/images/upload` para logo, banner, galería y servicios; galería del negocio con tabla `business_photo` (tipos LOCAL, SERVICE, WORK); banner de perfil; resolución de URLs R2 a CDN público en frontend
- constructor de servicios con categorias, etiquetas, duracion, precio y buffers
- horarios de trabajo y bloqueos manuales
- motor de disponibilidad y generacion de slots
- politicas de cancelacion y reprogramacion
- estados de reserva: pendiente, confirmado, cancelado, completado y no-show
- detalle completo de reserva y carga manual desde panel
- centro de notificaciones e historial
- notificaciones in-app, email y motor de eventos transaccionales
- reseñas implementadas con tres variantes de respuesta: publica (respeta ocultamiento por profesional e internal ops), profesional (ve todo su texto), cliente (ve su propia reseña); rating y reviewsCount propagados a todas las superficies publicas (home, explorar, mapa, favoritos, marketplace); notificacion automatica al profesional al recibir reseña; recomputo batch de agregados; analytics de reseñas para internal ops; eliminacion de reseña por cliente y por profesional con recomputo de agregados; respuesta publica del negocio pendiente
- feedback interno de app implementado (cliente y profesional pueden enviar rating + texto + categoria opcional hacia la plataforma; modulo separado `core.feedback`; historial paginado propio en configuracion; backoffice interno con listado, filtros, archive/unarchive y analytics basicos bajo `/internal/ops/app-feedback` protegido por `X-Internal-Token`); feedback con texto se marca automaticamente `publicVisible=true` y queda expuesto via `GET /public/app-feedback` sin auth para testimonios publicos en la web; el nombre del autor se muestra abreviado ("Nombre I.") por privacidad
- panel administrativo y configuracion general
- pagos online configurables y metodos de pago visibles
- side effects de booking (agenda, notificaciones) ejecutados via after-commit para seguridad transaccional
- base de analytics y eventos del producto

Notas operativas recientes:

- search y suggest siguen manteniendo los mismos endpoints publicos, pero hoy se apoyan en materialized views denormalizadas para bajar joins y costo por request
- las rutas publicas web mas criticas ya evitan ruido de auth cuando no existe una sesion conocida del cliente
- la web ahora persiste un `session hint` con rol (`CLIENT` o `PROFESSIONAL`) para poder rehidratar el perfil correcto tambien en `/` y otras rutas publicas despues de cerrar y reabrir el navegador
- los reloads de web ya no deben cerrar sesion por un `5xx` o una falla transitoria de refresh/auth me; la sesion solo cae automaticamente ante `401/403` reales
- el inbox de notificaciones se apoya en una ruta de lectura mas liviana para bajar latencia de lista sin cambiar la UX ni los contratos
- pagos online en runtime quedaron `Mercado Pago only`; `DLOCAL` se conserva solo como compatibilidad de lectura para datos historicos y como historia de migraciones Flyway
- el home web ahora usa SSR (`getServerSideProps`) en vez de ISR/static; la pagina incluye hero, categorias, top businesses y ReviewsSection (testimonios publicos de feedback de app via `GET /public/app-feedback`); el ranking de top professionals prioriza volumen de reservas confirmadas/completadas de los ultimos 3 meses
- `ClientNotificationsContext` ya no rompe si se renderiza fuera del provider; devuelve defaults seguros para degradar sin crash en rutas publicas o SSR
- la web ya usa recuperacion de contraseña en 3 pasos (`email -> telefono -> codigo`) sobre `/auth/password/recovery/*`, mientras mobile todavia conserva el flujo legacy por email/token

## Estado operativo actual de notificaciones

Hoy el sistema de notificaciones ya cubre una base funcional completa para profesional y cliente en web:

- profesional: campana, unread badge, dropdown preview, inbox en `/profesional/notificaciones` y timeline por reserva dentro de `/profesional/dashboard/reservas`
- cliente: campana en navbar, unread badge, dropdown preview, inbox en `/cliente/notificaciones` y timeline por reserva dentro de `/cliente/reservas`

La navegacion contextual actual sigue la experiencia real de cada rol:

- profesional: `/profesional/dashboard/reservas?bookingId={id}`
- cliente: `/cliente/reservas?bookingId={id}`

Se mantiene la separacion entre:

- inbox de notificaciones
- timeline de actividad por booking
- email transaccional

En mobile cliente hoy hay una base adicional de permisos del dispositivo:

- `/(tabs)/index`, `/(tabs)/notifications` y `/dashboard/settings` ya pueden solicitar al sistema activar notificaciones
- el estado del permiso y la preferencia local de `pushReminders` queda persistido en storage seguro del dispositivo
- todavia no existe en el repo una ruta backend para registrar `push token` o despachar push nativas; el alcance actual sigue siendo permiso + UX preparada + inbox/in-app existente

Pendiente visible despues de estas fases:

- settings y preferencias de notificaciones
- tiempo real o polling mas agresivo si producto lo define
- extensiones futuras de clientes fuera del scope operativo actual

## Lectura de validacion con profesionales

Base considerada: `9` respuestas efectivas del formulario de validacion.

Senales que condicionan el roadmap:

- la gestion actual de turnos sigue siendo manual o mixta
- el mayor dolor operativo es coordinar horarios y responder mensajes
- las cancelaciones de ultimo momento si pegan en la operacion
- la reserva autonoma con disponibilidad real tiene interes concreto
- la disposicion a pagar existe, pero depende de demostrar ahorro de tiempo y orden operativo

Conclusion operativa:

- el MVP tiene que demostrar agenda, confirmacion y reserva real
- `Pro` debe justificar pago con ahorro de tiempo y mejor operacion
- `Premium` debe concentrar crecimiento, fidelizacion y multi-sede o multi-profesional

## Roadmap de producto recomendado

### Fase 1 - MVP

Objetivo: validar reservas reales.

- marketplace
- perfiles publicos
- servicios
- agenda basica
- disponibilidad real
- reserva
- panel cliente
- panel profesional
- estados del turno
- notificaciones in-app

### Fase 2 - Operacion Pro

Objetivo: hacer que pagar ordene la operacion.

- pagos online
- agenda semanal
- ficha del cliente
- historial
- reprogramacion
- analytics basicos
- chat interno
- automatizaciones transaccionales por app y email cuando aplique

### Fase 3 - Retencion

Objetivo: aumentar recurrencia y valor percibido.

- favoritos
- reseñas mas fuertes
- fotos de referencia
- campanas basicas
- mejor seguimiento del cliente

### Fase 4 - Premium

Objetivo: construir el plan premium real.

- portfolio visual
- fidelizacion
- ultima hora
- agenda multiequipo
- analytics avanzados
- automatizacion inteligente
- tienda
- envios
- verificacion

### Fase 5 - Expansion

Objetivo: abrir nuevos motores de crecimiento sin romper el nucleo.

- analytics publicos
- comunidad profesional
- nuevas verticales wellness y salud
- eventos y nuevas lineas futuras

## Objetivos de negocio informados

### Corto plazo

- tener listo el MVP: agenda, marketplace, calendario y notificaciones
- definir plan de accion comercial y ventas
- salir a vender, ofrecer colaboraciones y recoger feedback
- facturar mas de `1k` al mes

### Mediano plazo

- web completa con planes antes de `2026-04-30`
- app mobile completa antes de `2026-05-31`
- mas de `500` profesionales en Montevideo y `1000` en Uruguay antes de `2026-07-01`
- oficina antes de `2026-08-01`
- entrada en Brasil y Argentina antes de `2026-10-01`
- liderazgo en Uruguay y mas de `10k` al mes antes de `2026-12-31`

Nota: el input original mencionaba `31/04/2026`, fecha invalida; en este contexto se normaliza a `2026-04-30`.

### Largo plazo

- liderazgo regional en Uruguay, Argentina y Brasil antes de `2027-07-01`
- mas de `15k` profesionales en la region antes de `2027-07-01`
- facturar mas de `50k` al mes antes de `2027-07-01`

## Foto rapida del repo

- `apps/web`: app web con `Pages Router`, `36` pages y `80` componentes.
- `apps/mobile`: app Expo con `23` pantallas y `21` servicios cliente.
- `backend-java`: API principal con `594` archivos Java y `58` migraciones SQL.
- `packages/shared`: utilidades, contratos y definiciones de billing compartidas.
- `scripts`: helpers de desarrollo del workspace.

## Estado actual del repo vs contexto objetivo

Capacidades ya visibles en codigo:

- autenticacion, sesiones, refresh y password reset
- OAuth Google y Apple
- perfiles de cliente y profesional
- catalogo de servicios del profesional
- agenda, slots y reservas
- notificaciones backend para profesional y cliente con inbox, unread/read, email transaccional y timeline por reserva
- notificaciones cliente FE-C2 con campana en navbar, unread badge, dropdown preview e inbox real con filtros y acciones de lectura
- centro de notificaciones profesional con campana, contador, dropdown e inbox completo con filtros y acciones de lectura
- detalle de reserva profesional con timeline operativo e historial por reserva
- busqueda, favoritos, geolocalizacion y mapa
- billing, suscripciones, checkout de reservas y webhooks con Mercado Pago
- mobile ya muestra mapa en el perfil publico del profesional y abre los flujos de `Mercado Pago` dentro de la app con browser embebido
- mobile ya puede pedir permiso de ubicacion del dispositivo para mostrar la zona actual del cliente y lanzar exploracion ordenada por cercania real con `lat/lng`
- mobile ya puede pedir permiso de notificaciones del sistema y persistir ese estado local en `home`, `notificaciones` y `configuracion`; todavia no registra device tokens en backend ni envia push server-side desde el repo actual
- storage de imagenes con Cloudflare R2, CDN público, galería de fotos del negocio y banner de perfil

Capacidades de producto definidas pero no necesariamente cerradas en UI o API publica:

- onboarding inicial del negocio
- timeline cliente dentro del detalle de reserva
- respuesta publica del negocio a reseñas (reseñas ya cerradas con moderacion, ocultamiento y analytics en backend + web)
- analytics de producto y reporting orientado a plan
- bloqueo visible de features por plan dentro de toda la experiencia
- funciones Premium como multi-profesional, fidelizacion, ultima hora, portfolio y tienda

## Arquitectura resumida

### Web

La web usa `apps/web/src/pages` como capa de rutas y `apps/web/src/services` para hablar con la API. El cliente Axios:

- usa `NEXT_PUBLIC_API_URL`
- manda cookies
- guarda `accessToken` como fallback en storage
- intenta `POST /auth/refresh` ante `401`

`_app.tsx` monta providers para:

- perfil del cliente
- sincronizacion liviana de notificaciones del cliente entre inbox y navbar
- perfil profesional
- sincronizacion liviana de notificaciones del profesional entre inbox y sidebar
- cambios sin guardar del dashboard profesional
- tema y manejo global de errores

### Mobile

La app mobile usa `expo-router` con grupos:

- `app/(tabs)` para la experiencia principal del cliente
- `app/(auth)` para login, registro y password reset
- `app/dashboard` para vistas del profesional

El cliente Axios mobile:

- usa `EXPO_PUBLIC_API_URL` o defaults por plataforma
- envia `Authorization: Bearer`
- persiste access y refresh token
- renueva sesion con `POST /auth/refresh`

### Backend

El backend expone la logica de negocio y datos. Los paquetes mas importantes son:

- `auth`
- `professional`
- `booking`
- `billing`
- `search`
- `availability`
- `clientfavorite`
- `category`
- `geo`
- `cache`
- `feedback`
- `storage`

La configuracion principal vive en `backend-java/src/main/resources/application.yml`.

## Donde arrancar segun tarea

- UI web: `apps/web/src/pages` y `apps/web/src/components`
- consumo API web: `apps/web/src/services`
- navegacion mobile: `apps/mobile/app`
- consumo API mobile: `apps/mobile/src/services`
- contratos compartidos: `packages/shared/src`
- reglas de negocio backend: `backend-java/src/main/java/com/plura/plurabackend`
- configuracion backend: `backend-java/src/main/resources/application.yml`
- esquema y migraciones: `backend-java/src/main/resources/db/migration`

## Comandos utiles

```bash
pnpm install
pnpm dev
pnpm dev:web
pnpm dev:backend-java
pnpm build
pnpm lint
```

Puertos locales principales:

- API: `3000`
- Web: `3002`

## Infra y despliegue

- desarrollo local principal: `pnpm` + `backend-java`
- deploy documentado en `render.yaml`
- base de datos principal: PostgreSQL
- cache opcional: Redis
- search engine opcional: Meilisearch
- jobs opcionales: SQS
- storage de imagenes: Cloudflare R2 en producción (con CDN público), local como fallback de desarrollo

## Observaciones importantes del estado actual

- `packages/shared` se consume por imports relativos directos desde web y mobile; hoy no tiene `package.json` ni `tsconfig` propio.
- el `docker-compose.yml` de la raiz ya quedo alineado con el repo real: levanta `backend-java` y `apps/web` con sus env files actuales.
- el `README.md` raiz ya remite a `contexto/` como documentacion operativa viva en lugar de apuntar a un `backend-java/README.md` inexistente.
- el backend tiene soporte operativo mas amplio que el README raiz: sesiones, auditoria auth, OTP, payouts, provider ops y endpoints internos.

## Reglas de performance obligatorias

Este sistema debe funcionar como producto profesional real con usuarios concurrentes. Todo codigo nuevo o modificado debe respetar estas reglas sin excepcion:

### Backend (Java / Spring Boot)

- **Prohibido N+1**: nunca hacer llamadas a base de datos o APIs externas dentro de un loop o stream. Siempre usar batch queries (`findByIdIn`, `IN` clauses) y procesar en memoria.
- **JOIN FETCH obligatorio**: toda query JPA que acceda a relaciones (`getBooking()`, `getUser()`, etc.) en el resultado debe incluir `JOIN FETCH` en la query para evitar lazy loading individual.
- **No sincronizar APIs externas en el flujo de lectura**: si un endpoint necesita sincronizar estado con un proveedor externo (ej. Mercado Pago), hacerlo asincrono o en background. No bloquear la respuesta al usuario esperando APIs de terceros.
- **Paginacion**: toda query que retorne listas potencialmente grandes debe aceptar paginacion. Nunca retornar `List<Entity>` sin limite desde la base de datos.
- **No usar `synchronized` con llamadas HTTP**: usar `ReentrantLock` con `tryLock` y timeout si se necesita exclusion mutua alrededor de I/O.
- **Pool sizing**: los defaults de pools de conexiones y threads deben ser suficientes para concurrencia real. Hikari min idle >= 5, billing/webhook core pool >= 4.
- **Statement timeout**: las queries deben completar en tiempo razonable. El timeout de statements debe ser >= 10s para tolerar queries legitimas pero cortando las que se escapan.
- **Query redundante**: no recargar datos de la DB si ya los tenes en memoria y no cambiaron. Solo re-fetchar despues de una escritura real.

### Frontend (React / Next.js)

- **No incluir state en dependency arrays de useCallback/useMemo si causa ciclos**: si un callback necesita leer state actual, usar `useRef` o functional state updates (`setState(prev => ...)`) en lugar de meter el state como dependencia.
- **Contextos con useMemo**: todo context value debe estar envuelto en `useMemo` con las dependencias correctas. Los callbacks estables (deps vacias) no necesitan estar en el array de dependencias del `useMemo`.
- **Polling con limite**: todo polling o retry recursivo debe tener un `MAX_ATTEMPTS` o un timeout total. Nunca hacer polling infinito.
- **Debounce en inputs de busqueda**: todo input que dispare API calls debe tener debounce >= 300ms.
- **AbortController en useEffect**: toda API call disparada desde un `useEffect` debe usar `AbortController` y cancelar en el cleanup.
- **React.memo para listas**: componentes que se renderizan dentro de loops (cards, items, rows) deben usar `React.memo` y los callbacks que reciben deben estar memoizados con `useCallback`.
- **No disparar multiples API calls redundantes al navegar**: usar guards (`hasLoaded`, `isLoading`) para evitar re-fetches innecesarios en contextos y hooks.

### General

- Ante la duda entre "mas rapido de escribir" y "mas eficiente en runtime", siempre elegir lo mas eficiente.
- El objetivo es que cada request use el minimo de recursos posible: menos queries, menos re-renders, menos llamadas a APIs externas.
- Si un cambio puede causar N+1, bloqueo de threads o re-renders en cascada, es un bug de performance y debe corregirse antes de mergearse.

## Documentos de esta carpeta

- `rutas-y-modulos.md`: mapa de rutas, modulos y lectura por rol o plan.
- `backend-endpoints.md`: resumen de endpoints y dominios del backend leidos desde producto.
- `infra-y-configuracion_sin_whatsapp.md`: variables, integraciones y notas operativas cruzadas con roadmap.
