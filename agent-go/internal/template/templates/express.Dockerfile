FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* yarn.lock* ./
RUN npm ci 2>/dev/null || npm install

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY . .
__BUILD_RUN__
EXPOSE 3000
ENV NODE_ENV=production
CMD __ENTRY_CMD__
