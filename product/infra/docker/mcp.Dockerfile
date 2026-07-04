# ---------------------------------------------------------
# Evolith Reference Architecture
# MCP Server Dockerfile Template (HTTP/SSE Mode)
# ---------------------------------------------------------

FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
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
