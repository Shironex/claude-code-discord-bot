# Workflow Automation

Claude Code workflow features and automation capabilities.

## Enhanced Workflow Features

### Single Command Integration
- **Unified Experience**: `/claude` handles complete workflow from search to execution
- **Multi-Step Process**: Repository search → File selection → Image upload → Analysis prompt
- **Smart Validation**: Only shows repositories with `claude.yml` workflow
- **Session Management**: Maintains state across multiple interactions

### Repository Management
- **Text-Based Search**: Interactive search through text input modal
- **Intelligent Matching**: Supports exact repository names and fuzzy search
- **Access Validation**: Verifies repository permissions and Claude Code setup
- **Visual Selection**: Clear repository information with descriptions and metadata

### File Context Selection
- **Interactive File Explorer**: Browse repository files and directories
- **Smart Prioritization**: Common development paths prioritized (src/, lib/, README.md)
- **Multi-Selection**: Select specific files or entire directories
- **Optional Step**: Skip file selection for full repository analysis

### Visual Context Integration
- **Discord Attachment Support**: Upload screenshots, diagrams, UI mockups
- **Batch Processing**: Handle multiple images in single workflow
- **Automatic Validation**: File type and size validation
- **Secure Storage**: Temporary image storage with automatic cleanup

### Real-time Monitoring
- **Workflow Dispatch**: Automatic GitHub Actions workflow triggering
- **Status Tracking**: Real-time workflow execution monitoring
- **Progress Updates**: Live Discord message updates with workflow progress
- **Completion Notifications**: Automatic results delivery when workflow completes

## Claude Code Integration

### Workflow Requirements
Repositories must contain:
- `.github/workflows/claude.yml` - GitHub Actions workflow file
- Proper workflow inputs configuration for prompt handling
- Repository access permissions for the bot's GitHub token

### Workflow Input Structure
```yaml
# claude.yml workflow inputs
inputs:
  prompt:
    description: 'Analysis prompt for Claude'
    required: true
    type: string
  files:
    description: 'Selected files (JSON array)'
    required: false
    type: string
  images:
    description: 'Image URLs (JSON array)'
    required: false
    type: string
  branch:
    description: 'Target branch'
    required: false
    type: string
    default: 'main'
```

### Context Enhancement
- **File Context**: Selected files provide focused analysis scope
- **Visual Context**: Images provide additional context for analysis
- **Branch Context**: Specify target branch for analysis
- **Custom Prompts**: User-defined analysis instructions

## Automation Benefits

### Enhanced User Experience
- **Guided Workflow**: Step-by-step process with clear instructions
- **Skip Options**: Optional steps allow both quick and detailed analysis
- **Error Prevention**: Validation prevents common user errors
- **Recovery Mechanisms**: Clear error messages and recovery actions

### Improved Analysis Quality
- **Targeted Analysis**: File selection enables focused code review
- **Visual Context**: Images provide crucial context for issue resolution
- **Custom Prompts**: Tailored analysis instructions improve results
- **Historical Context**: Session management enables complex multi-step workflows

### Developer Productivity
- **Reduced Setup Time**: No manual workflow configuration required
- **Batch Operations**: Handle multiple files and images efficiently
- **Automated Monitoring**: No need to manually check workflow status
- **Integrated Experience**: Everything happens within Discord interface

## Advanced Features

### Session-Based Workflows
- **Stateful Interactions**: Maintains context across multiple Discord interactions
- **30-Minute Sessions**: Automatic session cleanup prevents resource leaks
- **Recovery Mechanisms**: Session validation and error recovery
- **Concurrent Support**: Multiple users can run workflows simultaneously

### Background Processing
- **Asynchronous Execution**: Workflows run independently of Discord interactions
- **Status Polling**: Regular workflow status checks and updates
- **Completion Detection**: Automatic notification when workflows complete
- **Error Handling**: Robust error detection and user notification

### Integration Architecture
- **GitHub Actions**: Native integration with GitHub workflow system
- **Discord UI**: Rich interactive interface with buttons, modals, and selects
- **Image Service**: Secure temporary storage for visual context
- **Real-time Updates**: Live status updates through Discord message edits

## Workflow Templates

### Self-Hosted Runner Template
```yaml
# .github/workflows/claude.yml
name: Claude Code Analysis
on:
  workflow_dispatch:
    inputs:
      prompt:
        description: 'Analysis prompt'
        required: true
      files:
        description: 'Selected files JSON'
        required: false
      images:
        description: 'Image URLs JSON'
        required: false

jobs:
  analyze:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - name: Run Claude Code Analysis
        run: |
          echo "Analyzing with prompt: ${{ github.event.inputs.prompt }}"
          # Claude Code analysis logic
```

### GitHub-Hosted Template
```yaml
name: Claude Code Analysis
on:
  workflow_dispatch:
    inputs:
      prompt:
        description: 'Analysis prompt'
        required: true

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Claude Code
        uses: anthropics/claude-code-action@v1
        with:
          prompt: ${{ github.event.inputs.prompt }}
```

## Monitoring and Status

### Real-time Status Updates
- **Workflow Queued**: Initial dispatch confirmation
- **Workflow Running**: Active execution status
- **Workflow Completed**: Success/failure notification
- **Workflow Failed**: Error details and troubleshooting

### Status Buttons
- **Check Status**: Manual status refresh
- **View Logs**: Direct link to GitHub Actions logs
- **Cancel Workflow**: Abort running workflow
- **Retry**: Re-run failed workflows

### Notification System
- **Discord Messages**: Real-time updates in Discord
- **Status Embeds**: Rich status information display
- **Error Reporting**: Detailed error messages and solutions
- **Completion Links**: Direct links to results and artifacts

## Related Documentation

- [Discord Commands](./discord-commands.md) - Command usage details
- [Image Processing](./image-processing.md) - Image handling capabilities
- [Workflow Service](../services/workflow-service.md) - Service implementation
- [GitHub Service](../services/github-service.md) - Repository operations

[← Back to Features](./README.md)