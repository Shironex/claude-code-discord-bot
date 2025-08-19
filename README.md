# Claude Code Discord Bot

A Discord bot that integrates with GitHub to browse and search repositories. Built with NestJS, Necord, and TypeScript.

## ✨ Features

- **🔍 Repository Browser**: Browse your GitHub repositories with pagination
- **🔎 Repository Search**: Search repositories by name or content
- **📊 Repository Info**: View repository stats (stars, language, last update)
- **🎮 Interactive UI**: Use Discord buttons and select menus for navigation

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

## 🎮 Commands

### `/run`
Browse your GitHub repositories with pagination
- Shows 25 repositories per page
- Use Previous/Next buttons to navigate
- Select a repository to view details

### `/search query:keyword`
Search your repositories
- Search by repository name or description
- Results are paginated
- Example: `/search query:discord bot`

## 🔧 Getting Tokens

### Discord Bot Token
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to Bot section and create a bot
4. Copy the token

### GitHub Token
1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. Generate a new token (classic)
3. Select scopes: `repo` and/or `public_repo`
4. Copy the token

### Guild ID
1. Enable Developer Mode in Discord
2. Right-click your server → Copy Server ID

## 🏗️ Project Structure

```
src/
├── commands/              # Discord slash commands
│   └── repository/        # Repository-related commands
├── interactions/          # Button and select handlers
│   ├── buttons/          # Navigation buttons
│   └── selects/          # Repository selection
├── services/             # Business logic
│   ├── github.service.ts # GitHub API integration
│   ├── session.service.ts # User session management
│   └── embed.service.ts  # Discord UI creation
├── utils/                # Utilities and constants
├── interfaces/           # TypeScript types
└── dtos/                # Input validation
```

## 📋 Available Scripts

```bash
# Development
pnpm start:dev    # Start with hot reload
pnpm start:debug  # Start with debugging
pnpm build        # Build for production
pnpm lint         # Fix code issues
pnpm format       # Format code
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