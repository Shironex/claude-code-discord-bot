# Adding New Packages to the Release System

This guide explains how to add new packages (apps, libraries, tools) to the automated release and versioning system.

## Overview

The monorepo uses **Changesets** for automated versioning and release management. Each package in `apps/*` and `packages/*` can be independently versioned and released through our CI/CD pipeline.

## Step-by-Step Guide

### 1. Create the Package Structure

Create your new package in the appropriate directory:

```bash
# For applications
mkdir -p apps/your-app-name

# For shared libraries/packages  
mkdir -p packages/your-package-name
```

### 2. Setup Package.json

Create a `package.json` with the following structure:

```json
{
  "name": "@claude-code/your-package-name",
  "version": "0.1.0",
  "license": "MIT",
  "private": false,
  "scripts": {
    "build": "your-build-command",
    "dev": "your-dev-command",
    "lint": "eslint src/**/*.ts --fix",
    "typecheck": "tsc --noEmit",
    "test": "your-test-command"
  },
  "dependencies": {
    // Your dependencies
  },
  "devDependencies": {
    // Your dev dependencies
  }
}
```

**Important naming convention:**
- Applications: `@claude-code/app-name` (e.g., `@claude-code/web-ui`, `@claude-code/mobile-app`)
- Packages: `@claude-code/package-name` (e.g., `@claude-code/shared-utils`, `@claude-code/api-client`)

### 3. Update Turborepo Configuration

Add your package to the build pipeline in `turbo.json`:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {},
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

### 4. Update Release Workflow (GitHub Actions)

Edit `.github/workflows/release.yml` to include your new package in version comparison:

```bash
# Find this section in the release workflow:
# TODO: When adding new packages, compare their versions here

# Add your package version comparison:
YOUR_PACKAGE_VERSION=$(node -p "require('./apps/your-app/package.json').version")
if [ "$(printf '%s\n' "$HIGHEST_VERSION" "$YOUR_PACKAGE_VERSION" | sort -V | tail -n1)" = "$YOUR_PACKAGE_VERSION" ]; then
  HIGHEST_VERSION=$YOUR_PACKAGE_VERSION
fi

# Add tag creation for your package:
if git tag "@claude-code/your-package@$YOUR_PACKAGE_VERSION" -m "Release @claude-code/your-package@$YOUR_PACKAGE_VERSION" 2>/dev/null; then
  echo "✅ Created package tag: @claude-code/your-package@$YOUR_PACKAGE_VERSION"
else
  echo "⚠️ Package tag @claude-code/your-package@$YOUR_PACKAGE_VERSION already exists, skipping"
fi
```

### 5. Update Commitlint Scopes

Add your package scope to `commitlint.config.js`:

```javascript
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', [
      'discord-bot',
      'your-package-name',  // Add your scope here
      'web-ui',
      'docs',
      'root',
      'ci',
      'deps',
      'release',
      'config'
    ]]
  }
}
```

### 6. Create Your First Changeset

When you're ready to release your package, create a changeset:

```bash
pnpm changeset
```

Select your package and choose the bump type:
- **patch**: Bug fixes, small improvements (`0.1.0 → 0.1.1`)
- **minor**: New features, backward compatible (`0.1.0 → 0.2.0`)  
- **major**: Breaking changes (`0.1.0 → 1.0.0`)

Example changeset for a new web UI package:

```markdown
---
"@claude-code/web-ui": minor
---

Add initial web dashboard with repository management

- Implement repository listing and search
- Add user authentication and session management  
- Create responsive dashboard layout
- Integrate with GitHub API for repository data
```

### 7. Test Your Setup

Before committing, verify everything works:

```bash
# Check changeset status
pnpm changeset status

# Verify build works
pnpm build

# Run quality checks
pnpm lint
pnpm typecheck

# Test release preview (dry run)
pnpm changeset version --snapshot preview --dry-run
```

## Package Types and Examples

### Application Package (`apps/web-ui`)

```json
{
  "name": "@claude-code/web-ui",
  "version": "0.1.0",
  "private": false,
  "scripts": {
    "build": "next build",
    "dev": "next dev",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  }
}
```

### Shared Library (`packages/api-client`)

```json
{
  "name": "@claude-code/api-client", 
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

### Documentation Package (`packages/docs`)

```json
{
  "name": "@claude-code/docs",
  "version": "0.1.0",
  "scripts": {
    "build": "docusaurus build",
    "dev": "docusaurus start",
    "serve": "docusaurus serve"
  }
}
```

## Release Workflow

Once your package is set up:

1. **Development**: Make changes to your package
2. **Create Changeset**: `pnpm changeset` (describe what changed)
3. **Commit & PR**: Follow conventional commit format
4. **Merge to Master**: Automatic release triggers
5. **Release Happens**: Package gets versioned, tagged, and released

## Version Management Strategy

- **Individual Packages**: Each has independent versioning based on changes
- **Root Package**: Automatically synced to the highest package version
- **Git Tags**: Both root (`v0.2.0`) and package-specific (`@claude-code/web-ui@0.2.0`) tags
- **GitHub Releases**: Named after root version with all package changes included

## Common Issues and Solutions

### Package Not Detected by Changesets

Ensure your package is in a directory listed in `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'      # Your app should be here
  - 'packages/*'  # Your package should be here
```

### Build Failures in CI

Make sure your package has all required scripts in `package.json`:

```json
{
  "scripts": {
    "build": "required - your build command",
    "lint": "optional - for quality checks",
    "typecheck": "optional - for type checking",
    "test": "optional - for testing"
  }
}
```

### Version Conflicts

If you see tag collision errors, check if your package version was already released:

```bash
git tag --list | grep your-package-name
```

### Changeset Not Triggering Release

Verify your changeset format:

```markdown
---
"@claude-code/your-package": minor
---

Your change description here
```

## Advanced Configuration

### Custom Release Pipeline

If your package needs custom release steps, you can add them to the GitHub Actions workflow:

```yaml
- name: Custom Release Step for Your Package
  if: contains(steps.changesets.outputs.publishedPackages, '@claude-code/your-package')
  run: |
    # Custom deployment or notification logic
    echo "Your package was released!"
```

### Package Dependencies

If your packages depend on each other, use `updateInternalDependencies` in `.changeset/config.json`:

```json
{
  "updateInternalDependencies": "patch"
}
```

This ensures internal dependencies get updated when related packages are released.

## Questions?

- Check the [Contributing Guide](../../CONTRIBUTING.md) for general development workflows
- Review existing packages in `apps/discord-bot` for reference implementation
- Look at `.changeset/` directory for example changesets

The release system is designed to be flexible and scale with your monorepo as you add more packages!