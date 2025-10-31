# Health Check Service

**File:** `apps/discord-bot/src/services/health-check.service.ts`

## Overview

The Health Check Service provides comprehensive real-time monitoring of all bot components. It implements intelligent caching, parallel execution, and timeout protection to ensure efficient and reliable health checks.

## Purpose

- Monitor bot runtime health (uptime, memory, performance)
- Check GitHub API integration status and rate limits
- Track session management health
- Verify image service connectivity and status
- Provide diagnostic information for troubleshooting
- Support the `/doctor` command

## Class Definition

```typescript
@Injectable()
export class HealthCheckService extends BaseService {
  constructor(
    loggerFactory: LoggerFactory,
    private readonly configService: ConfigService,
    private readonly githubService: GitHubService,
    private readonly sessionService: SessionService,
    private readonly imageServiceClient: ImageServiceClient
  ) {
    super(HealthCheckService.name, loggerFactory);
  }
}
```

## Dependencies

- **LoggerFactory**: Structured logging across all health checks
- **ConfigService**: Access to configuration values
- **GitHubService**: GitHub API integration health
- **SessionService**: Session management metrics
- **ImageServiceClient**: Image service connectivity

## Key Methods

### `getFullHealthStatus(forceRefresh?: boolean): Promise<BotHealthStatus>`

Returns comprehensive health status across all components.

**Parameters:**
- `forceRefresh` (optional): If `true`, bypass cache and perform fresh checks

**Returns:** `BotHealthStatus` object containing:
- Overall status (operational, degraded, critical, unavailable)
- Individual component health details
- Timestamp and cache status

**Behavior:**
- Checks cache validity (5-minute TTL)
- Returns cached result if valid and not forcing refresh
- Executes all checks in parallel if cache miss or forced
- Caches result for subsequent requests
- Determines overall status based on worst component status

**Example:**
```typescript
// Get cached status (if available)
const status = await healthCheckService.getFullHealthStatus();

// Force fresh check
const freshStatus = await healthCheckService.getFullHealthStatus(true);
```

### `checkBotRuntime(): Promise<ComponentHealth>`

**Private method** that checks bot runtime health.

**Checks:**
- Process uptime calculation
- Memory usage (heap used vs total)
- Memory pressure percentage

**Status Logic:**
- 🟢 Operational: Memory usage < 75%
- 🟡 Degraded: Memory usage 75-90%
- 🔴 Critical: Memory usage > 90%

**Returns:**
```typescript
{
  status: 'operational' | 'degraded' | 'critical',
  message: 'Bot runtime is healthy',
  responseTime: 12,
  details: {
    uptime: 19920,  // seconds
    memory: {
      used: 145,
      total: 200,
      percentage: 72
    }
  },
  lastCheck: Date
}
```

### `checkGitHubIntegration(): Promise<ComponentHealth>`

**Private method** that verifies GitHub API integration.

**Checks:**
- Token configuration status
- API rate limit information
- API connectivity and response time

**Status Logic:**
- 🟢 Operational: Rate limit > 100 calls remaining
- 🟡 Degraded: Rate limit < 100 calls remaining
- 🔴 Critical: Rate limit exhausted or API error
- ⚪ Unavailable: No token configured

**API Calls:**
- `octokit.rest.rateLimit.get()` - Gets current rate limit status

**Returns:**
```typescript
{
  status: 'operational' | 'degraded' | 'critical' | 'unavailable',
  message: 'GitHub integration is healthy',
  responseTime: 234,
  details: {
    rateLimit: {
      remaining: 4891,
      limit: 5000,
      reset: Date  // When rate limit resets
    }
  },
  lastCheck: Date
}
```

### `checkSessionHealth(): Promise<ComponentHealth>`

**Private method** that monitors session management.

**Checks:**
- Number of active user sessions
- Session memory utilization estimate

**Status Logic:**
- 🟢 Operational: < 50 active sessions
- 🟡 Degraded: 50-100 active sessions
- 🔴 Critical: > 100 active sessions

**Returns:**
```typescript
{
  status: 'operational' | 'degraded' | 'critical',
  message: 'Session health is good',
  responseTime: 5,
  details: {
    activeSessions: 12
  },
  lastCheck: Date
}
```

### `checkImageService(): Promise<ComponentHealth>`

**Private method** that verifies image service connectivity.

**Checks:**
- Service configuration status
- Connection test
- Health endpoint status
- Response time monitoring

**Status Logic:**
- 🟢 Operational: Connection successful, response < 2s
- 🟡 Degraded: Connection successful, response > 2s
- 🔴 Critical: Connection failed
- ⚪ Unavailable: Service not configured

**API Calls:**
- `imageServiceClient.testConnection()` - Connectivity test
- `imageServiceClient.getHealth()` - Service health endpoint

**Returns:**
```typescript
{
  status: 'operational' | 'degraded' | 'critical' | 'unavailable',
  message: 'Image service is healthy',
  responseTime: 156,
  details: {
    version: '1.0.0',
    uptime: 8100  // seconds
  },
  lastCheck: Date
}
```

### `clearCache(): void`

Clears the cached health result. Useful for:
- Testing scenarios
- Forcing immediate re-check
- Cache invalidation after configuration changes

**Example:**
```typescript
healthCheckService.clearCache();
const freshStatus = await healthCheckService.getFullHealthStatus();
```

## Private Utility Methods

### `determineOverallStatus(components: ComponentHealth[]): HealthStatus`

Determines the overall bot health based on individual components.

**Logic:**
1. If any component is critical → overall is critical
2. If any component is degraded → overall is degraded
3. If all components are unavailable → overall is unavailable
4. Otherwise → overall is operational

### `withTimeout<T>(promise: Promise<T>, timeoutMs: number, componentName: string): Promise<T>`

Wraps health check promises with timeout protection.

**Parameters:**
- `promise`: The health check promise to execute
- `timeoutMs`: Timeout in milliseconds (default: 3000ms)
- `componentName`: Name for logging purposes

**Behavior:**
- Races the promise against a timeout
- If timeout occurs, returns critical status
- Logs timeout errors for debugging
- Prevents hanging health checks

## Caching Strategy

### Cache Configuration

```typescript
private cachedResult: CachedHealthResult | null = null;
private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

### Cache Validation

```typescript
if (!forceRefresh &&
    this.cachedResult &&
    now - this.cachedResult.timestamp < this.CACHE_TTL_MS) {
  return { ...this.cachedResult.result, cached: true };
}
```

### Benefits

- **Reduces API calls**: Prevents excessive GitHub API requests
- **Improves response time**: Cached checks return in < 100ms
- **Rate limit protection**: Avoids exhausting GitHub rate limits
- **Resource efficiency**: Reduces system load

### Cache Invalidation

- **Time-based**: Automatic after 5 minutes
- **Manual**: Via `clearCache()` method
- **Force refresh**: Via `getFullHealthStatus(true)`

## Timeout Protection

Each component check has a **3-second timeout** to prevent hanging:

```typescript
private readonly CHECK_TIMEOUT_MS = 3000; // 3 seconds

const [runtime, github, sessions, imageService] = await Promise.all([
  this.withTimeout(this.checkBotRuntime(), this.CHECK_TIMEOUT_MS, 'runtime'),
  this.withTimeout(this.checkGitHubIntegration(), this.CHECK_TIMEOUT_MS, 'github'),
  // ...
]);
```

**Timeout behavior:**
- Aborts the check after timeout
- Returns critical status for that component
- Logs error for investigation
- Allows other checks to complete normally

## Parallel Execution

All health checks run simultaneously using `Promise.all()`:

```typescript
const [runtime, github, sessions, imageService] = await Promise.all([
  this.withTimeout(this.checkBotRuntime(), ...),
  this.withTimeout(this.checkGitHubIntegration(), ...),
  this.withTimeout(this.checkSessionHealth(), ...),
  this.withTimeout(this.checkImageService(), ...)
]);
```

**Benefits:**
- **Faster execution**: Total time = slowest check (not sum of all)
- **Typical total time**: 1-2 seconds for fresh checks
- **Maximum time**: 3 seconds (timeout protection)

## Performance Characteristics

### Response Times

| Scenario | Typical Time | Maximum Time |
|----------|-------------|--------------|
| Cached response | < 100ms | 150ms |
| Fresh check (all healthy) | 500-1000ms | 2000ms |
| Fresh check (with timeouts) | 3000ms | 3000ms |

### Resource Usage

- **Memory**: Minimal (<1MB for cache)
- **CPU**: Low (only during checks)
- **Network**: 1-2 API calls per fresh check

## Error Handling

### Component Isolation

Each component check is independent:

```typescript
try {
  // Perform check
  return successResult;
} catch (error) {
  this.logger.error('Check failed', error, 'checkComponent');
  return {
    status: 'critical',
    message: 'Failed to check component',
    error: error.message,
    lastCheck: new Date()
  };
}
```

**Benefits:**
- One failing component doesn't crash entire health check
- Partial status information always available
- Detailed error messages for troubleshooting

### Graceful Degradation

- Failed checks return critical status (not throw errors)
- Overall status reflects worst component state
- Logs contain detailed error information
- User sees comprehensive status despite failures

## Usage Examples

### Basic Health Check

```typescript
const healthStatus = await healthCheckService.getFullHealthStatus();

console.log(`Overall: ${healthStatus.overallStatus}`);
console.log(`Bot Runtime: ${healthStatus.runtime.status}`);
console.log(`GitHub: ${healthStatus.github.status}`);
console.log(`Sessions: ${healthStatus.sessions.status}`);
console.log(`Images: ${healthStatus.imageService.status}`);
```

### Forcing Fresh Check

```typescript
// Bypass cache for real-time status
const freshStatus = await healthCheckService.getFullHealthStatus(true);

if (freshStatus.overallStatus === 'critical') {
  // Take action based on critical status
  await notifyAdministrators(freshStatus);
}
```

### Monitoring Specific Component

```typescript
const status = await healthCheckService.getFullHealthStatus();

if (status.github.status === 'degraded') {
  const rateLimit = status.github.details?.rateLimit;
  console.warn(`GitHub rate limit low: ${rateLimit?.remaining}/${rateLimit?.limit}`);
}
```

### Cache Management

```typescript
// Clear cache after configuration change
healthCheckService.clearCache();

// Verify new configuration
const status = await healthCheckService.getFullHealthStatus();
console.log('Configuration updated:', status.github.status);
```

## Integration Points

### Commands

- **DoctorCommand** (`/doctor`): Primary consumer of health checks

### Services

- **GitHubService**: Provides GitHub API health data
- **SessionService**: Provides session metrics
- **ImageServiceClient**: Provides image service status

### Embeds

- **EmbedService**: Formats health data for Discord display

## Testing Considerations

### Mockable Dependencies

All external dependencies are injected, making testing straightforward:

```typescript
const mockGitHubService = {
  isConfigured: jest.fn().mockReturnValue(true),
  octokit: {
    rest: {
      rateLimit: {
        get: jest.fn().mockResolvedValue({
          data: { resources: { core: { remaining: 4500, limit: 5000 } } }
        })
      }
    }
  }
};
```

### Test Scenarios

1. **All components healthy**
2. **Individual component failures**
3. **Timeout scenarios**
4. **Cache hit/miss behavior**
5. **Rate limit thresholds**
6. **Memory pressure thresholds**

## Related Documentation

- [Doctor Command](../features/health-check.md) - User-facing command documentation
- [Base Service](./base-service.md) - Inherited base class
- [GitHub Service](./github-service.md) - GitHub integration details
- [Session Service](./session-service.md) - Session management

[← Back to Services](./README.md)
