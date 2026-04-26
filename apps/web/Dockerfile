FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

ENV PNPM_STORE_PATH=/pnpm-store
ENV NEXT_BUILD_DIR=.next-build

COPY . .

RUN pnpm install --frozen-lockfile

ENV SKIP_HOME_SSG_FETCH=true

RUN pnpm -C apps/web build

FROM node:20-bookworm-slim

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

ENV NODE_ENV=production
ENV PNPM_STORE_PATH=/pnpm-store
ENV NEXT_BUILD_DIR=.next-build
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=build /app /app

EXPOSE 3000

CMD ["pnpm", "-C", "apps/web", "start"]
