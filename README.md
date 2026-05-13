# Plura Monorepo

Monorepo con frontend web (Next.js), app mobile (Expo) y backend API (Spring Boot + PostgreSQL).

## Estructura

- `apps/web`: Next.js 14 (Pages Router) + TypeScript.
- `apps/mobile`: Expo + React Native.
- `backend-java`: Spring Boot 3.5 + JPA + PostgreSQL.
- `packages`: espacio para librerías compartidas de workspace.

## Requisitos

- Node.js `>=20`
- pnpm
- Java 17
- PostgreSQL

## Desarrollo

Instalar dependencias del workspace:

```bash
corepack enable
pnpm install
```

Levantar web + backend:

```bash
pnpm dev
```

En Windows usar PowerShell o CMD desde la raiz del repo. `pnpm dev` arranca:

- backend Java en `http://localhost:3000`
- web Next.js en `http://localhost:3002`

El backend toma variables desde `.env.backend` y `backend-java/.env`; si ambos existen,
`backend-java/.env` pisa valores de `.env.backend`. La base PostgreSQL no se levanta sola:
`SPRING_DATASOURCE_URL` o `DATABASE_URL` debe venir configurada en esos archivos o en el entorno.

Si preferís levantarlo con Docker Desktop:

```bash
docker compose up --build
```

Comandos individuales:

```bash
pnpm dev:web
pnpm dev:backend-java
pnpm dev:backend:remote
```

## Puertos por defecto

- Backend API: `3000`
- Web: `3002`

## Migraciones de base de datos

El backend usa Flyway con historial de migraciones en:

- `backend-java/src/main/resources/db/migration`

Configuración principal:

- `SPRING_FLYWAY_ENABLED` (default `true`)
- `SPRING_FLYWAY_BASELINE_ON_MIGRATE` (default `true`)

Los SQL legacy/manual se mantienen en:

- `backend-java/db`

## Despliegue

La infraestructura vigente es:

- Backend: Fly.io, configurado en `backend-java/fly.toml`.
- Frontend web: Vercel.
- Base de datos: Supabase PostgreSQL por Session Pooler.
- Imágenes: Cloudflare R2 con CDN público.

El backend Java se empaqueta con `backend-java/Dockerfile` y expone `/health` para los checks de Fly.
Los valores no secretos principales viven en `backend-java/fly.toml`; los secretos deben cargarse en
Fly con `fly secrets`, incluyendo credenciales de Supabase, JWT, SMTP, Cloudflare R2 y Mercado Pago.

La configuración de Spring Boot está preparada para:

1. leer `SPRING_DATASOURCE_URL`
2. si no existe usar `DATABASE_URL` y convertir automáticamente `postgres://` / `postgresql://` a JDBC
3. extraer credenciales embebidas en `DATABASE_URL` cuando existan
4. fallar temprano si no hay datasource PostgreSQL válido en runtime

La web se despliega en Vercel y debe apuntar al backend Fly mediante `NEXT_PUBLIC_API_URL`.
Para imágenes públicas, Vercel debe exponer `NEXT_PUBLIC_IMAGE_CDN_BASE_URL` con el dominio CDN de R2.

## Notas

- El workspace usa `pnpm` (no `npm lockfiles`).
- `docker-compose.yml` quedó alineado con el monorepo actual y levanta `backend-java` + `apps/web`
  usando `.env.backend`, `backend-java/.env` y `.env.frontend`.
- La documentación operativa viva está en `contexto/`.
