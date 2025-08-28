# Development Commands

Comprehensive reference for all development commands in the monorepo.

## Core Development Commands

### Development Server
```bash
# Start Discord bot in watch mode (primary development)
pnpm dev

# Start specific application only
pnpm dev --filter=@claude-code/discord-bot
pnpm dev --filter=@claude-code/image-service
pnpm dev --filter=@claude-code/shared
```

### Build Commands
```bash
# Build all packages and applications
pnpm build

# Build specific application
pnpm build --filter=@claude-code/discord-bot
pnpm build --filter=@claude-code/image-service
pnpm build --filter=@claude-code/shared

# Build with dependencies
pnpm build --filter=@claude-code/discord-bot...
```

### Package Management
```bash
# Install all workspace dependencies
pnpm install

# Add dependency to specific package
pnpm add package-name --filter=@claude-code/discord-bot
pnpm add -D dev-package --filter=@claude-code/shared

# Update dependencies
pnpm update
pnpm update --filter=@claude-code/discord-bot
```

## Quality Assurance Commands

### Linting and Formatting
```bash
# Run ESLint on all packages (with auto-fix)
pnpm lint

# Lint specific package
pnpm lint --filter=@claude-code/discord-bot

# Format code with Prettier
pnpm format

# Check formatting without fixing
pnpm format:check
```

### Type Checking
```bash
# Run TypeScript type checking on all packages
pnpm typecheck

# Type check specific package
pnpm typecheck --filter=@claude-code/discord-bot

# Watch mode for type checking
pnpm typecheck --watch
```

### Combined Quality Checks
```bash
# Run all quality checks in sequence
pnpm lint && pnpm typecheck && pnpm build

# Parallel quality checks (faster)
pnpm run -r lint & pnpm run -r typecheck & wait
```

## Testing Commands

### Unit Testing
```bash
# Run tests for all packages
pnpm test

# Run tests for specific package
pnpm test --filter=@claude-code/shared
pnpm test --filter=@claude-code/image-service

# Watch mode for tests
pnpm test --watch

# Coverage report
pnpm test --coverage
```

### Integration Testing
```bash
# Run integration tests
pnpm test:integration

# E2E testing
pnpm test:e2e --filter=@claude-code/image-service
```

## Release Management Commands

### Changeset Workflow
```bash
# Create a new changeset
pnpm changeset

# Check changeset status
pnpm changeset:status

# Version packages (CI only)
pnpm version

# Publish packages (CI only)
pnpm release
```

### Validation Commands
```bash
# Test commit message format
pnpm lint:commit

# Check version status for CI
pnpm ci:version-check
```

## Docker Commands

### Discord Bot
```bash
# Build Docker image
cd apps/discord-bot
docker build -t claude-discord-bot .

# Run container
docker run -d \
  -e DISCORD_TOKEN="your_token" \
  -e GITHUB_TOKEN="your_token" \
  claude-discord-bot
```

### Image Service
```bash
# Development environment
cd apps/image-service
docker-compose -f docker-compose.dev.yml up

# Generate API keys
bash scripts/generate-keys.sh

# Build production image
docker build -t claude-image-service .
```

### GitHub Actions Runner
```bash
cd runners/github-actions
cp .env.example .env  # Configure first
docker-compose up -d
```

## Turborepo Commands

### Pipeline Execution
```bash
# Run build pipeline with caching
turbo run build

# Run with force (no cache)
turbo run build --force

# Show dependency graph
turbo run build --graph

# Parallel execution
turbo run lint typecheck --parallel
```

### Cache Management
```bash
# Clear local cache
turbo prune

# Enable remote caching (if configured)
turbo run build --api="https://your-cache-endpoint"
```

## Workspace Commands

### Dependency Management
```bash
# Show workspace dependencies
pnpm list --depth=0

# Show specific package dependencies
pnpm list --filter=@claude-code/discord-bot

# Audit dependencies
pnpm audit

# Update all dependencies
pnpm up -r
```

### Package Operations
```bash
# Add new workspace package
mkdir packages/new-package
cd packages/new-package
pnpm init

# Run command in all workspaces
pnpm run -r build

# Run command in filtered workspaces
pnpm run --filter=\"./apps/*\" build
```

## Debugging Commands

### Logging and Monitoring
```bash
# Start with debug logging
LOG_LEVEL=debug pnpm dev

# Monitor log files
tail -f apps/discord-bot/logs/combined.log
tail -f apps/discord-bot/logs/services/GitHubService.log

# Memory monitoring
node --inspect apps/discord-bot/dist/main.js
```

### Development Tools
```bash
# Start with Node.js inspector
node --inspect-brk apps/discord-bot/dist/main.js

# Profile performance
node --prof apps/discord-bot/dist/main.js

# Analyze heap usage
node --max_old_space_size=2048 apps/discord-bot/dist/main.js
```

## Utility Commands

### File Operations
```bash
# Clean build artifacts
pnpm clean
rm -rf apps/*/dist packages/*/dist

# Clean node_modules
pnpm clean:deps
rm -rf node_modules apps/*/node_modules packages/*/node_modules

# Reset to clean state
pnpm clean && pnpm clean:deps && pnpm install
```

### Development Utilities
```bash
# Generate API documentation (if configured)
pnpm docs:generate

# Start documentation server
pnpm docs:serve

# Generate TypeScript declarations
pnpm types:generate
```

## Environment-Specific Commands

### Development Environment
```bash
NODE_ENV=development pnpm dev
DISCORD_TOKEN=dev_token pnpm dev --filter=@claude-code/discord-bot
```

### Production Environment
```bash
NODE_ENV=production pnpm build
NODE_ENV=production pnpm start --filter=@claude-code/discord-bot
```

### Testing Environment
```bash
NODE_ENV=test pnpm test
CI=true pnpm test --coverage
```

## Performance Commands

### Bundle Analysis
```bash
# Analyze bundle size (if configured)
pnpm analyze

# Build performance metrics
time pnpm build

# Memory usage during build
/usr/bin/time -v pnpm build
```

### Optimization
```bash
# Optimize dependencies
pnpm dedupe

# Clean and reinstall for optimization
rm -rf node_modules && pnpm install --frozen-lockfile
```

## Troubleshooting Commands

### Common Fixes
```bash
# Fix dependency issues
rm -rf node_modules pnpm-lock.yaml && pnpm install

# Fix TypeScript issues
pnpm build --filter=@claude-code/shared && pnpm typecheck

# Fix linting issues
pnpm lint --fix

# Reset Git hooks
rm -rf .husky && pnpm prepare
```

### Diagnostic Commands
```bash
# Check pnpm configuration
pnpm config list

# Check workspace setup
pnpm list --depth=0

# Check Node.js and pnpm versions
node --version && pnpm --version
```

## Related Documentation

- [Getting Started](./getting-started.md) - Initial setup
- [Development Patterns](./patterns.md) - Code patterns
- [Code Standards](./code-standards.md) - Quality requirements
- [Troubleshooting](../workflows/troubleshooting.md) - Common issues

[← Back to Development](./README.md)