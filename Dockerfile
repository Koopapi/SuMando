# Imagen de producción de Mando (plan 001, sección 5): compilación standalone de Next y migración al arrancar.
FROM node:24-bookworm-slim AS builder
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile
COPY . .
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter web build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1 MIGRATE_ON_START=1
RUN groupadd --system mando && useradd --system --gid mando --home /app mando \
  && mkdir -p /app/data/files && chown -R mando:mando /app/data
# Spec 008: documentos de empleados; en Coolify se monta un volumen persistente en /app/data.
ENV FILES_DIR=/app/data/files
COPY --from=builder --chown=mando:mando /app/apps/web/.next/standalone ./
COPY --from=builder --chown=mando:mando /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=mando:mando /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=mando:mando /app/apps/web/drizzle ./apps/web/drizzle
USER mando
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD node -e "fetch('http://localhost:3000/api/setup').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "apps/web/server.js"]
