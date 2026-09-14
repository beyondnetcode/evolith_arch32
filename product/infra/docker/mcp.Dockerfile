# ---------------------------------------------------------
# Evolith Reference Architecture
# MCP Server Dockerfile Template (HTTP/SSE Mode)
# ---------------------------------------------------------

FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS runtime
WORKDIR /app

RUN addgroup -g 1001 -S evolith && \
    adduser -u 1001 -S evolith -G evolith

COPY --from=builder /app/package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

# MCP SSE Transport typically exposes an HTTP port
EXPOSE 3001

USER evolith

# Run the MCP Server
CMD ["node", "dist/index.js"]
