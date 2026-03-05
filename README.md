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
pnpm install
```

Levantar web + backend:

```bash
pnpm dev
```

Comandos individuales:

```bash
pnpm dev:web
pnpm dev:backend-java
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

## Despliegue en Render

El proyecto ya cuenta con un **render.yaml** en la raíz que define los dos servicios:

- `plura-api`: backend Java empaquetado en un Docker multi‑stage.
- `plura-web`: frontend Next.js construido con pnpm.

Render ofrece variables de entorno sensibles y una base de datos PostgreSQL gestionada. El `render.yaml`
incluye todas las variables necesarias (algunas marcadas `sync: false` para que no se suban al repo);
asegurate de rellenarlas en el dashboard o mediante `render env set`.

La configuración de Spring Boot está preparada para:

1. leer `SPRING_DATASOURCE_URL`.*
2. si no existe usar `DATABASE_URL` (Render provee esto cuando enlazas un servicio de base de datos)
3. si sigue ausente caer en una H2 en memoria para que el contenedor arranque y el healthcheck pase.

Las cookies JWT se marcan como `Secure` y el puerto público se asigna con `-Dserver.port=${PORT}`
para que Render pueda cambiarlo dinámicamente.

> 💡 Si el despliegue falla, revisá los **logs del servicio** en el panel de Render; suelen indicar la
> variable faltante o el error de conexión a la BD.

## Notas

- El workspace usa `pnpm` (no `npm lockfiles`).
- `backend-java/README.md` contiene detalles funcionales de billing, search y scripts operativos.
