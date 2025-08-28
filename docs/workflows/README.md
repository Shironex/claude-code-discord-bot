# Workflows Documentation

Documentation for Git workflows, commit conventions, and release management.

## Workflow Documentation

- **[Commit Guidelines](./commit-guidelines.md)** - Commit message requirements and conventions
- **[Release Process](./release-process.md)** - Release management and changeset workflow
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions

## Quick Reference

### Commit Format
```bash
type(scope): description

# Examples:
feat(discord-bot): add repository search modal
fix(image-service): resolve upload timeout issue
docs(root): update development guidelines
```

### Release Workflow
```bash
# 1. Create changeset for your changes
pnpm changeset

# 2. Commit your changes with proper format
git commit -m "feat(discord-bot): add new feature"

# 3. Push - releases happen automatically on merge to master
git push origin feat/your-feature-name
```

### Quality Checks
All commits automatically run:
- Commit message validation (commitlint)
- Code linting (ESLint)
- Type checking (TypeScript)
- Code formatting (Prettier)

## Important Rules

- **Always** follow conventional commit format (enforced by hooks)
- **Always** create changesets for user-facing changes
- **Never** commit directly to master (use feature branches)
- **Always** run quality checks before committing

## Related Documentation

- [Development](../development/) - Development commands and patterns
- [Configuration](../configuration/) - Commitlint and validation setup
- [Code Standards](../development/code-standards.md) - Quality requirements

[← Back to Documentation](../README.md)