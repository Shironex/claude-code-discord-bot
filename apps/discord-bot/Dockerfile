# Standalone Docker build for Discord Bot
# Build from apps/discord-bot directory: docker build -t claude-discord-bot .
# Optimized for Coolify.io deployment platform

# ============================================
# Build Stage
# ============================================
FROM node:20-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm@latest

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install all dependencies (including dev dependencies for build)
# Note: Using --no-frozen-lockfile as this is a standalone build without pnpm-lock.yaml
RUN pnpm install --no-frozen-lockfile

# Copy source code and TypeScript configuration
COPY src ./src
COPY tsconfig.json tsconfig.build.json ./

# Build the Discord bot application
RUN pnpm build

# ============================================
# Production Stage
# ============================================
FROM node:20-alpine AS production

# Install pnpm globally
RUN npm install -g pnpm@latest

# Create non-root user for security
RUN addgroup -g 1001 -S discord && \
    adduser -S discord -u 1001

# Set working directory
WORKDIR /app

# Copy package.json and install only production dependencies
COPY package.json ./
RUN pnpm install --no-frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Change ownership to non-root user
RUN chown -R discord:discord /app

# Switch to non-root user
USER discord

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/main.js"]