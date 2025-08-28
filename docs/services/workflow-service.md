# Workflow Service

**Location**: `apps/discord-bot/src/services/workflow.service.ts`

## Purpose
GitHub Actions workflow management and execution for Claude Code analysis workflows.

## Key Methods

### `checkWorkflowExists(owner: string, repo: string): Promise<boolean>`
Verify claude.yml workflow exists in repository.

### `dispatchWorkflow(repository: Repository, inputs: WorkflowInputs): Promise<WorkflowRun>`
Trigger workflow with custom inputs including prompt, files, and images.

### `getWorkflowRuns(owner: string, repo: string): Promise<WorkflowRun[]>`
Retrieve workflow run history for monitoring.

### `getLatestWorkflowRun(owner: string, repo: string): Promise<WorkflowRun>`
Get most recent workflow run for status tracking.

## Features
- Workflow file existence validation
- Workflow dispatch with custom inputs
- Real-time workflow run status monitoring
- Workflow run history and logs
- Error handling and retry logic

## Workflow Inputs
```typescript
interface WorkflowInputs {
  prompt: string;           // Claude analysis prompt
  files?: string[];        // Selected files for analysis
  images?: string[];       // Uploaded image URLs
  branch?: string;         // Target branch (default: main)
}
```

## Integration
- GitHub Service for repository validation
- Session Service for workflow context storage
- Embed Service for status display
- Workflow Monitor Service for real-time updates

## Related Documentation
- [GitHub Service](./github-service.md) - Repository operations
- [Workflow Monitor Service](./workflow-monitor-service.md) - Status monitoring
- [Workflow Automation](../features/workflow-automation.md) - User features

[← Back to Services](./README.md)