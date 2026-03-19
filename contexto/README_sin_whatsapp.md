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
- agenda diaria
- bloqueo de horarios
- confirmacion y cancelacion desde panel
- carga manual de turnos
- aparicion en marketplace
- recepcion de reservas desde Plura
- notificaciones in-app y recordatorio basico

Lectura operativa actual:

- `agenda diaria` limita navegacion de agenda, no la gestion base de reservas
- `Free/BASIC` debe poder entrar a `/profesional/dashboard/reservas`, ver reservas operativas y ejecutar acciones base desde panel segun estado y politica

Bloqueos esperados en producto:

- sin pagos online
- sin ficha de cliente
- sin analytics
- sin chat interno
- sin agenda semanal
- sin multiequipo
- sin automatizaciones avanzadas
- sin portfolio, puntos, ultima hora, paquetes, tienda ni badge verificado

### Pro

Plan para ahorrar tiempo y profesionalizar una sola agenda activa. Precio objetivo actual: `$590 UYU / mes`.

- todo lo de `Free`
- perfil mejorado con portada, logo, descripcion larga, mapa y metodos de pago
- pagos online configurables y cobro en local o al reservar
- agenda diaria y semanal
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

- autenticacion y seguridad: registro, login, recuperacion, sesiones, OAuth Google y Apple
- onboarding inicial del negocio o profesional cuando este listo
- roles y permisos
- perfil editable del negocio o profesional
- ubicacion, direccion y mapa
- almacenamiento y gestion de imagenes
- constructor de servicios con categorias, etiquetas, duracion, precio y buffers
- horarios de trabajo y bloqueos manuales
- motor de disponibilidad y generacion de slots
- politicas de cancelacion y reprogramacion
- estados de reserva: pendiente, confirmado, cancelado, completado y no-show
- detalle completo de reserva y carga manual desde panel
- centro de notificaciones e historial
- notificaciones in-app, email y motor de eventos transaccionales
- reseñas base y respuesta del negocio
- panel administrativo y configuracion general
- pagos online configurables y metodos de pago visibles
- base de analytics y eventos del producto

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

- `apps/web`: app web con `Pages Router`, `32` pages y `57` componentes.
- `apps/mobile`: app Expo con `23` pantallas y `16` servicios cliente.
- `backend-java`: API principal con `382` archivos Java y `40` migraciones SQL.
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
- storage de imagenes

Capacidades de producto definidas pero no necesariamente cerradas en UI o API publica:

- onboarding inicial del negocio
- timeline cliente dentro del detalle de reserva
- reseñas y respuesta del negocio
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
- storage de imagenes: local o Cloudflare R2

## Observaciones importantes del estado actual

- `packages/shared` se consume por imports relativos directos desde web y mobile; hoy no tiene `package.json` ni `tsconfig` propio.
- el `docker-compose.yml` de la raiz parece legado o desactualizado: referencia `backend/`, pero el backend real del repo es `backend-java/`.
- el `README.md` raiz menciona `backend-java/README.md`, pero ese archivo hoy no existe.
- el backend tiene soporte operativo mas amplio que el README raiz: sesiones, auditoria auth, OTP, payouts, provider ops y endpoints internos.

## Documentos de esta carpeta

- `rutas-y-modulos.md`: mapa de rutas, modulos y lectura por rol o plan.
- `backend-endpoints.md`: resumen de endpoints y dominios del backend leidos desde producto.
- `infra-y-configuracion.md`: variables, integraciones y notas operativas cruzadas con roadmap.
