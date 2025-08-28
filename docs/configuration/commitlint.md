# Commitlint Configuration

Commit message validation rules and configuration for automated enforcement.

## Configuration File

**Location**: `commitlint.config.js`

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert'
      ]
    ],
    'scope-enum': [
      2,
      'always',
      [
        'discord-bot',
        'image-service',
        'shared',
        'root',
        'ci',
        'docs',
        'deps',
        'release',
        'config',
        'template',
        'packages',
        'scripts',
        'docker',
        'docker-compose',
        'dockerfile',
        'commitlint',
        'husky',
        'turbo'
      ]
    ],
    'scope-empty': [2, 'never'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 100]
  }
};
```

## Rule Explanations

### Type Rules
- **`type-enum`**: Only allows specified commit types
- **Allowed types**: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- **Enforcement**: Error level (blocks commit)

### Scope Rules
- **`scope-enum`**: Only allows specified scopes
- **`scope-empty`**: Scope is required (cannot be empty)
- **Enforcement**: Error level (blocks commit)

### Subject Rules
- **`subject-case`**: Subject must be lowercase
- **`subject-max-length`**: Maximum 100 characters
- **Enforcement**: Error level (blocks commit)

### Body Rules
- **`body-max-line-length`**: Each body line maximum 100 characters
- **Enforcement**: Error level (blocks commit)

## Validation Examples

### Valid Commit Messages
```bash
✅ feat(discord-bot): add repository search modal
✅ fix(image-service): resolve upload timeout issue
✅ docs(shared): update logger documentation
✅ style(discord-bot): fix eslint formatting issues
✅ refactor(shared): extract common utilities
✅ perf(discord-bot): optimize session cleanup
✅ test(image-service): add upload validation tests
✅ ci(root): add automated release workflow
```

### Invalid Commit Messages
```bash
❌ Add new feature                     # Missing type and scope
❌ feat: add new feature               # Missing scope
❌ feat(invalid): add new feature      # Invalid scope
❌ feat(discord-bot): Add new feature  # Capitalized subject
❌ update(discord-bot): add feature    # Invalid type
❌ feat(discord-bot): add a really long description that exceeds the maximum allowed character limit for commit messages which is one hundred characters  # Too long
```

## Hook Integration

### Husky Configuration
**Location**: `.husky/commit-msg`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit "$1"
```

This hook runs automatically on every commit attempt and validates the commit message format.

### Manual Validation
```bash
# Test commit message format
pnpm lint:commit "feat(discord-bot): add new feature"

# Validate last commit message
npx commitlint --from HEAD~1 --to HEAD --verbose

# Validate commit message from file
echo "feat(discord-bot): add new feature" | npx commitlint
```

## Error Messages

### Type Error
```
❌ type must be one of [feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert] [type-enum]

Your message: "update(discord-bot): add new feature"
Expected format: "feat(discord-bot): add new feature"
```

### Scope Error
```
❌ scope must be one of [discord-bot, image-service, shared, root, ci, docs, deps, release, config, template, packages, scripts, docker, docker-compose, dockerfile, commitlint, husky, turbo] [scope-enum]

Your message: "feat(invalid-scope): add new feature"
Expected format: "feat(discord-bot): add new feature"
```

### Case Error
```
❌ subject must not be sentence-case, start-case, pascal-case, upper-case [subject-case]

Your message: "feat(discord-bot): Add new feature"
Expected format: "feat(discord-bot): add new feature"
```

### Length Error
```
❌ subject must not be longer than 100 characters [subject-max-length]

Your message is 150 characters long.
Consider shortening your commit message.
```

## Scope Guidelines

### Application Scopes
- **`discord-bot`**: Changes to the Discord bot application
- **`image-service`**: Changes to the image service API
- **`shared`**: Changes to the shared package

### Infrastructure Scopes
- **`root`**: Root workspace configuration changes
- **`ci`**: CI/CD pipeline changes
- **`docs`**: Documentation updates
- **`deps`**: Dependency updates
- **`release`**: Release-related changes

### Configuration Scopes
- **`config`**: General configuration changes
- **`docker`**: Docker-related changes
- **`commitlint`**: Commitlint configuration changes
- **`husky`**: Git hooks configuration
- **`turbo`**: Turborepo configuration

## Bypassing Validation

### Emergency Override
```bash
# Only use in emergencies
git commit --no-verify -m "emergency fix"
```

**Warning**: Bypassing validation should only be used in true emergencies and the commit should be fixed with a proper message later.

### Temporary Disable
```bash
# Temporarily disable commitlint
export HUSKY=0
git commit -m "temporary message"
unset HUSKY
```

## Customization

### Adding New Scopes
```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        // ... existing scopes
        'new-scope',  // Add new scope here
      ]
    ]
  }
};
```

### Custom Rules
```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Custom rule: require ticket number in footer
    'footer-must-have-ticket': [2, 'always'],
  },
  plugins: [
    {
      rules: {
        'footer-must-have-ticket': (parsed) => {
          const { footer } = parsed;
          if (!footer || !footer.includes('Closes #')) {
            return [false, 'Footer must include ticket reference (e.g., "Closes #123")'];
          }
          return [true];
        },
      },
    },
  ],
};
```

## IDE Integration

### VS Code Extension
Install "Conventional Commits" extension for commit message assistance:

1. **Install Extension**: Search for "Conventional Commits" in VS Code
2. **Use Command**: Cmd/Ctrl + Shift + P → "Conventional Commits"
3. **Select Type and Scope**: Follow prompts to build valid commit message

### Git Template
```bash
# Set up commit template
echo "# type(scope): description\n\n# body\n\n# footer" > ~/.gitmessage
git config --global commit.template ~/.gitmessage
```

## Troubleshooting

### Hook Not Running
```bash
# Reinstall hooks
rm -rf .husky
npx husky install
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
```

### Permission Issues
```bash
# Fix hook permissions
chmod +x .husky/commit-msg
```

### Node.js Issues
```bash
# Ensure npx is available
which npx
npm install -g npm@latest
```

## Related Documentation

- [Commit Guidelines](../workflows/commit-guidelines.md) - Detailed commit format guide
- [Release Process](../workflows/release-process.md) - How commits trigger releases
- [Troubleshooting](../workflows/troubleshooting.md) - Common commit issues

[← Back to Configuration](./README.md)