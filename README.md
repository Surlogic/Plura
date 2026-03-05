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

## Notas

- El workspace usa `pnpm` (no `npm lockfiles`).
- `backend-java/README.md` contiene detalles funcionales de billing, search y scripts operativos.
