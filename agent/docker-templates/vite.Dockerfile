FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN npm ci 2>/dev/null || npm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN __BUILD_COMMAND__

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/__OUTPUT_DIR__ ./__OUTPUT_DIR__
RUN npm install -g serve
EXPOSE 3000
CMD __ENTRY_CMD__
