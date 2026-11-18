# ==========================================
# SurplusLink Backend Multi-Stage Dockerfile
# ==========================================

# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies required for building
COPY package*.json ./
RUN npm ci

# Copy source code and build config
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to JavaScript and copy migrations
RUN npm run build

# Stage 2: Production runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install curl for health check
RUN apk add --no-cache curl

# Copy package manifests and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built JavaScript and migrations from builder stage
COPY --from=builder /app/dist ./dist

# Create logs directory and assign permissions to non-root user
RUN mkdir -p logs && chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "dist/server.js"]

