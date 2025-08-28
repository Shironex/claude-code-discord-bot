# Code Quality & Standards

Code quality standards, linting rules, and formatting guidelines for the monorepo.

## TypeScript Configuration

### Strict Type Checking
- `strict: true` enabled across all packages
- `noImplicitAny: true` - All types must be explicit
- `strictNullChecks: true` - Null safety enforced
- `noImplicitReturns: true` - All code paths must return

### Path Mapping
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],
      "@services/*": ["./services/*"],
      "@utils/*": ["./utils/*"]
    }
  }
}
```

## ESLint Configuration

### Core Rules
- **@typescript-eslint/recommended**: TypeScript best practices
- **@typescript-eslint/strict**: Strict TypeScript rules
- **prettier/recommended**: Prettier integration

### Custom Rules
```typescript
// eslint.config.js
export default {
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

## Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

## Naming Conventions

### Files and Directories
- **kebab-case**: File names (`github-service.ts`)
- **PascalCase**: Class names (`GitHubService`)
- **camelCase**: Function and variable names
- **UPPER_CASE**: Constants (`API_BASE_URL`)

### TypeScript Interfaces
```typescript
// Interface naming
interface UserSession {
  userId: string;
  createdAt: Date;
}

// Enum naming
enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed'
}
```

## Code Organization

### Import Order
```typescript
// 1. Node.js built-ins
import { readFileSync } from 'fs';

// 2. External packages
import { Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/rest';

// 3. Internal packages
import { LoggerService } from '@claude-code/shared';

// 4. Relative imports
import { BaseService } from '../base/base.service';
import { GitHubRepository } from './github.interface';
```

### Class Structure
```typescript
@Injectable()
export class ExampleService {
  // 1. Private properties
  private readonly logger: LoggerService;
  private cache: Map<string, any> = new Map();
  
  // 2. Constructor
  constructor(loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.createLogger('ExampleService');
  }
  
  // 3. Public methods
  public async publicMethod(): Promise<void> {
    // Implementation
  }
  
  // 4. Private methods
  private privateHelper(): void {
    // Implementation
  }
}
```

## Error Handling Standards

### Custom Exceptions
```typescript
export class RepositoryNotFoundError extends Error {
  constructor(owner: string, repo: string) {
    super(`Repository ${owner}/${repo} not found`);
    this.name = 'RepositoryNotFoundError';
  }
}
```

### Error Handling Pattern
```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  this.logger.error('Operation failed', error, 'methodName');
  
  if (error instanceof SpecificError) {
    throw new UserFriendlyError('User-friendly message');
  }
  
  throw error; // Re-throw unknown errors
}
```

## Documentation Standards

### JSDoc Comments
```typescript
/**
 * Search repositories by query string
 * @param query - Search term or exact repository name
 * @param limit - Maximum number of results to return
 * @returns Promise resolving to array of repositories
 * @throws {RateLimitError} When GitHub API rate limit exceeded
 */
async searchRepositories(query: string, limit = 25): Promise<Repository[]> {
  // Implementation
}
```

### README Requirements
Each package/app must have:
- Purpose and overview
- Installation instructions
- Usage examples
- API documentation
- Contributing guidelines

## Testing Standards

### Test File Structure
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mockDependency: jest.Mocked<Dependency>;
  
  beforeEach(() => {
    // Setup
  });
  
  describe('methodName', () => {
    it('should handle success case', async () => {
      // Test implementation
    });
    
    it('should handle error case', async () => {
      // Error test
    });
  });
});
```

### Test Naming
- Descriptive test names
- "should" statements for behavior
- Group related tests with `describe`
- One assertion per test when possible

## Performance Standards

### Memory Management
- Avoid memory leaks in services
- Clean up timers and intervals
- Use weak references for caches
- Monitor memory usage in production

### API Efficiency
- Implement caching for expensive operations
- Use pagination for large datasets
- Batch API calls when possible
- Handle rate limits gracefully

## Security Standards

### Input Validation
```typescript
function validateInput(input: unknown): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be string');
  }
  
  if (input.length > 100) {
    throw new ValidationError('Input too long');
  }
  
  return input.trim();
}
```

### Sensitive Data
- Never log sensitive information
- Use environment variables for secrets
- Implement data masking in logs
- Validate all external inputs

## Git Standards

### Commit Messages
```bash
feat(discord-bot): add repository search modal
fix(image-service): resolve upload timeout issue
docs(shared): update logger documentation
```

### Branch Naming
- `feat/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/update-section` - Documentation
- `refactor/component-name` - Code refactoring

## Quality Gates

### Pre-commit Hooks
1. Lint checking with auto-fix
2. Type checking validation
3. Format checking with Prettier
4. Commit message validation

### CI/CD Checks
1. Build verification
2. Test execution and coverage
3. Type checking
4. Linting validation
5. Security scanning

## Development Tools

### VS Code Extensions
- TypeScript and JavaScript Language Features
- ESLint
- Prettier - Code formatter
- GitLens
- Auto Rename Tag

### Configuration Files
- `.vscode/settings.json` - Workspace settings
- `.vscode/extensions.json` - Recommended extensions
- `.editorconfig` - Editor configuration

## Related Documentation

- [Development Patterns](./patterns.md) - Code patterns
- [Testing Strategy](./testing.md) - Testing guidelines
- [Commands](./commands.md) - Quality check commands
- [Workflows](../workflows/) - Git and commit standards

[← Back to Development](./README.md)