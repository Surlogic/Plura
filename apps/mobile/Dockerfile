FROM node:20-bookworm-slim

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

ENV PNPM_STORE_PATH=/pnpm-store
