# Documentation

This directory contains comprehensive documentation for the Claude Code Discord Bot monorepo project.

## Quick Navigation

### 🏗️ [Architecture](./architecture/)
System design, monorepo structure, and component architecture
- [Overview](./architecture/overview.md) - High-level architecture overview
- [Monorepo Structure](./architecture/monorepo-structure.md) - Directory layout and workspace organization
- [Discord Bot](./architecture/discord-bot.md) - Discord bot architecture details
- [Image Service](./architecture/image-service.md) - Image service architecture
- [Shared Package](./architecture/shared-package.md) - Shared package structure

### 🔧 [Services](./services/)
Service-specific documentation and API references
- [Base Service](./services/base-service.md) - Abstract base class for all services
- [GitHub Service](./services/github-service.md) - GitHub integration service
- [Session Service](./services/session-service.md) - Session management service
- [Embed Service](./services/embed-service.md) - Discord embed service
- [Workflow Service](./services/workflow-service.md) - GitHub Actions workflow service
- [File Explorer Service](./services/file-explorer-service.md) - Repository file exploration
- [Image Upload Service](./services/image-upload-service.md) - Image handling service

### 💻 [Development](./development/)
Development setup, patterns, and guidelines
- [Getting Started](./development/getting-started.md) - Environment setup & quick start
- [Commands](./development/commands.md) - Development commands reference
- [Patterns](./development/patterns.md) - Development patterns & examples
- [Testing](./development/testing.md) - Testing strategy & guidelines
- [Code Standards](./development/code-standards.md) - Code quality & standards

### ✨ [Features](./features/)
Feature documentation and user guides
- [Discord Commands](./features/discord-commands.md) - Discord command documentation
- [Workflow Automation](./features/workflow-automation.md) - Claude Code workflow features
- [Image Processing](./features/image-processing.md) - Image processing capabilities
- [Logging System](./features/logging-system.md) - Logger configuration & usage

### 🚀 [Deployment](./deployment/)
Deployment guides and production configuration
- [Docker](./deployment/docker.md) - Docker configuration
- [GitHub Runners](./deployment/github-runners.md) - Self-hosted runner setup
- [Production](./deployment/production.md) - Production deployment guide

### 🔄 [Workflows](./workflows/)
Git workflows, commits, and release management
- [Commit Guidelines](./workflows/commit-guidelines.md) - Commit message requirements
- [Release Process](./workflows/release-process.md) - Release & changeset management
- [Troubleshooting](./workflows/troubleshooting.md) - Common issues & solutions

### ⚙️ [Configuration](./configuration/)
Configuration references and setup guides
- [Environment Variables](./configuration/environment-vars.md) - Environment variable reference
- [GitHub Permissions](./configuration/github-permissions.md) - GitHub token requirements
- [Commitlint](./configuration/commitlint.md) - Commit message validation rules

## Getting Help

1. **Quick Start**: Start with [Getting Started](./development/getting-started.md)
2. **Common Issues**: Check [Troubleshooting](./workflows/troubleshooting.md)
3. **Development Patterns**: See [Development Patterns](./development/patterns.md)
4. **Architecture Questions**: Review [Architecture Overview](./architecture/overview.md)

## Contributing to Documentation

When making changes to the codebase, please update the relevant documentation. See the main [CLAUDE.md](../CLAUDE.md) file for documentation maintenance guidelines.