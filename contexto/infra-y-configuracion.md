# Infra Y Configuracion

## Stack principal

- Monorepo `pnpm`
- Web: `Next.js 15`, `React 19`, `TypeScript`
- Mobile: `Expo 54`, `React Native 0.81`, `expo-router`
- Backend: `Spring Boot 3.5`, `Java 17`, `JPA`, `Spring Security`
- Base de datos: PostgreSQL
- Migraciones: Flyway

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
- `ANALYZE`
- `SKIP_HOME_SSG_FETCH`

### Mobile

Variables detectadas en uso:

- `EXPO_PUBLIC_API_URL`
- `MAPBOX_TOKEN`
- `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`

Archivo ejemplo:

- `apps/mobile/.env.example`

### Backend

Areas de configuracion principales en `application.yml`:

- server y compresion
- datasource PostgreSQL/H2 fallback
- Flyway
- JWT y refresh token
- OAuth Google y Apple
- mail SMTP
- cache y Redis
- feature flags de search/profile/slots
- CORS
- auth cookies y password reset
- rate limiting
- storage local o R2
- SQS
- search engine externo
- billing

Variables criticas sin las que el backend puede fallar o degradarse:

- `JWT_SECRET`
- `JWT_REFRESH_PEPPER`
- credenciales DB productivas
- credenciales OAuth si se usa login social
- variables de billing si se habilitan pagos reales

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
- mata procesos previos ocupando `3000` o `3002` cuando corresponda

## Deploy

`render.yaml` define:

- `plura-api`: backend Docker
- `plura-web`: app Next.js
- `plura-db`: base PostgreSQL gestionada

## Integraciones externas detectadas

- Google OAuth
- Apple OAuth
- Mapbox
- Mercado Pago
- dLocal
- Redis
- Meilisearch
- AWS S3 SDK / Cloudflare R2
- AWS SQS
- SMTP
- Prometheus / Actuator

## Scripts operativos utiles

- `backend-java/scripts/geocode_professional_profiles.sh`
  - geocodifica perfiles profesionales sin coordenadas
- `backend-java/scripts/audit_public_consistency.sh`
  - compara servicios y agenda publicados contra DB
- `backend-java/scripts/release/run_phase3_migrations.sh`
- `backend-java/scripts/release/run_phase4_migrations.sh`

## Observaciones de mantenimiento

- `docker-compose.yml` de raiz parece de una estructura anterior y no coincide con `backend-java`.
- `packages/shared` no esta empaquetado como workspace package consumible.
- `apps/web/next.config.js` habilita `externalDir` para poder importar desde `packages/shared/src`.
- El backend contempla H2 como fallback de arranque, pero la app real esta pensada para PostgreSQL.
