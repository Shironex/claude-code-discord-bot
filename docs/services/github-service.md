# GitHub Service

**Location**: `apps/discord-bot/src/services/github.service.ts`

## Purpose
GitHub API integration with repository management, search functionality, and workflow validation.

## Features

### Repository Management
- Repository search across user's repositories
- Repository details fetching with comprehensive stats
- Direct repository access validation
- Repository ownership and permissions checking

### Search Capabilities
- Text-based repository search with fuzzy matching
- Exact repository matching (`owner/repo` format)
- User repository enumeration
- Search result filtering and ranking

### Workflow Integration
- Claude Code workflow file detection (`claude.yml`)
- Workflow existence validation
- Repository compatibility checking
- Workflow template support

### Error Handling & Resilience
- GitHub API rate limiting handling
- Automatic retry logic with exponential backoff
- Graceful degradation for API failures
- Comprehensive error logging and reporting

## Core Methods

### `searchRepositories(query: string, limit?: number): Promise<Repository[]>`
Search user's repositories with text matching.

**Parameters**:
- `query`: Search term or exact repository name
- `limit`: Maximum number of results (default: 25)

**Returns**: Array of repository objects with metadata

**Usage**:
```typescript
const repos = await githubService.searchRepositories('discord-bot');
const exactRepo = await githubService.searchRepositories('user/repo-name');
```

**Features**:
- Supports both fuzzy search and exact matching
- Filters results by repository access permissions
- Returns repositories with name, description, and metadata
- Handles private and public repository visibility

### `getRepository(owner: string, repo: string): Promise<Repository>`
Get single repository details and validation.

**Parameters**:
- `owner`: Repository owner username or organization
- `repo`: Repository name

**Returns**: Complete repository object with stats and permissions

**Usage**:
```typescript
const repo = await githubService.getRepository('microsoft', 'vscode');
```

**Features**:
- Validates repository existence and access
- Returns comprehensive repository metadata
- Includes statistics (stars, forks, size, etc.)
- Checks user permissions for repository operations

### `getUserRepositories(page?: number, per_page?: number): Promise<Repository[]>`
Fetch user's accessible repositories with pagination.

**Parameters**:
- `page`: Page number for pagination (default: 1)
- `per_page`: Results per page (default: 100, max: 100)

**Returns**: Array of user's repositories

**Usage**:
```typescript
const userRepos = await githubService.getUserRepositories();
const page2 = await githubService.getUserRepositories(2, 50);
```

**Features**:
- Includes both owned and collaborator repositories
- Supports pagination for large repository lists
- Filters by repository permissions and visibility
- Sorted by recent activity by default

### `checkClaudeWorkflow(owner: string, repo: string): Promise<boolean>`
Check if repository contains Claude Code workflow file.

**Parameters**:
- `owner`: Repository owner
- `repo`: Repository name

**Returns**: Boolean indicating workflow existence

**Usage**:
```typescript
const hasWorkflow = await githubService.checkClaudeWorkflow('user', 'repo');
```

**Features**:
- Validates `.github/workflows/claude.yml` existence
- Checks workflow file accessibility
- Handles various workflow template formats
- Returns false for repositories without proper access

## Configuration

### Environment Variables
```bash
GITHUB_TOKEN="ghp_your_personal_access_token_here"
```

### GitHub Token Requirements
The GitHub token requires these scopes:
- `repo` - Full repository access (for private repositories)
- `public_repo` - Public repository access
- `actions:write` - Required for workflow dispatch operations

### Rate Limiting
- Respects GitHub API rate limits (5000 requests/hour for authenticated users)
- Implements exponential backoff for rate limit recovery
- Caches frequently accessed repository data
- Provides rate limit status in error messages

## Error Handling

### Error Types

#### `RepositoryNotFoundError`
Thrown when repository doesn't exist or is not accessible.
```typescript
try {
  const repo = await githubService.getRepository('nonexistent', 'repo');
} catch (error) {
  if (error instanceof RepositoryNotFoundError) {
    // Handle repository not found
  }
}
```

#### `InsufficientPermissionsError`
Thrown when user lacks required permissions for repository operation.

#### `RateLimitExceededError`
Thrown when GitHub API rate limit is exceeded.

#### `GitHubAPIError`
Generic error for other GitHub API failures.

### Error Recovery
- Automatic retry with exponential backoff
- Fallback to cached data when available
- Graceful degradation for non-critical operations
- Comprehensive error logging for debugging

## Usage Patterns

### Repository Search and Selection
```typescript
@Injectable()
export class RepositorySelectHandler {
  constructor(private readonly githubService: GitHubService) {}

  async handleRepositorySearch(query: string): Promise<SelectOption[]> {
    try {
      const repositories = await this.githubService.searchRepositories(query, 25);
      
      return repositories.map(repo => ({
        label: `${repo.owner.login}/${repo.name}`,
        value: `${repo.owner.login}/${repo.name}`,
        description: repo.description?.substring(0, 100) || 'No description',
        emoji: repo.private ? '🔒' : '📁'
      }));
    } catch (error) {
      this.logger.error('Failed to search repositories', error);
      return [];
    }
  }
}
```

### Workflow Validation
```typescript
@Injectable()
export class WorkflowService {
  constructor(private readonly githubService: GitHubService) {}

  async validateRepositoryForClaude(owner: string, repo: string): Promise<boolean> {
    try {
      // Check repository access
      await this.githubService.getRepository(owner, repo);
      
      // Check workflow existence
      const hasWorkflow = await this.githubService.checkClaudeWorkflow(owner, repo);
      
      return hasWorkflow;
    } catch (error) {
      this.logger.error('Repository validation failed', error);
      return false;
    }
  }
}
```

### Repository Information Display
```typescript
@Injectable()
export class EmbedService {
  constructor(private readonly githubService: GitHubService) {}

  async createRepositoryEmbed(owner: string, repo: string): Promise<EmbedBuilder> {
    const repository = await this.githubService.getRepository(owner, repo);
    
    return new EmbedBuilder()
      .setTitle(`${repository.full_name}`)
      .setDescription(repository.description || 'No description available')
      .setURL(repository.html_url)
      .addFields([
        { name: 'Stars', value: repository.stargazers_count.toString(), inline: true },
        { name: 'Language', value: repository.language || 'Unknown', inline: true },
        { name: 'Updated', value: new Date(repository.updated_at).toLocaleDateString(), inline: true }
      ])
      .setColor(repository.private ? 0xFF6B6B : 0x4ECDC4);
  }
}
```

## Performance Considerations

### Caching Strategy
- Repository metadata cached for 5 minutes
- Search results cached for 2 minutes
- Workflow validation results cached for 10 minutes
- User repository lists cached for 15 minutes

### Request Optimization
- Batch API calls when possible
- Parallel requests for independent operations
- Request deduplication for identical queries
- Connection pooling for HTTP requests

### Memory Management
- LRU cache for repository data
- Automatic cache cleanup
- Memory usage monitoring
- Garbage collection optimization

## Integration Points

### Session Service Integration
```typescript
// Store repository selection in user session
await this.sessionService.updateSession(userId, {
  selectedRepository: { owner, repo },
  repositoryValidated: true
});
```

### Workflow Service Integration
```typescript
// Repository data flows to workflow operations
const repository = await this.githubService.getRepository(owner, repo);
await this.workflowService.dispatchWorkflow(repository, inputs);
```

### File Explorer Integration
```typescript
// Repository context for file exploration
const repoContext = await this.githubService.getRepository(owner, repo);
const fileTree = await this.fileExplorerService.getFileTree(repoContext);
```

## Testing

### Unit Tests
- Mock GitHub API responses
- Test search functionality with various inputs
- Validate error handling scenarios
- Test caching behavior

### Integration Tests
- Real GitHub API integration (with test repositories)
- Rate limiting behavior validation
- Authentication and permission testing
- End-to-end repository workflow testing

## Related Documentation

- [Workflow Service](./workflow-service.md) - GitHub Actions integration
- [Session Service](./session-service.md) - User session management  
- [File Explorer Service](./file-explorer-service.md) - Repository file browsing
- [Discord Bot Architecture](../architecture/discord-bot.md) - Overall bot design

[← Back to Services](./README.md)