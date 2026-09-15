# ---------------------------------------------------------
# Evolith Reference Architecture
# BFF (Backend-For-Frontend) Dockerfile Template (NestJS)
# ---------------------------------------------------------

# Stage 1: Dependencies and Build
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS builder
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production Dependencies
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 3: Runtime
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS runtime
WORKDIR /app

# Standard Evolith security rules: do not run as root
RUN addgroup -g 1001 -S evolith && \
    adduser -u 1001 -S evolith -G evolith

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Port that Traefik will route to
EXPOSE 3000

USER evolith

# Run the NestJS BFF
CMD ["node", "dist/main"]
