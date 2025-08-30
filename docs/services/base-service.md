# BaseService Documentation

## Overview

BaseService is the abstract base class for all services in the Discord bot application. It provides consistent logging and GitHub integration capabilities across all services.

## Features

- **Consistent Logging**: Provides standardized logging through LoggerService integration
- **GitHub Integration**: Centralized Octokit initialization and management
- **Configuration Management**: Integrates with NestJS ConfigService
- **Error Handling**: Standardized GitHub access validation

## Constructor

```typescript
constructor(
    serviceName: string, 
    loggerFactory?: LoggerFactory, 
    configService?: ConfigService,
    requireGitHub: boolean = false
)
```

### Parameters

- `serviceName` (required): Name of the service for logging context
- `loggerFactory` (optional): LoggerFactory for dependency injection
- `configService` (optional): ConfigService for GitHub token access
- `requireGitHub` (optional): Whether GitHub token is required (throws error if missing)

## Protected Properties

- `logger`: LoggerService instance for service-specific logging
- `octokit`: Octokit client instance (null if no GitHub token)
- `hasGitHubAccess`: Boolean flag indicating GitHub availability

## Protected Methods

### `validateGitHubAccess(): void`

Validates that GitHub access is available. Throws error if not configured.

```typescript
async getUserRepositories(): Promise<Repository[]> {
    this.validateGitHubAccess(); // Throws if no GitHub token
    
    const { data } = await this.octokit.rest.repos.listForAuthenticatedUser();
    return data;
}
```

## Usage Patterns

### Basic Service (No GitHub Required)

```typescript
@Injectable()
export class MyService extends BaseService {
    constructor(loggerFactory: LoggerFactory) {
        super('MyService', loggerFactory);
    }
    
    doSomething(): void {
        this.logger.log('Doing something');
    }
}
```

### GitHub-Enabled Service

```typescript
@Injectable()
export class GitHubEnabledService extends BaseService {
    constructor(
        configService: ConfigService,
        loggerFactory: LoggerFactory
    ) {
        super('GitHubEnabledService', loggerFactory, configService, true);
    }
    
    async fetchData(): Promise<any> {
        this.validateGitHubAccess();
        return await this.octokit.rest.repos.get({ owner: 'user', repo: 'repo' });
    }
}
```

### Optional GitHub Service

```typescript
@Injectable()
export class OptionalGitHubService extends BaseService {
    constructor(
        configService: ConfigService,
        loggerFactory: LoggerFactory
    ) {
        super('OptionalGitHubService', loggerFactory, configService, false);
    }
    
    async fetchDataIfAvailable(): Promise<any> {
        if (this.hasGitHubAccess) {
            return await this.octokit.rest.repos.get({ owner: 'user', repo: 'repo' });
        }
        
        this.logger.warn('GitHub not available, returning cached data');
        return getCachedData();
    }
}
```

## Configuration

### Environment Variables

- `GITHUB_TOKEN`: Personal access token for GitHub API access

### Dependency Injection

BaseService integrates with NestJS dependency injection:

```typescript
// app.module.ts
@Module({
    imports: [LoggerModule, ConfigModule.forRoot({ isGlobal: true })],
    providers: [MyService],
})
export class AppModule {}
```

## Error Handling

### GitHub Token Validation

When `requireGitHub` is true, BaseService will throw an error during construction if no GitHub token is found:

```typescript
// This will throw if GITHUB_TOKEN is not set
super('GitHubService', loggerFactory, configService, true);
```

### Runtime Validation

Use `validateGitHubAccess()` for runtime checks:

```typescript
async performGitHubOperation(): Promise<void> {
    this.validateGitHubAccess(); // Throws: "GitHub token not configured - operation requires GitHub access"
    
    // Safe to use this.octokit here
    await this.octokit.rest.repos.get({ owner: 'user', repo: 'repo' });
}
```

## Migration from Previous Pattern

### Before (Duplicate Initialization)

```typescript
@Injectable()
export class OldService extends BaseService {
    private octokit: Octokit | null = null;

    constructor(private configService: ConfigService) {
        super('OldService');
        const token = this.configService.get<string>('GITHUB_TOKEN');

        if (token) {
            this.octokit = new Octokit({ auth: token });
            this.logger.log('Service initialized with token');
        } else {
            this.logger.warn('GitHub token not found');
        }
    }

    async fetchData(): Promise<any> {
        if (!this.octokit) {
            throw new Error('GitHub token not configured');
        }
        return await this.octokit.rest.repos.get({ owner: 'user', repo: 'repo' });
    }
}
```

### After (Using Enhanced BaseService)

```typescript
@Injectable()
export class NewService extends BaseService {
    constructor(
        configService: ConfigService,
        loggerFactory: LoggerFactory
    ) {
        super('NewService', loggerFactory, configService, true);
    }

    async fetchData(): Promise<any> {
        this.validateGitHubAccess();
        return await this.octokit.rest.repos.get({ owner: 'user', repo: 'repo' });
    }
}
```

## Benefits

- **60+ lines of duplicate code eliminated** across GitHub services
- **Single source of truth** for GitHub client configuration
- **Consistent error handling** across all GitHub services
- **Simplified testing** with centralized mocking points
- **Better maintainability** through reduced code duplication
- **Easy to add global features** like rate limiting, retries, etc.

## Related Services

Services that extend BaseService with GitHub integration:

- [GitHubService](github-service.md) - Repository management
- [WorkflowService](workflow-service.md) - GitHub Actions workflow control
- [FileExplorerService](file-explorer-service.md) - Repository file tree exploration

## Architecture Notes

BaseService is part of the service-based architecture where all services follow consistent patterns for logging and external API integration. This refactoring consolidates GitHub client management while maintaining backward compatibility.