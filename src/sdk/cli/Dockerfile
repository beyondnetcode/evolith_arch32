# Evolith CLI Dockerfile
# Multi-stage build for minimal image size

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source code and assets
COPY src/ ./src/
COPY shell/ ./shell/
COPY templates/ ./templates/

# Build TypeScript
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runtime

LABEL org.opencontainers.image.title="Evolith Smart CLI"
LABEL org.opencontainers.image.description="Evolith Smart CLI - Governance, standards validation, and AI agent integration"
LABEL org.opencontainers.image.version="1.1.0"
LABEL org.opencontainers.image.authors="Beyondnet"
LABEL org.opencontainers.image.source="https://github.com/beyondnetcode/evolith_arch32"

# Install runtime dependencies
RUN apk add --no-cache bash curl

WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shell ./shell
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user for security
RUN addgroup -g 1001 -S evolith && \
    adduser -S evolith -u 1001 -G evolith
USER evolith

# Environment variables
ENV EVOLITH_CONFIG_PATH=/home/evolith/.evolith
ENV EVOLITH_LOG_LEVEL=info

# Expose port for HTTP MCP (optional)
EXPOSE 3000

# Default command - MCP server in HTTP mode
CMD ["node", "dist/main.js", "mcp", "serve", "--transport", "http"]

# Alternative commands for different modes:
# stdio mode (default): node dist/main.js mcp serve
# HTTP mode: node dist/main.js mcp serve --transport http --port 3000
# CLI mode: node dist/main.js validate