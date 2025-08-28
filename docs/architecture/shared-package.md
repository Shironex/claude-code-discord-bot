# Shared Package Architecture

The `packages/shared/` package provides centralized TypeScript type definitions and utilities used across both the Discord bot and image service applications.

## Package Structure

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

## Core Type Definitions

### API Response Types

#### Generic API Response
```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  timestamp: string;
}
```

#### Image Upload Responses
```typescript
export interface ImageUploadResponse {
  id: string;
  filename: string;
  size: number;
  contentType: string;
  url: string;
  expiresAt: string;
}

export interface BatchUploadResponse {
  uploads: ImageUploadResponse[];
  failed: Array<{
    filename: string;
    error: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}
```

#### Health Check Types
```typescript
export interface HealthCheckResponse {
  status: 'ok' | 'error' | 'degraded';
  timestamp: string;
  uptime: number;
  version?: string;
  memory?: {
    used: string;
    total: string;
    percentage: number;
  };
  dependencies?: Record<string, 'connected' | 'disconnected' | 'error'>;
}
```

### Image Service Types

#### File Metadata
```typescript
export interface FileMetadata {
  filename: string;
  size: number;
  contentType: string;
  lastModified?: Date;
}

export interface ImageMetadata extends FileMetadata {
  width?: number;
  height?: number;
  format?: string;
}
```

#### Upload Configuration
```typescript
export interface UploadConfig {
  maxFileSize: number;
  allowedTypes: string[];
  ttl: number;
  uploadPath: string;
}
```

### Shared Constants

```typescript
export const SHARED_IMAGE_CONSTANTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp'
  ],
  DEFAULT_TTL: 3600, // 1 hour
  CLEANUP_INTERVAL: 300000, // 5 minutes
} as const;

export const SHARED_API_CONSTANTS = {
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RATE_LIMIT_WINDOW: 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
} as const;
```

## Shared Logger System

### Architecture Overview

The shared package includes a comprehensive Winston-based logging system with:
- **Security**: Automatic sensitive data filtering
- **Performance Monitoring**: Method timing and memory usage tracking
- **Multiple Transports**: Console, file, and service-specific logging
- **NestJS Integration**: Full compatibility with NestJS dependency injection
- **Type Safety**: Complete TypeScript interfaces and type definitions

### Logger Service Features

#### Core Logging Methods
```typescript
export class LoggerService {
  log(message: string, context?: string): void;
  error(message: string, error?: Error, context?: string): void;
  warn(message: string, context?: string): void;
  debug(message: string, context?: string): void;
  verbose(message: string, context?: string): void;
}
```

#### Performance Monitoring
```typescript
export class LoggerService {
  time(label: string): void;
  timeEnd(label: string): number;
  performance(operation: string, duration: number, context?: string): void;
  methodEntry(methodName: string, args?: any): void;
  methodExit(methodName: string, result?: any): void;
}
```

#### Memory Monitoring
```typescript
export class LoggerService {
  private checkMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const percentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    if (percentage > this.memoryWarningThreshold) {
      this.warn(`High memory usage: ${heapUsedMB}MB/${heapTotalMB}MB (${percentage}%)`);
    }
  }
}
```

### Logger Configuration

#### Transport Configuration
```typescript
export interface LoggerTransportConfig {
  level: string;
  filename?: string;
  handleExceptions?: boolean;
  format?: winston.Logform.Format;
  silent?: boolean;
}

export interface LoggerConfig {
  level: string;
  enableFileLogging: boolean;
  enableConsoleLogging: boolean;
  memoryWarningThreshold: number;
  memoryDebugThreshold: number;
  memoryCheckInterval: number;
}
```

#### Security Features
```typescript
export class SecurityUtils {
  static sanitizeLogData(data: any): any {
    const sensitiveKeys = [
      'password', 'token', 'apikey', 'api_key', 
      'secret', 'auth', 'authorization'
    ];
    
    return this.maskSensitiveData(data, sensitiveKeys);
  }
  
  private static maskSensitiveData(obj: any, keys: string[]): any {
    // Recursively mask sensitive data
  }
}
```

## Usage Patterns in Applications

### Discord Bot Integration

#### Service Implementation
```typescript
import { LoggerService, LoggerFactory } from '@claude-code/shared';

export class GitHubService {
  private readonly logger: LoggerService;

  constructor(loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.createLogger('GitHubService');
  }

  async searchRepositories(query: string): Promise<Repository[]> {
    this.logger.methodEntry('searchRepositories', { query });
    this.logger.time('github-search');
    
    try {
      const repos = await this.octokit.search.repos({ q: query });
      const duration = this.logger.timeEnd('github-search');
      
      this.logger.performance('github-search', duration);
      this.logger.methodExit('searchRepositories', { count: repos.data.items.length });
      
      return repos.data.items;
    } catch (error) {
      this.logger.error('Failed to search repositories', error);
      throw error;
    }
  }
}
```

#### Type Usage
```typescript
import { ImageUploadResponse, SHARED_IMAGE_CONSTANTS } from '@claude-code/shared';

export class ImageUploadService {
  async uploadDiscordAttachment(attachment: Attachment): Promise<ImageUploadResponse> {
    if (attachment.size > SHARED_IMAGE_CONSTANTS.MAX_FILE_SIZE) {
      throw new Error('File too large');
    }
    
    if (!SHARED_IMAGE_CONSTANTS.ALLOWED_TYPES.includes(attachment.contentType)) {
      throw new Error('Invalid file type');
    }
    
    // Upload logic
  }
}
```

### Image Service Integration

```typescript
import { ApiResponse, HealthCheckResponse } from '@claude-code/shared';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: this.getMemoryInfo(),
      dependencies: this.checkDependencies()
    };
  }
}
```

## Build Configuration

### Build Tool: tsup
```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
});
```

### Output Formats
- **ESM**: Modern ES modules for tree-shaking
- **CommonJS**: Legacy support for older Node.js
- **Type Definitions**: Automatic .d.ts generation
- **Source Maps**: Debugging support

### Package Dependencies
```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "winston": "^3.10.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "tsup": "^7.0.0"
  }
}
```

## Versioning Strategy

### Semantic Versioning
- **Major**: Breaking changes to public APIs
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, no API changes

### Changeset Integration
```bash
# Create changeset for shared package changes
pnpm changeset

# Select @claude-code/shared
# Choose version bump type
# Describe changes for changelog
```

### Consumer Updates
When shared package is updated:
1. Dependent packages automatically detect changes
2. Turborepo rebuilds dependent applications
3. Type checking ensures compatibility
4. Tests validate integration

## Testing Architecture

### Unit Testing
```typescript
// logger.service.test.ts
describe('LoggerService', () => {
  let loggerService: LoggerService;

  beforeEach(() => {
    loggerService = new LoggerService(mockConfig);
  });

  it('should mask sensitive data in logs', () => {
    const sensitiveData = { password: 'secret123', username: 'user' };
    const result = loggerService.sanitizeLogData(sensitiveData);
    
    expect(result.password).toBe('***REDACTED***');
    expect(result.username).toBe('user');
  });
});
```

### Integration Testing
- Cross-package integration tests
- Type compatibility verification
- Performance benchmarks
- Memory usage testing

## Related Documentation

- [Logging System](../features/logging-system.md) - Logger usage and features
- [Development Patterns](../development/patterns.md) - Using shared types
- [Discord Bot Architecture](./discord-bot.md) - Bot integration
- [Image Service Architecture](./image-service.md) - Service integration

[← Back to Architecture](./README.md)