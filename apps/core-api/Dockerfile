# Evolith Core API Dockerfile
# Multi-stage build for minimal production image

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and tsconfig
COPY apps/core-api/package*.json ./
COPY apps/core-api/tsconfig*.json ./

# Install all dependencies (including devDeps needed for build)
RUN npm install --legacy-peer-deps

# Copy source
COPY apps/core-api/src/ ./src/

# Build TypeScript → dist/
RUN npm run build

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="Evolith Core API"
LABEL org.opencontainers.image.description="Evolith Core API — gate evaluation, phase transitions, and architecture drift detection"
LABEL org.opencontainers.image.version="0.0.1"
LABEL org.opencontainers.image.authors="Beyondnet"
LABEL org.opencontainers.image.source="https://github.com/beyondnetcode/evolith_arch32"

RUN apk add --no-cache bash curl

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Install production dependencies only
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy corpus: rulesets + reference (built from monorepo root context)
COPY rulesets/ ./corpus/rulesets/
COPY reference/ ./corpus/reference/

# Create non-root user
RUN addgroup -g 1001 -S evolith && \
    adduser -S evolith -u 1001 -G evolith && \
    chown -R evolith:evolith /app

USER evolith

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV WORKSPACE_ROOT=/app/corpus
ENV CORE_PATH=/app/corpus
ENV EVOLITH_LOG_LEVEL=info

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/main"]
