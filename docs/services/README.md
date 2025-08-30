# Services Documentation

Detailed documentation for each service in the Discord bot application.

## Base Architecture

- **[Base Service](./base-service.md)** - Abstract base class providing logging and GitHub integration

## Core Services

- **[GitHub Service](./github-service.md)** - GitHub API integration with repository management
- **[Session Service](./session-service.md)** - User session management across Discord interactions
- **[Embed Service](./embed-service.md)** - Centralized Discord embed creation utilities
- **[Workflow Service](./workflow-service.md)** - GitHub Actions workflow management and execution
- **[File Explorer Service](./file-explorer-service.md)** - Repository file tree exploration and selection
- **[Image Upload Service](./image-upload-service.md)** - Discord attachment processing and image service integration

## Service Architecture

All services follow these patterns:
- Extend `BaseService` for consistent logging and GitHub integration
- Use dependency injection through NestJS
- Implement proper error handling and validation
- Follow separation of concerns principles

## Related Documentation

- [Discord Bot Architecture](../architecture/discord-bot.md) - Overall bot architecture
- [Development Patterns](../development/patterns.md) - Service development patterns
- [Code Standards](../development/code-standards.md) - Service coding standards

[← Back to Documentation](../README.md)