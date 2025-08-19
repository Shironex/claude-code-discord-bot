# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Discord bot built with NestJS and Necord that integrates with GitHub to browse and search repositories. It's designed as a prototype to eventually integrate with Claude Code for repository analysis.

## Architecture

### Framework & Core Technologies
- **Framework**: NestJS with Necord for Discord integration
- **Discord Library**: Discord.js v14 with full TypeScript support
- **GitHub Integration**: Octokit REST API client
- **Package Manager**: pnpm
- **Build System**: NestJS CLI with TypeScript compilation

### Modular Architecture

The codebase follows a clean, modular architecture with separation of concerns:

```
src/
├── services/              # Business logic and external integrations
│   ├── github.service.ts  # GitHub API client with pagination support
│   ├── session.service.ts # User session management with cleanup
│   └── embed.service.ts   # Discord embed creation utilities
├── commands/              # Discord slash command handlers
│   └── repository/
│       ├── run.command.ts    # /run command for browsing repositories
│       └── search.command.ts # /search command for repository search
├── interactions/          # Discord interaction handlers
│   ├── buttons/
│   │   ├── pagination.buttons.ts # Previous/Next navigation
│   │   └── cancel.button.ts      # Cancel operation button
│   └── selects/
│       └── repository.select.ts  # Repository selection handler
├── utils/                 # Shared utilities and helpers
│   ├── constants.ts       # Application constants and configuration
│   └── discord.utils.ts   # Discord UI component builders
├── interfaces/            # TypeScript type definitions
│   ├── session.interface.ts  # Session management types
│   └── discord.interface.ts  # Discord component types
├── dtos/                  # Data transfer objects for validation
├── app.module.ts          # Root module with dependency injection
└── main.ts               # Application entry point
```

### Key Services

#### GitHubService (`src/services/github.service.ts`)
- **Purpose**: GitHub API integration with full repository management
- **Features**: 
  - Paginated repository listing with metadata
  - Repository search across user's repositories
  - Repository details fetching with stats
  - Error handling and rate limiting
- **Methods**:
  - `getUserRepositoriesPaginated()` - Fetch repos with pagination
  - `searchRepositories()` - Search user's repositories
  - `getRepository()` - Get single repository details

#### SessionService (`src/services/session.service.ts`)
- **Purpose**: Manage user sessions across Discord interactions
- **Features**:
  - Session creation and lifecycle management
  - Automatic session cleanup and expiration
  - Type-safe session data storage
- **Methods**:
  - `createSession()`, `getSession()`, `updateSession()`
  - `cleanupExpiredSessions()` - Automatic cleanup

#### EmbedService (`src/services/embed.service.ts`)
- **Purpose**: Centralized Discord embed creation
- **Features**:
  - Consistent styling and branding
  - Error, success, and loading state embeds
  - Repository information display
- **Methods**:
  - `createRepositorySelectionMessage()` - Main selection interface
  - `createErrorEmbed()`, `createSuccessEmbed()` - Status messages

## Environment Setup

### Required Environment Variables
```bash
# Discord Configuration
DISCORD_TOKEN="your_discord_bot_token"
DEV_GUILD="your_development_guild_id"

# GitHub Integration
GITHUB_TOKEN="your_github_personal_access_token"
```

### GitHub Token Permissions
The GitHub token requires these scopes:
- `repo` - Full repository access (for private repos)
- `public_repo` - Public repository access

## Common Commands

### Development
```bash
pnpm install         # Install dependencies
pnpm start:dev       # Start in watch mode with hot reload
pnpm start:debug     # Start with debugging enabled
pnpm build           # Build the project for production
pnpm lint            # Run ESLint with auto-fix
pnpm format          # Format code with Prettier
```

## Development Patterns

### Adding New Commands
1. Create command file in `src/commands/[category]/` directory
2. Implement command class with `@Injectable()` decorator
3. Use `@SlashCommand()` decorator with name and description
4. Inject required services via constructor
5. Add to `app.module.ts` providers array

Example:
```typescript
@Injectable()
export class NewCommand {
  constructor(
    private readonly githubService: GitHubService,
    private readonly sessionService: SessionService,
    private readonly embedService: EmbedService
  ) {}

  @SlashCommand({ name: 'example', description: 'Example command' })
  public async onExample(@Context() [interaction]: SlashCommandContext) {
    // Implementation
  }
}
```

### Adding Interaction Handlers
1. Create handler file in `src/interactions/[type]/` directory
2. Use appropriate decorator (`@Button()`, `@StringSelect()`, etc.)
3. Handle interaction validation and error cases
4. Update session state through SessionService
5. Add to module providers

### Working with Sessions
- All user state is managed through SessionService
- Sessions automatically expire after 30 minutes
- Use TypeScript interfaces for type safety
- Always check session existence before operations

### Discord UI Components
- Use DiscordUtils for consistent component creation
- Follow established patterns for pagination
- Maintain consistent styling through constants
- Handle edge cases (empty results, errors)

## Code Quality & Standards

### TypeScript Configuration
- Strict type checking enabled
- ESLint with TypeScript parser
- Prettier for consistent formatting
- Path mapping for clean imports

### Testing Strategy
- Unit tests for services and utilities
- Integration tests for command handlers
- Mock GitHub API responses
- Docker environment testing

### Error Handling
- Centralized error handling through EmbedService
- Graceful degradation for API failures
- User-friendly error messages
- Proper logging for debugging

## Current Features

This is a **prototype** focused on GitHub repository browsing and Discord integration. The current functionality includes:

- Repository listing with pagination
- Repository search functionality
- Interactive Discord UI with buttons and select menus
- Session management for user interactions
- Clean, modular architecture for future expansion

Future plans include integrating with Claude Code for automated repository analysis and improvements.