# Architecture Overview

## Project Overview

This is a Discord bot built with NestJS and Necord that integrates with GitHub to browse repositories and trigger Claude Code analysis workflows. The bot provides an interactive Discord interface for repository management and automated code analysis through GitHub Actions workflows.

## Framework & Core Technologies

- **Framework**: NestJS with Necord for Discord integration
- **Discord Library**: Discord.js v14 with full TypeScript support
- **GitHub Integration**: Octokit REST API client
- **Package Manager**: pnpm
- **Build System**: NestJS CLI with TypeScript compilation
- **Monorepo**: Turborepo for build orchestration

## Design Principles

### Modular Architecture
The system follows a clean, modular architecture with separation of concerns:
- **Services Layer**: Business logic and external integrations
- **Commands Layer**: Discord slash command handlers
- **Interactions Layer**: Discord interaction handlers (buttons, modals, selects)
- **Utils Layer**: Shared utilities and helpers
- **Interfaces Layer**: TypeScript type definitions organized by domain

### Dependency Injection
- Uses NestJS dependency injection container
- Services are injectable and follow single responsibility principle
- Proper constructor-based dependency injection
- Mock-friendly architecture for testing

### Error Handling
- Centralized error handling through EmbedService
- Graceful degradation for API failures
- User-friendly error messages
- Comprehensive logging for debugging

### Session Management
- Stateful user interactions through SessionService
- Automatic session cleanup and expiration
- Type-safe session data storage
- Consistent session handling across all interactions

## Technology Stack Benefits

### NestJS Framework
- **Scalability**: Modular architecture supports growth
- **TypeScript**: Full type safety and developer experience
- **Testing**: Built-in testing utilities and patterns
- **Documentation**: Automatic API documentation generation

### Necord Discord Integration
- **Type Safety**: Full TypeScript support for Discord.js
- **Decorators**: Clean, declarative command and interaction handling
- **Middleware**: Request/response pipeline for common logic
- **Auto-discovery**: Automatic registration of commands and handlers

### Turborepo Monorepo
- **Build Optimization**: Incremental builds and caching
- **Task Pipeline**: Orchestrated build, test, and deployment tasks
- **Code Sharing**: Shared packages with proper dependency management
- **Scalability**: Easy addition of new applications and packages

## Related Documentation

- [Monorepo Structure](./monorepo-structure.md) - Detailed directory layout
- [Discord Bot Architecture](./discord-bot.md) - Bot-specific architecture
- [Image Service Architecture](./image-service.md) - Image service design
- [Services Documentation](../services/) - Individual service details

[← Back to Architecture](./README.md)