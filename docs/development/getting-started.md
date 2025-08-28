# Getting Started

Quick setup guide for developing with the Claude Code Discord Bot monorepo.

## Prerequisites

- **Node.js**: Version 18 or higher
- **pnpm**: Package manager for monorepo management
- **Git**: Version control
- **Discord Bot**: Bot application with token
- **GitHub Token**: Personal access token with repository permissions

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-username/claude-code-discord-bot.git
cd claude-code-discord-bot
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Configure Environment Variables

#### Discord Bot Environment
Copy the environment template:
```bash
cp apps/discord-bot/.env.example apps/discord-bot/.env
```

Configure required variables in `apps/discord-bot/.env`:
```bash
# Discord Configuration
DISCORD_TOKEN="your_discord_bot_token"
DEV_GUILD="your_development_guild_id"

# GitHub Integration
GITHUB_TOKEN="your_github_personal_access_token"

# Optional Development Settings
LOG_LEVEL="debug"
NODE_ENV="development"
```

#### Image Service Environment (Optional)
```bash
cp apps/image-service/.env.example apps/image-service/.env
cd apps/image-service
bash scripts/generate-keys.sh  # Generate API keys
```

### 4. GitHub Token Setup

Create a GitHub Personal Access Token with these scopes:
- `repo` - Full repository access (for private repositories)
- `public_repo` - Public repository access  
- `actions:write` - Required for dispatching workflows

### 5. Discord Bot Setup

1. Create Discord application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Create bot and copy the token to `.env`
3. Add bot to your development server with necessary permissions:
   - Send Messages
   - Use Slash Commands
   - Embed Links
   - Attach Files

## Development Commands

### Start Development
```bash
# Start Discord bot in watch mode
pnpm dev

# Start specific application only
pnpm dev --filter=@claude-code/discord-bot
pnpm dev --filter=@claude-code/image-service
```

### Build and Test
```bash
# Build all packages
pnpm build

# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Format code
pnpm format
```

### Quality Assurance
```bash
# Run all quality checks
pnpm lint && pnpm typecheck && pnpm build

# Individual quality checks
pnpm lint            # ESLint with auto-fix
pnpm typecheck       # TypeScript validation
pnpm format          # Prettier formatting
```

## Project Structure Overview

```
claude-code-discord-bot/
├── apps/
│   ├── discord-bot/     # Main Discord bot application
│   └── image-service/   # Image storage API service
├── packages/
│   └── shared/          # Shared types and utilities
├── docs/                # Documentation (this directory)
├── runners/             # GitHub Actions runners
└── .github/             # CI/CD workflows
```

## Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feat/your-feature-name
```

### 2. Make Changes
- Follow existing code patterns
- Update relevant documentation
- Run quality checks frequently

### 3. Test Changes
```bash
pnpm build
pnpm lint
pnpm typecheck
```

### 4. Commit Changes
```bash
# Follow conventional commit format
git commit -m "feat(discord-bot): add new feature"
```

### 5. Create Changeset (if needed)
```bash
pnpm changeset
```

## Development Tips

### Code Editing
- Use VS Code with TypeScript extension
- Enable format on save
- Use workspace TypeScript version
- Install recommended extensions

### Debugging
- Use `console.log` or logger for debugging
- Check application logs in `apps/*/logs/`
- Use Discord developer tools for interaction debugging
- Monitor GitHub API rate limits

### Common Issues
- **Bot not responding**: Check Discord token and permissions
- **GitHub API errors**: Verify token scopes and rate limits
- **Build errors**: Run `pnpm install` and check Node.js version
- **Type errors**: Ensure all packages are built (`pnpm build`)

## Next Steps

1. **Explore Code**: Review [Discord Bot Architecture](../architecture/discord-bot.md)
2. **Add Features**: Follow [Development Patterns](./patterns.md)
3. **Test Changes**: See [Testing Guidelines](./testing.md)
4. **Deploy**: Check [Deployment Guides](../deployment/)

## Related Documentation

- [Commands Reference](./commands.md) - All development commands
- [Development Patterns](./patterns.md) - Code patterns and examples
- [Code Standards](./code-standards.md) - Quality requirements
- [Configuration](../configuration/) - Environment setup details

[← Back to Development](./README.md)