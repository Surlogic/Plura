# Contexto General De Plura

Generado el `2026-03-14`.

## Que es esta app

Plura es un monorepo para una plataforma de servicios con dos perfiles principales:

- `cliente`: explora profesionales, marca favoritos y gestiona reservas.
- `profesional`: configura perfil publico, servicios, agenda, politicas de reserva y facturacion.

El sistema combina:

- frontend web en `Next.js`
- app mobile en `Expo / React Native`
- backend API en `Spring Boot`
- PostgreSQL con migraciones `Flyway`

## Foto rapida del repo

- `apps/web`: app web con `Pages Router`, `32` pages y `57` componentes.
- `apps/mobile`: app Expo con `23` pantallas y `16` servicios cliente.
- `backend-java`: API principal con `382` archivos Java y `40` migraciones SQL.
- `packages/shared`: utilidades y contratos compartidos entre web y mobile.
- `scripts`: helpers de desarrollo del workspace.

## Dominios funcionales principales

- Autenticacion y sesiones
- OAuth Google y Apple
- Perfiles de cliente y profesional
- Catalogo de servicios profesionales
- Disponibilidad y horarios
- Reservas, cancelaciones y reprogramaciones
- Favoritos del cliente
- Busqueda y sugerencias
- Geolocalizacion y mapas
- Billing, suscripciones, pagos, payouts y webhooks
- Operacion interna y observabilidad

## Arquitectura resumida

### Web

La web usa `apps/web/src/pages` como capa de rutas y `apps/web/src/services` para hablar con la API. El cliente Axios:

- usa `NEXT_PUBLIC_API_URL`
- manda cookies
- guarda `accessToken` como fallback en storage
- intenta `POST /auth/refresh` ante `401`

`_app.tsx` monta providers para:

- perfil del cliente
- perfil profesional
- cambios sin guardar del dashboard profesional
- tema y manejo global de errores

### Mobile

La app mobile usa `expo-router` con grupos:

- `app/(tabs)` para la experiencia principal del cliente
- `app/(auth)` para login, registro y password reset
- `app/dashboard` para vistas del profesional

El cliente Axios mobile:

- usa `EXPO_PUBLIC_API_URL` o defaults por plataforma
- envía `Authorization: Bearer`
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

## Flujo funcional de alto nivel

1. Un usuario se registra o inicia sesion como cliente o profesional.
2. El cliente descubre profesionales desde home, explorar o pagina publica.
3. La disponibilidad publica se consulta por slots del profesional.
4. El cliente crea una reserva y, si aplica, inicia pago.
5. El profesional administra reservas, agenda, servicios, perfil y payout config.
6. Billing cubre suscripciones de profesionales y pagos operativos de reservas.

## Donde arrancar segun tarea

- UI web: `apps/web/src/pages` y `apps/web/src/components`
- consumo API web: `apps/web/src/services`
- navegacion mobile: `apps/mobile/app`
- consumo API mobile: `apps/mobile/src/services`
- contratos compartidos: `packages/shared/src`
- reglas de negocio backend: `backend-java/src/main/java/com/plura/plurabackend`
- configuracion backend: `backend-java/src/main/resources/application.yml`
- esquema/migraciones: `backend-java/src/main/resources/db/migration`

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

- Desarrollo local principal: `pnpm` + `backend-java`
- Deploy documentado en `render.yaml`
- Base de datos principal: PostgreSQL
- Cache opcional: Redis
- Search engine opcional: Meilisearch
- Jobs opcionales: SQS
- Storage de imagenes: local o Cloudflare R2

## Observaciones importantes del estado actual

- `packages/shared` se consume por imports relativos directos desde web y mobile; hoy no tiene `package.json` ni `tsconfig` propio.
- El `docker-compose.yml` de la raiz parece legado o desactualizado: referencia `backend/`, pero el backend real del repo es `backend-java/`.
- El `README.md` raiz menciona `backend-java/README.md`, pero ese archivo hoy no existe.
- El backend tiene soporte operativo bastante mas amplio que el README raiz: sesiones, auditoria auth, OTP, payouts, provider ops y endpoints internos.

## Documentos de esta carpeta

- `rutas-y-modulos.md`: mapa de rutas y responsabilidades por app.
- `backend-endpoints.md`: resumen de endpoints y dominios del backend.
- `infra-y-configuracion.md`: variables, integraciones y notas operativas.
