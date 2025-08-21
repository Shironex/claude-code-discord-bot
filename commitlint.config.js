/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Custom scope enum for monorepo structure
    'scope-enum': [
      2,
      'always',
      [
        'discord-bot',      // Main Discord bot application
        'image-service',    // Image service API application
        'root',             // Root workspace changes
        'ci',              // CI/CD changes
        'docs',            // Documentation
        'deps',            // Dependencies
        'release',         // Release-related changes
        'config',          // Configuration changes
        'template',        // Template changes
        'shared-types',    // Shared types package
        'packages',        // Packages directory
        'scripts',         // Scripts directory
        'docker',          // Docker changes
        'docker-compose',  // Docker compose changes
        'dockerfile',      // Dockerfile changes,
        'commitlint',      // Commitlint changes
        'husky',           // Husky changes
        'turbo',           // Turbo changes
      ],
    ],
    // Allow empty scopes for general changes
    'scope-empty': [1, 'never'],
    // Allow sentence case (first letter capitalized) and pascal case (PascalCase)
    'subject-case': [1, 'always', ['sentence-case', 'pascal-case', 'lower-case']],
    // Limit subject length
    'subject-max-length': [2, 'always', 100],
    // Ensure subject is not empty
    'subject-empty': [2, 'never'],
    // Limit body length
    'body-max-line-length': [1, 'always', 100],
    // Ensure type is present
    'type-empty': [2, 'never'],
    // Custom type enum to include common monorepo types
    'type-enum': [
      2,
      'always',
      [
        'feat',       // New feature
        'fix',        // Bug fix
        'docs',       // Documentation only changes
        'style',      // Changes that do not affect meaning (white-space, formatting, etc)
        'refactor',   // Code change that neither fixes a bug nor adds a feature
        'perf',       // Performance improvements
        'test',       // Adding missing tests or correcting existing tests
        'build',      // Changes to build system or external dependencies
        'ci',         // Changes to CI configuration files and scripts
        'chore',      // Other changes that don't modify src or test files
        'revert',     // Reverts a previous commit
      ],
    ],
  },
};