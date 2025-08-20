# @claude-code/discord-bot

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
