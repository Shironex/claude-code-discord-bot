# Deployment Documentation

Guides for deploying and running the applications in production environments.

## Deployment Guides

- **[Docker](./docker.md)** - Docker configuration, containerization, and deployment
- **[GitHub Runners](./github-runners.md)** - Self-hosted GitHub Actions runner setup
- **[Production](./production.md)** - Production deployment guide and best practices

## Quick Deployment Options

### Docker Deployment
```bash
# Discord Bot
cd apps/discord-bot
docker build -t claude-discord-bot .
docker run -d -e DISCORD_TOKEN="token" -e GITHUB_TOKEN="token" claude-discord-bot

# Image Service
cd apps/image-service
docker-compose -f docker-compose.dev.yml up -d
```

### GitHub Self-Hosted Runner
```bash
cd runners/github-actions
cp .env.example .env  # Configure tokens
docker-compose up -d
```

## Production Considerations

- Environment variable security
- Health checks and monitoring
- Resource limits and scaling
- Backup and recovery strategies
- SSL/TLS configuration

## Related Documentation

- [Configuration](../configuration/) - Environment variables and setup
- [Architecture](../architecture/) - System requirements and dependencies
- [Troubleshooting](../workflows/troubleshooting.md) - Common deployment issues

[← Back to Documentation](../README.md)