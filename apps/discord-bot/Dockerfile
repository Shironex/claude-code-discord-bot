# Production Dockerfile for Discord Bot
# Build from monorepo root: docker build -f apps/discord-bot/Dockerfile -t claude-discord-bot .
# Optimized for Coolify.io deployment platform

# ============================================
# Base Stage
# ============================================
FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm@latest

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# ============================================
# Build Stage
# ============================================
FROM base AS build

# Copy shared packages
COPY packages/ ./packages/

# Copy Discord bot source
COPY apps/discord-bot/ ./apps/discord-bot/

# Install all dependencies (including dev dependencies for building)
RUN pnpm install --frozen-lockfile

# Build shared packages first
RUN pnpm --filter @claude-code/shared build

# Build the Discord bot application
RUN pnpm --filter @claude-code/discord-bot build

# ============================================
# Production Stage
# ============================================
FROM node:20-alpine AS production

# Install pnpm globally
RUN npm install -g pnpm@latest

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S discordbot -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy built packages
COPY --from=build --chown=discordbot:nodejs /app/packages/ ./packages/
COPY --from=build --chown=discordbot:nodejs /app/apps/discord-bot/dist ./apps/discord-bot/dist
COPY --from=build --chown=discordbot:nodejs /app/apps/discord-bot/package.json ./apps/discord-bot/

# Install only production dependencies (skip scripts like husky prepare)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Create logs directory
RUN mkdir -p logs && chown -R discordbot:nodejs logs

# Switch to non-root user
USER discordbot

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["node", "apps/discord-bot/dist/main.js"]