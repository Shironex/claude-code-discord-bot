# CLAUDE.md - Claude Code Assistant Guide

## Project Context
- **Type**: Discord bot + Image service monorepo 
- **Stack**: NestJS, Necord, TypeScript, Turborepo, pnpm
- **Architecture**: Service-based with dependency injection
- **Key Pattern**: All services extend BaseService for consistent logging

## Quick Reference

### Most Used Commands
```bash
pnpm dev             # Start development
pnpm build           # Build all packages
pnpm lint            # Run linting (auto-fix)
pnpm typecheck       # TypeScript validation
pnpm changeset       # Create release changeset
```

### Project Structure
```
apps/discord-bot/    # Main Discord bot application
apps/image-service/  # Image storage API service  
packages/shared/     # Shared types and utilities
docs/               # Detailed documentation (see below)
```

## Documentation Map

For detailed information, refer to specific documentation:

- **🏗️ [Architecture](docs/architecture/)** - System design and component structure
- **🔧 [Services](docs/services/)** - Service-specific implementation details
- **💻 [Development](docs/development/)** - Setup, patterns, and guidelines
- **✨ [Features](docs/features/)** - Feature documentation and usage
- **🚀 [Deployment](docs/deployment/)** - Docker, production, and runner setup
- **🔄 [Workflows](docs/workflows/)** - Git workflows and release management
- **⚙️ [Configuration](docs/configuration/)** - Environment variables and setup

## CRITICAL: Documentation Maintenance Rules

### When Adding New Features
**ALWAYS update relevant documentation when making changes:**

1. **Service Changes**: Update `docs/services/[service-name].md`
2. **New Commands**: Update `docs/features/discord-commands.md`
3. **Architecture Changes**: Update relevant files in `docs/architecture/`
4. **New Patterns**: Add to `docs/development/patterns.md`
5. **Environment Changes**: Update `docs/configuration/environment-vars.md`

### When Modifying Existing Code
**Follow this checklist for documentation updates:**

- [ ] Check if documentation exists: `grep -r "ClassName\|MethodName" docs/`
- [ ] Update ALL related documentation files
- [ ] Update code examples if behavior changes
- [ ] Add deprecation notices if removing features
- [ ] Update troubleshooting if fixing common issues

### Documentation Update Mapping

**Service modifications** → Update:
- `docs/services/[service-name].md` (method signatures, features)
- `docs/development/patterns.md` (if patterns change)
- `docs/architecture/discord-bot.md` (if architecture changes)

**Discord command changes** → Update:
- `docs/features/discord-commands.md` (command usage)
- `docs/development/patterns.md` (if interaction patterns change)

**Environment/Config changes** → Update:
- `docs/configuration/environment-vars.md` (new variables)
- `docs/deployment/` (if deployment changes)
- `docs/development/getting-started.md` (if setup changes)

**New dependencies/tools** → Update:
- `docs/development/commands.md` (new commands)
- `docs/architecture/overview.md` (if tech stack changes)

### Documentation Standards
- **Use relative links**: `[Services](docs/services/README.md)`
- **Include code examples**: Show usage with file paths
- **Mark requirements**: Clearly indicate required vs optional
- **Add timestamps**: For time-sensitive information
- **Cross-reference**: Link related documentation sections

## Essential Patterns

### Service Development
```typescript
// Always extend BaseService
export class MyService extends BaseService {
  constructor(loggerFactory: LoggerFactory) {
    super('MyService', loggerFactory);
  }
}
```

### Error Handling
```typescript
try {
  const result = await operation();
  return result;
} catch (error) {
  this.logger.error('Operation failed', error, 'methodName');
  throw new UserFriendlyError('User message');
}
```

### Session Management
```typescript
// Always check session existence
const session = await this.sessionService.getSession(userId);
if (!session) {
  await interaction.reply({ content: 'Session expired. Use /claude to start over.' });
  return;
}
```

## Critical Workflow Rules

### Commit Format (ENFORCED)
```bash
type(scope): description
# Examples:
feat(discord-bot): add repository search modal
fix(image-service): resolve upload timeout issue
docs(shared): update logger documentation
```

### Release Process
1. **Make changes** following patterns above
2. **Update documentation** per maintenance rules above
3. **Create changeset**: `pnpm changeset` (if user-facing changes)
4. **Commit**: Follow conventional format (enforced by hooks)
5. **PR**: Automated release when merged to master

## Key Architecture Points

### Dependency Injection
- Services injected via NestJS container
- Logger injected through LoggerFactory
- Configuration via environment variables

### Session-Based Workflows
- All multi-step interactions use SessionService
- 30-minute automatic expiration
- Type-safe session data storage

### Error Handling Strategy
- EmbedService for consistent user-facing errors
- Comprehensive logging for debugging
- Graceful degradation for API failures

## File Locations to Remember

**Key Configuration Files**:
- `apps/discord-bot/src/app.module.ts` - DI setup
- `packages/shared/src/` - Shared types
- `commitlint.config.js` - Commit validation
- `turbo.json` - Build pipeline

**Entry Points**:
- `apps/discord-bot/src/main.ts` - Bot entry
- `apps/image-service/src/main.ts` - API entry
- `packages/shared/src/index.ts` - Shared exports

## Common Tasks Quick Guide

### Adding a New Service
1. Create service in `apps/discord-bot/src/services/`
2. Extend BaseService with proper logging
3. Add to `app.module.ts` providers
4. Update `docs/services/[service-name].md`
5. Add usage examples to `docs/development/patterns.md`

### Adding a Discord Command
1. Create in `apps/discord-bot/src/commands/[category]/`
2. Use `@SlashCommand()` decorator
3. Add to module providers
4. Update `docs/features/discord-commands.md`

### Adding Environment Variables
1. Add to `.env.example` files
2. Add validation in startup
3. Update `docs/configuration/environment-vars.md`
4. Update deployment documentation if needed

## Final Reminder

**Documentation is not optional** - it's a critical part of the codebase that enables:
- Future Claude sessions to work efficiently
- New developers to onboard quickly  
- Complex systems to remain maintainable
- Knowledge to persist beyond individual contributors

Always update documentation when making changes. Your future self (and future Claude sessions) will thank you!