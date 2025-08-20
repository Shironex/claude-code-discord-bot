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

## Quick Start for Local Testing

This guide helps you get the Discord bot running locally.

### Prerequisites

- **Node.js** >= 22.11.0 ([Download](https://nodejs.org/))
- **pnpm** >= 10.9.0 (Install: `npm install -g pnpm`)
- **Discord Bot** with required permissions
- **GitHub Personal Access Token** with proper scopes

### Step 1: Clone & Install

```bash
# Clone the repository
git clone https://github.com/Shironex/claude-code-discord-bot.git
cd claude-code-discord-bot

# Install all dependencies
pnpm install
```

### Step 2: Create Discord Bot

1. **Go to Discord Developer Portal**
   - Visit: https://discord.com/developers/applications
   - Click "New Application" → Enter a name (e.g., "Claude Bot Test")

2. **Create Bot**
   - Go to "Bot" section → Click "Add Bot"
   - **Copy the Bot Token** (you'll need this for `.env`)
   - Enable these **Privileged Gateway Intents**:
     - ✅ Message Content Intent
     - ✅ Server Members Intent

3. **Bot Permissions**
   - Go to "OAuth2" → "URL Generator"
   - **Scopes**: Select `bot` and `applications.commands`
   - **Bot Permissions**: Select:
     - ✅ Send Messages
     - ✅ Use Slash Commands
     - ✅ Embed Links
     - ✅ Read Message History

4. **Invite Bot to Your Server**
   - Copy the generated URL and open it
   - Select your test server and authorize

5. **Get Guild ID**
   - Enable Developer Mode: Discord Settings → Advanced → Developer Mode ✅
   - Right-click your server → "Copy Server ID"

### Step 3: Create GitHub Token

1. **Go to GitHub Settings**
   - Visit: https://github.com/settings/personal-access-tokens
   - Click "Generate new token (personal)"

2. **Configure Token**
   - **Note**: "Claude Discord Bot Token"
   - **Repository Permissions** (select these):
     - ✅ **Actions** - Read and Write (required for dispatching workflows)
     - ✅ **Commit statuses** - Read-only (for workflow status updates)
     - ✅ **Contents** - Read-only (for reading repository files)
     - ✅ **Metadata** - Read-only (for repository information)
     - ✅ **Pull Requests** - Read-only (for PR-related workflows)

3. **Copy Token** - Save it securely, you won't see it again!

### Step 4: Configure Environment

```bash
# Copy the environment template
cp apps/discord-bot/.env.example apps/discord-bot/.env

# Edit the .env file with your values
nano apps/discord-bot/.env  # or use any text editor
```

**Configure these values in `apps/discord-bot/.env`:**

```bash
# Discord Configuration
DISCORD_TOKEN="your_bot_token_from_step_2"
DEV_GUILD="your_server_id_from_step_2"

# GitHub Integration  
GITHUB_TOKEN="your_github_token_from_step_3"

# Logging Configuration (optional - these are defaults)
LOG_LEVEL="debug"                   # For testing, use "debug" for more logs
ENABLE_FILE_LOGS="true"            # Creates log files in logs/ directory
MEMORY_WARNING_THRESHOLD="90"       # Memory usage warning at 90%
```

### Step 5: Set Up Claude Code Workflow

To use the bot, your repositories need a Claude Code workflow file:

1. **Copy the Recommended Template**
   
   Copy the contents of `apps/discord-bot/templates/claude-workflow-two-step.yml` from this repository to your target repository as `.github/workflows/claude.yml`.

   **Why the two-step workflow?** This template is mainly tested with self-hosted runners and provides better reliability. Other templates are more experimental.

2. **Add to Your Repository**
   ```bash
   # In any repository you want to analyze:
   mkdir -p .github/workflows
   
   # Copy the two-step template content to claude.yml
   # (Copy the file content manually or download it)
   
   # Commit the workflow
   git add .github/workflows/claude.yml
   git commit -m "feat: add Claude Code workflow"
   git push
   ```

3. **Customize the Workflow (Optional)**
   
   You can modify the `custom_instructions` field in the workflow file to better match your specific needs and development flow.

4. **Advanced Customization**
   
   For more detailed Claude Code action modifications, visit the official documentation:
   https://github.com/anthropics/claude-code-action/tree/main/docs
   
   Note: Both `custom_instructions` and workflow templates will be configurable through a UI/web interface in future releases.

### Step 6: Start the Bot

```bash
# Start the bot in development mode
pnpm dev

# You should see output like:
# [INFO] Discord bot application starting...
# [INFO] Bot logged in as: YourBotName#1234
# [INFO] Discord bot application started successfully
```

### Step 7: Test the Bot

1. **In Discord**, use the slash command:
   ```
   /claude
   ```

2. **Search for Repository**
   - Enter a repository name (e.g., "my-project")
   - Select a repository from the dropdown

3. **Enter Analysis Prompt**
   - Type what you want Claude to analyze
   - Example: "Review this code for security issues"

4. **Monitor Progress**
   - The bot will show workflow status updates
   - Click "Check Status" to see progress
   - Results will appear when complete

### Troubleshooting

**Bot not responding?**
- Check bot permissions in Discord server
- Verify `DISCORD_TOKEN` and `DEV_GUILD` in `.env`
- Check console for error messages

**"No repositories found"?**
- Ensure `GITHUB_TOKEN` has `repo` scope
- Add `claude.yml` workflow to your repositories
- Check that repositories are accessible with your token

**Workflow not starting?**
- Verify `claude.yml` exists in `.github/workflows/`
- Check GitHub token has `workflow` scope
- Ensure repository has GitHub Actions enabled

**Memory warnings?**
- Normal for development - Node.js starts with small heap
- Adjust `MEMORY_WARNING_THRESHOLD` if needed
- Monitor with `MEMORY_DEBUG_THRESHOLD=50` for more details

### File Structure After Setup

```
claude-code-discord-bot/
├── apps/discord-bot/.env          # Your configuration
├── logs/                          # Log files (auto-created)
│   ├── error.log                  # Error logs only
│   ├── combined.log               # All logs  
│   └── services/                  # Service-specific logs
├── node_modules/                  # Dependencies
└── dist/                          # Built application
```

### Next Steps

- **Production Deployment**: See [DEPLOYMENT.md](./.github/docs/DEPLOYMENT.md)
- **Development Guide**: See [CLAUDE.md](./CLAUDE.md) for architecture details
- **Contributing**: See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines

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