# Create Pull Request Command

Create a new branch, commit changes, and submit a pull request following the project's CI/CD workflow.

## Behavior

- Creates a new branch based on current changes
- Formats modified files using prettier
- **REQUIRED**: Creates changesets for any changes that should trigger releases
- Analyzes changes and splits into logical commits following conventional commit format
- **ENFORCED**: Each commit uses strict conventional commit format: `type(scope): description`
- Uses valid types and scopes as defined in commitlint.config.js
- Pushes branch to remote (triggers automated PR checks)
- Creates pull request with proper summary and test plan
- **AUTOMATIC**: GitHub Actions will validate commits and detect changesets

## Mandatory Conventional Commit Format

**Format**: `type(scope): description`

**Valid Types** (strictly enforced by commitlint):
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

**Valid Scopes** (required, strictly enforced):
- `discord-bot` - Discord bot application changes
- `root` - Root workspace changes
- `ci` - CI/CD changes
- `docs` - Documentation
- `deps` - Dependencies
- `release` - Release-related
- `config` - Configuration

## Changeset Requirements

**BEFORE committing**, determine if changes need a changeset:

**CREATE CHANGESET for**:
- New features (`feat`)
- Bug fixes (`fix`)
- Performance improvements (`perf`)
- Breaking changes (any type)
- API changes

**DO NOT CREATE CHANGESET for**:
- Documentation changes (`docs`)
- Test changes (`test`)
- CI/CD changes (`ci`)
- Code style changes (`style`)
- Development dependency updates

**Command**: `pnpm changeset` before committing

## Guidelines for Commit Splitting

- **One logical change per commit** following conventional format
- **Group related files** by feature/component in same commit
- **Separate concerns**: refactoring vs features vs fixes
- **Ensure atomicity**: each commit should be independently understandable
- **Follow scope consistency**: use same scope for related changes

## Commit Message Examples

```bash
feat(discord-bot): add repository search modal with fuzzy matching
fix(discord-bot): resolve session timeout causing user state loss
docs(root): update contributing guidelines for conventional commits
ci(root): add automated release workflow with changesets
chore(deps): update discord.js to latest stable version
refactor(discord-bot): extract embed creation logic into service
```

## Automated PR Validation

Once PR is created, GitHub Actions will automatically:
- ✅ Validate all commit messages follow conventional format
- ✅ Run code quality checks (lint, typecheck, build)
- ✅ Detect and preview changesets
- ✅ Add automated PR comments about release impact
- ✅ Check security audit status

**PR will be blocked if any validation fails**

## Post-PR Creation

After PR is created:
1. **Review automated bot comments** about changesets and version impact
2. **Address any CI check failures** immediately
3. **Update PR description** if changeset preview suggests different impact
4. **Ensure all conversations are resolved** before requesting review

## Release Impact

- **PRs with changesets** will trigger automatic releases when merged to master
- **PRs without changesets** will NOT trigger releases (documentation, tests, CI)
- **Preview version changes** in PR comments before merging
- **Major version bumps** require extra attention and communication
