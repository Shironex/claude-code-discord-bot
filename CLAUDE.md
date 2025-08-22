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
│   ├── discord-bot/            # Discord bot application
│   │   ├── src/                # Application source code
│   │   ├── .env                # Bot environment variables
│   │   ├── .env.example        # Environment template
│   │   ├── package.json        # Bot dependencies
│   │   ├── templates/          # Claude workflow templates
│   │   └── dist/               # Build output
│   └── image-service/          # Standalone image storage API
│       ├── src/                # Image service source code
│       ├── .env.example        # Image service environment template
│       ├── Dockerfile          # Production image service container
│       ├── docker-compose.dev.yml # Development docker setup
│       └── scripts/            # Key generation and utility scripts
├── packages/
│   └── shared/                 # Shared TypeScript types and utilities between services
│       ├── src/                # Type definitions
│       └── dist/               # Built type definitions
├── runners/
│   └── github-actions/         # Self-hosted GitHub Actions runner
│       ├── Dockerfile          # Runner container configuration
│       ├── docker-compose.yml  # Runner deployment setup
│       └── entrypoint.sh       # Runner auto-registration script
├── .github/
│   ├── workflows/              # CI/CD workflows
│   └── docs/                   # Additional documentation
├── .claude/                    # Claude Code configuration
├── turbo.json                  # Turborepo configuration
├── package.json                # Root workspace configuration
├── pnpm-workspace.yaml         # PNPM workspace settings
├── commitlint.config.js        # Commit message validation
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
│   ├── workflow-monitor.service.ts # Real-time workflow status monitoring
│   ├── file-explorer.service.ts    # Repository file tree exploration
│   ├── startup.service.ts          # Application startup and configuration
│   └── image-service/              # Image handling integration
│       ├── image-service.client.ts # Image service API client
│       ├── image-service.module.ts # Image service module configuration
│       └── image-upload.service.ts # Discord attachment uploading
├── commands/              # Discord slash command handlers
│   ├── debug/
│   │   └── image-service.command.ts # /image-service debug command
│   └── repository/
│       └── claude.command.ts       # /claude command - unified workflow entry
├── interactions/          # Discord interaction handlers
│   ├── buttons/
│   │   ├── add-images.button.ts           # Add images to analysis
│   │   ├── cancel.button.ts               # Cancel operation button
│   │   ├── claude-prompt-trigger.button.ts # Trigger Claude prompt modal
│   │   ├── open-claude-prompt.button.ts   # Open Claude prompt interface
│   │   ├── skip-file-selection.button.ts  # Skip file selection step
│   │   ├── skip-images.button.ts          # Skip image attachment step
│   │   └── workflow-status.button.ts      # Check workflow status
│   ├── listeners/
│   │   └── image-upload.listener.ts       # Handle image upload events
│   ├── modals/
│   │   ├── claude-prompt.modal.ts         # Final prompt input modal
│   │   └── claude-repo-search.modal.ts    # Repository search modal
│   └── selects/
│       ├── file-path.select.ts            # File/directory selection handler
│       └── repository.select.ts           # Repository selection handler
├── logger/                # Custom Winston-based logging system
│   ├── formatters/        # Log formatting utilities
│   │   ├── console.formatter.ts    # Colored console output formatter
│   │   └── file.formatter.ts       # JSON file output formatter
│   ├── transports/        # Winston transport configurations
│   │   ├── console.transport.ts    # Console logging transport
│   │   ├── error-file.transport.ts # Error-specific file logging
│   │   ├── combined-file.transport.ts # Combined logs file transport
│   │   └── service-file.transport.ts  # Service-specific file logging
│   ├── logger.service.ts          # Main logger service implementation
│   ├── logger.factory.ts          # Logger factory for service instances
│   ├── logger.config.ts           # Winston configuration builder
│   └── logger.module.ts           # NestJS logger module
├── utils/                 # Shared utilities and helpers
│   ├── discord.constants.ts    # Discord-specific constants
│   ├── discord.utils.ts        # Discord UI component builders
│   ├── error.types.ts          # Error type definitions
│   ├── file-tree.utils.ts      # File tree manipulation utilities
│   ├── github.constants.ts     # GitHub-specific constants
│   ├── messages.constants.ts   # User-facing messages
│   ├── security.utils.ts       # Security utilities for logging
│   ├── tracking.utils.ts       # User interaction tracking utilities
│   ├── type-guards.ts          # TypeScript type guard functions
│   └── workflow.utils.ts       # Workflow status utilities
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

#### FileExplorerService (`apps/discord-bot/src/services/file-explorer.service.ts`)
- **Purpose**: Repository file tree exploration and selection
- **Features**:
  - Recursive file tree traversal with caching
  - Prioritization of common development files and directories
  - Interactive file/directory selection interface
  - Pagination for large repositories
- **Methods**:
  - `getFileTree()` - Fetch and cache repository file structure
  - `buildFileTreeResponse()` - Build paginated file tree for Discord UI
  - `clearCache()` - Manual cache invalidation

#### ImageUploadService (`apps/discord-bot/src/services/image-service/image-upload.service.ts`)
- **Purpose**: Discord attachment processing and image service integration
- **Features**:
  - Discord attachment validation and processing
  - Integration with standalone image service API
  - Batch upload support for multiple attachments
  - Automatic file type detection and validation
- **Methods**:
  - `uploadDiscordAttachment()` - Upload single Discord attachment
  - `uploadDiscordAttachments()` - Batch upload multiple attachments
  - `isImageAttachment()` - Validate attachment as supported image type

### Custom Logging System

The application implements a comprehensive Winston-based logging system with enhanced security, performance monitoring, and flexible configuration.

#### LoggerService (`apps/discord-bot/src/logger/logger.service.ts`)
- **Purpose**: Custom Winston logger implementation with NestJS integration
- **Features**:
  - **Multi-Transport Logging**: Console, error files, combined files, and service-specific files
  - **Security**: Automatic sensitive data filtering (passwords, tokens, keys)
  - **Performance Monitoring**: Method timing, memory usage tracking, slow operation detection  
  - **Error Handling**: Graceful fallbacks, safe flush operations, comprehensive validation
  - **NestJS Integration**: Full compatibility with NestJS LoggerService interface
- **Methods**:
  - `log()`, `error()`, `warn()`, `debug()`, `verbose()` - Standard logging methods
  - `time()`, `timeEnd()` - Performance timing using performance.now()
  - `methodEntry()`, `methodExit()` - Method lifecycle logging
  - `performance()` - Performance metrics with automatic level determination
  - `child()` - Create child loggers with additional context
  - `flush()`, `safeFlush()` - Graceful shutdown support

#### Memory Monitoring
The logger includes intelligent memory monitoring for production environments:
- **Configurable Thresholds**: Warning and debug levels via environment variables
- **Automatic Alerts**: Log warnings when memory usage exceeds thresholds
- **Performance Tracking**: Real-time heap usage monitoring with percentage calculations
- **Environment Variables**:
  ```bash
  MEMORY_WARNING_THRESHOLD=90    # Warning at 90% heap usage (default)
  MEMORY_DEBUG_THRESHOLD=75      # Debug logging at 75% heap usage (default)
  MEMORY_CHECK_INTERVAL=30000    # Check every 30 seconds (default)
  ```

#### File Logging Structure
```
logs/
├── error.log                    # Error-level logs only
├── combined.log                 # All log levels combined
└── services/
    ├── GitHubService.log        # Service-specific logs
    ├── SessionService.log       # Service-specific logs
    └── [ServiceName].log        # Dynamic service-specific logs
```

#### Log Formats
- **Console**: Colorized output with timestamps, service context, and readable formatting
- **Files**: JSON format with structured metadata for parsing and analysis
- **Security**: Automatic masking of sensitive data (tokens, passwords, API keys)

#### Usage Patterns
```typescript
// Basic service logging
export class MyService extends BaseService {
  constructor(loggerFactory: LoggerFactory) {
    super('MyService', loggerFactory);
  }

  async performOperation() {
    this.logger.info('Starting operation', 'performOperation');
    
    // Performance timing
    this.logger.time('database-query');
    const result = await this.queryDatabase();
    const duration = this.logger.timeEnd('database-query');
    
    // Automatic slow operation detection
    this.logger.checkSlowOperation('database-query', duration, 'performOperation');
    
    return result;
  }
}

// Method lifecycle logging
this.logger.methodEntry('processRepository', { repoId: repo.id });
const result = await this.processRepository(repo);
this.logger.methodExit('processRepository', result);
```

#### Configuration Options
All logging behavior is configurable via environment variables:
```bash
# Core logging configuration
LOG_LEVEL=debug                  # Logging level (error, warn, info, debug, verbose)
ENABLE_FILE_LOGS=true           # Enable file logging (default: true)
NODE_ENV=development            # Environment mode affects default log level

# Memory monitoring
MEMORY_WARNING_THRESHOLD=90      # Memory warning threshold percentage
MEMORY_DEBUG_THRESHOLD=75        # Memory debug threshold percentage  
MEMORY_CHECK_INTERVAL=30000      # Memory check interval in milliseconds
```

## Image Service API

The monorepo includes a standalone NestJS image service (`apps/image-service/`) that provides secure, temporary image storage for Discord attachments and other image processing needs.

### Architecture & Features

#### Core Modules
- **Upload Module**: Handles file uploads with validation and metadata extraction
- **Storage Module**: Manages temporary file storage with automatic cleanup
- **Auth Module**: Provides API key and HMAC signature authentication
- **Health Module**: Health checks and service monitoring
- **Redis Module**: Caching and session management

#### Security Features
- **Dual Authentication**: API key + HMAC signature validation
- **File Validation**: Content type and file size validation
- **Temporary Storage**: Automatic file cleanup with configurable TTL
- **Request Rate Limiting**: Protection against abuse
- **CORS Configuration**: Secure cross-origin resource sharing

#### Key Environment Variables
```bash
# Image Service Configuration (.env)
PORT=3001                           # Service port
NODE_ENV=production                 # Environment mode

# Security
API_KEY="generated-api-key"         # API authentication key
SECRET_KEY="generated-secret-key"   # HMAC signature secret

# Redis Configuration
REDIS_HOST=localhost                # Redis server host
REDIS_PORT=6379                     # Redis server port
REDIS_PASSWORD=""                   # Redis authentication

# Storage Configuration
UPLOAD_PATH=./uploads               # File storage directory
MAX_FILE_SIZE=10485760             # Maximum file size (10MB)
DEFAULT_TTL=3600                   # Default file TTL (1 hour)

# Cleanup
CLEANUP_INTERVAL=300               # Cleanup check interval (5 minutes)
```

#### API Endpoints
- `POST /upload` - Upload single or multiple images with metadata
- `GET /files/:id` - Retrieve stored images by ID
- `DELETE /files/:id` - Delete specific images
- `GET /health` - Service health check
- `GET /api-docs` - Interactive API documentation (Swagger)

#### Integration with Discord Bot
The Discord bot integrates with the image service through:
- **ImageServiceClient** - HTTP client for image service API
- **ImageUploadService** - Discord attachment processing
- **Automatic Authentication** - HMAC signature generation for secure requests

### Development Commands (Image Service)
```bash
# Start image service in development
pnpm dev --filter=@claude-code/image-service

# Generate API keys for development
cd apps/image-service && bash scripts/generate-keys.sh

# Build image service only
pnpm build --filter=@claude-code/image-service

# Docker development environment
cd apps/image-service && docker-compose -f docker-compose.dev.yml up
```

## Shared Package

The `packages/shared/` package provides centralized TypeScript type definitions and utilities used across both the Discord bot and image service applications.

### Package Structure
```
packages/shared/src/
├── api.types.ts          # Common API response types
├── constants.ts          # Shared constants across services
├── health.types.ts       # Health check type definitions
├── image.types.ts        # Image service specific types
├── logger/               # Shared logging system
│   ├── index.ts          # Logger exports
│   ├── logger.service.ts # Core logger implementation
│   ├── logger.factory.ts # Logger factory
│   ├── logger.module.ts  # NestJS module
│   ├── logger.config.ts  # Configuration
│   ├── constants.ts      # Logger constants
│   ├── interfaces/       # Type definitions
│   ├── formatters/       # Log formatters
│   ├── transports/       # Winston transports
│   └── utils/            # Logger utilities
└── index.ts             # Package exports
```

### Key Type Definitions
- **ImageUploadResponse** - Standard image upload response format
- **BatchUploadResponse** - Multi-file upload response format
- **HealthCheckResponse** - Service health status format
- **ApiResponse<T>** - Generic API response wrapper
- **SHARED_IMAGE_CONSTANTS** - Image validation and processing constants

### Shared Logger System
The shared package includes a comprehensive Winston-based logging system with:
- **Security**: Automatic sensitive data filtering
- **Performance Monitoring**: Method timing and memory usage tracking
- **Multiple Transports**: Console, file, and service-specific logging
- **NestJS Integration**: Full compatibility with NestJS dependency injection
- **Type Safety**: Complete TypeScript interfaces and type definitions

### Usage in Applications
```typescript
// Import logger components
import { 
  LoggerService, 
  LoggerFactory, 
  LoggerModule,
  CUSTOM_LOGGER 
} from '@claude-code/shared';

// In Discord Bot
import { ImageUploadResponse, SHARED_IMAGE_CONSTANTS } from '@claude-code/shared';

// In Image Service
import { ApiResponse, HealthCheckResponse } from '@claude-code/shared';

// Using the logger in services
import { LoggerService, LoggerFactory } from '@claude-code/shared';

export class MyService {
  private readonly logger: LoggerService;

  constructor(loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.createLogger('MyService');
  }

  async performOperation() {
    this.logger.info('Starting operation');
    this.logger.time('operation-timer');
    
    // ... operation code ...
    
    const duration = this.logger.timeEnd('operation-timer');
    this.logger.performance('operation', duration);
  }
}
```

### Build Configuration
- **Build Tool**: tsup for fast TypeScript compilation
- **Output Formats**: ESM and CommonJS for compatibility
- **Type Definitions**: Automatic .d.ts generation
- **Watch Mode**: Real-time rebuilding during development

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

## Adding New Packages

When you add new applications or packages to the monorepo (docs, web UI, mobile app, etc.), follow the comprehensive guide at [Adding New Packages](./.github/docs/ADDING_NEW_PACKAGES.md). This ensures proper integration with:

- Automated versioning and release management
- CI/CD pipeline and quality checks  
- Conventional commit scopes and validation
- Package-specific tagging and changelog generation

The release system is designed to scale automatically as you add more workspace packages.

## Deployment

### Production Deployment

The Discord bot includes production-ready Docker configuration optimized for deployment platforms like Coolify:

#### Docker Configuration
- **Production Dockerfile**: Multi-stage build with optimized layers (`apps/discord-bot/Dockerfile`)
- **Docker Compose**: Coolify-specific configuration (`docker-compose.coolify.yml`)
- **Security**: Non-root user, health checks, and resource limits
- **Optimization**: Minimal production image with only runtime dependencies

#### Quick Deployment Commands
```bash
# Local Docker testing
cd apps/discord-bot
docker build -t claude-discord-bot .
docker run -d -e DISCORD_TOKEN="token" -e GITHUB_TOKEN="token" claude-discord-bot

# Coolify deployment - use docker-compose.coolify.yml
```

### GitHub Self-Hosted Runners

For executing Claude workflows on your own infrastructure:

#### Runner Configuration
- **Runner Dockerfile**: Ubuntu-based with Node.js, pnpm, and GitHub CLI (`runners/github-actions/Dockerfile`)
- **Auto-Registration**: Automatic runner registration with GitHub (`runners/github-actions/entrypoint.sh`)
- **Docker Compose**: Complete runner setup (`runners/github-actions/docker-compose.yml`)
- **Template Support**: Compatible with Claude workflow templates in `apps/discord-bot/templates/`

#### Quick Runner Setup
```bash
# Configure environment
cd runners/github-actions
cp .env.example .env  # Edit with your tokens and repository

# Deploy runner
docker-compose up -d

# Verify registration in GitHub repository settings
```

### Deployment Documentation

Comprehensive deployment guide available at [`.github/docs/DEPLOYMENT.md`](./.github/docs/DEPLOYMENT.md) covering:
- Coolify platform deployment
- Environment variable configuration
- GitHub self-hosted runner setup
- Security considerations
- Monitoring and troubleshooting
- Performance optimization

## Current Features

This Discord bot provides comprehensive GitHub integration with Claude Code workflow automation through an enhanced multi-step interface:

### Enhanced Workflow
- **Single Command**: `/claude` handles the entire workflow from search to execution
- **Multi-Step Process**: Repository search → File selection → Image upload → Analysis prompt
- **Modal-Based UX**: Interactive text input for repository search and prompts  
- **Smart Validation**: Only shows repositories with `claude.yml` workflow
- **File Explorer**: Interactive file and directory selection for focused analysis
- **Image Integration**: Upload Discord attachments for visual context in analysis
- **Real-time Monitoring**: Automatic status updates and workflow tracking

### Core Repository Management
- Repository search through text input modal
- Intelligent repository matching (exact names and fuzzy search)
- Repository validation with Claude Code workflow detection
- Interactive file tree exploration with common path prioritization
- Session management for multi-step user interactions

### Claude Code Integration
- Enhanced workflow triggering with file and image context
- Real-time workflow status monitoring with Discord message updates
- Custom prompt input through dedicated modal interface
- File selection for targeted analysis of specific code sections
- Image attachment support for visual context (screenshots, diagrams, etc.)
- Automatic workflow file detection and validation (`claude.yml`)
- Background monitoring with status updates and completion notifications

### Image Processing Features
- **Discord Attachment Processing**: Automatic validation and upload of image attachments
- **Temporary Storage**: Secure image storage with automatic cleanup
- **Batch Upload Support**: Handle multiple images in a single workflow
- **Integration Security**: HMAC-signed requests between bot and image service

### Discord Command

#### `/claude`
**Complete Claude Code workflow with enhanced multi-step interface**
1. **Repository Search**: Opens modal to search your repositories
   - Text input for repository name or search term
   - Supports exact matches (`owner/repo`) and fuzzy search
   - Example searches: `"discord-bot"`, `"microsoft/vscode"`

2. **Repository Selection**: Shows validated repositories with Claude Code support
   - Only displays repositories containing `claude.yml` workflow
   - Clear indication of repositories without Claude Code setup
   - Direct selection leads to file explorer

3. **File Selection** (Optional): Interactive file tree exploration
   - Browse repository files and directories
   - Select specific files for focused analysis
   - Common paths prioritized (src/, lib/, README.md, etc.)
   - Skip option for full repository analysis

4. **Image Upload** (Optional): Attach visual context
   - Upload screenshots, diagrams, or other images
   - Automatic validation and processing
   - Batch upload support for multiple images
   - Skip option if no images needed

5. **Analysis Prompt**: Modal for analysis details
   - Custom analysis prompt (required)
   - Optional branch specification (defaults to 'main')
   - Context includes selected files and uploaded images
   - Example prompts: "Review code for security vulnerabilities", "Analyze this UI component"

6. **Workflow Execution**: Automatic dispatch and monitoring
   - Real-time status updates in Discord
   - Workflow progress tracking with status buttons
   - Completion notifications with results
   - Enhanced context from files and images

### Workflow Requirements
For repositories to support Claude Code analysis, they must contain:
- `.github/workflows/claude.yml` - GitHub Actions workflow file
- Proper workflow inputs configuration for prompt handling
- Repository access permissions for the bot's GitHub token

### Benefits of Enhanced Design
- **Unified Workflow**: Single `/claude` command handles complete analysis pipeline
- **Contextual Analysis**: File selection and image uploads provide targeted context
- **Better Validation**: Pre-validates Claude Code support before prompting
- **Interactive Experience**: Step-by-step guided workflow with clear skip options
- **Visual Context**: Support for screenshots, diagrams, and visual documentation
- **Error Prevention**: Only shows compatible repositories with validation
- **Flexible Usage**: Optional steps allow both quick and detailed analysis workflows

## Commit and Release Workflow (CRITICAL - READ FIRST)

**ALWAYS follow these steps when making changes to this repository:**

### 1. Before Making Changes
- Check current branch: `git branch`  
- Create feature branch if needed: `git checkout -b feat/your-feature-name`
- Ensure dependencies are up to date: `pnpm install`

### 2. Making Code Changes
- Follow existing code patterns and architecture outlined above
- Run quality checks as you develop: `pnpm lint`, `pnpm typecheck`
- Test your changes: `pnpm build`

### 3. Commit Message Requirements (ENFORCED BY HOOKS)
**This project uses Conventional Commits with strict validation via Commitlint.**

Format: `type(scope): description`

**Required Types:**
- `feat` - New feature
- `fix` - Bug fix  
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Test changes
- `build` - Build system changes
- `ci` - CI/CD changes
- `chore` - Other changes
- `revert` - Revert previous commit

**Required Scopes:**
- `discord-bot` - Discord bot application changes
- `image-service` - Image service API application changes
- `shared` - Shared package changes
- `root` - Root workspace changes
- `ci` - CI/CD changes
- `docs` - Documentation
- `deps` - Dependencies
- `release` - Release-related
- `config` - Configuration changes
- `template` - Template changes
- `packages` - Packages directory
- `scripts` - Scripts directory
- `docker` - Docker changes
- `docker-compose` - Docker compose changes
- `dockerfile` - Dockerfile changes
- `commitlint` - Commitlint changes
- `husky` - Husky changes
- `turbo` - Turbo changes

**Examples:**
```bash
git commit -m "feat(discord-bot): add repository search modal"
git commit -m "feat(image-service): implement image upload API with HMAC auth"
git commit -m "feat(shared): add image upload response types"
git commit -m "fix(discord-bot): resolve session timeout issue"  
git commit -m "docs(root): update contributing guidelines"
git commit -m "ci(root): add release automation workflow"
git commit -m "docker(image-service): optimize production dockerfile"
```

### 4. Changeset Management (REQUIRED FOR RELEASES)
**If your changes should trigger a release, ALWAYS create a changeset:**

```bash
# Create a changeset
pnpm changeset

# Follow the prompts:
# 1. Select packages to bump (usually @claude-code/discord-bot)
# 2. Choose bump type:
#    - patch: Bug fixes, small improvements
#    - minor: New features, backward compatible
#    - major: Breaking changes
# 3. Write a clear summary for the changelog
```

**Changeset Examples:**
- Patch: "Fix session cleanup memory leak"
- Minor: "Add support for repository file selection"
- Major: "Redesign command interface (breaking changes)"

**When NOT to create changeset:**
- Documentation-only changes (`docs` scope)
- Test changes that don't affect functionality
- CI/CD changes (`ci` scope)
- Development dependencies updates

### 5. Pre-Commit Hooks (AUTOMATIC)
Git hooks will AUTOMATICALLY run and may block commits if:
- Commit message doesn't follow conventional format
- Code doesn't pass linting (`pnpm lint`)
- TypeScript compilation fails (`pnpm typecheck`)  
- Code formatting is incorrect (`pnpm format`)

**If blocked:** Fix issues and try committing again.

### 6. Creating Pull Requests
**When pushing a PR:**

```bash
# Push your branch
git push origin feat/your-feature-name

# Create PR through GitHub UI or CLI
# The following will happen automatically:
# - Commit message validation on all PR commits
# - Changeset detection and preview
# - Code quality checks (lint, type, build)
# - Automated PR comments about changesets
```

**PR Requirements:**
- All commits must follow conventional commit format
- Include changeset if changes should trigger release
- Pass all CI checks (enforced)
- Provide clear PR description

### 7. Available Scripts for Development
```bash
# Core development
pnpm dev                     # Start Discord bot in watch mode
pnpm build                   # Build all packages
pnpm lint                    # Run linting (auto-fix)
pnpm typecheck              # TypeScript validation
pnpm format                 # Format code with Prettier

# Release management
pnpm changeset              # Create new changeset
pnpm changeset:status       # Check changeset status  
pnpm version               # Version packages (CI only)
pnpm release               # Publish packages (CI only)

# Validation helpers
pnpm lint:commit           # Test commit message format
pnpm ci:version-check      # Check version status
```

### 8. Release Process (AUTOMATED)
**Releases happen automatically when PR with changesets is merged to master:**
1. GitHub Actions detects changesets
2. Versions are bumped automatically
3. Changelogs are generated
4. GitHub release is created
5. Git tags are created

**Manual release check:**
```bash
pnpm changeset:status  # See what will be released
```

### 9. Emergency Fixes
For critical hotfixes to master:
```bash
git checkout master
git pull origin master
# Make minimal fix
git commit -m "fix(discord-bot): critical security patch"
# Create patch changeset
pnpm changeset  # Select patch, describe fix
git push origin master  # Triggers automated release
```

### 10. Common Issues & Solutions

**Commit rejected by commitlint?**
- Check message format: `type(scope): description`
- Use valid type and scope from lists above
- Use lowercase for description
- Example: `feat(discord-bot): add new feature`

**Pre-commit hooks failing?**
```bash
pnpm lint     # Fix linting issues
pnpm format   # Fix formatting  
pnpm build    # Ensure it builds cleanly
```

**Changeset confusion?**
- If unsure about need for changeset, create one anyway - better safe than sorry
- Use patch for most bug fixes and small improvements
- Use minor for new features that don't break existing functionality
- Use major only for breaking changes that require user action

**Build or type errors?**
```bash
pnpm typecheck  # Check TypeScript errors
pnpm lint       # Check and fix code style
pnpm build      # Verify successful compilation
```

**IMPORTANT REMINDERS:**
- All quality checks are enforced automatically via Git hooks and CI
- Focus on writing good code and following commit format
- The automated tools will guide you through the rest
- When in doubt, create a changeset - releases can be managed later
- Follow conventional commits exactly - the format is strictly enforced