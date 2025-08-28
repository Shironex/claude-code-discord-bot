# Discord Commands

Complete Discord command reference and usage guides for all bot commands.

## `/claude` Command

**Complete Claude Code workflow with enhanced multi-step interface**

The main command that handles the entire Claude Code analysis workflow from repository search to execution.

### Workflow Steps

#### 1. Repository Search
Opens modal to search your repositories
- Text input for repository name or search term
- Supports exact matches (`owner/repo`) and fuzzy search
- Example searches: `"discord-bot"`, `"microsoft/vscode"`

#### 2. Repository Selection
Shows validated repositories with Claude Code support
- Only displays repositories containing `claude.yml` workflow
- Clear indication of repositories without Claude Code setup
- Direct selection leads to file explorer

#### 3. File Selection (Optional)
Interactive file tree exploration
- Browse repository files and directories
- Select specific files for focused analysis
- Common paths prioritized (src/, lib/, README.md, etc.)
- Skip option for full repository analysis

#### 4. Image Upload (Optional)
Attach visual context to analysis
- Upload screenshots, diagrams, or other images
- Automatic validation and processing
- Batch upload support for multiple images
- Skip option if no images needed

#### 5. Analysis Prompt
Modal for analysis details
- Custom analysis prompt (required)
- Optional branch specification (defaults to 'main')
- Context includes selected files and uploaded images
- Example prompts: \"Review code for security vulnerabilities\", \"Analyze this UI component\"

#### 6. Workflow Execution
Automatic dispatch and monitoring
- Real-time status updates in Discord
- Workflow progress tracking with status buttons
- Completion notifications with results
- Enhanced context from files and images

### Usage Examples

#### Basic Repository Analysis
```
/claude
→ Search: \"my-project\"
→ Select repository from results
→ Skip file selection (analyze entire repo)
→ Skip image upload
→ Prompt: \"Review this code for best practices\"
```

#### Focused Code Review
```
/claude
→ Search: \"frontend-app\"
→ Select repository
→ Select files: src/components/Auth.tsx, src/utils/api.ts
→ Upload screenshot of error
→ Prompt: \"Fix the authentication issue shown in the screenshot\"
```

#### Architecture Analysis
```
/claude
→ Search: \"microservice-api\"
→ Select repository
→ Select directories: src/services/, docs/
→ Skip images
→ Prompt: \"Analyze the microservice architecture and suggest improvements\"
```

### Interactive Components

#### Repository Search Modal
- **Input Field**: Repository name or search term
- **Search Logic**: Fuzzy matching and exact repository names
- **Validation**: Checks for Claude Code workflow existence

#### File Selection Interface
- **Tree View**: Hierarchical file/directory display
- **Navigation**: Breadcrumb navigation and folder traversal
- **Selection**: Multi-select files and directories
- **Pagination**: Handles large repository structures

#### Image Upload Interface
- **Drag & Drop**: Discord attachment support
- **Validation**: File type and size checking
- **Preview**: Image thumbnails and metadata
- **Batch Processing**: Multiple image uploads

#### Workflow Status Interface
- **Real-time Updates**: Live workflow status tracking
- **Progress Indicators**: Step-by-step progress display
- **Action Buttons**: Status checking and cancellation
- **Result Display**: Completion notifications and links

### Error Handling

#### Common Error Scenarios

**Repository Not Found**
```
❌ Repository Not Found
The specified repository could not be found or is not accessible.
• Check repository name spelling
• Verify repository permissions
• Ensure repository is not private (if using public token)
```

**Missing Claude Workflow**
```
⚠️ Claude Code Setup Required
This repository doesn't have a Claude Code workflow configured.
• Add .github/workflows/claude.yml to your repository
• Use our workflow templates
• See setup documentation
```

**Session Expired**
```
🔄 Session Expired
Your session has timed out. Please start over with /claude.
• Sessions expire after 30 minutes of inactivity
• Use /claude to start a new session
```

**File Selection Timeout**
```
⏰ Selection Timeout
File selection took too long and was cancelled.
• Try selecting fewer files
• Use directory selection for bulk operations
• Contact support if issues persist
```

### Workflow Requirements

For repositories to support Claude Code analysis, they must contain:
- `.github/workflows/claude.yml` - GitHub Actions workflow file
- Proper workflow inputs configuration for prompt handling
- Repository access permissions for the bot's GitHub token

### Advanced Usage

#### Branch Specification
```
When prompted for analysis:
• Branch: \"feature/new-auth\" (optional, defaults to 'main')
• Prompt: \"Review the new authentication implementation\"
```

#### Complex File Selection
```
File Selection Strategies:
• Select specific files: src/auth.ts, tests/auth.test.ts
• Select entire directories: src/components/, docs/api/
• Mix files and directories for comprehensive analysis
```

#### Multi-Image Context
```
Image Upload Use Cases:
• Error screenshots for debugging
• Architecture diagrams for system analysis
• UI mockups for implementation guidance
• Performance graphs for optimization
```

## `/image-service` Debug Command

**Debug command for image service testing and diagnostics**

Development and debugging command for testing image service functionality.

### Usage
```
/image-service
```

### Features
- Test image service connectivity
- Validate authentication configuration
- Check API endpoint availability
- Display service health status

### Response Information
- **Connection Status**: API connectivity test
- **Authentication**: HMAC signature validation
- **Service Health**: Endpoint availability and performance
- **Configuration**: Current service settings (non-sensitive)

### Troubleshooting
Use this command when:
- Images fail to upload
- Authentication errors occur
- Service connectivity issues
- Performance problems detected

## Command Permissions

### Required Bot Permissions
- **Send Messages**: Basic message sending
- **Use Slash Commands**: Command registration and execution
- **Embed Links**: Rich embed display
- **Attach Files**: File and image handling
- **Manage Messages**: Message updates for status
- **Read Message History**: Context and reply handling

### User Requirements
- **GitHub Token**: Valid personal access token with repository permissions
- **Repository Access**: Read access to target repositories
- **Discord Permissions**: Ability to use slash commands in the server

## Performance Considerations

### Response Times
- **Repository Search**: < 2 seconds for most queries
- **File Tree Loading**: < 5 seconds for large repositories
- **Image Upload**: < 10 seconds per image
- **Workflow Dispatch**: < 3 seconds for trigger

### Rate Limiting
- **GitHub API**: 5000 requests/hour per user
- **Discord API**: Built-in rate limit handling
- **Image Service**: 100 uploads per 15-minute window
- **Concurrent Sessions**: 1000 active sessions maximum

### Optimization Tips
- Use specific repository names for faster search
- Select only necessary files for analysis
- Upload images in supported formats (JPEG, PNG, GIF, WebP)
- Keep prompts concise but descriptive

## Related Documentation

- [Workflow Automation](./workflow-automation.md) - Claude Code integration
- [Image Processing](./image-processing.md) - Image handling features
- [GitHub Service](../services/github-service.md) - Repository operations
- [Session Service](../services/session-service.md) - User session management

[← Back to Features](./README.md)