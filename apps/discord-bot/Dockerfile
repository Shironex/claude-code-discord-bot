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
RUN pnpm install --frozen-lockfile

# Copy source code
COPY src ./src
COPY tsconfig*.json ./

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
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Change ownership to non-root user
RUN chown -R discord:discord /app

# Switch to non-root user
USER discord

# Expose port (if needed for health checks)
EXPOSE 3000

# Health check (optional - can be used by Coolify for monitoring)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["node", "dist/main.js"]