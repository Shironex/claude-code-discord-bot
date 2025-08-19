# Claude Code Discord Bot Architecture

## Overview

This document outlines the architecture for integrating Claude Code with the Discord bot to enable automated repository analysis, code modifications, and pull request creation through Discord commands.

## High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Discord Bot   │───▶│  Job Queue       │───▶│ Claude Code Runner  │
│   (NestJS)      │    │  (Redis/Memory)  │    │   (Docker)          │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│  GitHub API     │    │  Session Store   │    │  Repository Clone   │
│  (Octokit)      │    │  (Memory/Redis)  │    │   (GitHub + gh CLI) │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

## Core Components

### 1. Discord Bot (Existing)
- **Technology**: NestJS + Necord
- **Responsibilities**: 
  - Handle Discord interactions
  - Manage user sessions
  - Display repository/file browsers
  - Queue Claude Code jobs
  - Stream results back to Discord

### 2. Job Queue System (New)
- **Technology**: Bull Queue (Redis) or In-Memory Queue
- **Responsibilities**:
  - Queue Claude Code execution requests
  - Manage job lifecycle (pending, running, completed, failed)
  - Handle job timeouts and retries
  - Provide job status updates

### 3. Container Orchestration (New)
- **Technology**: Docker + Docker Compose
- **Responsibilities**:
  - Spawn isolated Claude Code containers
  - Mount repository volumes
  - Pass authentication tokens securely
  - Clean up containers after completion
  - Resource management and limits

### 4. Claude Code Runner (New)
- **Technology**: Docker containers with Claude Code CLI
- **Responsibilities**:
  - Clone GitHub repositories
  - Execute Claude Code in headless mode
  - Create commits and pull requests
  - Return execution results

## Repository Cloning Strategy

### Authentication Flow
```
1. Discord Bot passes GITHUB_TOKEN to container via environment variable
2. Container authenticates with GitHub using gh CLI
3. Repository is cloned using authenticated gh CLI commands
4. Claude Code operates on cloned repository with full access
```

### Cloning Implementation
```bash
# Inside container
export GITHUB_TOKEN=$GITHUB_TOKEN_FROM_BOT
gh auth login --with-token <<< $GITHUB_TOKEN
gh repo clone $REPO_FULL_NAME /workspace/repo
cd /workspace/repo
# Execute Claude Code operations
```

### Security Considerations
- **Token Scope**: Use fine-grained personal access tokens with minimal required permissions
- **Container Isolation**: Each container runs in isolated network namespace
- **Ephemeral Storage**: Repositories are cloned to temporary volumes, cleaned up after execution
- **Resource Limits**: CPU/memory limits to prevent resource exhaustion
- **Read-Only Mounts**: Mount configuration files as read-only where possible

## File System Structure

### Container Layout
```
/workspace/
├── repo/                 # Cloned repository
├── claude-output/        # Claude Code execution logs
├── context/             # Selected files for context
└── scripts/             # Utility scripts
```

### Volume Management
```yaml
volumes:
  repo_data:
    driver: local
    driver_opts:
      type: tmpfs
      device: tmpfs
      o: size=1g,uid=1000,gid=1000
```

## Container Lifecycle

### 1. Container Creation
```typescript
const container = await docker.createContainer({
  Image: 'claude-runner:latest',
  Env: [
    `GITHUB_TOKEN=${githubToken}`,
    `REPO_URL=${repository.htmlUrl}`,
    `USER_PROMPT=${userPrompt}`
  ],
  WorkingDir: '/workspace',
  HostConfig: {
    Memory: 1024 * 1024 * 1024, // 1GB
    CpuShares: 512,
    AutoRemove: true,
    NetworkMode: 'claude-network'
  }
});
```

### 2. Execution Flow
```
1. Container starts with repository URL and user prompt
2. Authenticate with GitHub using provided token
3. Clone repository to /workspace/repo
4. Execute Claude Code with specified context and prompt
5. Create commits and push changes
6. Create pull request if changes exist
7. Return execution summary and PR URL
8. Container auto-removes on completion
```

### 3. Result Streaming
```typescript
// Stream container logs to Discord
container.attach({
  stream: true,
  stdout: true,
  stderr: true
}, (err, stream) => {
  stream.on('data', (chunk) => {
    // Send updates to Discord via webhooks
    discordService.sendUpdate(userId, chunk.toString());
  });
});
```

## Network Architecture

### Container Networking
```yaml
networks:
  claude-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Communication Patterns
- **Discord ↔ Bot**: WebSocket/HTTP for real-time updates
- **Bot ↔ Containers**: Docker API for container management
- **Containers ↔ GitHub**: HTTPS API calls for repository operations
- **Bot ↔ Queue**: Redis/Memory for job management

## Error Handling & Monitoring

### Container Failures
- **Timeout Handling**: Kill containers after 30 minutes maximum
- **Resource Exhaustion**: Automatic container restart with increased limits
- **Authentication Failures**: Retry with token refresh
- **Clone Failures**: Report detailed error messages to Discord

### Monitoring
```typescript
// Container resource monitoring
const stats = await container.stats({ stream: false });
if (stats.memory_stats.usage > maxMemory) {
  // Handle memory pressure
}
```

### Logging Strategy
- **Container Logs**: Streamed to Discord and persisted for debugging
- **Bot Logs**: Structured logging with correlation IDs
- **Audit Trail**: Track all repository operations and PR creations

## Security Model

### Token Management
- **Encryption**: Encrypt tokens at rest in session storage
- **Scope Limitation**: Use tokens with minimal required permissions
- **Rotation**: Support token rotation without service interruption
- **Audit**: Log all token usage for security monitoring

### Container Security
- **Non-Root User**: Run containers as non-privileged user
- **Read-Only Root**: Mount root filesystem as read-only
- **Network Isolation**: Containers cannot communicate with each other
- **Resource Limits**: Prevent DoS through resource exhaustion

### GitHub Permissions
```
Required token permissions:
- repo (for private repositories)
- public_repo (for public repositories)
- pull_requests:write
- contents:write
- metadata:read
```

## Scalability Considerations

### Horizontal Scaling
- **Queue Workers**: Multiple container runners for parallel job processing
- **Load Balancing**: Distribute containers across multiple Docker hosts
- **Resource Pooling**: Share Docker image layers across instances

### Performance Optimization
- **Image Caching**: Pre-built Docker images with Claude Code installed
- **Repository Caching**: Cache frequently accessed repositories
- **Incremental Cloning**: Use shallow clones for faster setup

### Resource Management
```yaml
# Container resource limits
resources:
  limits:
    memory: 1Gi
    cpu: 500m
  requests:
    memory: 512Mi
    cpu: 250m
```

## Future Enhancements

### Advanced Features
- **Multi-Repository Operations**: Support operations across multiple repositories
- **Workflow Integration**: Integration with GitHub Actions for automated testing
- **Branch Management**: Support for creating feature branches instead of direct PRs
- **Code Review Integration**: Automatic code review requests to specific users

### Performance Improvements
- **Container Pools**: Pre-warmed container pools for faster job execution
- **Distributed Execution**: Kubernetes deployment for enterprise scaling
- **Caching Layer**: Redis cache for repository metadata and file contents

## Implementation Priorities

### Phase 1: Foundation (Current Focus)
1. ✅ Docker container with gh CLI and git
2. ✅ Secure token passing mechanism
3. ✅ Repository cloning service
4. ✅ Basic container lifecycle management

### Phase 2: Integration
1. Claude Code CLI installation and configuration
2. Context file selection system
3. Headless execution pipeline
4. Result streaming to Discord

### Phase 3: Production
1. Pull request creation workflow
2. Error handling and recovery
3. Monitoring and logging
4. Performance optimization