# Environment Variables

Complete environment variable reference for all applications.

## Discord Bot Environment

**File**: `apps/discord-bot/.env`

### Required Variables
```bash
# Discord Configuration
DISCORD_TOKEN="your_discord_bot_token"
GITHUB_TOKEN="your_github_personal_access_token"
```

### Optional Variables
```bash
# Development Settings
DEV_GUILD="your_development_guild_id"          # Discord guild for development
LOG_LEVEL="debug"                              # Logging level
NODE_ENV="development"                         # Environment mode

# Logger Configuration
ENABLE_FILE_LOGS="true"                       # Enable file logging
MEMORY_WARNING_THRESHOLD="90"                 # Memory warning threshold
MEMORY_DEBUG_THRESHOLD="75"                   # Memory debug threshold
MEMORY_CHECK_INTERVAL="30000"                 # Memory check interval (ms)

# Image Service Integration
IMAGE_SERVICE_URL="http://localhost:3001"      # Image service endpoint
IMAGE_SERVICE_API_KEY="your_api_key"          # Image service API key
IMAGE_SERVICE_SECRET_KEY="your_secret_key"    # Image service secret key
```

## Image Service Environment

**File**: `apps/image-service/.env`

### Required Variables
```bash
# Service Configuration
PORT="3001"                                   # Service port
NODE_ENV="production"                         # Environment mode

# Security
API_KEY="generated-api-key"                   # API authentication key
SECRET_KEY="generated-secret-key"             # HMAC signature secret
```

### Optional Variables
```bash
# Redis Configuration
REDIS_HOST="localhost"                        # Redis server host
REDIS_PORT="6379"                             # Redis server port
REDIS_PASSWORD=""                             # Redis authentication
REDIS_DB="0"                                  # Redis database number

# Storage Configuration
UPLOAD_PATH="./uploads"                       # File storage directory
MAX_FILE_SIZE="10485760"                      # Maximum file size (10MB)
DEFAULT_TTL="3600"                           # Default file TTL (1 hour)

# Cleanup Configuration
CLEANUP_INTERVAL="300"                        # Cleanup check interval (5 min)
CLEANUP_BATCH_SIZE="100"                      # Files processed per cleanup

# Logging
LOG_LEVEL="info"                              # Logging level
ENABLE_REQUEST_LOGGING="true"                 # Log HTTP requests
LOG_DIRECTORY="./logs"                        # Log file directory

# CORS Configuration
CORS_ORIGIN="*"                               # CORS allowed origins
CORS_METHODS="GET,POST,DELETE"                # CORS allowed methods

# Rate Limiting
RATE_LIMIT_WINDOW="900000"                    # Rate limit window (15 min)
RATE_LIMIT_MAX_REQUESTS="100"                 # Max requests per window
```

## GitHub Actions Runner Environment

**File**: `runners/github-actions/.env`

### Required Variables
```bash
GITHUB_TOKEN="ghp_your_personal_access_token"
GITHUB_REPOSITORY="owner/repository-name"
RUNNER_NAME="claude-runner-01"
```

### Optional Variables
```bash
RUNNER_LABELS="claude-code,self-hosted"
RUNNER_WORKDIR="/actions-runner/_work"
RUNNER_GROUP="default"
RUNNER_REPLACE_EXISTING="true"
```

## Production Environment Variables

### Security Best Practices
```bash
# Use strong, generated keys
API_KEY="$(openssl rand -hex 32)"
SECRET_KEY="$(openssl rand -hex 32)"

# Production logging
LOG_LEVEL="info"
NODE_ENV="production"

# Resource limits
MAX_FILE_SIZE="10485760"                      # 10MB limit
RATE_LIMIT_MAX_REQUESTS="100"                 # Rate limiting

# Monitoring
MEMORY_WARNING_THRESHOLD="85"                 # Lower threshold for production
ENABLE_REQUEST_LOGGING="true"                 # Request logging for monitoring
```

### Environment-Specific Values
```bash
# Development
LOG_LEVEL="debug"
NODE_ENV="development"
CORS_ORIGIN="*"

# Staging
LOG_LEVEL="info"
NODE_ENV="staging"
CORS_ORIGIN="https://staging.yourdomain.com"

# Production
LOG_LEVEL="warn"
NODE_ENV="production"
CORS_ORIGIN="https://yourdomain.com"
```

## Variable Validation

### Discord Bot Validation
The application validates required environment variables at startup:

```typescript
if (!process.env.DISCORD_TOKEN) {
  throw new Error('DISCORD_TOKEN is required');
}

if (!process.env.GITHUB_TOKEN) {
  throw new Error('GITHUB_TOKEN is required');
}
```

### Image Service Validation
```typescript
if (!process.env.API_KEY) {
  throw new Error('API_KEY is required');
}

if (!process.env.SECRET_KEY) {
  throw new Error('SECRET_KEY is required');
}
```

## Environment Templates

### Discord Bot Template
```bash
# apps/discord-bot/.env.example
# Discord Configuration (Required)
DISCORD_TOKEN="your_discord_bot_token_here"
GITHUB_TOKEN="your_github_personal_access_token_here"

# Development Settings (Optional)
DEV_GUILD="your_development_guild_id_here"
LOG_LEVEL="debug"
NODE_ENV="development"

# Image Service Integration (Optional)
IMAGE_SERVICE_URL="http://localhost:3001"
# Get these from image service setup
IMAGE_SERVICE_API_KEY=""
IMAGE_SERVICE_SECRET_KEY=""
```

### Image Service Template
```bash
# apps/image-service/.env.example
# Service Configuration (Required)
PORT="3001"
NODE_ENV="development"

# Security (Required - Generate with scripts/generate-keys.sh)
API_KEY=""
SECRET_KEY=""

# Redis Configuration (Optional)
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

# Storage Configuration (Optional)
UPLOAD_PATH="./uploads"
MAX_FILE_SIZE="10485760"
DEFAULT_TTL="3600"
```

## Environment Setup Commands

### Initial Setup
```bash
# Copy templates
cp apps/discord-bot/.env.example apps/discord-bot/.env
cp apps/image-service/.env.example apps/image-service/.env

# Generate image service keys
cd apps/image-service
bash scripts/generate-keys.sh
```

### Validation Commands
```bash
# Check environment variables
node -e "console.log(process.env.DISCORD_TOKEN ? 'Discord token set' : 'Discord token missing')"
node -e "console.log(process.env.GITHUB_TOKEN ? 'GitHub token set' : 'GitHub token missing')"

# Test configuration
pnpm build
pnpm typecheck
```

## Related Documentation

- [GitHub Permissions](./github-permissions.md) - Token scope requirements
- [Getting Started](../development/getting-started.md) - Initial setup
- [Deployment](../deployment/) - Production configuration

[← Back to Configuration](./README.md)