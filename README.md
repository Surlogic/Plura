# Plura

Monorepo con pnpm workspaces preparado para escalar.

## Arquitectura
- backend/ -> NestJS + TypeScript + Prisma + PostgreSQL
- apps/web -> Next.js 14 (App Router) + TypeScript + TailwindCSS
- apps/mobile -> placeholder para futuro
- packages/ -> paquetes compartidos

## Requisitos
- Node >= 20
- pnpm

## Instalación
pnpm install

## Desarrollo
pnpm dev

Comandos individuales:
- pnpm dev:backend
- pnpm dev:web

## PostgreSQL
1. Instala PostgreSQL localmente.
2. Crea una base de datos llamada `plura`.
3. Ajusta `backend/.env` con tu `DATABASE_URL`.

Ejemplo:
postgresql://postgres:postgres@localhost:5432/plura?schema=public

## Prisma
- pnpm -C backend prisma migrate dev --name init
- pnpm -C backend prisma generate

## Variables de entorno (Web)
apps/web/.env.local:
NEXT_PUBLIC_API_URL=http://localhost:3000

## Puertos
- Backend: 3000
- Web: 3001
