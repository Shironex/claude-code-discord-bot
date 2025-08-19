# Deployment Guide

This guide covers deploying the Claude Code Discord Bot to production environments and setting up GitHub self-hosted runners for Claude workflows.

## Table of Contents

- [Discord Bot Deployment](#discord-bot-deployment)
  - [Coolify Deployment](#coolify-deployment)
  - [Environment Variables](#environment-variables)
  - [Local Docker Testing](#local-docker-testing)
- [GitHub Self-Hosted Runner](#github-self-hosted-runner)
  - [Setup Requirements](#setup-requirements)
  - [Deployment Steps](#deployment-steps)
  - [Configuration](#configuration)
- [Security Considerations](#security-considerations)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)

## Discord Bot Deployment

### Coolify Deployment

[Coolify](https://coolify.io) is a self-hostable cloud platform that simplifies application deployment. The bot includes optimized Docker configuration for Coolify deployment.

#### Prerequisites

1. **Coolify Instance**: A running Coolify installation on your VPS
2. **Discord Bot Token**: From [Discord Developer Portal](https://discord.com/developers/applications)
3. **GitHub Token**: Personal access token with repository permissions

#### Deployment Steps

1. **Create New Project in Coolify**
   - Navigate to your Coolify dashboard
   - Create a new project
   - Choose "Deploy from Git Repository"

2. **Repository Configuration**
   - Repository URL: `https://github.com/your-username/claude-code-discord-bot`
   - Branch: `main` or your production branch
   - Build Pack: Docker
   - Dockerfile location: `apps/discord-bot/Dockerfile`

3. **Environment Variables Setup**
   
   Configure these in Coolify's environment section:
   
   ```bash
   # Discord Configuration
   DISCORD_TOKEN=your_discord_bot_token
   DEV_GUILD=your_development_guild_id  # Optional
   
   # GitHub Integration
   GITHUB_TOKEN=your_github_personal_access_token
   
   # Application Environment
   NODE_ENV=production
   PORT=3000
   ```

4. **Resource Allocation**
   - **Minimum**: 256MB RAM, 0.25 CPU
   - **Recommended**: 512MB RAM, 1 CPU
   - **Storage**: 1GB for logs and temporary files

5. **Health Checks**
   Coolify will automatically use the health check defined in the Dockerfile:
   ```yaml
   healthcheck:
     test: ["CMD", "node", "-e", "console.log('Health check passed')"]
     interval: 30s
     timeout: 10s
     retries: 3
   ```

#### Using Docker Compose (Alternative)

If you prefer using the provided docker-compose configuration:

```bash
# Copy the compose file
cp docker-compose.coolify.yml docker-compose.yml

# Set environment variables in Coolify or create .env file
# Deploy using Coolify's Docker Compose option
```

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DISCORD_TOKEN` | ✅ | Bot token from Discord Developer Portal | `MTIzNDU2...` |
| `GITHUB_TOKEN` | ✅ | GitHub PAT with repo access | `ghp_1234...` |
| `DEV_GUILD` | ❌ | Development guild ID for testing | `123456789012345678` |
| `NODE_ENV` | ❌ | Node.js environment | `production` |
| `PORT` | ❌ | Application port | `3000` |

#### GitHub Token Permissions

Your GitHub token must have these scopes:
- `repo` - Full repository access (for private repos)
- `public_repo` - Public repository access
- `actions:write` - Required for dispatching workflows
- `admin:repo_hook` - For self-hosted runner registration (if using runners)

### Local Docker Testing

Before deploying to Coolify, test locally:

```bash
# Build the Docker image
cd apps/discord-bot
docker build -t claude-discord-bot .

# Run with environment variables
docker run -d \
  --name claude-discord-bot \
  -e DISCORD_TOKEN="your_token" \
  -e GITHUB_TOKEN="your_github_token" \
  claude-discord-bot

# Check logs
docker logs claude-discord-bot

# Stop and cleanup
docker stop claude-discord-bot
docker rm claude-discord-bot

# Interactive shell for debugging
docker exec -it claude-discord-bot sh
```

## GitHub Self-Hosted Runner

Self-hosted runners allow you to execute Claude Code workflows on your own infrastructure, providing better control and potentially faster execution.

### Setup Requirements

1. **Docker Environment**: Docker and Docker Compose installed
2. **GitHub Repository Access**: Repository where runners will be registered
3. **GitHub Token**: With `repo` and `admin:repo_hook` permissions
4. **System Resources**: Minimum 1GB RAM, 2GB recommended

### Deployment Steps

1. **Navigate to Runner Directory**
   ```bash
   cd runners/github-actions
   ```

2. **Configure Environment**
   
   Create `.env` file:
   ```bash
   # GitHub Configuration
   GITHUB_TOKEN=your_github_token_with_admin_permissions
   GITHUB_REPOSITORY=your-username/your-repository
   
   # Optional Runner Configuration
   RUNNER_NAME=claude-runner-prod
   RUNNER_LABELS=self-hosted,claude-workflows,docker,production
   RUNNER_GROUP=default
   ```

3. **Deploy with Docker Compose**
   ```bash
   # Build and start the runner
   docker-compose up -d
   
   # Check status
   docker-compose ps
   
   # View logs
   docker-compose logs -f
   ```

4. **Verify Registration**
   
   Check your GitHub repository settings:
   - Go to `Settings` > `Actions` > `Runners`
   - You should see your runner listed and online

### Configuration

#### Runner Labels

The runner is configured with these labels by default:
- `self-hosted` - Standard GitHub label
- `claude-workflows` - Identifies Claude-capable runners
- `docker` - Indicates Docker support

Add custom labels in your `.env`:
```bash
RUNNER_LABELS=self-hosted,claude-workflows,docker,production,linux
```

#### Resource Limits

Adjust resource limits in `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '4.0'      # Increase for better performance
      memory: 4G       # Increase for large repositories
    reservations:
      cpus: '1.0'
      memory: 1G
```

#### Persistent Storage

The runner uses volumes for persistent data:
- `runner_work` - Workflow execution workspace
- `runner_config` - Runner configuration and state

#### Multiple Runners

To run multiple runners, create separate compose files:

```bash
# Copy the compose file
cp docker-compose.yml docker-compose.runner2.yml

# Modify container name and runner name in the copy
# Deploy multiple runners
docker-compose -f docker-compose.yml up -d
docker-compose -f docker-compose.runner2.yml up -d
```

## Security Considerations

### Discord Bot Security

1. **Token Management**
   - Never commit tokens to version control
   - Use environment variables or secure secret management
   - Rotate tokens regularly
   - Limit bot permissions to minimum required

2. **Network Security**
   - Run containers with non-root users (already configured)
   - Use read-only filesystems when possible
   - Limit network access to required services only

3. **Resource Limits**
   - Set appropriate CPU and memory limits
   - Monitor resource usage
   - Implement rate limiting for bot commands

### GitHub Runner Security

1. **Token Permissions**
   - Use tokens with minimal required permissions
   - Consider using GitHub App tokens instead of PATs
   - Regular token rotation

2. **Workflow Security**
   - Review Claude workflow templates carefully
   - Avoid Docker-in-Docker unless absolutely necessary
   - Monitor runner activity and logs

3. **Network Isolation**
   - Run runners in isolated networks
   - Restrict outbound connections if possible
   - Use firewalls to limit access

## Monitoring & Logging

### Discord Bot Monitoring

1. **Health Checks**
   - Coolify automatically monitors health endpoints
   - Set up alerts for failed health checks
   - Monitor Discord API rate limits

2. **Logging**
   - Logs are automatically captured by Docker
   - Coolify provides log viewing interface
   - Consider external log aggregation for production

3. **Metrics**
   - Monitor memory usage and CPU
   - Track bot command usage
   - Monitor GitHub API usage

### Runner Monitoring

1. **Runner Status**
   - Check runner status in GitHub repository settings
   - Monitor runner uptime and availability
   - Set up alerts for offline runners

2. **Resource Monitoring**
   - Monitor CPU and memory usage during workflow execution
   - Track disk usage in work directories
   - Monitor Docker daemon health

3. **Workflow Monitoring**
   - Track workflow execution times
   - Monitor success/failure rates
   - Set up notifications for failed workflows

## Troubleshooting

### Common Discord Bot Issues

#### Bot Not Starting
```bash
# Check logs
docker logs claude-discord-bot

# Common causes:
# - Invalid Discord token
# - Missing environment variables
# - Network connectivity issues
```

#### Commands Not Responding
```bash
# Check bot permissions in Discord
# Verify guild ID configuration
# Check GitHub token permissions
```

#### GitHub API Errors
```bash
# Verify GitHub token permissions
# Check API rate limits
# Ensure repository access
```

### Common Runner Issues

#### Runner Not Registering
```bash
# Check logs
docker-compose logs github-runner

# Common causes:
# - Invalid GitHub token
# - Incorrect repository format
# - Network connectivity to GitHub
# - Insufficient token permissions
```

#### Runner Offline
```bash
# Check container status
docker-compose ps

# Restart runner
docker-compose restart github-runner

# Check GitHub runner status in repository settings
```

#### Workflow Failures
```bash
# Check workflow logs in GitHub Actions
# Verify Claude workflow templates exist
# Check runner labels match workflow requirements
```

### Debug Commands

```bash
# Discord Bot Debug
docker exec -it claude-discord-bot sh
npm run typecheck
npm run lint

# Runner Debug
docker exec -it claude-github-runner bash
./config.sh --help
ps aux | grep Runner
```

### Getting Help

1. **Check Logs First**
   - Application logs contain detailed error information
   - Docker daemon logs for container issues

2. **GitHub Issues**
   - Report issues to the project repository
   - Include logs and configuration details

3. **Discord/Coolify Support**
   - Coolify community for platform-specific issues
   - Discord developer docs for bot-related questions

## Performance Optimization

### Discord Bot Optimization

1. **Memory Usage**
   - Monitor memory consumption
   - Adjust container limits based on usage
   - Implement session cleanup

2. **Response Times**
   - Optimize GitHub API calls
   - Implement caching where appropriate
   - Use connection pooling

### Runner Optimization

1. **Build Performance**
   - Use Docker build cache
   - Optimize Dockerfile layers
   - Pre-install common dependencies

2. **Execution Performance**
   - Allocate sufficient resources
   - Use SSD storage for work directories
   - Monitor workflow execution times

## Backup and Recovery

### Configuration Backup
```bash
# Backup environment configuration
cp .env .env.backup

# Backup Docker compose files
cp docker-compose*.yml backup/
```

### Data Recovery
```bash
# Restore from backup
cp .env.backup .env

# Restart services
docker-compose down
docker-compose up -d
```

---

For additional help or questions, please refer to the main [CLAUDE.md](../../CLAUDE.md) file or create an issue in the project repository.