FROM node:22-alpine AS deps
RUN corepack enable pnpm
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY apps/playground/package.json ./apps/playground/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY packages/ ./packages/
COPY apps/playground/ ./apps/playground/
RUN pnpm -r --filter "@llm-series/!(playground)" build
RUN pnpm --filter @llm-series/playground build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/playground/.next/standalone ./
COPY --from=builder /app/apps/playground/.next/static ./apps/playground/.next/static
COPY --from=builder /app/apps/playground/public ./apps/playground/public
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/playground/server.js"]
