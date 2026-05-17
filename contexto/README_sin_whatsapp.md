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
- `negocio` o `profesional`: entra al MVP con una suscripcion unica llamada `Plura Core`.

Definicion vigente de monetizacion para MVP:

- el profesional/local se registra directo en `Plura Core`
- el wizard web de registro profesional cierra con activacion de `Plura Core`: crea o completa la cuenta, aplica configuracion inicial de perfil/horarios/primer servicio y llama billing para iniciar la prueba gratuita; si Mercado Pago devuelve checkout, redirige en la misma pestaña para autorizar el medio de pago
- no se venden ni se muestran planes por niveles, upgrades a Local/Enterprise ni comparativas de planes
- `INDEPENDENT` y `LOCAL` no son planes comerciales: son tipos operativos de perfil para definir modalidad, ubicacion, landing y datos publicos
- el modelo principal sigue siendo suscripcion mensual unica; en reservas prepagas el checkout puede sumar al cliente un cargo de procesamiento segun el servicio para cubrir fee de Mercado Pago + IVA + `1%` de plataforma

## Planes de producto

Naming vigente de negocio:

- `Usuario`: gratis
- `Plura Core`: suscripcion unica para profesionales y locales durante el MVP, con prueba gratuita de `2` meses iniciable desde backend billing
- `Enterprise`: futuro/personalizado para empresas con varios locales, sin UI, opcion de compra ni plan tecnico activo

Contratos actuales de compatibilidad:

- `Plura Core` <-> `CORE` <-> `PLAN_CORE`
- `PLAN_CORE` es el unico codigo canonico activo de suscripcion
- `POST /billing/subscription` acepta solo `PLAN_CORE` y `CORE`; cualquier alias comercial legacy devuelve `400`
- `PROFESSIONAL`, `LOCAL`, `ENTERPRISE`, `BASIC`, `PROFESIONAL`, `PLAN_BASIC`, `PLAN_PRO`, `PLAN_PROFESIONAL`, `PLAN_PROFESSIONAL`, `PLAN_PREMIUM`, `PLAN_LOCAL` y `PLAN_ENTERPRISE` no son planes de billing válidos
- `Local`, `Professional` y `Enterprise` quedan como tipos operativos o conceptos futuros fuera de billing; `subscription.plan` queda restringido en DB a `PLAN_CORE`

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

### Plura Core

Suscripcion unica para el MVP operativo de profesionales y locales.

- prueba gratuita de `2` meses antes del cobro mensual de Core
- el dashboard de facturacion muestra trial activo, dias restantes, activacion pendiente de Mercado Pago, prueba vencida y estados de suscripcion Core sin exponer otros planes comprables
- una sola agenda activa
- un solo profesional activo
- un solo local
- perfil publico con logo, banner y textos visibles
- hasta `6` fotos de galeria del negocio
- hasta `30` servicios publicos con nombre, duracion, precio y `1` foto por servicio
- agenda completa en dashboard web
- calendario, horarios y bloqueos
- bloqueo de horarios
- confirmacion y cancelacion desde panel
- reprogramacion basica
- carga manual de turnos
- aparicion en marketplace
- recepcion de reservas desde Plura
- notificaciones in-app y recordatorio basico
- pagina publica / landing y dashboard profesional/local
- pagos online con Mercado Pago si la integracion esta configurada

Lectura operativa actual:

- `Plura Core/CORE` ya puede usar la agenda del dashboard sin bloqueos de vista semanal o mensual
- `Plura Core/CORE` debe poder entrar a `/profesional/dashboard/reservas`, ver reservas operativas y ejecutar acciones base desde panel segun estado y politica
- en `/profesional/dashboard`, incluso con `scheduleTier=DAILY`, la semana visible debe cargar y mostrar todas las reservas no canceladas del rango visible para no marcar huecos falsos ni permitir lectura engañosa de disponibilidad
- la agenda profesional web diferencia visualmente `pending`, `confirmed`, `completed` y `no_show` con color por estado tanto en la grilla semanal como en el resumen mensual; `cancelled` no se renderiza en agenda
- la agenda semanal del dashboard usa base completa de `24h` con scroll vertical interno, pero el viewport visible muestra aproximadamente `12h`; el foco inicial inteligente usa horario laboral y reservas visibles, y el fallback solo define a que franja abrir si faltan datos
- en desktop, `/profesional/dashboard` prioriza layout estable y agenda visible: mantiene scroll de pagina normal para la pantalla completa y reserva el scroll interno al cuerpo de la agenda semanal, evitando truncar la grilla por un shell full-height demasiado estricto

Extras futuros no vendidos ni visibles como plan ahora:

- ficha de cliente
- sin analytics
- sin chat interno
- sin multiequipo
- sin automatizaciones avanzadas
- sin portfolio avanzado (galería básica ya existe), puntos, ultima hora, paquetes, tienda ni badge verificado

### Enterprise

Futuro/personalizado para empresas con varios locales. No se muestra en UI ni existe como opcion de compra actual.

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

- versionado de API adoptado como regla operativa para proteger producción, web y mobile frente a cambios de contrato; la política inicial es documentar y aplicar hacia adelante, y las migraciones concretas a rutas versionadas se harán en tareas separadas sin asumir que `/api/v1` ya exista en todo el backend
- autenticacion y seguridad: registro, login, recuperacion, sesiones y OAuth; hoy web y mobile exponen Google como login social activo, mientras backend conserva soporte OAuth mas amplio a nivel modulo auth; conviven dos recuperaciones de contraseña (`/auth/password/forgot` + `/auth/password/reset` como flujo legacy por token y `/auth/password/recovery/*` como flujo escalonado email + telefono + OTP por email); al confirmar cualquiera de los resets, backend devuelve el `role` recuperado (`USER` o `PROFESSIONAL`) para redirigir al login correcto y limpiar sesion previa; el backend ya autoriza superficies cliente/profesional por contexto activo del JWT (`ctx=CLIENT` o `ctx=PROFESSIONAL`) y no por `UserRole` legacy: toda cuenta activa puede operar como cliente y el contexto profesional exige `ProfessionalProfile.active=true`; una cuenta autenticada puede activar o reactivar su capacidad profesional con `POST /auth/professional-profile/activate` sin crear otro `app_user` ni tomar control de emails ajenos; el registro por email ya soporta OTP SMS unico previo al alta con Twilio Verify y, al activarlo por env, deja el telefono verificado desde el inicio; login OAuth puede requerir completar telefono via `POST /auth/oauth/complete-phone`; cierre de perfil profesional usa `DELETE /auth/professional-profile` con challenge OTP `ACCOUNT_DELETION` y no elimina la cuenta base ni datos cliente; eliminacion total de cuenta usa `DELETE /auth/me` con `scope=TOTAL`, `challengeId` y `code`
- onboarding inicial del negocio o profesional cuando este listo
- roles y permisos
- perfil editable del negocio o profesional
- ubicacion, direccion y mapa
- almacenamiento y gestion de imagenes con Cloudflare R2 como storage principal en producción; endpoint genérico `POST /profesional/images/upload` para logo, banner, galería y servicios; galería del negocio con tabla `business_photo` (tipos LOCAL, SERVICE, WORK); banner de perfil; resolución de URLs R2 a CDN público en frontend
- al persistir logo, banner, galería o fotos de servicio, backend canoniza URLs públicas del CDN o `/uploads` a referencias internas de storage para evitar metadatos inconsistentes; en la web pública, si una foto apunta a un objeto faltante, la UI la omite o cae a placeholder sin romper la composición
- identidad visual del negocio con encuadre persistente para `logo` y `banner`: el dashboard profesional ya permite subir ambos assets y abrir un editor visual en modal al terminar la subida o desde `Editar encuadre`; la composición (`positionX`, `positionY`, `zoom`) se reutiliza en preview, sidebar profesional y perfil público para evitar recortes raros o estirados perceptivos
- constructor de servicios con categorias, etiquetas, duracion, precio y buffers
- horarios de trabajo y bloqueos manuales
- motor de disponibilidad y generacion de slots
- politicas de cancelacion y reprogramacion
- estados de reserva: pendiente, confirmado, cancelado, completado y no-show
- detalle completo de reserva y carga manual desde panel
- centro de notificaciones e historial
- notificaciones in-app, email y motor de eventos transaccionales
- reseñas implementadas con tres variantes de respuesta: publica (respeta ocultamiento por profesional e internal ops), profesional (ve todo su texto y puede reportar incumplimientos), cliente (ve y puede eliminar su propia reseña); rating y reviewsCount propagados a todas las superficies publicas (home, explorar, mapa, favoritos, marketplace); notificacion automatica al profesional al recibir reseña; recomputo batch de agregados que deja `rating=0` y `reviewsCount=0` cuando un profesional queda sin reseñas; analytics de reseñas para internal ops con bandera de reportes; ocultamiento publico del texto por profesional e internal ops; respuesta publica del negocio pendiente
- feedback interno de app implementado (cliente y profesional pueden enviar rating + texto + categoria opcional hacia la plataforma; modulo separado `core.feedback`; historial paginado propio en configuracion; backoffice interno dedicado bajo la UI web `/internal/feedback`, consumiendo `/internal/ops/app-feedback` con listado, filtros, archive/unarchive y analytics basicos protegido por `X-Internal-Token`); feedback con texto se marca automaticamente `publicVisible=true` y queda expuesto via `GET /public/app-feedback` sin auth para testimonios publicos en la web; el nombre del autor se muestra abreviado ("Nombre I.") por privacidad
- moderacion interna de reseñas separada del feedback de producto: la UI vive en `/internal/ops/reviews`, consume los endpoints `/internal/ops/reviews*` y muestra reportes hechos por profesionales sin mezclar ese dominio con feedback de app
- panel administrativo y configuracion general
- pagos online configurables y metodos de pago visibles
- side effects de booking (agenda, notificaciones) ejecutados via after-commit para seguridad transaccional
- se removio la capa interna de analytics de producto y eventos `app_product_event`; reservas, pagos, reseñas y notificaciones conservan sus eventos operativos propios.
- hardening de base para Supabase ya aplicado desde Flyway: la app sigue usando Supabase como PostgreSQL administrado detras del backend Spring, pero el Data API/PostgREST deja de exponer `public`; queda reservado un schema `api_public` vacio para futuras superficies auditadas y las tablas operativas actuales de `public` pasan a RLS defensivo deny-all para roles API

Notas operativas recientes:

- search y suggest siguen manteniendo los mismos endpoints publicos, pero hoy se apoyan en materialized views denormalizadas para bajar joins y costo por request
- `/explorar` ya filtra por fecha y `disponible ahora` usando disponibilidad real de `available_slot`; la fecha ya no solo reordena resultados
- en `/explorar?vista=mapa`, frontend separa dataset base y render de mapa: la búsqueda mantiene un set crudo estable, la vista mapa pide internamente la primera página con `size` amplio para no truncar QA por paginación, el mapa usa solo los resultados con coordenadas y ni `pan/zoom` ni `Ver todo` mutan filtros backend o URL; si la URL viene sin `lat/lng`, la geolocalización del navegador queda solo como centrado visual inicial y no dispara una búsqueda automática cerca del usuario
- cuando una reserva cambia de horario o estado operativo con impacto en agenda (`cancel`, `reschedule`, confirmacion por pago), el backend ya reconstruye `available_slot` del dia afectado en el mismo ciclo after-commit; discovery y marketplace no deberian quedar mostrando huecos viejos por un rebuild async tardio
- la barra unificada de busqueda web ahora usa exactamente la misma base visual del home tambien en dashboard cliente y `/explorar`: mismo shell hero, mismo ancho maximo, misma altura de controles y mismos contratos; la variante `hero` del home suma una interaccion propia de foco en desktop donde `Servicios` se expande y `Ubicacion/Fecha` se compactan a icono mientras ese campo queda activo, sin trasladar esa animacion a `/explorar`; cuando aplica refinamiento extra, `/explorar` mantiene los filtros activos dentro del buscador como chips removibles para combinar rubro/consulta, fecha, ubicacion y disponibilidad sin duplicar UI por pagina
- la geoseleccion desde autocomplete ya no debe combinar una direccion hiper especifica con radio geografico de forma excluyente; cuando hay coordenadas, el radio manda y el texto de ciudad queda como apoyo UX
- las materialized views de search ahora se refrescan tambien al startup bajo lock distribuido para evitar que `search_professional_document_mv` quede vieja respecto de `professional_profile`
- las rutas publicas web mas criticas ya evitan ruido de auth cuando no existe una sesion conocida del cliente
- en rutas publicas como `/reservar`, si no existe una sesion conocida del cliente, la UI ya no queda trabada esperando `auth/me`: el CTA final puede abrir el acceso embebido de reserva directamente; ademas, el navbar compartido ya no expone un pill `Cargando...` por bootstrap de auth en superficies publicas y degrada a opciones publicas hasta que el perfil real termine de hidratar
- el backend ahora tambien degrada a anonimo en superficies publicas (`/health`, `/categories`, `/api/home`, `/api/search`, `/api/geo/*`, `/public/**`, uploads y webhooks) si llega un JWT o cookie auth invalido/vencido; no debe responder `401` solo por credenciales viejas mientras la ruta siga siendo publica
- la web ahora persiste un `session hint` con rol (`CLIENT` o `PROFESSIONAL`) para poder rehidratar el perfil correcto tambien en `/` y otras rutas publicas despues de cerrar y reabrir el navegador
- la web ya prioriza contexto/intencion por sobre `role` legacy en los accesos principales: login cliente y reserva usan `/auth/login` o `/auth/context/select` con `ctx=CLIENT`; login/onboarding profesional usan `ctx=PROFESSIONAL` cuando existe y, si la cuenta autenticada aun no lo tiene, activan `ProfessionalProfile` con `POST /auth/professional-profile/activate` sobre el mismo `app_user`
- los reloads de web ya no deben cerrar sesion por un `5xx` o una falla transitoria de refresh/auth me; la sesion solo cae automaticamente ante `401/403` reales
- al cerrar sesion desde la web, la UI ahora muestra un overlay transitorio de `Cerrando sesión` y redirige al login correcto por rol (`/cliente/auth/login` o `/profesional/auth/login`) en vez de dejar la pantalla sin feedback mientras limpia estado local
- el inbox de notificaciones se apoya en una ruta de lectura mas liviana para bajar latencia de lista sin cambiar la UX ni los contratos
- pagos online en runtime quedaron `Mercado Pago only`; `DLOCAL` se conserva solo como compatibilidad de lectura para datos historicos y como historia de migraciones Flyway
- el home web ahora usa SSG con revalidacion (`getStaticProps`, `revalidate: 300`) en vez de SSR por request; la pagina prioriza `buscar -> categorias -> destacados -> como funciona -> confianza -> CTA final`, reutiliza la barra unificada de busqueda en una variante hero mas limpia y arma el bloque superior como `texto + card visual`, dejando en desktop la columna izquierda ordenada como `titulo/subtitulo -> buscador -> metricas` con mas aire vertical antes del resto del home; esa card animada de rubros rota automaticamente usando `homeData.categories`, `category.imageUrl` cuando existe y placeholders SVG locales como fallback, respetando `prefers-reduced-motion`; si la regeneracion no trae data util, el cliente mantiene retry liviano; sigue consumiendo testimonios publicos reales via `GET /public/app-feedback`; el ranking de top professionals prioriza volumen de reservas confirmadas/completadas de los ultimos 3 meses
- `/api/home` ya aprovecha cache backend `homeData`, evitando recalcular categorias, stats y top professionals en cada hit del home
- home y explorar ya comparten una identidad visual publica consistente para negocios/locales: las cards priorizan `banner` como media principal, muestran `logo` superpuesto, caen a foto real del negocio si falta banner y evitan usar categorias o imagenes de servicio como branding principal salvo fallback extremo
- la reserva publica web en `/reservar` ya no comprime servicio, fecha, horario y checkout en una sola pantalla: ahora corre en `3` etapas reales (`servicio -> fecha y horario -> revision y confirmacion final`), mantiene los mismos endpoints backend, sigue retomando el cierre desde `pendingReservation` despues de login y conserva `serviceId/date/time/step` en URL para refresh y resumes
- `/api/home` y `/api/search` ahora exponen metadata suficiente de branding de card (`bannerUrl`, `bannerMedia`, `logoUrl`, `logoMedia`, `fallbackPhotoUrl`) para que home y marketplace no dependan de una sola imagen plana
- en el paso final de `/reservar`, si el cliente todavia no tiene sesion, la web ahora abre primero una pantalla embebida de registro/login para completar el acceso sin salir del flujo; ese overlay hoy ofrece credenciales propias y Google; `pendingReservation` se conserva como respaldo si el usuario termina en las pantallas completas de auth o en `complete-phone` despues de OAuth
- el paso final del flujo publico no promete confirmacion inmediata: la reserva sigue naciendo en `PENDING`; si el servicio requiere pago online, la confirmacion final depende del backend y de la acreditacion de Mercado Pago
- para reservas con pago online, web y mobile ya pueden mostrar separado `monto del servicio o seña`, `cargo de procesamiento` y `total del checkout`; ese desglose lo calcula backend y queda snapshoteado en la reserva para mantener el mismo total en todos los clientes
- cada servicio online puede elegir en dashboard entre acreditación Mercado Pago `5,99% + IVA` inmediata o `4,99% + IVA` a `21` dias; backend usa ese modo por servicio, suma ademas `1%` de plataforma al checkout y snapshot-ea el modo elegido en la reserva para no recalcular con otra configuracion despues
- flujo real de estados para QA manual:
  `POST /public/profesionales/{slug}/reservas` crea siempre en `PENDING`;
  si el servicio es `ON_SITE`, el profesional confirma manualmente desde `/profesional/dashboard/reservas`;
  si requiere pago online, el backend confirma automaticamente al acreditar el webhook de Mercado Pago;
  si una reserva prepaga se cancela fuera de la ventana de no devolucion segun la policy snapshot, backend genera el refund correspondiente y deja trazabilidad en finanzas;
  si Mercado Pago responde que el refund quedo iniciado pero todavia no final, la operacion no se considera cerrada: queda bajo seguimiento en `provider_operation` hasta webhook o reconciliacion;
  cuando ese refund queda iniciado pero pendiente, backend emite notificacion in-app y email transaccional solo al cliente con texto segun el medio de pago detectado;
  si Mercado Pago devuelve `account_money`, el mensaje avisa acreditacion inmediata o dentro del mismo dia;
  si detecta tarjeta, el mensaje cita la referencia oficial de 7 a 20 dias habiles y muestra una ventana conservadora un poco mas amplia para no prometer de mas;
  si el refund queda completado en el mismo dispatch, backend tambien emite `PAYMENT_REFUNDED` solo para el cliente sin esperar un webhook extra, reutilizando esa misma logica de estimacion;
  mientras la reserva siga `PENDING` o `CONFIRMED`, el horario queda bloqueado y no puede coexistir otra reserva en ese mismo tramo;
  si la reserva se cancela o se reagenda, el slot anterior se libera y la disponibilidad publica se recalcula enseguida para ese dia;
  una reserva `CONFIRMED` puede pasar a `COMPLETED` manualmente desde `/profesional/dashboard/reservas` o via `POST /profesional/reservas/{id}/complete` solo cuando ya termino el turno completo (`booking.endDateTime <= now`, incluyendo post-buffer);
  la reseña del cliente sigue habilitada solo sobre reservas `COMPLETED`, sin reseña previa y dentro de `7` dias desde `completedAt`
- la web cliente ahora suma recordatorio in-app de reseña con backend como fuente de verdad: al entrar a `/cliente/inicio` o `/cliente/reservas`, busca una reserva `COMPLETED` elegible, registra la impresion real y muestra como maximo `1` reminder por dia, `3` por reserva y solo dentro de los `7` dias posteriores a `completedAt`; desaparece si el cliente reseña, si vence la ventana o si llega al tope
- `ClientNotificationsContext` ya no rompe si se renderiza fuera del provider; devuelve defaults seguros para degradar sin crash en rutas publicas o SSR
- web y mobile ya usan recuperacion de contraseña en 3 pasos (`email -> telefono -> codigo`) sobre `/auth/password/recovery/*`; el flujo legacy `/auth/password/forgot|reset` queda solo como compatibilidad
- los formularios principales que cargan telefono en web y mobile ya usan selector de pais con bandera + codigo internacional; el frontend compone el numero final antes de enviarlo al backend y, en registro/complete-phone, pide OTP SMS antes de continuar
- tras completar un reset de contraseña, web y mobile ya no dejan la eleccion manual del acceso: navegan al login de cliente o profesional segun el rol real de la cuenta recuperada

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
- mobile ahora tambien sincroniza el `push token` del cliente autenticado contra backend via `PUT /cliente/notificaciones/push-token` cuando el permiso queda `granted`, y lo marca deshabilitado si el permiso se revoca o el usuario apaga `pushReminders`
- todavia no existe en el repo un worker de despacho push nativo server-side; el alcance operativo actual sigue siendo inbox/in-app + email, con base de device tokens ya persistida para futuras integraciones

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
- `Plura Core` debe justificar pago con ahorro de tiempo y mejor operacion
- `Enterprise` queda como linea futura/personalizada para multi-sede o multi-profesional

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

### Fase 2 - Operacion Core

Objetivo: hacer que pagar ordene la operacion.

- pagos online
- agenda semanal
- ficha del cliente si se define como add-on futuro
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

### Fase 4 - Enterprise

Objetivo: construir la oferta Enterprise personalizada futura.

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

- web completa con Plura Core antes de `2026-04-30`
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
- `apps/mobile`: app Expo con `31` pantallas y `21` servicios cliente.
- `backend-java`: API principal con `594` archivos Java y `58` migraciones SQL.
- `packages/shared`: utilidades, contratos y definiciones de billing compartidas.
- `scripts`: helpers de desarrollo del workspace.

## Estado actual del repo vs contexto objetivo

Capacidades ya visibles en codigo:

- autenticacion, sesiones, refresh y password reset
- OAuth Google expuesto en frontend; soporte OAuth adicional conservado en backend auth
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
- mobile ya puede pedir permiso de notificaciones del sistema, persistir ese estado local en `home`, `notificaciones` y `configuracion`, y registrar/deshabilitar el `push token` del cliente autenticado en backend; todavia no envia push server-side desde el repo actual
- storage de imagenes con Cloudflare R2, CDN público, galería de fotos del negocio y banner de perfil

Capacidades de producto definidas pero no necesariamente cerradas en UI o API publica:

- onboarding inicial del negocio
- timeline cliente dentro del detalle de reserva
- respuesta publica del negocio a reseñas (reseñas ya cerradas con moderacion, ocultamiento y analytics en backend + web)
- analytics de producto y reporting interno; analytics comerciales para profesionales quedan fuera de Core
- add-ons futuros sin bloqueo visible por plan comercial
- funciones futuras como multi-profesional, fidelizacion, ultima hora, portfolio avanzado y tienda
- base backend inicial de multitrabajador futuro: schema `professional_worker` + `professional_worker_service`, `worker_id` opcional en reservas/slots, trabajador dueño backfilleado para cada local existente, endpoints admin `/profesional/team*` para invitar/listar/editar agenda/servicios y endpoints publicos `/auth/worker-invitations*` para aceptar invitaciones; todavia falta conectar disponibilidad publica, reserva por trabajador, dashboards de trabajador y login unificado por contexto

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

- `app/index.tsx` como entrada: resuelve sesion y, cuando no existe login activo, muestra una portada de bienvenida con logo y acceso separado para cliente o profesional
- `app/(tabs)` como shell de rutas Expo para cliente; la implementacion real de tabs ya vive en `src/features/client/navigation/*` y `src/features/client/screens/*`
- `app/(auth)` para auth por rol, recovery escalonado y completar telefono despues de OAuth; la eleccion inicial del acceso ya vive en `/`
- `app/dashboard` como shell de rutas Expo para profesional; la implementacion real del dashboard ya vive en `src/features/professional/screens/*`
- la base de sesion mobile ya vive en el namespace neutral `src/context/auth/AuthSessionContext.tsx`; ya no queda alias legacy para `ProfessionalProfileContext`
- la entrada auth publica mobile ya empezo a moverse a `src/features/shared/auth/*`, las tabs cliente ya arrancan desde `src/features/client/navigation/*` + `src/features/client/screens/*`, la navegacion del dashboard profesional ya arranca desde `src/features/professional/navigation/*`, sus pantallas reales viven en `src/features/professional/screens/*` y las pantallas auth reales ya quedaron separadas entre `src/features/client/auth/*` y `src/features/professional/auth/*`
- cliente y profesional ya no consumen el hook auth crudo en sus features principales: usan `src/features/client/session/useClientSession.ts` y `src/features/professional/session/useProfessionalSession.ts` para reducir mezcla entre perfiles
- mobile ya separa tambien la configuración por superficie: cliente maneja preferencias, push, seguridad y baja de cuenta desde `src/features/client/screens/SettingsScreen.tsx` dentro del shell `/(tabs)/settings` sin abrir una rama `/client` aparte, mientras profesional deja `dashboard/settings` reservado a seguridad del negocio y política de reservas
- las screens mobile mas cargadas ya empezaron a mover su orquestacion a hooks por dominio: agenda profesional usa `src/features/professional/hooks/useProfessionalAgenda.ts` y settings cliente/profesional usan `src/features/client/hooks/useClientSettings.ts` + `src/features/professional/hooks/useProfessionalSettings.ts`
- la limpieza final de mobile ya movio la auth compartida a `src/features/shared/auth/*` como namespace real (`AuthEntryShowcase`, `AuthWelcomeScreen`, `PasswordRecoveryScreen`) y la barra inferior profesional ya vive directamente en `src/features/professional/navigation/ProfessionalBottomNav.tsx`; se eliminaron los aliases legacy de `src/features/auth/*` y `src/components/professional/ProfessionalBottomNav.tsx`
- la portada inicial `/` queda como unico selector entre cliente y profesional; los flows `/(auth)/login-client`, `/(auth)/register-client`, `/(auth)/login-professional` y `/(auth)/register-professional` ya no aceptan cruzar una cuenta al shell equivocado cuando OAuth devuelve otro rol
- si la sesion es de cliente, mobile entra por `/(tabs)` y deja que Expo Router resuelva la tab inicial sin exponer `index` en el deep link; ademas `+native-intent` y `+not-found` rescatan URLs viejas como `plura:///`, `plura://index` o `plura:///(tabs)/index`; si por estado viejo o deep link cae en `app/dashboard`, el layout profesional la reubica al shell cliente para no dejarla atrapada en vistas como `Turnos y reservas`
- el shell profesional mobile ahora incluye una barra inferior persistente para navegar entre modulos clave del dashboard sin volver manualmente atras
- al cerrar sesion en mobile, la navegacion ya vuelve al login correcto por rol (`/(auth)/login-client` o `/(auth)/login-professional`) en vez de mandar siempre a la portada inicial

El cliente Axios mobile:

- usa `EXPO_PUBLIC_API_URL` o defaults por plataforma
- envia `Authorization: Bearer`
- persiste access y refresh token
- renueva sesion con `POST /auth/refresh`
- para bootstrap de sesion ya no prueba ambos `/auth/me/*` a ciegas: primero lee el `role` del JWT, consulta solo el endpoint correcto y deduplica refresh concurrentes
- ante un `401/403` real limpia la sesion local; ante fallas transitorias de red o `5xx` ya no invalida por reflejo el estado autenticado cargado

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
corepack enable
pnpm install
pnpm dev
pnpm dev:web
pnpm dev:backend-java
pnpm dev:backend:remote
pnpm build
pnpm lint
```

Dataset QA marketplace Uruguay:

```bash
backend-java/scripts/seed_marketplace_uy_qa.sh
```

- carga `24` profesionales con categorias, servicios, coordenadas y ciudades de Uruguay para QA de marketplace
- crea cliente QA `qa.cliente.marketplace@plura.test`
- password comun del dataset: `PluraQA2026!`
- pensado para validar busqueda, suggest, filtros por categoria, mapa, perfil publico y favoritos

Puertos locales principales:

- API: `3000`
- Web: `3002`

## Infra y despliegue

- desarrollo local principal: `pnpm` + `backend-java`
- backend en Fly.io, web en Vercel
- base de datos principal: Supabase PostgreSQL
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
hola engo 
hola gurises


### Verificación celular

- Regla de seguridad: los clientes pueden navegar e iniciar el flujo, pero no pueden confirmar reservas sin celular verificado (`phoneVerified=true`); profesionales y OAuth deben completar OTP antes de continuar con alta/activación.
