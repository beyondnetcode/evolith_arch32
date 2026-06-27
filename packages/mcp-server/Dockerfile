FROM node:20-alpine AS builder

WORKDIR /app

COPY packages/mcp-server/package.json packages/mcp-server/package-lock.json ./
COPY packages/mcp-server/tsconfig*.json ./

RUN npm ci --legacy-peer-deps

COPY packages/mcp-server/src/ ./src/

RUN npx tsc -p tsconfig.prod.json

# ── Runner ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="Evolith MCP Server"
LABEL org.opencontainers.image.source="https://github.com/beyondnetcode/evolith_arch32"

RUN apk add --no-cache curl

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force && rm package-lock.json

COPY rulesets/ ./corpus/rulesets/

RUN addgroup -g 1001 -S evolith && \
    adduser -S evolith -u 1001 -G evolith && \
    chown -R evolith:evolith /app

USER evolith

ENV NODE_ENV=production
ENV PORT=3000
ENV TRANSPORT=sse
ENV WORKSPACE_ROOT=/app/corpus
ENV CORE_PATH=/app/corpus
ENV EVOLITH_LOG_LEVEL=info
ENV EVOLITH_MCP_ALLOW_NO_AUTH=false

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main", "serve", "--transport", "sse", "--port", "3000"]
