FROM node:20-alpine AS builder

WORKDIR /app

COPY apps/core-api/package*.json ./
COPY apps/core-api/tsconfig*.json ./

RUN npm ci --legacy-peer-deps

COPY apps/core-api/src/ ./src/

# Build without sourcemaps or declaration files (prod tsconfig)
RUN npx tsc -p tsconfig.prod.json

# ── Runner ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="Evolith Core API"
LABEL org.opencontainers.image.source="https://github.com/beyondnetcode/evolith_arch32"

RUN apk add --no-cache curl

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force && rm package-lock.json

# Copy only runtime ruleset data — .md excluded via .dockerignore
COPY rulesets/ ./corpus/rulesets/

RUN addgroup -g 1001 -S evolith && \
    adduser -S evolith -u 1001 -G evolith && \
    chown -R evolith:evolith /app

USER evolith

ENV NODE_ENV=production
ENV PORT=3000
ENV WORKSPACE_ROOT=/app/corpus
ENV CORE_PATH=/app/corpus
ENV EVOLITH_LOG_LEVEL=info

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main"]
