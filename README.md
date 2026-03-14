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

Por defecto, `pnpm dev` arranca una base PostgreSQL local con PostGIS en `127.0.0.1:5433`
para el backend Java. Si necesitás usar una base remota definida en `backend-java/.env`,
ejecutá:

```bash
pnpm dev:backend:remote
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
>
> ⚠️ *Error común durante despliegues repetidos:* Flyway puede abortar el arranque si un archivo
> de migración se modificó después de haber sido aplicado en la base de datos (checksum mismatch).
> En ese caso verás un mensaje como **"Migration checksum mismatch for migration version 2"**.
> Para solucionarlo podés:
>
> 1. Conectarte a la base de datos gestionada (´render db connect plura-db´ o vía psql) y ejecutar
>    `flyway repair` para actualizar la fila en `flyway_schema_history`.
> 2. Borrar la base de datos y dejar que el despliegue cree una nueva (solo si no tenés datos
>    importantes).
> 3. Temporalmente deshabilitar la validación con `SPRING_FLYWAY_VALIDATE_ON_MIGRATE=false` (como
>    se configura en la plantilla `render.yaml`) y luego volver a habilitarla una vez reparada.
>    Esto permite que el contenedor arranque mientras arreglás la historia de migraciones.

> 🔧 *Build de Next.js lento/que falla:* Si el build de la web se queda colgado en \"Generating static pages\"
> o falla por timeout (60s por página), revisá que ESLint esté deshabilitado durante el build
> (configurado en `next.config.js`). Si persiste, podés aumentar el timeout en Render o optimizar
> las páginas estáticas.

## Notas

- El workspace usa `pnpm` (no `npm lockfiles`).
- `backend-java/README.md` contiene detalles funcionales de billing, search y scripts operativos.
