# Development Documentation

Guides and references for developing with this codebase.

## Development Guides

- **[Getting Started](./getting-started.md)** - Environment setup, installation, and quick start guide
- **[Commands](./commands.md)** - Development commands reference for building, testing, and running
- **[Patterns](./patterns.md)** - Development patterns, examples, and best practices
- **[Testing](./testing.md)** - Testing strategy, guidelines, and examples
- **[Code Standards](./code-standards.md)** - Code quality standards, linting, and formatting

## Quick Reference

### Most Used Commands
```bash
pnpm dev                  # Start Discord bot in development
pnpm build               # Build all packages
pnpm lint                # Run linting with auto-fix
pnpm typecheck           # TypeScript validation
pnpm format              # Format code with Prettier
```

### Adding New Features
1. Follow [development patterns](./patterns.md)
2. Update relevant [service documentation](../services/)
3. Add tests following [testing guidelines](./testing.md)
4. Ensure [code standards](./code-standards.md) compliance

## Related Documentation

- [Architecture](../architecture/) - System design and structure
- [Configuration](../configuration/) - Environment and setup
- [Workflows](../workflows/) - Git and release processes

[← Back to Documentation](../README.md)