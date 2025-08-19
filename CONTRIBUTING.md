# Contributing to Claude Code Discord Bot

Thank you for your interest in contributing to the Claude Code Discord Bot! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js >=22.11.0
- pnpm >=10.9.0
- Git

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/claude-code-discord-bot.git
   cd claude-code-discord-bot
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp apps/discord-bot/.env.example apps/discord-bot/.env
   # Edit .env with your Discord token and GitHub token
   ```

4. **Start development**
   ```bash
   pnpm dev
   ```

## 📝 Commit Convention

This project uses [Conventional Commits](https://conventionalcommits.org/) to ensure consistent commit messages and enable automated changelog generation.

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Scopes

- **discord-bot**: Discord bot application changes
- **root**: Root workspace changes
- **ci**: CI/CD changes
- **docs**: Documentation updates
- **deps**: Dependency updates
- **release**: Release-related changes
- **config**: Configuration changes

### Examples

```bash
feat(discord-bot): add new slash command for repository analysis
fix(discord-bot): resolve session timeout issue
docs(root): update contributing guidelines
ci(root): add automated release workflow
```

## 🔄 Version Management & Releases

This project uses [Changesets](https://github.com/changesets/changesets) for version management and automated releases.

### Creating a Changeset

When you make changes that should trigger a release, you need to create a changeset:

```bash
pnpm changeset
```

This will:
1. Ask which packages should be bumped
2. Ask what type of bump (major, minor, patch)
3. Ask for a summary of the changes

### Changeset Guidelines

- **Major**: Breaking changes that require user action
- **Minor**: New features that are backward compatible
- **Patch**: Bug fixes and small improvements

### Examples

```bash
# For a new feature
pnpm changeset
# Select: discord-bot, minor
# Summary: "Add support for repository file selection"

# For a bug fix
pnpm changeset
# Select: discord-bot, patch
# Summary: "Fix session cleanup memory leak"
```

## 🔧 Development Workflow

### Branch Strategy

- `master`: Production-ready code
- `dev`: Development branch for staging
- Feature branches: `feat/feature-name`
- Bug fix branches: `fix/bug-description`

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** following the coding standards

3. **Add a changeset** if your changes should trigger a release
   ```bash
   pnpm changeset
   ```

4. **Commit your changes** using conventional commits
   ```bash
   git commit -m "feat(discord-bot): add new feature"
   ```

5. **Push and create a PR**
   ```bash
   git push origin feat/your-feature-name
   ```

### Automated Checks

Every PR will automatically run:

- ✅ Commit message validation (Commitlint)
- ✅ Code linting (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Code formatting (Prettier)
- ✅ Build verification
- ✅ Security audit
- ✅ Changeset validation

### Git Hooks

Pre-commit hooks will automatically run:
- Code linting and type checking
- Code formatting
- Build verification

If any checks fail, the commit will be rejected. Fix the issues and try again.

## 🏗️ Project Structure

```
claude-code-discord-bot/
├── apps/
│   └── discord-bot/            # Discord bot application
│       ├── src/                # Application source code
│       ├── .env                # Bot environment variables
│       └── package.json        # Bot dependencies
├── packages/                   # Shared packages (future)
├── .github/                    # GitHub Actions workflows
│   ├── workflows/
│   │   ├── ci.yml             # Continuous integration
│   │   ├── release.yml        # Automated releases
│   │   └── pr-checks.yml      # PR validation
│   └── actions/
│       └── setup-node-pnpm/   # Reusable setup action
├── .changeset/                 # Changesets configuration
├── .husky/                     # Git hooks
├── commitlint.config.js        # Commit message rules
├── turbo.json                  # Turborepo configuration
└── pnpm-workspace.yaml         # PNPM workspace settings
```

## 🧪 Testing

```bash
# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Run formatting
pnpm format

# Build project
pnpm build
```

## 📦 Release Process

Releases are automated through GitHub Actions:

1. **Merge PR to master** - Triggers release workflow
2. **Changesets analysis** - Determines if release is needed
3. **Version bump** - Updates package versions and changelogs
4. **Release creation** - Creates GitHub release with changelog
5. **Tagging** - Creates Git tags for versions

### Manual Release

If you need to manually trigger a release:

1. **Version packages**
   ```bash
   pnpm version
   ```

2. **Review changes** in `CHANGELOG.md`

3. **Commit and push**
   ```bash
   git add .
   git commit -m "chore(release): version packages"
   git push
   ```

4. **Publish** (if authorized)
   ```bash
   pnpm release
   ```

## 🔍 Code Quality Standards

### TypeScript

- Use strict TypeScript configuration
- Provide proper type annotations
- Avoid `any` types when possible
- Use interfaces for object shapes

### Code Style

- Follow the existing code patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Error Handling

- Always handle errors appropriately
- Use try-catch for async operations
- Provide user-friendly error messages
- Log errors for debugging

### Security

- Never commit secrets or tokens
- Validate all external inputs
- Follow secure coding practices
- Use environment variables for configuration

## ❓ Getting Help

- 📚 Check the [README.md](./README.md) for basic information
- 🐛 Open an [issue](https://github.com/your-org/claude-code-discord-bot/issues) for bugs
- 💡 Start a [discussion](https://github.com/your-org/claude-code-discord-bot/discussions) for questions
- 📖 Review existing documentation in `/docs`

## 🎯 Best Practices

### Commits

- Make atomic commits (one logical change per commit)
- Write clear, descriptive commit messages
- Reference issues/PRs when relevant
- Keep commits focused and small

### Code Reviews

- Be respectful and constructive
- Test the changes locally when possible
- Check for security implications
- Verify documentation updates

### Performance

- Consider performance implications of changes
- Test with realistic data sizes
- Monitor memory usage
- Optimize Discord API calls

## 🚨 Troubleshooting

### Common Issues

**Husky hooks not running?**
```bash
pnpm prepare
```

**Commit rejected by commitlint?**
- Check your commit message follows the conventional format
- Use `pnpm lint:commit` to validate before committing

**Changeset workflow questions?**
- Run `pnpm changeset status` to see current state
- Use `pnpm changeset --empty` for non-release changes

**Build or type errors?**
```bash
pnpm typecheck
pnpm lint
pnpm build
```

Thank you for contributing to making Claude Code Discord Bot better! 🎉