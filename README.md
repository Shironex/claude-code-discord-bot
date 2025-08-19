# Claude Code Discord Bot

[![CI](https://github.com/Shironex/claude-code-discord-bot/workflows/CI/badge.svg)](https://github.com/Shironex/claude-code-discord-bot/actions/workflows/ci.yml)
[![Release](https://github.com/Shironex/claude-code-discord-bot/workflows/Release/badge.svg)](https://github.com/Shironex/claude-code-discord-bot/actions/workflows/release.yml)
[![Version](https://img.shields.io/github/package-json/v/Shironex/claude-code-discord-bot)](https://github.com/Shironex/claude-code-discord-bot/releases)
[![License](https://img.shields.io/github/license/Shironex/claude-code-discord-bot)](LICENSE)

A Discord bot that integrates with GitHub to browse repositories and trigger Claude Code analysis workflows. Built with NestJS, Necord, and organized as a Turborepo monorepo.

## Architecture

### Monorepo Structure

```
claude-code-discord-bot/
├── apps/
│   └── discord-bot/            # Discord bot application
│       ├── src/                # Application source code
│       ├── .env                # Bot environment variables
│       ├── .env.example        # Environment template
│       ├── package.json        # Bot dependencies
│       └── dist/               # Build output
├── packages/                   # Shared packages (future)
├── .github/                    # GitHub Actions workflows
├── .claude/                    # Claude Code configuration
├── turbo.json                  # Turborepo configuration
├── package.json                # Root workspace configuration
├── pnpm-workspace.yaml         # PNPM workspace settings
└── CLAUDE.md                   # Development guide
```

### Discord Bot Structure

```
apps/discord-bot/src/
├── services/              # Business logic and integrations
├── commands/              # Discord slash commands
├── interactions/          # Discord interaction handlers
│   ├── buttons/           # Button interactions
│   ├── modals/            # Modal interactions
│   └── selects/           # Select menu interactions
├── utils/                 # Shared utilities
├── interfaces/            # TypeScript type definitions
├── app.module.ts          # NestJS root module
└── main.ts               # Application entry point
```

## Installation & Development

### Prerequisites

- Node.js >= 22.11.0
- pnpm >= 10.9.0
- Discord Bot Token
- GitHub Personal Access Token

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd claude-code-discord-bot
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment**
   ```bash
   # Copy environment template
   cp apps/discord-bot/.env.example apps/discord-bot/.env
   
   # Edit apps/discord-bot/.env with your tokens:
   # DISCORD_TOKEN=your_discord_bot_token
   # DEV_GUILD=your_development_guild_id
   # GITHUB_TOKEN=your_github_personal_access_token
   ```

4. **Start development server**
   ```bash
   # Start Discord bot in watch mode
   pnpm dev
   
   # Or start specific app
   pnpm dev --filter=@claude-code/discord-bot
   ```

### Development Commands

```bash
# Development
pnpm dev                    # Start Discord bot in watch mode
pnpm build                  # Build all packages
pnpm start                  # Start production build

# Code Quality
pnpm lint                   # Run ESLint on all packages
pnpm typecheck              # Run TypeScript type checking
pnpm format                 # Format code with Prettier

# Package-specific commands
pnpm dev --filter=@claude-code/discord-bot      # Start only Discord bot
pnpm build --filter=@claude-code/discord-bot    # Build only Discord bot
pnpm lint --filter=@claude-code/discord-bot     # Lint only Discord bot

# Release management
pnpm changeset                  # Create a new changeset
pnpm changeset:status           # Check changeset status
pnpm version                    # Version packages (automated in CI)
pnpm release                    # Publish packages (automated in CI)
```

### GitHub Token Permissions

Your GitHub token needs these scopes:
- `repo` - Full repository access (for private repos)  
- `public_repo` - Public repository access
- `actions:write` - Required for dispatching workflows

## Features

- **Repository Search**: Search and browse GitHub repositories
- **Claude Code Integration**: Trigger automated code analysis workflows
- **Interactive Discord UI**: Modal-based forms and button interactions
- **Real-time Updates**: Live workflow status monitoring
- **Session Management**: Persistent user sessions across interactions ( to be tested )

## Technology Stack

- **Framework**: NestJS with Necord for Discord integration
- **Discord**: Discord.js v14 with full TypeScript support
- **GitHub**: Octokit REST API client
- **Build System**: Turborepo for monorepo management
- **Package Manager**: pnpm with workspaces
- **Language**: TypeScript with strict type checking

## CI/CD & Release Management

This project uses automated CI/CD workflows:

- **Continuous Integration**: Runs on every push and PR
  - Commit message validation (Commitlint)
  - Code quality checks (ESLint, TypeScript, Prettier)
  - Build verification and security audit
  
- **Automated Releases**: Triggered on merges to master
  - Version bumping based on changesets
  - Automatic changelog generation
  - GitHub releases with detailed changelogs
  - Git tagging for version tracking

- **Pull Request Validation**: Enhanced PR checks
  - Changeset detection and preview
  - Version impact analysis
  - Automated bot comments with release information

### Making Changes

1. Create a feature branch
2. Make your changes following [conventional commits](https://conventionalcommits.org/)
3. Add a changeset: `pnpm changeset`
4. Commit your changes: `git commit -m "feat(scope): description"`
5. Push and create a PR

Git hooks will automatically run quality checks before commits.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines, commit conventions, and development workflows.

See [CLAUDE.md](./CLAUDE.md) for detailed development patterns, architecture documentation, and technical specifications.