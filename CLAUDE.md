# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Discord bot built with NestJS and Necord that integrates with GitHub to browse repositories and trigger Claude Code analysis workflows. The bot provides an interactive Discord interface for repository management and automated code analysis through GitHub Actions workflows.

## Architecture

### Framework & Core Technologies
- **Framework**: NestJS with Necord for Discord integration
- **Discord Library**: Discord.js v14 with full TypeScript support
- **GitHub Integration**: Octokit REST API client
- **Package Manager**: pnpm
- **Build System**: NestJS CLI with TypeScript compilation
- **Monorepo**: Turborepo for build orchestration

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
└── CLAUDE.md                   # This file
```

### Discord Bot Architecture

The Discord bot follows a clean, modular architecture with separation of concerns:

```
apps/discord-bot/src/
├── services/              # Business logic and external integrations
│   ├── base/
│   │   └── base.service.ts         # Base service with common logging
│   ├── github.service.ts           # GitHub API client with search support
│   ├── session.service.ts          # User session management with cleanup
│   ├── embed.service.ts            # Discord embed creation utilities
│   ├── workflow.service.ts         # GitHub Actions workflow management
│   └── workflow-monitor.service.ts # Real-time workflow status monitoring
├── commands/              # Discord slash command handlers
│   └── repository/
│       └── claude.command.ts       # /claude command - unified workflow entry
├── interactions/          # Discord interaction handlers
│   ├── buttons/
│   │   ├── cancel.button.ts               # Cancel operation button
│   │   └── workflow-status.button.ts      # Check workflow status
│   ├── modals/
│   │   ├── claude-prompt.modal.ts         # Final prompt input modal
│   │   └── claude-repo-search.modal.ts    # Repository search modal
│   └── selects/
│       └── repository.select.ts           # Repository selection handler
├── utils/                 # Shared utilities and helpers
│   ├── discord.constants.ts    # Discord-specific constants
│   ├── github.constants.ts     # GitHub-specific constants
│   ├── messages.constants.ts   # User-facing messages
│   ├── workflow.utils.ts       # Workflow status utilities
│   └── discord.utils.ts        # Discord UI component builders
├── interfaces/            # TypeScript type definitions (organized by domain)
│   ├── services/          # Service interfaces
│   │   ├── github.interface.ts     # GitHub service contract
│   │   ├── workflow.interface.ts   # Workflow service contract
│   │   ├── embed.interface.ts      # Embed service contract
│   │   └── session.interface.ts    # Session service contract
│   ├── models/            # Data models
│   │   ├── repository.interface.ts # Repository data types
│   │   ├── session.interface.ts    # Session data types
│   │   └── workflow.interface.ts   # Workflow data types
│   └── discord/           # Discord-specific types
│       └── discord.interface.ts    # Discord component types
├── app.module.ts          # Root module with dependency injection
└── main.ts               # Application entry point
```

### Key Services

#### GitHubService (`apps/discord-bot/src/services/github.service.ts`)
- **Purpose**: GitHub API integration with repository management
- **Features**: 
  - Repository search across user's repositories
  - Repository details fetching with stats
  - Direct repository access validation
  - Error handling and rate limiting
- **Methods**:
  - `searchRepositories()` - Search user's repositories with text matching
  - `getRepository()` - Get single repository details and validation
  - `getUserRepositories()` - Fetch user's repositories

#### SessionService (`apps/discord-bot/src/services/session.service.ts`)
- **Purpose**: Manage user sessions across Discord interactions
- **Features**:
  - Session creation and lifecycle management
  - Automatic session cleanup and expiration
  - Type-safe session data storage
- **Methods**:
  - `createSession()`, `getSession()`, `updateSession()`
  - `cleanupExpiredSessions()` - Automatic cleanup

#### EmbedService (`apps/discord-bot/src/services/embed.service.ts`)
- **Purpose**: Centralized Discord embed creation
- **Features**:
  - Consistent styling and branding
  - Error, success, and loading state embeds
  - Repository information display
  - Workflow status and dispatch embeds
- **Methods**:
  - `createRepositorySelectionMessage()` - Main selection interface
  - `createErrorEmbed()`, `createSuccessEmbed()` - Status messages
  - `createWorkflowDispatchedEmbed()` - Workflow launch confirmation
  - `createWorkflowNotFoundEmbed()` - Missing workflow templates

#### WorkflowService (`apps/discord-bot/src/services/workflow.service.ts`)
- **Purpose**: GitHub Actions workflow management and execution
- **Features**:
  - Workflow file existence validation
  - Workflow dispatch with custom inputs
  - Workflow run status monitoring
  - Real-time status updates
- **Methods**:
  - `checkWorkflowExists()` - Verify claude.yml workflow exists
  - `dispatchWorkflow()` - Trigger workflow with prompt inputs
  - `getWorkflowRuns()`, `getLatestWorkflowRun()` - Status tracking

#### WorkflowMonitorService (`apps/discord-bot/src/services/workflow-monitor.service.ts`)
- **Purpose**: Real-time monitoring of workflow execution status
- **Features**:
  - Automatic status updates for running workflows
  - Discord message updates with progress
  - Background polling and notification system

## Environment Setup

### Required Environment Variables

Environment variables are stored in `apps/discord-bot/.env`:

```bash
# Discord Configuration
DISCORD_TOKEN="your_discord_bot_token"
DEV_GUILD="your_development_guild_id"

# GitHub Integration
GITHUB_TOKEN="your_github_personal_access_token"
```

Copy `apps/discord-bot/.env.example` to `apps/discord-bot/.env` and fill in your values.

### GitHub Token Permissions
The GitHub token requires these scopes:
- `repo` - Full repository access (for private repos)
- `public_repo` - Public repository access
- `actions:write` - Required for dispatching workflows

## Common Commands

### Development (from root directory)
```bash
pnpm install         # Install all workspace dependencies
pnpm dev             # Start Discord bot in watch mode
pnpm build           # Build all packages
pnpm lint            # Run ESLint on all packages
pnpm format          # Format code with Prettier
pnpm typecheck       # Run TypeScript type checking
```

### Development (Discord bot specific)
```bash
pnpm dev --filter=@claude-code/discord-bot      # Start only Discord bot
pnpm build --filter=@claude-code/discord-bot    # Build only Discord bot
pnpm lint --filter=@claude-code/discord-bot     # Lint only Discord bot
```

### Quality Assurance
```bash
pnpm lint            # Check and fix linting issues for all packages
pnpm typecheck       # Verify TypeScript types for all packages
pnpm format          # Format all TypeScript files with Prettier
```

## Development Patterns

### Adding New Commands
1. Create command file in `apps/discord-bot/src/commands/[category]/` directory
2. Implement command class with `@Injectable()` decorator
3. Use `@SlashCommand()` decorator with name and description
4. Inject required services via constructor
5. Add to `apps/discord-bot/src/app.module.ts` providers array

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
1. Create handler file in `apps/discord-bot/src/interactions/[type]/` directory
2. Use appropriate decorator (`@Button()`, `@StringSelect()`, `@Modal()`, etc.)
3. Handle interaction validation and error cases
4. Update session state through SessionService
5. Add to module providers

Example Button Handler:
```typescript
@Injectable()
export class CustomButtonHandler {
  constructor(private readonly sessionService: SessionService) {}

  @Button('custom_button_id')
  public async onCustomButton(@Context() [interaction]: ButtonContext) {
    // Handle button interaction
  }
}
```

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

This Discord bot provides streamlined GitHub integration with Claude Code workflow automation through a unified command interface:

### Streamlined Workflow
- **Single Command**: `/claude` handles the entire workflow
- **Modal-Based UX**: Interactive text input for repository search and prompts  
- **Smart Validation**: Only shows repositories with `claude.yml` workflow
- **Direct Integration**: Repository selection immediately leads to prompt input
- **Real-time Monitoring**: Automatic status updates and workflow tracking

### Core Repository Management
- Repository search through text input modal
- Intelligent repository matching (exact names and fuzzy search)
- Repository validation with Claude Code workflow detection
- Session management for multi-step user interactions

### Claude Code Integration
- Unified workflow triggering via single `/claude` command
- Real-time workflow status monitoring with Discord message updates
- Custom prompt input through dedicated modal interface
- Automatic workflow file detection and validation (`claude.yml`)
- Background monitoring with status updates and completion notifications

### Discord Command

#### `/claude`
**Complete Claude Code workflow in one command**
1. **Repository Search**: Opens modal to search your repositories
   - Text input for repository name or search term
   - Supports exact matches (`owner/repo`) and fuzzy search
   - Example searches: `"discord-bot"`, `"microsoft/vscode"`

2. **Repository Selection**: Shows validated repositories with Claude Code support
   - Only displays repositories containing `claude.yml` workflow
   - Clear indication of repositories without Claude Code setup
   - Direct selection leads to prompt input

3. **Prompt Input**: Modal for analysis details
   - Custom analysis prompt (required)
   - Optional branch specification (defaults to 'main')
   - Example prompts: "Review code for security vulnerabilities", "Optimize performance"

4. **Workflow Execution**: Automatic dispatch and monitoring
   - Real-time status updates in Discord
   - Workflow progress tracking with status buttons
   - Completion notifications with results

### Workflow Requirements
For repositories to support Claude Code analysis, they must contain:
- `.github/workflows/claude.yml` - GitHub Actions workflow file
- Proper workflow inputs configuration for prompt handling
- Repository access permissions for the bot's GitHub token

### Benefits of New Design
- **Simplified UX**: One command instead of three (`/run`, `/search`, `/claude`)
- **Better Validation**: Pre-validates Claude Code support before prompting
- **Faster Workflow**: Fewer steps from search to execution
- **Error Prevention**: Only shows compatible repositories
- **Cleaner Interface**: No pagination complexity or analyze buttons