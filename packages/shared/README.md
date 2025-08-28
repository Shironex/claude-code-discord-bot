# @claude-code/shared

Shared TypeScript types, interfaces, and utilities for the Claude Code Discord Bot ecosystem.

## Overview

This package provides common types, interfaces, and constants used across the Claude Code Discord Bot and Image Service applications. It ensures type consistency and reduces code duplication between services.

## Installation

### For local workspace development

Add to project's `package.json` dependencies:

```json
{
  "dependencies": {
    "@claude-code/shared": "workspace:*"
  }
}
```

Then install with:

```bash
pnpm install
```

### For external projects

```bash
pnpm add @claude-code/shared
```

## Usage

```typescript
import { 
  ImageMetadata, 
  ImageUploadResponse, 
  ApiResponse,
  SHARED_IMAGE_CONSTANTS 
} from '@claude-code/shared';

// Use shared types
const metadata: ImageMetadata = {
  id: 'abc123',
  size: 1024000,
  mimeType: 'image/png',
  uploadedAt: new Date(),
  expiresAt: new Date(Date.now() + 3600000),
  originalName: 'screenshot.png'
};

// Use shared constants
const maxSize = SHARED_IMAGE_CONSTANTS.MAX_FILE_SIZE;
const supportedTypes = SHARED_IMAGE_CONSTANTS.SUPPORTED_MIME_TYPES;
```

## Included Types

### Image Types
- `ImageMetadata` - Core image metadata
- `ImageMetadataExtended` - Extended metadata with processing info
- `StoredImage` - Image data with metadata
- `ImageUploadResponse` - Upload response structure
- `BatchUploadResponse` - Batch upload response
- `ImageProcessingOptions` - Image processing configuration
- `FileValidationResult` - File validation results
- `UploadConfig` - Upload configuration
- `StorageStats` - Storage statistics

### API Types  
- `ApiResponse<T>` - Standard API response wrapper
- `PaginationOptions` - Pagination parameters
- `PaginatedResponse<T>` - Paginated response structure
- `RateLimitResult` - Rate limiting results
- `RateLimitStatus` - Rate limiting status
- `AuthContext` - Authentication context
- `AuthConfig` - Authentication configuration
- `DeleteResponse` - Delete operation response

### Health Types
- `HealthCheckResult` - Complete health check status
- `ServiceHealthStatus` - Individual service health
- `CleanupResult` - Cleanup operation results
- `UploadProgress` - Upload progress tracking

### Constants
- `SHARED_IMAGE_CONSTANTS` - Image service constants
- `DISCORD_CONSTANTS` - Discord integration constants  
- `GITHUB_CONSTANTS` - GitHub integration constants

### Utility Types
- `RequiredKeys<T, K>` - Make specific keys required
- `OptionalKeys<T, K>` - Make specific keys optional
- `DeepPartial<T>` - Deep partial type
- `SuccessResponse<T>` - Typed success response
- `ErrorResponse` - Typed error response
- `ApiResult<T>` - Union of success/error responses

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Development mode (watch)
pnpm dev

# Type checking
pnpm typecheck

# Clean build files
pnpm clean
```

## Integration

This package is automatically built and published as part of the monorepo. It's consumed by:

- `@claude-code/discord-bot` - Discord bot application
- `@claude-code/image-service` - Image service API

Both applications reference this package for consistent type definitions and shared constants.