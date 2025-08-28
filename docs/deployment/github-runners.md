# GitHub Self-Hosted Runners

Self-hosted GitHub Actions runner setup for executing Claude workflows on your own infrastructure.

## Runner Configuration

**Location**: `runners/github-actions/`

### Features
- **Runner Dockerfile**: Ubuntu-based with Node.js, pnpm, and GitHub CLI
- **Auto-Registration**: Automatic runner registration with GitHub
- **Docker Compose**: Complete runner setup
- **Template Support**: Compatible with Claude workflow templates

## Quick Setup

```bash
# Configure environment
cd runners/github-actions
cp .env.example .env  # Edit with your tokens and repository

# Deploy runner
docker-compose up -d

# Verify registration in GitHub repository settings
```

## Environment Configuration

### Required Variables
```bash
# .env file
GITHUB_TOKEN="ghp_your_personal_access_token"
GITHUB_REPOSITORY="owner/repository-name"
RUNNER_NAME="claude-runner-01"
RUNNER_LABELS="claude-code,self-hosted"
```

### Optional Settings
```bash
RUNNER_WORKDIR="/actions-runner/_work"
RUNNER_GROUP="default"
RUNNER_REPLACE_EXISTING="true"
```

## Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'
services:
  github-runner:
    build: .
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - GITHUB_REPOSITORY=${GITHUB_REPOSITORY}
      - RUNNER_NAME=${RUNNER_NAME}
      - RUNNER_LABELS=${RUNNER_LABELS}
    volumes:
      - runner_data:/actions-runner
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped

volumes:
  runner_data:
```

## Automatic Registration

The runner automatically:
1. Downloads GitHub Actions runner binary
2. Registers with your repository
3. Starts listening for workflow jobs
4. Handles cleanup on container stop

## Workflow Compatibility

### Claude Workflow Templates
The runner supports all Claude workflow templates:
- `claude-workflow-self-hosted.yml`
- `claude-workflow-single-step.yml`
- `claude-workflow-two-step.yml`

### Required Labels
```yaml
# Use in workflow files
runs-on: [self-hosted, claude-code]
```

## Security Considerations

### Token Permissions
GitHub token requires:
- `repo` - Repository access
- `admin:org` - Runner registration (if organization)
- `workflow` - Workflow access

### Container Security
- **Isolated Environment**: Container isolation
- **Docker Socket**: Careful Docker access management
- **Network Security**: Restrict network access
- **Regular Updates**: Keep runner image updated

## Monitoring and Maintenance

### Health Checks
```bash
# Check runner status
docker-compose ps

# View runner logs
docker-compose logs -f github-runner

# Restart runner
docker-compose restart github-runner
```

### Troubleshooting
```bash
# Manual registration check
docker-compose exec github-runner ./config.sh --check

# Force re-registration
docker-compose down
docker-compose up -d
```

## Scaling Runners

### Multiple Runners
```yaml
# Scale to multiple runners
services:
  github-runner:
    # ... configuration
    deploy:
      replicas: 3
```

### Different Runner Types
```bash
# Create specialized runners
cd runners/github-actions
cp docker-compose.yml docker-compose.gpu.yml
# Configure GPU support, different labels, etc.
```

## Related Documentation

- [Docker Configuration](./docker.md) - Container setup
- [Production Deployment](./production.md) - Complete deployment
- [Workflow Templates](../../apps/discord-bot/templates/) - Workflow examples

[← Back to Deployment](./README.md)