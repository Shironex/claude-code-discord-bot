# File Explorer Service

**Location**: `apps/discord-bot/src/services/file-explorer.service.ts`

## Purpose
Repository file tree exploration and selection with caching and pagination support.

## Key Methods

### `getFileTree(owner: string, repo: string, path?: string): Promise<FileTreeNode[]>`
Fetch and cache repository file structure with recursive traversal.

### `buildFileTreeResponse(fileTree: FileTreeNode[], currentPath: string): MessageCreateOptions`
Build paginated file tree interface for Discord UI with navigation controls.

### `clearCache(owner: string, repo: string): void`
Manual cache invalidation for repository file structures.

## Features
- Recursive file tree traversal with caching
- Prioritization of common development files and directories
- Interactive file/directory selection interface
- Pagination for large repositories
- Smart path navigation and breadcrumbs
- File type detection and icons

## File Tree Structure
```typescript
interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileTreeNode[];
}
```

## Caching Strategy
- LRU cache for file tree data
- 10-minute cache expiration
- Memory-efficient tree structures
- Automatic cleanup of stale data

## Priority Paths
Common development files are prioritized:
- README files
- Configuration files
- Source directories (src/, lib/, app/)
- Documentation directories
- Build and deployment files

## Integration
- GitHub Service for repository file access
- Session Service for navigation state
- Embed Service for file tree display
- Discord Utils for pagination controls

## Related Documentation
- [GitHub Service](./github-service.md) - File access
- [Discord Commands](../features/discord-commands.md) - File selection UI
- [Session Service](./session-service.md) - Navigation state

[← Back to Services](./README.md)