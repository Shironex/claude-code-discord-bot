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

### Modular Architecture

The codebase follows a clean, modular architecture with separation of concerns:

```
src/
├── services/              # Business logic and external integrations
│   ├── github.service.ts       # GitHub API client with pagination support
│   ├── session.service.ts      # User session management with cleanup
│   ├── embed.service.ts        # Discord embed creation utilities
│   ├── workflow.service.ts     # GitHub Actions workflow management
│   └── workflow-monitor.service.ts # Real-time workflow status monitoring
├── commands/              # Discord slash command handlers
│   └── repository/
│       ├── run.command.ts      # /run command for browsing repositories
│       ├── search.command.ts   # /search command for repository search
│       └── claude.command.ts   # /claude command for triggering analysis
├── interactions/          # Discord interaction handlers
│   ├── buttons/
│   │   ├── pagination.buttons.ts      # Previous/Next navigation
│   │   ├── cancel.button.ts           # Cancel operation button
│   │   ├── claude-analyze.button.ts   # Trigger Claude analysis
│   │   └── workflow-status.button.ts  # Check workflow status
│   ├── modals/
│   │   └── claude-prompt.modal.ts     # Custom prompt input modal
│   └── selects/
│       └── repository.select.ts       # Repository selection handler
├── utils/                 # Shared utilities and helpers
│   ├── constants.ts       # Application constants and configuration
│   └── discord.utils.ts   # Discord UI component builders
├── interfaces/            # TypeScript type definitions
│   ├── session.interface.ts   # Session management types
│   ├── discord.interface.ts   # Discord component types
│   └── workflow.interface.ts  # GitHub workflow types
├── dtos/                  # Data transfer objects for validation
│   ├── search.dto.ts      # Search command validation
│   ├── claude.dto.ts      # Claude command validation
│   └── length.dto.ts      # String length validation
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
  - Workflow status and dispatch embeds
- **Methods**:
  - `createRepositorySelectionMessage()` - Main selection interface
  - `createErrorEmbed()`, `createSuccessEmbed()` - Status messages
  - `createWorkflowDispatchedEmbed()` - Workflow launch confirmation
  - `createWorkflowNotFoundEmbed()` - Missing workflow templates

#### WorkflowService (`src/services/workflow.service.ts`)
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

#### WorkflowMonitorService (`src/services/workflow-monitor.service.ts`)
- **Purpose**: Real-time monitoring of workflow execution status
- **Features**:
  - Automatic status updates for running workflows
  - Discord message updates with progress
  - Background polling and notification system

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
- `actions:write` - Required for dispatching workflows

## Common Commands

### Development
```bash
pnpm install         # Install dependencies
pnpm start:dev       # Start in watch mode with hot reload
pnpm start:debug     # Start with debugging enabled
pnpm start:prod      # Start production build
pnpm build           # Build the project for production
pnpm lint            # Run ESLint with auto-fix
pnpm format          # Format code with Prettier
pnpm typecheck       # Run TypeScript type checking
```

### Quality Assurance
```bash
pnpm lint            # Check and fix linting issues
pnpm typecheck       # Verify TypeScript types
pnpm format          # Format all TypeScript files with Prettier
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

This Discord bot provides comprehensive GitHub integration with Claude Code workflow automation:

### Core Repository Management
- Repository listing with pagination (`/run` command)
- Repository search functionality (`/search` command)
- Interactive Discord UI with buttons and select menus
- Session management for user interactions

### Claude Code Integration
- Direct workflow triggering via `/claude` command
- Real-time workflow status monitoring
- Custom prompt input through Discord modals
- Automatic workflow file detection (`claude.yml`)
- Background monitoring with status updates

### Discord Commands

#### `/run`
Browse your GitHub repositories with pagination
- Shows 25 repositories per page
- Use Previous/Next buttons to navigate
- Select a repository to view details or trigger analysis

#### `/search query:keyword`
Search your repositories by name or description
- Results are paginated
- Example: `/search query:discord bot`

#### `/claude repository:owner/repo prompt:"analysis prompt" [branch:branch_name]`
Trigger Claude Code analysis on a repository
- Requires `claude.yml` workflow in target repository
- Custom prompts for specific analysis tasks
- Optional branch specification (defaults to 'main')
- Real-time status updates and monitoring

### Workflow Requirements
For repositories to support Claude Code analysis, they must contain:
- `.github/workflows/claude.yml` - GitHub Actions workflow file
- Proper workflow inputs configuration for prompt handling
- Repository access permissions for the bot's GitHub token