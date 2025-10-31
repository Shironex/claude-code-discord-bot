import { EmbedService } from '@/services/embed.service';
import { Repository, PaginatedRepositories } from '@/interfaces/models/repository.interface';
import { WorkflowRun } from '@/interfaces/models/workflow.interface';
import { DISCORD_COLORS } from '@/utils/discord.constants';
import { MESSAGES } from '@/utils/messages.constants';
import { DiscordUtils } from '@/utils/discord.utils';
import { WorkflowUtils } from '@/utils/workflow.utils';

// Create a proper EmbedBuilder mock that tracks method calls
class MockEmbedBuilder {
  public data: any = {
    title: undefined,
    description: undefined,
    color: undefined,
    fields: [],
    footer: undefined,
    timestamp: undefined,
    url: undefined,
  };

  setTitle(title: string) {
    this.data.title = title;
    return this;
  }

  setDescription(description: string) {
    this.data.description = description;
    return this;
  }

  setColor(color: number) {
    this.data.color = color;
    return this;
  }

  addFields(fields: any) {
    // Handle both single field and array of fields
    if (Array.isArray(fields)) {
      this.data.fields.push(...fields);
    } else {
      this.data.fields.push(fields);
    }
    return this;
  }

  setFooter(footer: any) {
    this.data.footer = footer;
    return this;
  }

  setTimestamp(timestamp?: Date | number | boolean) {
    this.data.timestamp = timestamp === undefined ? new Date().toISOString() : timestamp;
    return this;
  }

  setURL(url: string) {
    this.data.url = url;
    return this;
  }
}

// Mock discord.js
jest.mock('discord.js', () => ({
  EmbedBuilder: jest.fn().mockImplementation(() => new MockEmbedBuilder()),
  ActionRowBuilder: jest.fn(),
  StringSelectMenuBuilder: jest.fn(),
  ButtonBuilder: jest.fn(),
}));

// Mock the utility classes
jest.mock('@/utils/discord.utils');
jest.mock('@/utils/workflow.utils');

describe('EmbedService', () => {
  let embedService: EmbedService;
  let mockLogger: any;

  const mockRepository: Repository = {
    id: 123456,
    name: 'test-repo',
    fullName: 'testuser/test-repo',
    description: 'A test repository for testing',
    language: 'TypeScript',
    private: false,
    stargazersCount: 42,
    forksCount: 5,
    updatedAt: new Date('2023-06-01').toISOString(),
    htmlUrl: 'https://github.com/testuser/test-repo',
  };

  const mockWorkflowRun: WorkflowRun = {
    id: 123456789,
    status: 'in_progress',
    conclusion: null,
    html_url: 'https://github.com/testuser/test-repo/actions/runs/123456789',
    created_at: '2023-06-15T10:00:00Z',
    updated_at: '2023-06-15T10:05:00Z',
    run_number: 42,
    head_branch: 'main',
  };

  beforeEach(() => {
    embedService = new EmbedService();
    
    // Mock the logger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    (embedService as any).logger = mockLogger;

    // Setup DiscordUtils mocks
    (DiscordUtils.createRepositoryFieldsForEmbed as jest.Mock) = jest.fn().mockReturnValue([
      { name: 'Language', value: 'TypeScript', inline: true },
      { name: 'Stars', value: '42', inline: true },
    ]);

    (DiscordUtils.createSelectMenuRow as jest.Mock) = jest.fn().mockReturnValue({
      addComponents: jest.fn().mockReturnThis(),
      setComponents: jest.fn().mockReturnThis(),
      toJSON: jest.fn().mockReturnValue({}),
    });

    // Setup WorkflowUtils mocks
    (WorkflowUtils.getWorkflowStatusText as jest.Mock) = jest.fn().mockReturnValue('In Progress');
    (WorkflowUtils.getWorkflowStatusEmoji as jest.Mock) = jest.fn().mockReturnValue('🔄');
  });

  describe('Constructor', () => {
    it('should initialize as BaseService with correct service name', () => {
      expect(embedService).toBeInstanceOf(EmbedService);
    });
  });

  describe('createLoadingEmbed', () => {
    it('should create loading embed with correct properties', () => {
      const message = 'Loading repositories';
      
      const embed = embedService.createLoadingEmbed(message);
      
      expect(embed.data.title).toBe('🤖 Claude Code Bot');
      expect(embed.data.description).toBe('🔄 Loading repositories');
      expect(embed.data.color).toBe(DISCORD_COLORS.INFO);
    });

    it('should handle empty message', () => {
      const embed = embedService.createLoadingEmbed('');
      
      expect(embed.data.description).toBe('🔄 ');
    });
  });

  describe('createErrorEmbed', () => {
    it('should create error embed with correct properties', () => {
      const title = 'Test Error';
      const description = 'Something went wrong';
      
      const embed = embedService.createErrorEmbed(title, description);
      
      expect(embed.data.title).toBe('❌ Test Error');
      expect(embed.data.description).toBe('Something went wrong');
      expect(embed.data.color).toBe(DISCORD_COLORS.ERROR);
    });

    it('should handle empty title and description', () => {
      const embed = embedService.createErrorEmbed('', '');
      
      expect(embed.data.title).toBe('❌ ');
      expect(embed.data.description).toBe('');
    });
  });

  describe('createSuccessEmbed', () => {
    it('should create success embed with correct properties', () => {
      const title = 'Success';
      const description = 'Operation completed';
      
      const embed = embedService.createSuccessEmbed(title, description);
      
      expect(embed.data.title).toBe('✅ Success');
      expect(embed.data.description).toBe('Operation completed');
      expect(embed.data.color).toBe(DISCORD_COLORS.SUCCESS);
    });
  });

  describe('createWarningEmbed', () => {
    it('should create warning embed with correct properties', () => {
      const title = 'Warning';
      const description = 'Something needs attention';
      
      const embed = embedService.createWarningEmbed(title, description);
      
      expect(embed.data.title).toBe('⚠️ Warning');
      expect(embed.data.description).toBe('Something needs attention');
      expect(embed.data.color).toBe(DISCORD_COLORS.WARNING);
    });
  });

  describe('createGitHubNotConfiguredEmbed', () => {
    it('should create GitHub not configured embed', () => {
      const embed = embedService.createGitHubNotConfiguredEmbed();
      
      expect(embed.data.title).toBe('❌ GitHub Not Configured');
      expect(embed.data.description).toBe(MESSAGES.GITHUB_NOT_CONFIGURED);
      expect(embed.data.color).toBe(DISCORD_COLORS.ERROR);
    });
  });

  describe('createNoRepositoriesEmbed', () => {
    it('should create no repositories embed', () => {
      const embed = embedService.createNoRepositoriesEmbed();
      
      expect(embed.data.title).toBe('⚠️ No Repositories Found');
      expect(embed.data.description).toBe('No repositories found in your GitHub account.');
      expect(embed.data.color).toBe(DISCORD_COLORS.WARNING);
    });
  });

  describe('createNoSearchResultsEmbed', () => {
    it('should create no search results embed', () => {
      const query = 'nonexistent';
      
      const embed = embedService.createNoSearchResultsEmbed(query);
      
      expect(embed.data.title).toBe('⚠️ No Results Found');
      expect(embed.data.description).toBe('No repositories found matching "nonexistent".');
      expect(embed.data.color).toBe(DISCORD_COLORS.WARNING);
    });

    it('should handle empty query', () => {
      const embed = embedService.createNoSearchResultsEmbed('');
      
      expect(embed.data.description).toBe('No repositories found matching "".');
    });
  });

  describe('createRepositorySelectionEmbed', () => {
    const mockPaginatedRepos: PaginatedRepositories = {
      repositories: [mockRepository],
      currentPage: 1,
      totalPages: 3,
      totalCount: 25,
      hasNextPage: true,
      hasPreviousPage: false,
    };

    it('should create repository selection embed without search query', () => {
      const embed = embedService.createRepositorySelectionEmbed(mockPaginatedRepos, null);
      
      expect(embed.data.title).toBe('🤖 Claude Code Bot');
      expect(embed.data.description).toBe('Found 25 repositories. Select one to analyze:');
      expect(embed.data.color).toBe(DISCORD_COLORS.PRIMARY);
      expect(embed.data.footer?.text).toBe('Page 1 of 3 • Step 1 of 2');
    });

    it('should create repository selection embed with search query', () => {
      const searchQuery = 'react';
      
      const embed = embedService.createRepositorySelectionEmbed(mockPaginatedRepos, searchQuery);
      
      expect(embed.data.title).toBe('🔍 Search Results for "react"');
      expect(embed.data.description).toBe('Found 25 repositories matching "react". Select one to analyze:');
      expect(embed.data.color).toBe(DISCORD_COLORS.PRIMARY);
      expect(embed.data.footer?.text).toBe('Page 1 of 3 • Step 1 of 2');
    });
  });

  // For methods that have more complex logic, test that they return an embed
  // without testing all internal details due to Discord.js complexity
  describe('Complex embed methods', () => {
    it('should create repository selected embed', () => {
      const embed = embedService.createRepositorySelectedEmbed(mockRepository);
      
      expect(embed).toBeDefined();
      expect(embed.data.title).toBe('✅ Repository Selected');
      expect(embed.data.color).toBe(DISCORD_COLORS.SUCCESS);
    });

    it('should create repository selected embed with Claude workflow status', () => {
      const embed = embedService.createRepositorySelectedEmbed(mockRepository, true);
      
      expect(embed).toBeDefined();
      expect(embed.data.title).toBe('✅ Repository Selected');
      expect(embed.data.color).toBe(DISCORD_COLORS.SUCCESS);
      // Should add Claude field when hasClaudeWorkflow is provided
      expect(embed.data.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '🤖 Claude Code', value: '✅ Available' })
        ])
      );
    });

    it('should create repository selected embed with Claude workflow unavailable', () => {
      const embed = embedService.createRepositorySelectedEmbed(mockRepository, false);
      
      expect(embed).toBeDefined();
      expect(embed.data.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '🤖 Claude Code', value: '❌ Not configured' })
        ])
      );
    });

    it('should create workflow dispatched embed', () => {
      const embed = embedService.createWorkflowDispatchedEmbed(
        'testuser/test-repo',
        'main',
        'Test prompt',
        mockWorkflowRun
      );
      
      expect(embed).toBeDefined();
      expect(embed.data.title).toBe('🚀 Claude Code Workflow Started');
      expect(embed.data.color).toBe(DISCORD_COLORS.INFO);
    });

    it('should create workflow dispatched embed with file paths', () => {
      const filePaths = ['src/app.ts', 'src/utils.ts', 'README.md'];
      
      const embed = embedService.createWorkflowDispatchedEmbed(
        'testuser/test-repo',
        'main',
        'Test prompt with files',
        mockWorkflowRun,
        filePaths
      );
      
      expect(embed).toBeDefined();
      expect(embed.data.title).toBe('🚀 Claude Code Workflow Started');
      expect(embed.data.color).toBe(DISCORD_COLORS.INFO);
      // Should include file context field when filePaths provided
      expect(embed.data.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            name: '📁 File Context', 
            value: '`src/app.ts, src/utils.ts, README.md`' 
          })
        ])
      );
    });

    it('should create workflow dispatched embed with many file paths (truncated)', () => {
      const filePaths = ['file1.ts', 'file2.ts', 'file3.ts', 'file4.ts', 'file5.ts', 'file6.ts', 'file7.ts'];
      
      const embed = embedService.createWorkflowDispatchedEmbed(
        'testuser/test-repo',
        'main',
        'Test prompt with many files',
        mockWorkflowRun,
        filePaths
      );
      
      expect(embed).toBeDefined();
      // Should truncate when more than 5 files
      expect(embed.data.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            name: '📁 File Context', 
            value: '`file1.ts, file2.ts, file3.ts, file4.ts, file5.ts (and 2 more)`' 
          })
        ])
      );
    });

    it('should create repository selection message', () => {
      const mockPaginatedRepos: PaginatedRepositories = {
        repositories: [mockRepository],
        currentPage: 1,
        totalPages: 1,
        totalCount: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      const result = embedService.createRepositorySelectionMessage(mockPaginatedRepos, null);
      
      expect(result).toBeDefined();
      expect(result.embed).toBeDefined();
      expect(result.components).toBeDefined();
      expect(Array.isArray(result.components)).toBe(true);
      expect(result.components.length).toBeGreaterThan(0);
    });

    it('should create workflow status embed', () => {
      const embed = embedService.createWorkflowStatusEmbed(mockWorkflowRun, 'testuser/test-repo');
      
      expect(embed).toBeDefined();
      expect(embed.data.title).toBe('🔄 Workflow Status');
      expect(embed.data.color).toBe(DISCORD_COLORS.INFO);
    });

    it('should create workflow status embed for completed successful workflow', () => {
      const completedRun = { 
        ...mockWorkflowRun, 
        status: 'completed', 
        conclusion: 'success',
        updated_at: '2023-06-15T10:05:30Z'
      };
      
      const embed = embedService.createWorkflowStatusEmbed(completedRun, 'testuser/test-repo');
      
      expect(embed).toBeDefined();
      expect(embed.data.title).toBe('🔄 Workflow Status');
      expect(embed.data.color).toBe(DISCORD_COLORS.SUCCESS);
      // Should include completed field
      expect(embed.data.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '✅ Completed' })
        ])
      );
    });

    it('should create workflow status embed for completed failed workflow', () => {
      const failedRun = { 
        ...mockWorkflowRun, 
        status: 'completed', 
        conclusion: 'failure',
        updated_at: '2023-06-15T10:05:30Z'
      };
      
      const embed = embedService.createWorkflowStatusEmbed(failedRun, 'testuser/test-repo');
      
      expect(embed).toBeDefined();
      expect(embed.data.color).toBe(DISCORD_COLORS.ERROR);
    });

    it('should create workflow completed embed', () => {
      const startTime = new Date('2023-06-15T10:00:00Z');
      const successfulRun = { 
        ...mockWorkflowRun, 
        status: 'completed', 
        conclusion: 'success',
        updated_at: '2023-06-15T10:05:30Z'
      };
      
      const embed = embedService.createWorkflowCompletedEmbed('testuser/test-repo', successfulRun, startTime);
      
      expect(embed).toBeDefined();
      expect(embed.data.title).toBe('🔄 Workflow Completed');
      expect(embed.data.color).toBe(DISCORD_COLORS.SUCCESS);
      // Should include success result field
      expect(embed.data.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            name: '🎉 Result',
            value: 'Task completed successfully! Check for any pull requests that may have been created.'
          })
        ])
      );
    });

    it('should create workflow completed embed for failed workflow', () => {
      const startTime = new Date('2023-06-15T10:00:00Z');
      const failedRun = { 
        ...mockWorkflowRun, 
        status: 'completed', 
        conclusion: 'failure',
        updated_at: '2023-06-15T10:05:30Z'
      };
      
      const embed = embedService.createWorkflowCompletedEmbed('testuser/test-repo', failedRun, startTime);
      
      expect(embed).toBeDefined();
      expect(embed.data.title).toBe('🔄 Workflow Completed');
      expect(embed.data.color).toBe(DISCORD_COLORS.ERROR);
      // Should include failure error field
      expect(embed.data.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            name: '❌ Error',
            value: 'Workflow failed. Click "View on GitHub" to see the error details.'
          })
        ])
      );
    });

    it('should create workflow completed embed for cancelled workflow', () => {
      const startTime = new Date('2023-06-15T10:00:00Z');
      const cancelledRun = { 
        ...mockWorkflowRun, 
        status: 'completed', 
        conclusion: 'cancelled',
        updated_at: '2023-06-15T10:05:30Z'
      };
      
      const embed = embedService.createWorkflowCompletedEmbed('testuser/test-repo', cancelledRun, startTime);
      
      expect(embed).toBeDefined();
      expect(embed.data.title).toBe('🔄 Workflow Completed');
      expect(embed.data.color).toBe(DISCORD_COLORS.WARNING);
    });

    it('should create file selection embed', () => {
      const mockFileTree = {
        items: [
          { name: 'src/', type: 'dir' },
          { name: 'package.json', type: 'file' },
        ],
        totalItems: 2,
        truncated: false,
      };
      
      const embed = embedService.createFileSelectionEmbed(mockRepository, mockFileTree);
      
      expect(embed).toBeDefined();
      expect(embed.data.title).toBe('📁 Select Files/Folders for Context');
      expect(embed.data.color).toBe(DISCORD_COLORS.PRIMARY);
    });

    it('should create prompt ready embed', () => {
      const selectedPaths = ['src/services/', 'package.json'];
      
      const embed = embedService.createPromptReadyEmbed(mockRepository, selectedPaths);
      
      expect(embed).toBeDefined();
      expect(embed.data.title).toBe('✅ Ready for Analysis Prompt');
      expect(embed.data.color).toBe(DISCORD_COLORS.SUCCESS);
    });
  });

  describe('Error and status embeds', () => {
    it('should create session expired embed', () => {
      const embed = embedService.createSessionExpiredEmbed();
      
      expect(embed.data.title).toBe('❌ Session Expired');
      expect(embed.data.description).toBe(MESSAGES.SESSION_EXPIRED);
      expect(embed.data.color).toBe(DISCORD_COLORS.ERROR);
    });

    it('should create pagination error embed', () => {
      const embed = embedService.createPaginationErrorEmbed();
      
      expect(embed.data.title).toBe('❌ Pagination Error');
      expect(embed.data.description).toBe(MESSAGES.PAGINATION_ERROR);
      expect(embed.data.color).toBe(DISCORD_COLORS.ERROR);
    });

    it('should create workflow not found embed', () => {
      const embed = embedService.createWorkflowNotFoundEmbed('testuser', 'test-repo');
      
      expect(embed.data.title).toBe('⚠️ Claude Code Not Configured');
      expect(embed.data.description).toContain('Repository `testuser/test-repo` does not have Claude Code workflow configured.');
      expect(embed.data.color).toBe(DISCORD_COLORS.WARNING);
    });

    it('should create search loading embed', () => {
      const embed = embedService.createSearchLoadingEmbed('react');
      
      expect(embed.data.title).toBe('🔍 Searching Repositories');
      expect(embed.data.description).toBe('🔄 Searching for "react"...');
      expect(embed.data.color).toBe(DISCORD_COLORS.INFO);
    });

    it('should create search error embed', () => {
      const embed = embedService.createSearchErrorEmbed('react');
      
      expect(embed.data.title).toBe('❌ Search Error');
      expect(embed.data.description).toBe('Failed to search repositories for "react". Please try again.');
      expect(embed.data.color).toBe(DISCORD_COLORS.ERROR);
    });
  });
});