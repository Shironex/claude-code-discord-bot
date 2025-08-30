# @claude-code/discord-bot

## 1.1.0

### Minor Changes

- b8df7d8: Refactor Octokit initialization to BaseService
  - **BREAKING**: Services now require LoggerFactory injection alongside ConfigService
  - Add centralized Octokit client initialization to BaseService
  - Remove duplicate GitHub token management across GitHubService, WorkflowService, and FileExplorerService
  - Add validateGitHubAccess() helper method for consistent GitHub access validation
  - Add configurable requireGitHub parameter to enforce GitHub token requirements
  - Eliminate 60+ lines of duplicate initialization code
  - Maintain backward compatibility for services not requiring GitHub access
  - Enhanced error handling with consistent GitHub token validation

## 1.0.0

### Major Changes

- 10b04b9: Add image service API with comprehensive test suite and modular documentation

### Patch Changes

- Updated dependencies [10b04b9]
  - @claude-code/shared@0.1.0

## 0.4.0

### Minor Changes

- e6f6864: Implement custom Winston logger with comprehensive file logging and enhanced console output
  - Replace default NestJS logger with Winston-based custom logger
  - Add file logging with daily rotation (error.log, combined.log, service-specific logs)
  - Implement beautiful colored console output with service context
  - Add performance logging and method-level tracking
  - Support graceful shutdown with proper log flushing
  - Fix MaxListeners warning by limiting global exception handling to main logger

## 0.3.1

### Patch Changes

- 9eac835: Fix workflow monitor incorrectly identifying running instances as completed

  Resolves issue #9 where the workflow monitor service incorrectly identified newly spawned Claude Code instances as "already completed" when there were existing open pull requests on the repository.

  The fix implements a unique tracking ID system that:
  - Generates unique IDs for each workflow dispatch
  - Uses intelligent polling to find the correct workflow run
  - Filters runs by creation timestamp and status
  - Supports multiple concurrent workflows without confusion
  - Provides graceful fallback for older workflow configurations

  This ensures accurate workflow status tracking even when multiple workflows are running or when repositories have existing open PRs.

## 0.3.0

### Minor Changes

- df8f79f: Add comprehensive deployment infrastructure with Docker containers and self-hosted GitHub runners
  - Add production-ready Dockerfile for Discord bot with multi-stage builds, security optimizations, and health checks
  - Add Docker Compose configuration optimized for Coolify deployment platform
  - Add GitHub self-hosted runner Dockerfile with auto-registration and Claude workflow support
  - Add comprehensive deployment documentation covering Coolify setup, runner configuration, and security best practices
  - Update project documentation with deployment guides and quick start commands

## 0.2.0

### Minor Changes

- c2c3f34: Add comprehensive CI/CD infrastructure with automated release management
  - Implement Husky git hooks for pre-commit quality checks
  - Add Commitlint with conventional commit validation and custom scopes
  - Integrate Changesets for automated versioning and changelog generation
  - Create automated release workflow with GitHub Actions
  - Add PR validation workflow with changeset detection and preview
  - Enhance CI pipeline with commit message validation
  - Add development scripts for release management
  - Update documentation with contribution guidelines and workflow instructions

  This establishes a professional development workflow with automated quality enforcement, conventional commit standards, and seamless release management.
