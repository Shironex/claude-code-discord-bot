# Development Patterns

Common patterns and examples for developing with this codebase.

## Service Development Patterns

### Base Service Pattern
All services extend `BaseService` for consistent logging and GitHub integration:

#### Basic Service (No GitHub Required)
```typescript
import { BaseService } from '../base/base.service';
import { LoggerFactory } from '@claude-code/shared';

@Injectable()
export class MyService extends BaseService {
  constructor(loggerFactory: LoggerFactory) {
    super('MyService', loggerFactory);
  }

  async performOperation(): Promise<void> {
    this.logger.methodEntry('performOperation');
    this.logger.time('operation-timer');
    
    try {
      // Implementation
      const result = await this.doWork();
      
      const duration = this.logger.timeEnd('operation-timer');
      this.logger.performance('operation', duration);
      this.logger.methodExit('performOperation', result);
      
      return result;
    } catch (error) {
      this.logger.error('Operation failed', error);
      throw error;
    }
  }
}
```

#### GitHub-Enabled Service
```typescript
import { BaseService } from '../base/base.service';
import { LoggerFactory } from '@claude-code/shared';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GitHubEnabledService extends BaseService {
  constructor(
    configService: ConfigService,
    loggerFactory: LoggerFactory
  ) {
    super('GitHubEnabledService', loggerFactory, configService, true);
  }

  async fetchFromGitHub(): Promise<any> {
    this.validateGitHubAccess(); // Throws if no GitHub token
    
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner: 'user',
        repo: 'repository'
      });
      
      this.logger.log('Successfully fetched from GitHub');
      return data;
    } catch (error) {
      this.logger.error('GitHub API call failed', error);
      throw new Error('Failed to fetch repository data');
    }
  }

  async fetchOptional(): Promise<any> {
    if (!this.hasGitHubAccess) {
      this.logger.warn('GitHub not configured, using fallback');
      return this.getFallbackData();
    }
    
    return await this.fetchFromGitHub();
  }
}
```

## Discord Command Patterns

### Slash Command Structure
```typescript
@Injectable()
export class ExampleCommand {
  constructor(
    private readonly githubService: GitHubService,
    private readonly sessionService: SessionService,
    private readonly embedService: EmbedService
  ) {}

  @SlashCommand({ name: 'example', description: 'Example command' })
  public async onExample(@Context() [interaction]: SlashCommandContext) {
    const userId = interaction.user.id;
    
    // Create session for multi-step workflow
    await this.sessionService.createSession(userId, {
      command: 'example',
      step: 'initial'
    });
    
    // Show initial response
    const embed = this.embedService.createLoadingEmbed('Processing...');
    await interaction.reply({ embeds: [embed] });
  }
}
```

## Interaction Handler Patterns

### Button Handler
```typescript
@Injectable()
export class ExampleButtonHandler {
  constructor(private readonly sessionService: SessionService) {}

  @Button('example-button')
  public async onExampleButton(@Context() [interaction]: ButtonContext) {
    const userId = interaction.user.id;
    const session = await this.sessionService.getSession(userId);
    
    if (!session) {
      await interaction.reply({
        content: 'Session expired. Please start over.',
        ephemeral: true
      });
      return;
    }
    
    // Update session state
    await this.sessionService.updateSession(userId, {
      step: 'next-step',
      buttonClicked: true
    });
    
    // Continue workflow
    await this.handleNextStep(interaction, session.data);
  }
}
```

### Modal Handler
```typescript
@Injectable()
export class ExampleModalHandler {
  @Modal('example-modal')
  public async onExampleModal(@Context() [interaction]: ModalContext) {
    const userId = interaction.user.id;
    const input = interaction.fields.getTextInputValue('input-field');
    
    // Validate input
    if (!this.validateInput(input)) {
      await interaction.reply({
        content: 'Invalid input. Please try again.',
        ephemeral: true
      });
      return;
    }
    
    // Process input and update session
    await this.sessionService.updateSession(userId, {
      userInput: input,
      step: 'processing'
    });
    
    // Show processing state
    const embed = this.embedService.createLoadingEmbed('Processing input...');
    await interaction.reply({ embeds: [embed] });
  }
}
```

## Error Handling Patterns

### Service Error Handling
```typescript
@Injectable()
export class ExampleService {
  async riskyOperation(): Promise<Result> {
    try {
      return await this.externalAPI.call();
    } catch (error) {
      this.logger.error('External API call failed', error);
      
      if (error.response?.status === 429) {
        // Rate limited - retry with backoff
        await this.delay(5000);
        return this.riskyOperation();
      }
      
      if (error.response?.status === 404) {
        throw new NotFoundException('Resource not found');
      }
      
      throw new InternalServerErrorException('API call failed');
    }
  }
}
```

### Discord Interaction Error Handling
```typescript
public async handleInteraction(interaction: any): Promise<void> {
  try {
    await this.processInteraction(interaction);
  } catch (error) {
    this.logger.error('Interaction failed', error);
    
    const errorEmbed = this.embedService.createErrorEmbed(
      'Operation Failed',
      'Something went wrong. Please try again.',
      error
    );
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [errorEmbed] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}
```

## Session Management Patterns

### Multi-Step Workflow
```typescript
@Injectable()
export class WorkflowService {
  async startWorkflow(userId: string): Promise<void> {
    await this.sessionService.createSession(userId, {
      workflow: 'example',
      step: 'step-1',
      data: {}
    });
  }
  
  async advanceWorkflow(userId: string, stepData: any): Promise<void> {
    const session = await this.sessionService.getSession(userId);
    if (!session) throw new Error('No active session');
    
    const nextStep = this.getNextStep(session.data.step);
    
    await this.sessionService.updateSession(userId, {
      step: nextStep,
      [`${session.data.step}Data`]: stepData
    });
  }
}
```

## Testing Patterns

### Service Unit Tests
```typescript
describe('ExampleService', () => {
  let service: ExampleService;
  let mockLoggerFactory: jest.Mocked<LoggerFactory>;
  
  beforeEach(async () => {
    mockLoggerFactory = {
      createLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        error: jest.fn(),
        time: jest.fn(),
        timeEnd: jest.fn()
      })
    };
    
    service = new ExampleService(mockLoggerFactory);
  });
  
  it('should handle successful operations', async () => {
    const result = await service.performOperation();
    expect(result).toBeDefined();
    expect(mockLoggerFactory.createLogger).toHaveBeenCalledWith('ExampleService');
  });
});
```

### Integration Tests
```typescript
describe('Discord Command Integration', () => {
  let app: INestApplication;
  let mockInteraction: any;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = module.createNestApplication();
    await app.init();
    
    mockInteraction = {
      user: { id: 'test-user' },
      reply: jest.fn(),
      editReply: jest.fn()
    };
  });
  
  it('should handle command execution', async () => {
    const command = app.get(ExampleCommand);
    await command.onExample([mockInteraction]);
    
    expect(mockInteraction.reply).toHaveBeenCalled();
  });
});
```

## Configuration Patterns

### Environment Configuration
```typescript
@Injectable()
export class ConfigService {
  get discordToken(): string {
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      throw new Error('DISCORD_TOKEN is required');
    }
    return token;
  }
  
  get githubToken(): string {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN is required');
    }
    return token;
  }
  
  get logLevel(): string {
    return process.env.LOG_LEVEL || 'info';
  }
}
```

## Utility Patterns

### Discord Component Builders
```typescript
export class DiscordUtils {
  static createButton(
    customId: string,
    label: string,
    style: ButtonStyle = ButtonStyle.Primary,
    emoji?: string
  ): ButtonBuilder {
    const button = new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(style);
    
    if (emoji) {
      button.setEmoji(emoji);
    }
    
    return button;
  }
  
  static createSelectMenu(
    customId: string,
    placeholder: string,
    options: SelectOption[]
  ): StringSelectMenuBuilder {
    return new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .addOptions(options);
  }
}
```

## Related Documentation

- [Code Standards](./code-standards.md) - Quality requirements
- [Getting Started](./getting-started.md) - Setup guide
- [Services Documentation](../services/) - Service implementations
- [Architecture](../architecture/) - System design

[← Back to Development](./README.md)