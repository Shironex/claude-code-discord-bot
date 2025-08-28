# Testing Strategy

Testing guidelines and strategies for the monorepo applications.

## Testing Framework

- **Unit Tests**: Jest for services and utilities
- **Integration Tests**: Supertest for API endpoints
- **E2E Tests**: Jest with Discord.js mocks
- **Coverage**: Istanbul/NYC for coverage reporting

## Testing Commands

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test --coverage

# Run tests for specific package
pnpm test --filter=@claude-code/shared

# Watch mode
pnpm test --watch
```

## Unit Testing Patterns

### Service Testing
```typescript
describe('GitHubService', () => {
  let service: GitHubService;
  let mockOctokit: jest.Mocked<Octokit>;
  
  beforeEach(() => {
    mockOctokit = {
      rest: {
        repos: {
          get: jest.fn(),
          listForAuthenticatedUser: jest.fn()
        }
      }
    } as any;
    
    service = new GitHubService(mockLoggerFactory, mockOctokit);
  });
  
  it('should fetch repository details', async () => {
    mockOctokit.rest.repos.get.mockResolvedValue({
      data: mockRepository
    });
    
    const repo = await service.getRepository('owner', 'repo');
    expect(repo).toEqual(mockRepository);
  });
});
```

### Utility Testing
```typescript
describe('FileTreeUtils', () => {
  it('should build file tree from GitHub data', () => {
    const githubFiles = mockGitHubFileData;
    const tree = FileTreeUtils.buildTree(githubFiles);
    
    expect(tree).toHaveLength(2);
    expect(tree[0].name).toBe('src');
    expect(tree[0].children).toHaveLength(3);
  });
});
```

## Integration Testing

### API Endpoint Testing
```typescript
describe('Image Service API', () => {
  let app: INestApplication;
  
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();
    
    app = module.createNestApplication();
    await app.init();
  });
  
  it('/upload (POST)', () => {
    return request(app.getHttpServer())
      .post('/upload')
      .attach('file', 'test-image.png')
      .set('Authorization', 'Bearer test-key')
      .expect(201)
      .expect(res => {
        expect(res.body.data.id).toBeDefined();
      });
  });
});
```

## Mock Strategies

### GitHub API Mocking
```typescript
const mockGitHubService = {
  searchRepositories: jest.fn(),
  getRepository: jest.fn(),
  checkClaudeWorkflow: jest.fn()
};

// Mock successful responses
mockGitHubService.searchRepositories.mockResolvedValue(mockRepositories);
mockGitHubService.getRepository.mockResolvedValue(mockRepository);
```

### Discord Interaction Mocking
```typescript
const mockInteraction = {
  user: { id: 'test-user-123' },
  reply: jest.fn(),
  editReply: jest.fn(),
  deferReply: jest.fn(),
  values: ['test-value']
};
```

## Test Data Management

### Fixtures
```typescript
// tests/fixtures/repository.fixtures.ts
export const mockRepository = {
  id: 123,
  name: 'test-repo',
  full_name: 'owner/test-repo',
  owner: { login: 'owner' },
  private: false,
  description: 'Test repository'
};

export const mockRepositories = [mockRepository];
```

### Test Utilities
```typescript
// tests/utils/test.utils.ts
export class TestUtils {
  static createMockLogger(): jest.Mocked<LoggerService> {
    return {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      time: jest.fn(),
      timeEnd: jest.fn()
    };
  }
}
```

## Coverage Requirements

- **Services**: 90% coverage minimum
- **Utilities**: 95% coverage minimum
- **Controllers**: 85% coverage minimum
- **Critical paths**: 100% coverage required

## Testing Best Practices

1. **Arrange-Act-Assert**: Clear test structure
2. **Single Responsibility**: One test per behavior
3. **Descriptive Names**: Clear test descriptions
4. **Isolated Tests**: No test dependencies
5. **Mock External Dependencies**: Avoid real API calls
6. **Fast Execution**: Tests should run quickly

## Related Documentation

- [Development Patterns](./patterns.md) - Testing patterns
- [Code Standards](./code-standards.md) - Quality requirements
- [Commands](./commands.md) - Testing commands

[← Back to Development](./README.md)