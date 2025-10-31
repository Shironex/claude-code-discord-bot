# Discord Bot Architecture

The Discord bot follows a clean, modular architecture with separation of concerns and clear layering.

## Application Structure

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
│   ├── health-check.service.ts     # Bot health monitoring and diagnostics
│   ├── startup.service.ts          # Application startup and configuration
│   └── image-service/              # Image handling integration
│       ├── image-service.client.ts # Image service API client
│       ├── image-service.module.ts # Image service module configuration
│       └── image-upload.service.ts # Discord attachment uploading
├── commands/              # Discord slash command handlers
│   ├── debug/
│   │   └── image-service.command.ts # /image-service debug command
│   ├── health/
│   │   └── doctor.command.ts       # /doctor command - health check
│   └── repository/
│       └── claude.command.ts       # /claude command - unified workflow entry
├── interactions/          # Discord interaction handlers
│   ├── buttons/
│   │   ├── add-images.button.ts           # Add images to analysis
│   │   ├── cancel.button.ts               # Cancel operation button
│   │   ├── claude-prompt-trigger.button.ts # Trigger Claude prompt modal
│   │   ├── open-claude-prompt.button.ts   # Open Claude prompt interface
│   │   ├── refresh-health.button.ts       # Refresh health status check
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
│   │   ├── workflow.interface.ts   # Workflow data types
│   │   └── health.interface.ts     # Health check data types
│   └── discord/           # Discord-specific types
│       └── discord.interface.ts    # Discord component types
├── app.module.ts          # Root module with dependency injection
└── main.ts               # Application entry point
```

## Architectural Layers

### 1. Services Layer
**Location**: `src/services/`
**Purpose**: Business logic and external API integrations

#### Core Services:
- **GitHub Service**: Repository management and API integration
- **Session Service**: User state management across interactions
- **Embed Service**: Centralized Discord UI creation
- **Workflow Service**: GitHub Actions workflow automation
- **File Explorer Service**: Repository file tree exploration
- **Image Upload Service**: Discord attachment processing
- **Health Check Service**: Component health monitoring and diagnostics

#### Service Patterns:
- All services extend `BaseService` for consistent logging
- Constructor-based dependency injection
- Proper error handling with user-friendly messages
- Separation of concerns and single responsibility

### 2. Commands Layer
**Location**: `src/commands/`
**Purpose**: Discord slash command entry points

#### Command Structure:
- Organized by category (debug, repository, etc.)
- Use `@SlashCommand()` decorator for registration
- Handle initial user interactions
- Delegate business logic to services

### 3. Interactions Layer
**Location**: `src/interactions/`
**Purpose**: Handle Discord component interactions

#### Interaction Types:
- **Buttons**: Action buttons for workflow steps
- **Modals**: Text input forms for user data
- **Selects**: Dropdown menus for choices
- **Listeners**: Event-based handlers for uploads

### 4. Utilities Layer
**Location**: `src/utils/`
**Purpose**: Shared helper functions and constants

#### Utility Categories:
- Discord-specific utilities and constants
- GitHub API helpers and constants
- File tree manipulation utilities
- Security utilities for sensitive data handling
- Type guards for runtime type checking

### 5. Interfaces Layer
**Location**: `src/interfaces/`
**Purpose**: TypeScript type definitions organized by domain

#### Interface Organization:
- **Services**: Service contracts and interfaces
- **Models**: Data models and DTOs
- **Discord**: Discord-specific type definitions

## Dependency Injection Architecture

### Module Structure
```typescript
@Module({
  imports: [
    NecordModule.forRoot({
      token: process.env.DISCORD_TOKEN,
      intents: [GatewayIntentBits.Guilds],
      development: [process.env.DEV_GUILD],
    }),
    LoggerModule,
    ImageServiceModule,
  ],
  providers: [
    // Services
    GitHubService,
    SessionService,
    EmbedService,
    WorkflowService,
    FileExplorerService,
    
    // Commands
    ClaudeCommand,
    
    // Interactions
    RepositorySelectHandler,
    FilePathSelectHandler,
    // ... all interaction handlers
  ],
})
export class AppModule {}
```

### Dependency Flow
- **Services** are injected into commands and interactions
- **Logger** is injected into all services via BaseService
- **Configuration** is handled through environment variables
- **External APIs** (GitHub, Image Service) are abstracted through services

## Error Handling Strategy

### Centralized Error Handling
- EmbedService creates consistent error messages
- Graceful degradation for API failures
- User-friendly error responses in Discord
- Comprehensive logging for debugging

### Error Types
- **Validation Errors**: User input validation
- **API Errors**: External service failures
- **Session Errors**: State management issues
- **Permission Errors**: GitHub access problems

## Session Management Architecture

### Session Lifecycle
1. **Creation**: User initiates command interaction
2. **Updates**: State changes through interaction handlers
3. **Cleanup**: Automatic expiration after 30 minutes
4. **Persistence**: In-memory storage with cleanup intervals

### Session Data Structure
- Repository selection state
- File selection state
- Image upload state
- Workflow execution state
- User preferences and settings

## Integration Patterns

### GitHub Integration
- Octokit REST API client
- Repository search and validation
- Workflow dispatch and monitoring
- File tree exploration with caching

### Discord Integration
- Necord decorators for clean command handling
- Type-safe interaction components
- Consistent embed styling and branding
- Real-time status updates

### Image Service Integration
- HTTP client with HMAC authentication
- Automatic retry and error handling
- Batch upload support
- Integration with Discord attachments

## Performance Considerations

### Caching Strategy
- File tree caching for large repositories
- Session cleanup to prevent memory leaks
- GitHub API rate limiting handling

### Asynchronous Operations
- Non-blocking workflow monitoring
- Background session cleanup
- Parallel API calls where possible

## Health Monitoring Architecture

### Overview
The health monitoring system provides real-time diagnostics across all bot components through the `/doctor` command. It implements intelligent caching, parallel execution, and timeout protection to ensure efficient monitoring without impacting bot performance.

### Components Monitored

#### 1. Bot Runtime
- Process uptime tracking
- Memory usage monitoring (heap used/total)
- Memory pressure thresholds (operational < 75%, degraded 75-90%, critical > 90%)
- Response time metrics

#### 2. GitHub Integration
- Token validity verification
- API rate limit monitoring (5000 requests/hour)
- API connectivity checks
- Status thresholds based on remaining rate limit calls

#### 3. Session Management
- Active session count tracking
- Session memory estimation
- Load thresholds (operational < 50, degraded 50-100, critical > 100 sessions)

#### 4. Image Service
- Service connectivity testing
- Health endpoint verification
- Response time monitoring
- Service availability status

### Architecture Pattern

```
/doctor command
    ↓
DoctorCommand (command handler)
    ↓
HealthCheckService (health checks coordination)
    ↓
[Parallel Execution with 3s timeout per check]
    ├─ checkBotRuntime() → process.memoryUsage(), uptime
    ├─ checkGitHubIntegration() → octokit.rest.rateLimit.get()
    ├─ checkSessionHealth() → sessionService.sessions.size
    └─ checkImageService() → imageServiceClient.testConnection()
    ↓
determineOverallStatus() → aggregate results
    ↓
EmbedService.createHealthCheckEmbed()
    ↓
Discord embed with refresh button
```

### Caching Strategy
- **Cache Duration**: 5 minutes (300,000ms)
- **Cache Invalidation**: Time-based expiration or manual refresh via button
- **Benefits**:
  - Reduces GitHub API calls (rate limit protection)
  - Improves response time (< 100ms for cached checks)
  - Minimizes system load for frequent checks

### Timeout Protection
- Each component check has a **3-second timeout**
- Timeouts return critical status (don't crash entire check)
- Allows partial status information even with failures
- Comprehensive error logging for debugging

### Status Determination
Overall status is determined by worst component status:
1. If any component is critical → overall is critical
2. If any component is degraded → overall is degraded
3. If all are unavailable → overall is unavailable
4. Otherwise → overall is operational

### Performance Characteristics
- **Cached response**: < 100ms
- **Fresh check**: 500-1000ms (all healthy)
- **Maximum time**: 3000ms (timeout protection)
- **Parallel execution**: Total time = slowest check

### User Interface
- **Color-coded indicators**: 🟢 (operational), 🟡 (degraded), 🔴 (critical), ⚪ (unavailable)
- **Detailed metrics**: Response time, memory usage, rate limits, session counts
- **Interactive refresh**: Manual refresh button to bypass cache
- **Ephemeral responses**: Private status information

### Error Handling
- **Component isolation**: One failing check doesn't crash entire health check
- **Graceful degradation**: Failed checks return critical status
- **Detailed logging**: All errors logged with context
- **User-friendly messages**: Clear error descriptions in Discord

## Related Documentation

- [Services Documentation](../services/) - Individual service details
- [Development Patterns](../development/patterns.md) - Implementation patterns
- [Discord Commands](../features/discord-commands.md) - Command usage
- [Logging System](../features/logging-system.md) - Logging architecture

[← Back to Architecture](./README.md)