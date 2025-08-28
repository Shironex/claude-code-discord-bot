# Logging System

Comprehensive Winston-based logging system with enhanced security, performance monitoring, and flexible configuration.

## System Overview

The application implements a comprehensive logging system shared across both the Discord bot and image service applications through the `@claude-code/shared` package.

### Core Features
- **Multi-Transport Logging**: Console, error files, combined files, and service-specific files
- **Security**: Automatic sensitive data filtering (passwords, tokens, keys)
- **Performance Monitoring**: Method timing, memory usage tracking, slow operation detection  
- **Error Handling**: Graceful fallbacks, safe flush operations, comprehensive validation
- **NestJS Integration**: Full compatibility with NestJS LoggerService interface

## LoggerService Implementation

### Standard Logging Methods
```typescript
export class LoggerService {
  log(message: string, context?: string): void;
  error(message: string, error?: Error, context?: string): void;
  warn(message: string, context?: string): void;
  debug(message: string, context?: string): void;
  verbose(message: string, context?: string): void;
}
```

### Performance Monitoring Methods
```typescript
export class LoggerService {
  time(label: string): void;
  timeEnd(label: string): number;
  performance(operation: string, duration: number, context?: string): void;
  methodEntry(methodName: string, args?: any): void;
  methodExit(methodName: string, result?: any): void;
  checkSlowOperation(label: string, duration: number, context: string): void;
}
```

### Advanced Features
```typescript\nexport class LoggerService {\n  child(additionalContext: Record<string, any>): LoggerService;\n  flush(): Promise<void>;\n  safeFlush(): Promise<void>;\n  setLevel(level: string): void;\n}\n```

## Memory Monitoring

The logger includes intelligent memory monitoring for production environments:

### Configurable Thresholds
- **Warning Level**: Default 90% heap usage\n- **Debug Level**: Default 75% heap usage\n- **Check Interval**: Default every 30 seconds\n- **Automatic Alerts**: Log warnings when memory usage exceeds thresholds

### Environment Variables
```bash\nMEMORY_WARNING_THRESHOLD=90    # Warning at 90% heap usage (default)\nMEMORY_DEBUG_THRESHOLD=75      # Debug logging at 75% heap usage (default)\nMEMORY_CHECK_INTERVAL=30000    # Check every 30 seconds (default)\n```

### Performance Tracking
- Real-time heap usage monitoring with percentage calculations
- Memory usage alerts and warnings
- Performance impact tracking
- Garbage collection optimization

## File Logging Structure

```\nlogs/\n├── error.log                    # Error-level logs only\n├── combined.log                 # All log levels combined\n└── services/\n    ├── GitHubService.log        # Service-specific logs\n    ├── SessionService.log       # Service-specific logs\n    └── [ServiceName].log        # Dynamic service-specific logs\n```

### Log Rotation\n- **Daily Rotation**: New log files created daily\n- **Size Limits**: Maximum 50MB per log file\n- **Retention**: 30 days of log history\n- **Compression**: Automatic compression of rotated logs

## Log Formats

### Console Output\n- **Colorized Output**: Different colors for log levels\n- **Timestamps**: Human-readable timestamps\n- **Service Context**: Clear service identification\n- **Readable Formatting**: Optimized for development\n\n### File Output\n- **JSON Format**: Structured metadata for parsing and analysis\n- **Machine Readable**: Easy parsing by log aggregation tools\n- **Searchable**: Efficient searching and filtering\n- **Metadata Rich**: Complete context and timing information

### Security Features\n- **Automatic Masking**: Sensitive data (tokens, passwords, API keys) automatically redacted\n- **Configurable Patterns**: Customizable sensitive data detection\n- **Safe Logging**: Prevents accidental sensitive data exposure\n- **Audit Compliance**: Meets security logging requirements

## Usage Patterns

### Basic Service Logging
```typescript\nexport class MyService extends BaseService {\n  constructor(loggerFactory: LoggerFactory) {\n    super('MyService', loggerFactory);\n  }\n\n  async performOperation(): Promise<void> {\n    this.logger.info('Starting operation', 'performOperation');\n    \n    // Performance timing\n    this.logger.time('database-query');\n    const result = await this.queryDatabase();\n    const duration = this.logger.timeEnd('database-query');\n    \n    // Automatic slow operation detection\n    this.logger.checkSlowOperation('database-query', duration, 'performOperation');\n    \n    return result;\n  }\n}\n```

### Method Lifecycle Logging
```typescript\n// Method entry and exit tracking\nthis.logger.methodEntry('processRepository', { repoId: repo.id });\nconst result = await this.processRepository(repo);\nthis.logger.methodExit('processRepository', result);\n```

### Error Logging with Context
```typescript\ntry {\n  const result = await this.riskyOperation();\n  return result;\n} catch (error) {\n  this.logger.error('Operation failed', error, 'riskyOperation');\n  \n  // Additional context\n  this.logger.error('Failed operation context', null, 'riskyOperation', {\n    userId: user.id,\n    operation: 'data-sync',\n    timestamp: new Date().toISOString()\n  });\n  \n  throw error;\n}\n```

### Performance Monitoring
```typescript\n// Manual performance tracking\nthis.logger.time('complex-calculation');\nconst result = await this.performComplexCalculation();\nconst duration = this.logger.timeEnd('complex-calculation');\n\n// Log performance metrics\nthis.logger.performance('complex-calculation', duration, 'performCalculation');\n\n// Check for slow operations\nif (duration > 5000) {\n  this.logger.warn(`Slow operation detected: ${duration}ms`, 'performCalculation');\n}\n```

## Configuration Options

All logging behavior is configurable via environment variables:

### Core Logging Configuration
```bash\n# Logging level (error, warn, info, debug, verbose)\nLOG_LEVEL=debug\n\n# Enable/disable file logging (default: true)\nENABLE_FILE_LOGS=true\n\n# Environment mode affects default log level\nNODE_ENV=development\n```

### Memory Monitoring Configuration
```bash\n# Memory warning threshold percentage (default: 90)\nMEMORY_WARNING_THRESHOLD=90\n\n# Memory debug threshold percentage (default: 75)\nMEMORY_DEBUG_THRESHOLD=75\n\n# Memory check interval in milliseconds (default: 30000)\nMEMORY_CHECK_INTERVAL=30000\n```

### File Logging Configuration
```bash\n# Log file directory (default: ./logs)\nLOG_DIRECTORY=./logs\n\n# Maximum log file size in MB (default: 50)\nMAX_LOG_FILE_SIZE=50\n\n# Log retention in days (default: 30)\nLOG_RETENTION_DAYS=30\n```

## Service Integration

### NestJS Module Integration
```typescript\n@Module({\n  imports: [LoggerModule],\n  providers: [MyService],\n})\nexport class MyModule {}\n```

### Service Constructor Pattern
```typescript\n@Injectable()\nexport class MyService extends BaseService {\n  constructor(loggerFactory: LoggerFactory) {\n    super('MyService', loggerFactory);\n  }\n}\n```

### Custom Logger Creation
```typescript\n@Injectable()\nexport class MyService {\n  private readonly logger: LoggerService;\n\n  constructor(loggerFactory: LoggerFactory) {\n    this.logger = loggerFactory.createLogger('MyService');\n  }\n}\n```

## Monitoring and Analytics

### Log Analysis\n- **Structured JSON**: Easy parsing by tools like ELK stack, Fluentd\n- **Performance Metrics**: Built-in timing and performance data\n- **Error Tracking**: Comprehensive error logging with stack traces\n- **Usage Analytics**: Method call frequency and performance tracking\n\n### Integration with Monitoring Tools\n- **Prometheus**: Metrics export for Prometheus monitoring\n- **Grafana**: Dashboard integration for log visualization\n- **ELK Stack**: Elasticsearch, Logstash, Kibana integration\n- **CloudWatch**: AWS CloudWatch log streaming\n\n### Custom Metrics\n```typescript\n// Custom metric logging\nthis.logger.info('Custom metric', 'metrics', {\n  metricName: 'user_login',\n  value: 1,\n  tags: { source: 'discord', method: 'oauth' },\n  timestamp: new Date().toISOString()\n});\n```

## Security and Compliance

### Sensitive Data Protection\n- **Automatic Redaction**: Passwords, tokens, API keys automatically masked\n- **Custom Patterns**: Configurable sensitive data detection patterns\n- **Safe Defaults**: Conservative approach to data logging\n- **Audit Trail**: Complete audit trail without sensitive data exposure\n\n### Compliance Features\n- **GDPR Compliance**: Personal data protection and masking\n- **SOX Compliance**: Audit trail and data integrity\n- **HIPAA Ready**: Healthcare data protection patterns\n- **Configurable Retention**: Flexible data retention policies\n\n## Troubleshooting\n\n### Common Issues\n\n#### High Memory Usage\n```\n⚠️ High memory usage detected: 1024MB/1200MB (85%)\n• Check for memory leaks in application code\n• Review log retention settings\n• Consider increasing memory limits\n```\n\n#### Log File Permissions\n```\n❌ Unable to write to log file: /logs/combined.log\n• Check file system permissions\n• Verify log directory exists and is writable\n• Review disk space availability\n```\n\n#### Performance Impact\n```\n⚠️ Slow operation detected: database-query (5234ms)\n• Review database query optimization\n• Check network connectivity\n• Consider query caching\n```\n\n### Debugging Tips\n- Use `LOG_LEVEL=debug` for detailed debugging information\n- Check service-specific log files for targeted troubleshooting\n- Monitor memory usage logs for performance issues\n- Review error logs for application issues\n\n## Related Documentation\n\n- [Shared Package Architecture](../architecture/shared-package.md) - Logger implementation\n- [Development Patterns](../development/patterns.md) - Logger usage patterns\n- [Configuration](../configuration/environment-vars.md) - Environment setup\n- [Services Documentation](../services/) - Service-specific logging\n\n[← Back to Features](./README.md)