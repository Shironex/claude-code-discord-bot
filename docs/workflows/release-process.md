# Release Process

Release management and changeset workflow for automated versioning and publishing.

## Changeset Workflow

### When to Create Changesets
**If your changes should trigger a release, ALWAYS create a changeset:**

```bash
pnpm changeset
```

### Changeset Process
1. **Select packages to bump** (usually @claude-code/discord-bot)
2. **Choose bump type**:
   - **patch**: Bug fixes, small improvements
   - **minor**: New features, backward compatible
   - **major**: Breaking changes
3. **Write a clear summary** for the changelog

### Changeset Examples
- **Patch**: "Fix session cleanup memory leak"
- **Minor**: "Add support for repository file selection"
- **Major**: "Redesign command interface (breaking changes)"

### When NOT to Create Changeset
- Documentation-only changes (`docs` scope)
- Test changes that don't affect functionality
- CI/CD changes (`ci` scope)
- Development dependencies updates

## Automated Release Process

### How Releases Work
**Releases happen automatically when PR with changesets is merged to master:**

1. **GitHub Actions detects changesets**
2. **Versions are bumped automatically**
3. **Changelogs are generated**
4. **GitHub release is created**
5. **Git tags are created**

### Check Release Status
```bash
# See what will be released
pnpm changeset:status
```

## Pre-Commit Hooks

Git hooks will **AUTOMATICALLY** run and may block commits if:
- Commit message doesn't follow conventional format
- Code doesn't pass linting (`pnpm lint`)
- TypeScript compilation fails (`pnpm typecheck`)  
- Code formatting is incorrect (`pnpm format`)

**If blocked:** Fix issues and try committing again.

## Pull Request Requirements

### Creating PRs
```bash
# Push your branch
git push origin feat/your-feature-name

# The following happens automatically:
# - Commit message validation on all PR commits
# - Changeset detection and preview
# - Code quality checks (lint, type, build)
# - Automated PR comments about changesets
```

### PR Requirements
- All commits must follow conventional commit format
- Include changeset if changes should trigger release
- Pass all CI checks (enforced)
- Provide clear PR description

## Available Scripts

### Development Scripts
```bash
pnpm dev                     # Start Discord bot in watch mode
pnpm build                   # Build all packages
pnpm lint                    # Run linting (auto-fix)
pnpm typecheck              # TypeScript validation
pnpm format                 # Format code with Prettier
```

### Release Management Scripts
```bash
pnpm changeset              # Create new changeset
pnpm changeset:status       # Check changeset status  
pnpm version               # Version packages (CI only)
pnpm release               # Publish packages (CI only)
```

### Validation Scripts
```bash
pnpm lint:commit           # Test commit message format
pnpm ci:version-check      # Check version status
```

## Emergency Fixes

For critical hotfixes to master:

```bash
git checkout master
git pull origin master
# Make minimal fix
git commit -m "fix(discord-bot): critical security patch"
# Create patch changeset
pnpm changeset  # Select patch, describe fix
git push origin master  # Triggers automated release
```

## Version Bump Guidelines

### Patch (0.0.X)
- Bug fixes that don't affect functionality
- Performance improvements
- Documentation updates
- Internal code refactoring
- Security patches

### Minor (0.X.0)
- New features that are backward compatible
- New API endpoints or commands
- Enhanced existing functionality
- New configuration options
- Deprecation warnings (but not removals)

### Major (X.0.0)
- Breaking changes to existing APIs
- Removed deprecated features
- Changed behavior that affects existing users
- New required configuration
- Database schema changes

## Manual Release Check

```bash
# Check what will be released
pnpm changeset:status

# Output example:
# @claude-code/discord-bot: minor (1.2.0 → 1.3.0)
# @claude-code/shared: patch (0.1.0 → 0.1.1)
```

## Related Documentation

- [Commit Guidelines](./commit-guidelines.md) - Commit message format
- [Troubleshooting](./troubleshooting.md) - Common issues
- [Development Commands](../development/commands.md) - Available scripts

[← Back to Workflows](./README.md)