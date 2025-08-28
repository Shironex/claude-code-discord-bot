# Commit Guidelines

Commit message requirements and conventions enforced by Commitlint.

## Conventional Commits Format

**This project uses strict Conventional Commits validation via Commitlint.**

### Basic Format
```
type(scope): description
```

### Formatting Requirements
- **Subject must be lowercase** (e.g., "add new feature" not "Add new feature")
- **Subject max length**: 100 characters
- **Body lines must be max 100 characters** each
- **Scope cannot be empty**

## Required Types

- `feat` - New feature
- `fix` - Bug fix  
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Test changes
- `build` - Build system changes
- `ci` - CI/CD changes
- `chore` - Other changes
- `revert` - Revert previous commit

## Required Scopes

**Application Scopes**:
- `discord-bot` - Discord bot application changes
- `image-service` - Image service API application changes
- `shared` - Shared package changes

**Infrastructure Scopes**:
- `root` - Root workspace changes
- `ci` - CI/CD changes
- `docs` - Documentation
- `deps` - Dependencies
- `release` - Release-related
- `config` - Configuration changes

**Deployment Scopes**:
- `docker` - Docker changes
- `docker-compose` - Docker compose changes
- `dockerfile` - Dockerfile changes

**Tooling Scopes**:
- `commitlint` - Commitlint changes
- `husky` - Husky changes
- `turbo` - Turbo changes
- `template` - Template changes
- `packages` - Packages directory
- `scripts` - Scripts directory

## Examples

### Good Commit Messages
```bash
feat(discord-bot): add repository search modal
fix(image-service): resolve upload timeout issue
docs(shared): update logger documentation
style(discord-bot): fix eslint formatting issues
refactor(shared): extract common utilities
perf(discord-bot): optimize session cleanup
test(image-service): add upload validation tests
ci(root): add automated release workflow
```

### Bad Commit Messages
```bash
# ❌ Capitalized description
feat(discord-bot): Add new feature

# ❌ Missing scope
feat: add new feature

# ❌ Invalid scope
feat(invalid-scope): add new feature

# ❌ Too long description (>100 chars)
feat(discord-bot): add a really long description that exceeds the maximum allowed character limit

# ❌ Invalid type
update(discord-bot): add new feature
```

## Pre-Commit Validation

Git hooks **automatically validate** commit messages and will **block commits** that don't follow the format.

### If Your Commit is Rejected
1. **Check the format**: Ensure `type(scope): description` structure
2. **Use valid type and scope** from the lists above
3. **Use lowercase** for the description
4. **Keep under 100 characters**

### Example Fix
```bash
# ❌ Rejected commit
git commit -m "Add new feature"

# ✅ Fixed commit
git commit -m "feat(discord-bot): add repository search feature"
```

## Advanced Commit Patterns

### Multi-Line Commits
```bash
git commit -m "feat(discord-bot): add file selection interface

- Implement interactive file tree navigation
- Add multi-select file support
- Include pagination for large repositories
- Optimize file tree caching

Closes #123"
```

### Breaking Changes
```bash
feat(discord-bot)!: redesign command interface

BREAKING CHANGE: Command structure has changed from /repo to /claude
```

### Co-authored Commits
```bash
feat(shared): add image processing utilities

Co-authored-by: Jane Doe <jane@example.com>
```

## Related Documentation

- [Release Process](./release-process.md) - Changeset and release workflow
- [Development Commands](../development/commands.md) - Quality check commands
- [Code Standards](../development/code-standards.md) - General standards

[← Back to Workflows](./README.md)