# Docker Configuration

Docker configuration, containerization, and deployment setup for all applications.

## Discord Bot Docker Setup

### Production Dockerfile
**Location**: `apps/discord-bot/Dockerfile`

- **Multi-stage build** with optimized layers
- **Security**: Non-root user, health checks, and resource limits
- **Optimization**: Minimal production image with only runtime dependencies

### Quick Deployment Commands
```bash
# Local Docker testing
cd apps/discord-bot
docker build -t claude-discord-bot .
docker run -d \
  -e DISCORD_TOKEN="your_discord_token" \
  -e GITHUB_TOKEN="your_github_token" \
  claude-discord-bot

# Production deployment with Docker Compose
docker-compose -f docker-compose.coolify.yml up -d
```

## Image Service Docker Setup

### Development Environment
```bash
cd apps/image-service

# Start with Docker Compose
docker-compose -f docker-compose.dev.yml up

# Generate API keys
bash scripts/generate-keys.sh
```

### Production Build
```bash
# Build production image
docker build -t claude-image-service .

# Run container
docker run -d \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e API_KEY="your_api_key" \
  -e SECRET_KEY="your_secret_key" \
  claude-image-service
```

## Multi-Service Deployment

### Docker Compose Setup
```yaml
# docker-compose.yml
version: '3.8'
services:
  discord-bot:
    build: ./apps/discord-bot
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - IMAGE_SERVICE_URL=http://image-service:3001
    depends_on:
      - image-service
      - redis
  
  image-service:
    build: ./apps/image-service
    environment:
      - NODE_ENV=production
      - API_KEY=${IMAGE_API_KEY}
      - SECRET_KEY=${IMAGE_SECRET_KEY}
      - REDIS_HOST=redis
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - redis
  
  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

## Production Considerations

### Security
- **Environment Variables**: Use secrets management for sensitive data
- **Network Security**: Implement proper network segmentation
- **Image Security**: Regular security scanning and updates
- **Access Control**: Restrict container permissions

### Performance
- **Resource Limits**: Set appropriate CPU and memory limits
- **Health Checks**: Implement container health monitoring
- **Logging**: Centralized logging configuration
- **Monitoring**: Container metrics and alerting

### Scalability
- **Load Balancing**: Multiple container instances
- **Database**: External database for production
- **Storage**: Persistent volumes for data
- **Caching**: Redis clustering for high availability

## Related Documentation

- [Production Deployment](./production.md) - Complete deployment guide
- [GitHub Runners](./github-runners.md) - Runner containerization
- [Configuration](../configuration/environment-vars.md) - Environment setup

[← Back to Deployment](./README.md)