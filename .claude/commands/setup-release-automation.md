# Setup Automated Release Management

This command sets up a comprehensive automated versioning and release system for both single applications and monorepos, based on industry best practices using Changesets, Conventional Commits, and GitHub Actions.

## Overview

The system includes:
- **Changesets** - Automated version bumping and changelog generation
- **Conventional Commits** - Enforced commit message format with Commitlint
- **Git Hooks** - Pre-commit quality checks and commit validation with Husky
- **GitHub Actions** - CI/CD pipeline with automated releases
- **Monorepo Support** - Full support for multi-package repositories with Turborepo and PNPM workspaces

## Quick Start

Please analyze the current project and set up the appropriate release automation system:

1. **Detect project type** (monorepo vs single app)
2. **Choose package manager** (npm, yarn, pnpm - detect from existing lock files)
3. **Install and configure all necessary tools**
4. **Create GitHub Actions workflows**
5. **Set up commit validation and hooks**
6. **Generate documentation and examples**

## Project Analysis

First, analyze the current project structure:

```bash
# Check if it's already a monorepo
ls -la | grep -E "(pnpm-workspace\.yaml|lerna\.json|rush\.json)"

# Check existing package manager
ls -la | grep -E "(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)"

# Check for existing packages/workspaces
find . -name "package.json" -not -path "*/node_modules/*" | head -10

# Check current directory structure
find . -maxdepth 2 -type d | grep -E "(apps|packages|libs|tools)" | head -5
```

Based on the analysis, determine:
- **Project Type**: Single app, existing monorepo, or should become a monorepo
- **Package Manager**: npm, yarn, or pnpm
- **Existing Structure**: Current workspace setup if any

## Installation & Setup

### 1. Core Dependencies

Install the necessary dependencies based on the project type:

#### For Single Applications:
```bash
# Install Changesets for version management
npm install -D @changesets/cli

# Install Commitlint for commit validation
npm install -D @commitlint/cli @commitlint/config-conventional

# Install Husky for git hooks
npm install -D husky

# Initialize tools
npx changeset init
npx husky init
```

#### For Monorepos (add Turborepo):
```bash
# All the above dependencies PLUS:
npm install -D turbo

# For PNPM workspaces (recommended for monorepos)
# Ensure pnpm-workspace.yaml exists
```

### 2. Configuration Files

#### Changesets Configuration (`.changeset/config.json`)

**For Single Apps:**
```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.1/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

**For Monorepos:**
```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.1/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": [],
  "privatePackages": {
    "version": true,
    "tag": true
  }
}
```

#### Commitlint Configuration (`commitlint.config.js`)

**For Single Apps:**
```javascript
/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-empty': [1, 'always'], // Allow empty scopes
    'subject-case': [1, 'always', ['sentence-case', 'lower-case']],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 100],
  },
};
```

**For Monorepos (generate based on actual packages found):**
```javascript
/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Generate scope enum based on actual packages/apps discovered
    'scope-enum': [
      2,
      'always',
      [
        // Auto-generated from package.json names and directory structure
        'root',       // Root workspace changes
        'deps',       // Dependencies
        'ci',         // CI/CD changes
        'docs',       // Documentation
        'config',     // Configuration changes
        // Add discovered app/package names here
      ],
    ],
    'scope-empty': [1, 'never'], // Require scopes for monorepos
    'subject-case': [1, 'always', ['sentence-case', 'lower-case']],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 100],
  },
};
```

#### Husky Git Hooks

**Commit Message Hook (`.husky/commit-msg`):**
```bash
#!/usr/bin/env sh
npx commitlint --edit $1
```

**Pre-commit Hook (`.husky/pre-commit`):**

**For Single Apps:**
```bash
#!/usr/bin/env sh
# Run linting and type checking
npm run lint
npm run typecheck

# Run formatting
npm run format
```

**For Monorepos:**
```bash
#!/usr/bin/env sh
# Run linting and type checking across all packages
npm run lint
npm run typecheck

# Run formatting
npm run format
```

### 3. Package.json Scripts

Add the following scripts to the root `package.json`:

**For Single Apps:**
```json
{
  "scripts": {
    "changeset": "changeset",
    "changeset:add": "changeset add",
    "changeset:status": "changeset status",
    "version": "changeset version",
    "release": "npm run build && npm run changeset version",
    "lint:commit": "commitlint --edit"
  }
}
```

**For Monorepos:**
```json
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "format": "turbo run format", 
    "typecheck": "turbo run typecheck",
    "changeset": "changeset",
    "changeset:add": "changeset add",
    "changeset:status": "changeset status", 
    "version": "changeset version",
    "release": "turbo run build && changeset version",
    "lint:commit": "commitlint --edit"
  }
}
```

### 4. Turborepo Configuration (Monorepos only)

**`turbo.json`:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "format": {
      "dependsOn": ["^format"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

**`pnpm-workspace.yaml` (if using PNPM):**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'libs/*'
  - 'tools/*'
```

## GitHub Actions Workflows

### CI Workflow (`.github/workflows/ci.yml`)

**For Single Apps:**
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality-checks:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run type checking
        run: npm run typecheck

      - name: Run ESLint
        run: npm run lint

      - name: Run build
        run: npm run build

      - name: Run tests
        run: npm test
        if: always()

  commit-validation:
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Validate current commit (push)
        if: github.event_name == 'push'
        run: npx commitlint --last --verbose

      - name: Validate PR commits  
        if: github.event_name == 'pull_request'
        run: npx commitlint --from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }} --verbose
```

**For Monorepos (replace npm with turbo commands):**
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality-checks:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js and PNPM
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Setup PNPM
        uses: pnpm/action-setup@v2
        with:
          version: latest
          run_install: false

      - name: Get pnpm store directory
        run: echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_ENV

      - name: Setup pnpm cache
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run type checking
        run: pnpm run typecheck

      - name: Run ESLint
        run: pnpm run lint

      - name: Run build
        run: pnpm run build

      - name: Run tests
        run: pnpm run test
        if: always()
```

### Release Workflow (`.github/workflows/release.yml`)

**For Single Apps:**
```yaml
name: Release

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false

permissions:
  contents: write
  pull-requests: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Check for changesets
        id: changesets
        run: |
          if npx changeset status --output=changeset-status.json 2>/dev/null; then
            if [ -s changeset-status.json ]; then
              echo "has_changesets=true" >> $GITHUB_OUTPUT
            else
              echo "has_changesets=false" >> $GITHUB_OUTPUT
            fi
          else
            echo "has_changesets=false" >> $GITHUB_OUTPUT
          fi

      - name: Version and create release
        if: steps.changesets.outputs.has_changesets == 'true'
        run: |
          # Version packages based on changesets
          if npx changeset version; then
            echo "✅ Changesets processed successfully"
          else
            echo "⚠️ No changesets to process"
            exit 0
          fi
          
          # Get the new version
          NEW_VERSION=$(node -p "require('./package.json').version")
          echo "NEW_VERSION=$NEW_VERSION" >> $GITHUB_ENV
          
          # Commit the version changes
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add .
          git commit -m "chore(release): version to $NEW_VERSION" || echo "No changes to commit"
          
          # Create git tag
          git tag "v$NEW_VERSION" -m "Release v$NEW_VERSION"
          
          # Push changes and tags
          git push origin main --follow-tags

      - name: Create GitHub Release
        if: steps.changesets.outputs.has_changesets == 'true'
        uses: softprops/action-gh-release@v1
        with:
          tag_name: "v${{ env.NEW_VERSION }}"
          name: "Release v${{ env.NEW_VERSION }}"
          body: |
            🚀 **Release v${{ env.NEW_VERSION }}**
            
            Check the CHANGELOG.md for detailed changes.
            
            🤖 Automated release generated by GitHub Actions
          draft: false
          prerelease: false
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Clean up
        if: always()
        run: rm -f changeset-status.json
```

**For Monorepos (more complex versioning logic):**
```yaml
name: Release

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false

permissions:
  contents: write
  pull-requests: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js and PNPM
        # ... same as CI setup

      - name: Check for changesets
        id: changesets
        run: |
          if pnpm changeset status --output=changeset-status.json 2>/dev/null; then
            if [ -s changeset-status.json ]; then
              echo "has_changesets=true" >> $GITHUB_OUTPUT
            else
              echo "has_changesets=false" >> $GITHUB_OUTPUT
            fi
          else
            echo "has_changesets=false" >> $GITHUB_OUTPUT
          fi

      - name: Version packages and create releases
        if: steps.changesets.outputs.has_changesets == 'true'  
        run: |
          # Version packages based on changesets
          if pnpm changeset version; then
            echo "✅ Changesets processed successfully"
          else
            echo "⚠️ No changesets to process"
            exit 0
          fi
          
          # Get versions for all packages that changed
          ROOT_VERSION=$(node -p "require('./package.json').version")
          
          # Find all package.json files and extract versions
          CHANGED_PACKAGES=""
          for pkg in $(find apps packages -name "package.json" -not -path "*/node_modules/*"); do
            PKG_NAME=$(node -p "require('./$pkg').name")
            PKG_VERSION=$(node -p "require('./$pkg').version") 
            if [ ! -z "$PKG_NAME" ]; then
              CHANGED_PACKAGES="$CHANGED_PACKAGES\n$PKG_NAME@$PKG_VERSION"
              echo "${PKG_NAME}_VERSION=$PKG_VERSION" >> $GITHUB_ENV
            fi
          done
          
          echo "ROOT_VERSION=$ROOT_VERSION" >> $GITHUB_ENV
          echo "CHANGED_PACKAGES<<EOF" >> $GITHUB_ENV
          echo -e "$CHANGED_PACKAGES" >> $GITHUB_ENV
          echo "EOF" >> $GITHUB_ENV
          
          # Commit version changes
          git config user.name "github-actions[bot]" 
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add .
          git commit -m "chore(release): version packages" || echo "No changes to commit"
          
          # Create tags for each changed package
          echo -e "$CHANGED_PACKAGES" | while read line; do
            if [ ! -z "$line" ]; then
              git tag "$line" -m "Release $line" 2>/dev/null || echo "Tag $line already exists"
            fi
          done
          
          # Create root version tag
          git tag "v$ROOT_VERSION" -m "Release v$ROOT_VERSION" 2>/dev/null || echo "Root tag already exists"
          
          # Push all changes and tags
          git push origin main --follow-tags

      - name: Create GitHub Release
        if: steps.changesets.outputs.has_changesets == 'true'
        uses: softprops/action-gh-release@v1
        with:
          tag_name: "v${{ env.ROOT_VERSION }}"
          name: "Release v${{ env.ROOT_VERSION }}"
          body: |
            🚀 **Monorepo Release v${{ env.ROOT_VERSION }}**
            
            ## Changed Packages
            ${{ env.CHANGED_PACKAGES }}
            
            Check the individual CHANGELOG.md files in each package for detailed changes.
            
            🤖 Automated release generated by GitHub Actions
          draft: false
          prerelease: false
          token: ${{ secrets.GITHUB_TOKEN }}
```

## Usage Instructions

### Creating a Release

1. **Make changes** to your code
2. **Create a changeset** describing your changes:
   ```bash
   npx changeset
   # Follow the prompts to select packages and change type
   ```
3. **Commit the changeset file** along with your code changes:
   ```bash
   git add .
   git commit -m "feat: add new feature
   
   This commit adds a new feature that does XYZ"
   ```
4. **Push to main branch** - this triggers the automated release
5. **GitHub Actions will**:
   - Detect changesets
   - Bump versions automatically
   - Generate changelogs
   - Create git tags  
   - Create GitHub releases

### Changeset Types

- **patch** - Bug fixes, small improvements
- **minor** - New features, backward compatible changes
- **major** - Breaking changes that require user action

### Commit Message Format

Follow conventional commits format:
```
type(scope): description

Optional longer description

BREAKING CHANGE: description of breaking change
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

## Examples and Documentation

### Example Changeset Creation

```bash
# Create a changeset
npx changeset

# Example prompts and responses:
? Which packages would you like to include? 
  ✅ @my-org/my-package

? Which packages should have a major bump? 
  (Press space to select)
  
? Which packages should have a minor bump?
  ✅ @my-org/my-package
  
? Which packages should have a patch bump?
  (Press space to select)

? Please enter a summary for this change:
  Add new user authentication feature

? Does this changeset include a description? No
```

This creates a file like `.changeset/friendly-cats-jump.md`:
```markdown
---
"@my-org/my-package": minor
---

Add new user authentication feature
```

### Example Release Process

1. **Developer commits changes**:
   ```bash
   git commit -m "feat(auth): add OAuth2 integration
   
   Implement Google and GitHub OAuth2 authentication
   with secure token refresh and user profile sync"
   ```

2. **Developer creates changeset**:
   ```bash
   npx changeset
   # Selects minor bump for the authentication feature
   git add .changeset/
   git commit -m "chore: add changeset for OAuth2 feature"
   ```

3. **Push triggers automation**:
   ```bash
   git push origin main
   # GitHub Actions detects changesets
   # Automatically bumps version from 1.0.0 to 1.1.0  
   # Generates changelog entry
   # Creates git tag v1.1.0
   # Creates GitHub release
   ```

## Troubleshooting

### Common Issues

1. **Changesets not detected**
   - Ensure `.changeset` folder exists and contains `.md` files
   - Run `npx changeset status` to check current state

2. **Commit validation failing**
   - Check commit message follows conventional format
   - Verify scope matches allowed scopes in `commitlint.config.js`

3. **Pre-commit hooks failing**  
   - Run `npm run lint` and fix any linting errors
   - Run `npm run typecheck` and fix TypeScript errors
   - Run `npm run format` to auto-format code

4. **Release workflow not triggering**
   - Ensure GitHub Actions are enabled in repository settings
   - Check that branch protection rules allow the actions bot to push
   - Verify `GITHUB_TOKEN` has required permissions

### Manual Release

If automation fails, you can manually release:

```bash
# Version packages
npx changeset version

# Build packages  
npm run build

# Commit version changes
git add .
git commit -m "chore(release): version packages"

# Create and push tags
git tag "v$(node -p "require('./package.json').version")"
git push origin main --follow-tags
```

## Advanced Configuration

### Custom Commit Scopes

For monorepos, automatically generate commit scopes from package names:

```javascript
// In commitlint.config.js
const fs = require('fs');
const path = require('path');

// Auto-discover packages
const packages = [];
const workspaceDirs = ['apps', 'packages', 'libs', 'tools'];

workspaceDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(pkg => {
      const pkgPath = path.join(dir, pkg, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkgJson = require(`./${pkgPath}`);
        if (pkgJson.name) {
          // Extract package name without org scope
          packages.push(pkgJson.name.replace(/^@[^/]+\//, ''));
        }
      }
    });
  }
});

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', [
      'root',
      'deps', 
      'ci',
      'docs',
      'config',
      ...packages
    ]],
  },
};
```

### Branch Protection Rules

Recommend enabling these GitHub branch protection rules:
- Require pull request reviews
- Require status checks (CI workflow)
- Require branches to be up to date
- Include administrators
- Allow GitHub Actions to push (for automated releases)

### Release Channels

For advanced release management, configure different release channels:

```json
{
  "branches": [
    "main",
    "next", 
    {"name": "beta", "prerelease": true},
    {"name": "alpha", "prerelease": true}
  ]
}
```

This setup provides a complete, production-ready automated release management system that scales from single applications to complex monorepos.