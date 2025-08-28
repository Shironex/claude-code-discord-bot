# Configuration Documentation

Configuration references and setup guides for environment variables, permissions, and validation rules.

## Configuration Guides

- **[Environment Variables](./environment-vars.md)** - Complete environment variable reference
- **[GitHub Permissions](./github-permissions.md)** - GitHub token requirements and scopes
- **[Commitlint](./commitlint.md)** - Commit message validation rules and configuration

## Quick Configuration Reference

### Discord Bot Environment (.env)
```bash
# Required
DISCORD_TOKEN="your_discord_bot_token"
GITHUB_TOKEN="your_github_personal_access_token"

# Optional
DEV_GUILD="your_development_guild_id"
LOG_LEVEL="debug"
```

### Image Service Environment (.env)
```bash
# Service
PORT=3001
NODE_ENV=production

# Security
API_KEY="generated-api-key"
SECRET_KEY="generated-secret-key"

# Storage
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
DEFAULT_TTL=3600
```

### GitHub Token Scopes
Required permissions for GitHub integration:
- `repo` - Full repository access
- `public_repo` - Public repository access
- `actions:write` - Workflow dispatch

## Configuration Validation

- Environment variables are validated at startup
- Commit messages are validated by commitlint hooks
- TypeScript types enforce configuration structure

## Related Documentation

- [Getting Started](../development/getting-started.md) - Initial setup
- [Deployment](../deployment/) - Production configuration
- [Troubleshooting](../workflows/troubleshooting.md) - Configuration issues

[← Back to Documentation](../README.md)