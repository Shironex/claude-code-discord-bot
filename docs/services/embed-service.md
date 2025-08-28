# Embed Service

**Location**: `apps/discord-bot/src/services/embed.service.ts`

## Purpose
Centralized Discord embed creation with consistent styling, branding, and user experience across all bot interactions.

## Features

### Consistent UI Design
- Standardized embed colors and styling
- Consistent field layouts and formatting
- Brand-appropriate visual design
- Responsive embed sizing

### Message Templates
- Repository selection interfaces
- Error and success state displays
- Loading and progress indicators
- Workflow status and updates

### Context-Aware Embeds
- Dynamic content based on user state
- Conditional field display
- Interactive component integration
- Real-time data updates

### Error Handling UI
- User-friendly error messages
- Contextual help and guidance
- Recovery action suggestions
- Detailed error information for debugging

## Core Methods

### `createRepositorySelectionMessage(repositories: Repository[]): MessageCreateOptions`
Create the main repository selection interface with search results.

**Parameters**:
- `repositories`: Array of repository objects from GitHub API

**Returns**: Discord message options with embed and components

**Usage**:
```typescript
const repositories = await githubService.searchRepositories(query);
const message = embedService.createRepositorySelectionMessage(repositories);
await interaction.editReply(message);
```

**Features**:
- Repository list with descriptions
- Select dropdown for repository choice
- Search result count display
- Empty state handling
- Pagination support for large result sets

### `createErrorEmbed(title: string, description: string, error?: Error): EmbedBuilder`
Create standardized error message embeds.

**Parameters**:
- `title`: Error title/summary
- `description`: User-friendly error description
- `error`: Optional Error object for detailed logging

**Returns**: Discord embed builder with error styling

**Usage**:
```typescript
const errorEmbed = embedService.createErrorEmbed(
  'Repository Not Found',
  'The specified repository could not be found or is not accessible.',
  error
);
await interaction.editReply({ embeds: [errorEmbed] });
```

**Features**:
- Consistent red color scheme for errors
- Error icon and timestamp
- User-friendly messaging
- Optional technical details
- Actionable next steps

### `createSuccessEmbed(title: string, description: string): EmbedBuilder`
Create standardized success message embeds.

**Parameters**:
- `title`: Success title/summary
- `description`: Success description and next steps

**Returns**: Discord embed builder with success styling

**Usage**:
```typescript
const successEmbed = embedService.createSuccessEmbed(
  'Workflow Started',
  'Claude Code analysis has been triggered for your repository.'
);
await interaction.editReply({ embeds: [successEmbed] });
```

**Features**:
- Consistent green color scheme for success
- Success icon and timestamp
- Clear confirmation messaging
- Next step guidance

### `createWorkflowDispatchedEmbed(repository: Repository, inputs: WorkflowInputs): EmbedBuilder`
Create workflow launch confirmation embed.

**Parameters**:
- `repository`: Repository object where workflow was dispatched
- `inputs`: Workflow input parameters (prompt, files, images)

**Returns**: Discord embed with workflow dispatch details

**Usage**:
```typescript
const workflowEmbed = embedService.createWorkflowDispatchedEmbed(repository, {
  prompt: 'Analyze code security',
  files: ['src/main.ts', 'src/auth.ts'],
  images: ['screenshot.png']
});
```

**Features**:
- Repository information display
- Workflow input summary
- Expected completion time
- Status monitoring button
- Link to repository and workflow

### `createWorkflowNotFoundEmbed(repository: Repository): EmbedBuilder`
Create message for repositories without Claude Code workflow.

**Parameters**:
- `repository`: Repository object without claude.yml

**Returns**: Discord embed explaining missing workflow

**Usage**:
```typescript
const notFoundEmbed = embedService.createWorkflowNotFoundEmbed(repository);
await interaction.editReply({ embeds: [notFoundEmbed] });
```

**Features**:
- Clear explanation of missing workflow
- Setup instructions and links
- Template download options
- Help and documentation links

### `createLoadingEmbed(operation: string): EmbedBuilder`
Create loading state embed for long operations.

**Parameters**:
- `operation`: Description of current operation

**Returns**: Discord embed with loading styling

**Usage**:
```typescript
const loadingEmbed = embedService.createLoadingEmbed('Searching repositories...');
await interaction.editReply({ embeds: [loadingEmbed] });
```

### `createFileSelectionEmbed(fileTree: FileTreeNode[], currentPath: string): MessageCreateOptions`
Create file selection interface with tree view.

**Parameters**:
- `fileTree`: Repository file tree structure
- `currentPath`: Current directory path

**Returns**: Message options with file selection interface

**Usage**:
```typescript
const fileTree = await fileExplorerService.getFileTree(owner, repo);
const message = embedService.createFileSelectionEmbed(fileTree, '/src');
```

## Embed Styling Standards

### Color Scheme
```typescript
const EMBED_COLORS = {
  PRIMARY: 0x5865F2,      // Discord Blurple
  SUCCESS: 0x00D166,      // Green
  ERROR: 0xED4245,        // Red  
  WARNING: 0xFEE75C,      // Yellow
  INFO: 0x5865F2,         // Blue
  SECONDARY: 0x99AAB5     // Gray
} as const;
```

### Typography
- **Title**: Clear, action-oriented titles
- **Description**: User-friendly language, avoid technical jargon
- **Fields**: Consistent field naming and formatting
- **Footer**: Timestamps and additional context

### Layout Patterns
- **Primary Information**: Title and description
- **Context Fields**: Repository, user, timestamp
- **Action Fields**: Next steps, buttons, links
- **Status Information**: Progress, completion, errors

## Component Integration

### Action Buttons
```typescript
const buttons = new ActionRowBuilder<ButtonBuilder>()
  .addComponents(
    new ButtonBuilder()
      .setCustomId('workflow-status')
      .setLabel('Check Status')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🔍'),
    new ButtonBuilder()
      .setCustomId('cancel-workflow')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
  );

return {
  embeds: [embed],
  components: [buttons]
};
```

### Select Menus
```typescript
const repositorySelect = new StringSelectMenuBuilder()
  .setCustomId('repository-select')
  .setPlaceholder('Choose a repository...')
  .addOptions(
    repositories.map(repo => ({
      label: `${repo.owner.login}/${repo.name}`,
      value: `${repo.owner.login}/${repo.name}`,
      description: repo.description?.substring(0, 100) || 'No description',
      emoji: repo.private ? '🔒' : '📁'
    }))
  );
```

### Modal Integration
```typescript
const modal = new ModalBuilder()
  .setCustomId('claude-repo-search')
  .setTitle('Search Repositories')
  .addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId('search-query')
        .setLabel('Repository Search')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter repository name or search term...')
        .setRequired(true)
    )
  );
```

## Usage Patterns

### Multi-Step Workflow Updates
```typescript
@Injectable()
export class ClaudeCommand {
  async updateWorkflowProgress(interaction: any, step: string): Promise<void> {
    let embed: EmbedBuilder;
    
    switch (step) {
      case 'searching':
        embed = this.embedService.createLoadingEmbed('Searching repositories...');
        break;
      case 'repository-found':
        embed = this.embedService.createSuccessEmbed(
          'Repository Found',
          'Repository validated and workflow detected.'
        );
        break;
      case 'workflow-dispatched':
        embed = this.embedService.createWorkflowDispatchedEmbed(repository, inputs);
        break;
    }
    
    await interaction.editReply({ embeds: [embed] });
  }
}
```

### Error Recovery
```typescript
@Injectable()
export class ErrorHandler {
  async handleUserError(interaction: any, error: Error, context: string): Promise<void> {
    const errorEmbed = this.embedService.createErrorEmbed(
      'Operation Failed',
      'Something went wrong. Please try again or contact support.',
      error
    );
    
    // Add recovery actions
    const retryButton = new ButtonBuilder()
      .setCustomId(`retry-${context}`)
      .setLabel('Try Again')
      .setStyle(ButtonStyle.Secondary);
    
    await interaction.editReply({
      embeds: [errorEmbed],
      components: [new ActionRowBuilder().addComponents(retryButton)]
    });
  }
}
```

### Dynamic Content Updates
```typescript
@Injectable()
export class WorkflowMonitor {
  async updateWorkflowStatus(messageId: string, workflowRun: WorkflowRun): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('Workflow Status')
      .setDescription(`Current status: ${workflowRun.status}`)
      .setColor(this.getStatusColor(workflowRun.status))
      .addFields([
        {
          name: 'Progress',
          value: this.formatProgress(workflowRun),
          inline: false
        },
        {
          name: 'Started',
          value: `<t:${Math.floor(new Date(workflowRun.created_at).getTime() / 1000)}:R>`,
          inline: true
        }
      ])
      .setTimestamp();
    
    await this.updateMessage(messageId, { embeds: [embed] });
  }
}
```

## Accessibility and UX

### Screen Reader Support
- Descriptive embed titles and descriptions
- Meaningful button labels and emojis
- Alternative text for visual elements
- Clear progress indicators

### Mobile Optimization
- Responsive embed layouts
- Touch-friendly button sizing
- Optimized text length for mobile
- Efficient use of embed fields

### Internationalization Ready
- Centralized message templates
- Configurable text content
- Unicode emoji support
- RTL text support

## Performance Considerations

### Embed Size Limits
- Discord embed limits: 6000 characters total
- Title: 256 characters max
- Description: 4096 characters max
- Field values: 1024 characters max
- Automatic truncation with ellipsis

### Caching and Reuse
- Template caching for frequently used embeds
- Component reuse across interactions
- Efficient embed builder patterns
- Memory optimization for large repositories

## Testing

### Visual Testing
```typescript
describe('EmbedService', () => {
  it('should create repository selection embed', () => {
    const repositories = mockRepositories;
    const message = embedService.createRepositorySelectionMessage(repositories);
    
    expect(message.embeds[0].data.title).toBe('Select Repository');
    expect(message.components).toHaveLength(1);
    expect(message.components[0].components[0].data.options).toHaveLength(repositories.length);
  });
  
  it('should handle empty repository results', () => {
    const message = embedService.createRepositorySelectionMessage([]);
    const embed = message.embeds[0];
    
    expect(embed.data.description).toContain('No repositories found');
    expect(embed.data.color).toBe(EMBED_COLORS.WARNING);
  });
});
```

### Integration Testing
- User interaction flow testing
- Component integration validation
- Error state display testing
- Multi-step workflow embed updates

## Related Documentation

- [Discord Commands](../features/discord-commands.md) - Command embed usage
- [Workflow Service](./workflow-service.md) - Workflow status embeds
- [GitHub Service](./github-service.md) - Repository data display
- [Discord Bot Architecture](../architecture/discord-bot.md) - UI architecture

[← Back to Services](./README.md)