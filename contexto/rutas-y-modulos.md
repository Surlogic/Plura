# Rutas Y Modulos

## Web

Base: `apps/web/src/pages`

### Rutas publicas

- `/`: home con `Hero`, categorias, top professionals y FAQ.
- `/explorar`: buscador principal con filtros, lista y mapa.
- `/explorar/[slug]`: vista detallada de exploracion por slug.
- `/profesional/[slug]`: pagina publica del profesional.
- `/profesional/pagina/[slug]`: variante de pagina publica.
- `/reservar`: flujo de reserva desde perfil publico.
- `/reserva-confirmada`: confirmacion post reserva/pago.
- `/login`: acceso general.
- `/oauth/callback`: callback de OAuth.
- `/auth/forgot-password`
- `/auth/reset-password`

### Rutas del cliente

- `/cliente/auth/login`
- `/cliente/auth/register`
- `/cliente/inicio`
- `/cliente/dashboard`
- `/cliente/reservas`
- `/cliente/favoritos`
- `/cliente/perfil`
- `/cliente/configuracion`

Modulos relevantes:

- `components/cliente`: shell y sidebar del area cliente.
- `context/ClientProfileContext.tsx`: carga `GET /auth/me/cliente`.
- `hooks/useFavoriteProfessionals.ts`: favoritos del cliente.
- `services/clientBookings.ts`: reservas y pago del cliente.

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

Modulos relevantes:

- `components/profesional`: UI publica y dashboard.
- `context/ProfessionalProfileContext.tsx`: carga `/auth/me/profesional` o fallback `/auth/me/professional`.
- `services/professionalBookings.ts`
- `services/professionalBookingPolicy.ts`
- `services/professionalPayout.ts`
- `hooks/useProfessionalBilling.ts`

### Modulos transversales web

- `components/search`: barra unificada, sugerencias, fecha y location autocomplete.
- `components/map`: wrapper de Mapbox.
- `services/search.ts`: integra search y suggest.
- `services/geo.ts`: geocoding/autocomplete.
- `services/api.ts`: auth, refresh y headers de plataforma `WEB`.
- `middleware.ts`: CSP y headers de seguridad.

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

La tab bar esta orientada a cliente, pero tambien expone acceso a perfil/dashboard.

### Grupo `(auth)`

- `/(auth)/login`
- `/(auth)/register`
- `/(auth)/forgot-password`
- `/(auth)/reset-password`

### Grupo `dashboard`

- `/dashboard/agenda`
- `/dashboard/services`
- `/dashboard/business-profile`
- `/dashboard/billing`
- `/dashboard/schedule`
- `/dashboard/settings`

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

## Shared

Base: `packages/shared/src`

Modulos compartidos actuales:

- `billing/plans.ts`
- `bookings/idempotency.ts`
- `bookings/mappers.ts`
- `publicBookings/contracts.ts`
- `search/service.ts`
- `types/*`

Uso actual:

- web y mobile importan estos archivos por rutas relativas directas
- no aparece un paquete workspace formalizado para `shared`
