# Production Dockerfile for Image Service
# Build from monorepo root: docker build -f apps/image-service/Dockerfile -t claude-image-service .
FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Build stage
FROM base AS build

# Copy shared packages
COPY packages/ ./packages/

# Copy image service source
COPY apps/image-service/ ./apps/image-service/

# Install all dependencies (including dev dependencies for building)
RUN pnpm install --frozen-lockfile

# Build shared packages first
RUN pnpm --filter @claude-code/shared build

# Build the image service
RUN pnpm --filter @claude-code/image-service build

# Production stage
FROM node:20-alpine AS production

# Install pnpm globally
RUN npm install -g pnpm@latest

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S imageservice -u 1001

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy built packages
COPY --from=build --chown=imageservice:nodejs /app/packages/ ./packages/
COPY --from=build --chown=imageservice:nodejs /app/apps/image-service/dist ./apps/image-service/dist
COPY --from=build --chown=imageservice:nodejs /app/apps/image-service/package.json ./apps/image-service/

# Install only production dependencies (skip scripts like husky prepare)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Create logs directory
RUN mkdir -p logs && chown -R imageservice:nodejs logs

# Switch to non-root user
USER imageservice

# Expose port
EXPOSE 3001

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["node", "apps/image-service/dist/main.js"]