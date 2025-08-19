# Claude Code Discord Bot

A streamlined Discord bot that integrates with GitHub to trigger Claude Code analysis workflows. Built with NestJS, Necord, and TypeScript.

## ✨ Features

- **🤖 Claude Code Integration**: Unified `/claude` command for complete workflow automation
- **🔍 Smart Repository Search**: Text-based search with intelligent matching
- **✅ Workflow Validation**: Only shows repositories with Claude Code support
- **⚡ Streamlined UX**: One command replaces complex navigation
- **📊 Real-time Monitoring**: Live workflow status updates and notifications
- **🎮 Modal-Based UI**: Clean, focused input through Discord modals

## 🛠️ Setup

### Prerequisites

- Node.js 22.12.0 or newer
- pnpm package manager
- Discord Bot Token
- GitHub Personal Access Token

### Installation

1. **Clone and install**:
```bash
git clone <repository-url>
cd claude-code-discord-bot
pnpm install
```

2. **Configure environment**:
```bash
cp .env.example .env
```

Edit `.env` with your tokens:
```env
DISCORD_TOKEN="your_discord_bot_token"
DEV_GUILD="your_development_guild_id"
GITHUB_TOKEN="your_github_personal_access_token"
```

3. **Start the bot**:
```bash
pnpm start:dev
```

## 🎮 Usage

### `/claude` - Complete Claude Code Workflow

**One command to rule them all!** The `/claude` command provides a streamlined, modal-based workflow:

1. **🔍 Repository Search**: Type `/claude` to open a search modal
   - Enter repository name or search term
   - Supports exact matches (`owner/repo`) and fuzzy search
   - Example: `"discord-bot"` or `"microsoft/vscode"`

2. **✅ Repository Selection**: Choose from validated repositories
   - Only shows repositories with Claude Code workflow (`claude.yml`)
   - Clear indication of which repositories are compatible
   - No wasted time on unsupported repositories

3. **📝 Analysis Prompt**: Specify what you want Claude to do
   - Custom analysis prompt (required)
   - Optional branch specification (defaults to `main`)
   - Examples: "Review for security issues", "Optimize performance"

4. **🚀 Workflow Execution**: Automatic execution with real-time updates
   - Live status updates in Discord
   - Workflow progress tracking
   - Completion notifications with results

### Requirements

Your repositories need a `.github/workflows/claude.yml` file configured for Claude Code analysis.

## 🔧 Getting Tokens

### Discord Bot Token
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to Bot section and create a bot
4. Copy the token

### GitHub Token
1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. Generate a new token (classic)
3. Select scopes: `repo`, `public_repo`, and `actions:write` (required for workflow dispatch)
4. Copy the token

### Guild ID
1. Enable Developer Mode in Discord
2. Right-click your server → Copy Server ID

## 🏗️ Project Structure

```
src/
├── commands/              # Discord slash commands
│   └── repository/
│       └── claude.command.ts       # Unified /claude command
├── interactions/          # Modal and interaction handlers
│   ├── buttons/          # Status and workflow buttons
│   ├── modals/           # Repository search and prompt modals
│   └── selects/          # Repository selection
├── services/             # Business logic with service interfaces
│   ├── base/             # Base service with common patterns
│   ├── github.service.ts # GitHub API integration
│   ├── session.service.ts # User session management
│   ├── embed.service.ts  # Discord UI creation
│   ├── workflow.service.ts # GitHub Actions workflow management
│   └── workflow-monitor.service.ts # Real-time monitoring
├── utils/                # Domain-specific utilities and constants
├── interfaces/           # Organized TypeScript types (services, models, discord)
└── app.module.ts         # Clean dependency injection
```

## 📋 Available Scripts

```bash
# Development
pnpm start:dev     # Start with hot reload
pnpm start:debug   # Start with debugging
pnpm start:prod    # Start production build
pnpm build         # Build for production

# Quality Assurance
pnpm lint          # Check and fix linting issues
pnpm format        # Format code with Prettier
pnpm typecheck     # Run TypeScript type checking
```

## 🔒 Security

- GitHub tokens require minimal permissions (`repo` or `public_repo`)
- Discord tokens are bot-specific
- User sessions expire automatically after 30 minutes
- No sensitive data is logged

## 🐛 Troubleshooting

**Bot not responding?**
- Check your Discord token in `.env`
- Verify the bot has "Send Messages" and "Use Slash Commands" permissions
- Make sure `DEV_GUILD` matches your server ID

**No repositories showing?**
- Check your GitHub token has correct permissions
- Verify the token in `.env` is valid
- Check if you have any repositories in your GitHub account

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Create a pull request

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.