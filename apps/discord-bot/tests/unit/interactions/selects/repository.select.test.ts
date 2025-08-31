import { RepositorySelectHandler } from '@/interactions/selects/repository.select';
import { SessionService } from '@/services/session.service';
import { FileExplorerService } from '@/services/file-explorer.service';
import { EmbedService } from '@/services/embed.service';
import { CUSTOM_IDS } from '@/utils/discord.constants';
import { MESSAGES } from '@/utils/messages.constants';
import { Repository } from '@/interfaces/models/repository.interface';
import { MessageFlags, EmbedBuilder, ButtonBuilder, ActionRowBuilder } from 'discord.js';

// Mock Necord
jest.mock('necord', () => ({
  Context: () => () => ({}),
  StringSelect: () => () => ({}),
  StringSelectContext: {}
}));

// Mock Discord.js components
const mockButtonBuilder = {
  setCustomId: jest.fn().mockReturnThis(),
  setLabel: jest.fn().mockReturnThis(),
  setStyle: jest.fn().mockReturnThis()
};

const mockActionRowBuilder = {
  addComponents: jest.fn().mockReturnThis()
};

jest.mock('discord.js', () => ({
  ...jest.requireActual('discord.js'),
  EmbedBuilder: jest.fn().mockImplementation(() => ({
    setTitle: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setTimestamp: jest.fn().mockReturnThis(),
    addFields: jest.fn().mockReturnThis(),
    setFooter: jest.fn().mockReturnThis()
  })),
  ButtonBuilder: jest.fn().mockImplementation(() => mockButtonBuilder),
  ActionRowBuilder: jest.fn().mockImplementation(() => mockActionRowBuilder),
  MessageFlags: {
    Ephemeral: 64
  },
  ButtonStyle: {
    Primary: 1,
    Secondary: 2
  }
}));

// Mock utilities
jest.mock('@/utils/discord.utils', () => ({
  DiscordUtils: {
    createFileSelectionComponents: jest.fn()
  }
}));

jest.mock('@/utils/error.types', () => ({
  ErrorCategorizer: {
    categorizeError: jest.fn(),
    getLogLevel: jest.fn()
  }
}));

// Mock string select interaction
const createMockInteraction = (options: {
  userId?: string;
  userTag?: string;
  customId?: string;
  values?: string[];
} = {}) => ({
  user: {
    id: options.userId || 'user123',
    tag: options.userTag || 'testuser#1234'
  },
  customId: options.customId || CUSTOM_IDS.REPO_SELECT,
  values: options.values || ['owner/repo'],
  reply: jest.fn()
});

// Mock repository data
const createMockRepository = (fullName: string = 'owner/repo'): Repository => ({
  id: 1,
  fullName,
  name: fullName.split('/')[1],
  description: 'Test repository',
  private: false,
  language: 'TypeScript',
  stargazersCount: 100,
  forksCount: 10,
  updatedAt: '2023-01-01T00:00:00Z',
  htmlUrl: `https://github.com/${fullName}`
});

// Mock Services
const mockSessionService = {
  getSession: jest.fn(),
  updateSession: jest.fn()
} as unknown as jest.Mocked<SessionService>;

const mockFileExplorerService = {
  getFileTree: jest.fn()
} as unknown as jest.Mocked<FileExplorerService>;

const mockEmbedService = {
  createFileSelectionEmbed: jest.fn(),
  createPromptReadyEmbed: jest.fn()
} as unknown as jest.Mocked<EmbedService>;

describe('RepositorySelectHandler', () => {
  let handler: RepositorySelectHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    
    handler = new RepositorySelectHandler(
      mockSessionService,
      mockFileExplorerService,
      mockEmbedService
    );

    // Mock the logger to prevent actual logging
    Object.defineProperty(handler, 'logger', {
      value: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn()
      },
      writable: true
    });
  });

  describe('Constructor', () => {
    it('should initialize with correct service name and dependencies', () => {
      expect(handler).toBeDefined();
      expect(handler['sessionService']).toBe(mockSessionService);
      expect(handler['fileExplorerService']).toBe(mockFileExplorerService);
      expect(handler['embedService']).toBe(mockEmbedService);
    });

    it('should extend BaseService', () => {
      expect(handler).toBeDefined();
      expect(typeof handler['logger']).toBe('object');
    });
  });

  describe('onRepoSelect', () => {
    describe('Custom ID Validation', () => {
      it('should return early when custom ID does not match', async () => {
        const interaction = createMockInteraction({
          customId: 'different_select'
        }) as any;

        await handler.onRepoSelect([interaction]);

        expect(mockSessionService.getSession).not.toHaveBeenCalled();
        expect(interaction.reply).not.toHaveBeenCalled();
      });

      it('should process when custom ID matches exactly', async () => {
        const repository = createMockRepository();
        const interaction = createMockInteraction({
          customId: CUSTOM_IDS.REPO_SELECT,
          values: ['owner/repo']
        }) as any;

        const validSession = {
          userId: 'user123',
          paginatedData: {
            repositories: [repository]
          }
        } as any;

        mockSessionService.getSession.mockReturnValue(validSession);
        mockFileExplorerService.getFileTree.mockResolvedValue({
          items: [{ name: 'file.ts', type: 'file', path: 'file.ts', isCommon: false }],
          truncated: false,
          totalItems: 1
        });
        mockEmbedService.createFileSelectionEmbed.mockReturnValue(new EmbedBuilder() as any);

        const { DiscordUtils } = require('@/utils/discord.utils');
        DiscordUtils.createFileSelectionComponents.mockReturnValue([]);

        interaction.reply.mockResolvedValue(undefined);

        await handler.onRepoSelect([interaction]);

        expect(mockSessionService.getSession).toHaveBeenCalledWith('user123');
        expect(interaction.reply).toHaveBeenCalled();
      });
    });

    describe('Session Validation', () => {
      it('should reply with session expired when no session exists', async () => {
        const interaction = createMockInteraction() as any;
        mockSessionService.getSession.mockReturnValue(null);

        await handler.onRepoSelect([interaction]);

        expect(mockSessionService.getSession).toHaveBeenCalledWith('user123');
        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
      });

      it('should reply with session expired when session has no paginated data', async () => {
        const interaction = createMockInteraction() as any;
        const sessionWithoutData = {
          userId: 'user123',
          paginatedData: null
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithoutData);

        await handler.onRepoSelect([interaction]);

        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
      });

      it('should reply with session expired when session has undefined paginated data', async () => {
        const interaction = createMockInteraction() as any;
        const sessionWithUndefinedData = {
          userId: 'user123'
          // paginatedData is undefined
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithUndefinedData);

        await handler.onRepoSelect([interaction]);

        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
      });
    });

    describe('Repository Selection', () => {
      const repository = createMockRepository('owner/repo');
      const validSession = {
        userId: 'user123',
        paginatedData: {
          repositories: [repository, createMockRepository('other/repo')]
        }
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should reply with repository not found when selected repo does not exist', async () => {
        const interaction = createMockInteraction({
          values: ['nonexistent/repo']
        }) as any;

        await handler.onRepoSelect([interaction]);

        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.REPOSITORY_NOT_FOUND,
          flags: [MessageFlags.Ephemeral]
        });
      });

      it('should find and select the correct repository', async () => {
        const interaction = createMockInteraction({
          values: ['other/repo']
        }) as any;

        mockFileExplorerService.getFileTree.mockResolvedValue({
          items: [{ name: 'file.ts', type: 'file', path: 'file.ts', isCommon: false }],
          truncated: false,
          totalItems: 1
        });
        mockEmbedService.createFileSelectionEmbed.mockReturnValue(new EmbedBuilder() as any);

        const { DiscordUtils } = require('@/utils/discord.utils');
        DiscordUtils.createFileSelectionComponents.mockReturnValue([]);

        interaction.reply.mockResolvedValue(undefined);

        await handler.onRepoSelect([interaction]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          repository: expect.objectContaining({ fullName: 'other/repo' }),
          action: 'file_selection'
        });
      });

      it('should log repository selection', async () => {
        const interaction = createMockInteraction({
          values: ['owner/repo']
        }) as any;

        mockFileExplorerService.getFileTree.mockResolvedValue({
          items: [{ name: 'file.ts', type: 'file', path: 'file.ts', isCommon: false }],
          truncated: false,
          totalItems: 1
        });
        mockEmbedService.createFileSelectionEmbed.mockReturnValue(new EmbedBuilder() as any);

        const { DiscordUtils } = require('@/utils/discord.utils');
        DiscordUtils.createFileSelectionComponents.mockReturnValue([]);

        interaction.reply.mockResolvedValue(undefined);

        await handler.onRepoSelect([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith(
          'Repository selected: owner/repo by user: testuser#1234 (user123)'
        );
      });
    });

    describe('File Selection Display', () => {
      const repository = createMockRepository('owner/repo');
      const validSession = {
        userId: 'user123',
        paginatedData: {
          repositories: [repository]
        }
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should show file selection interface when files exist', async () => {
        const interaction = createMockInteraction() as any;
        const fileTree = {
          items: [
            { name: 'src', type: 'dir' as const, path: 'src', isCommon: false },
            { name: 'file.ts', type: 'file' as const, path: 'file.ts', isCommon: false }
          ],
          truncated: false,
          totalItems: 2
        };

        mockFileExplorerService.getFileTree.mockResolvedValue(fileTree);
        const mockEmbed = new EmbedBuilder();
        mockEmbedService.createFileSelectionEmbed.mockReturnValue(mockEmbed as any);

        const { DiscordUtils } = require('@/utils/discord.utils');
        const mockComponents = [mockActionRowBuilder];
        DiscordUtils.createFileSelectionComponents.mockReturnValue(mockComponents);

        interaction.reply.mockResolvedValue(undefined);

        await handler.onRepoSelect([interaction]);

        expect(mockFileExplorerService.getFileTree).toHaveBeenCalledWith('owner', 'repo');
        expect(mockEmbedService.createFileSelectionEmbed).toHaveBeenCalledWith(repository, fileTree);
        expect(DiscordUtils.createFileSelectionComponents).toHaveBeenCalledWith(fileTree.items);
        expect(interaction.reply).toHaveBeenCalledWith({
          embeds: [mockEmbed],
          components: mockComponents
        });

        expect(handler['logger'].log).toHaveBeenCalledWith(
          'File selection interface shown for owner/repo (2 items)'
        );
      });

      it('should show prompt ready message when no files exist', async () => {
        const interaction = createMockInteraction() as any;
        const emptyFileTree = { items: [], truncated: false, totalItems: 0 };

        mockFileExplorerService.getFileTree.mockResolvedValue(emptyFileTree);
        const mockEmbed = new EmbedBuilder();
        mockEmbedService.createPromptReadyEmbed.mockReturnValue(mockEmbed as any);

        interaction.reply.mockResolvedValue(undefined);

        await handler.onRepoSelect([interaction]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          selectedFilePaths: [],
          action: 'claude_prompt_input'
        });

        expect(mockEmbedService.createPromptReadyEmbed).toHaveBeenCalledWith(repository, []);
        expect(interaction.reply).toHaveBeenCalledWith({
          embeds: [mockEmbed],
          components: [expect.any(Object)]
        });
      });
    });

    describe('Error Handling', () => {
      const repository = createMockRepository('owner/repo');
      const validSession = {
        userId: 'user123',
        paginatedData: {
          repositories: [repository]
        }
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should handle rate limit errors with user message', async () => {
        const interaction = createMockInteraction() as any;
        const rateLimitError = new Error('API rate limit exceeded');
        mockFileExplorerService.getFileTree.mockRejectedValue(rateLimitError);

        const { ErrorCategorizer } = require('@/utils/error.types');
        ErrorCategorizer.categorizeError.mockReturnValue({
          category: 'rate_limit',
          message: 'Rate limit exceeded',
          userMessage: 'API rate limit exceeded. Please try again later.'
        });
        ErrorCategorizer.getLogLevel.mockReturnValue('warn');

        interaction.reply.mockResolvedValue(undefined);

        await handler.onRepoSelect([interaction]);

        expect(ErrorCategorizer.categorizeError).toHaveBeenCalledWith(rateLimitError);
        expect(handler['logger'].warn).toHaveBeenCalledWith(
          'File selection warning for owner/repo (rate_limit): Rate limit exceeded'
        );
        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'API rate limit exceeded. Please try again later.',
          flags: [MessageFlags.Ephemeral]
        });
      });

      it('should handle authentication errors with user message', async () => {
        const interaction = createMockInteraction() as any;
        const authError = new Error('Authentication failed');
        mockFileExplorerService.getFileTree.mockRejectedValue(authError);

        const { ErrorCategorizer } = require('@/utils/error.types');
        ErrorCategorizer.categorizeError.mockReturnValue({
          category: 'authentication',
          message: 'Authentication failed',
          userMessage: 'Authentication failed. Please check your credentials.'
        });
        ErrorCategorizer.getLogLevel.mockReturnValue('error');

        interaction.reply.mockResolvedValue(undefined);

        await handler.onRepoSelect([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith(
          'Failed to show file selection for owner/repo (authentication): Authentication failed',
          authError
        );
        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'Authentication failed. Please check your credentials.',
          flags: [MessageFlags.Ephemeral]
        });
      });

      it('should handle permission errors with user message', async () => {
        const interaction = createMockInteraction() as any;
        const permissionError = new Error('Permission denied');
        mockFileExplorerService.getFileTree.mockRejectedValue(permissionError);

        const { ErrorCategorizer } = require('@/utils/error.types');
        ErrorCategorizer.categorizeError.mockReturnValue({
          category: 'permission',
          message: 'Permission denied',
          userMessage: 'Permission denied. You may not have access to this repository.'
        });
        ErrorCategorizer.getLogLevel.mockReturnValue('error');

        interaction.reply.mockResolvedValue(undefined);

        await handler.onRepoSelect([interaction]);

        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'Permission denied. You may not have access to this repository.',
          flags: [MessageFlags.Ephemeral]
        });
      });

      it('should fallback to prompt ready message for network errors', async () => {
        const interaction = createMockInteraction() as any;
        const networkError = new Error('Network timeout');
        mockFileExplorerService.getFileTree.mockRejectedValue(networkError);

        const { ErrorCategorizer } = require('@/utils/error.types');
        ErrorCategorizer.categorizeError.mockReturnValue({
          category: 'network',
          message: 'Network timeout',
          userMessage: 'Network error occurred. Please try again.'
        });
        ErrorCategorizer.getLogLevel.mockReturnValue('warn');

        const mockEmbed = new EmbedBuilder();
        mockEmbedService.createPromptReadyEmbed.mockReturnValue(mockEmbed as any);

        interaction.reply.mockResolvedValue(undefined);

        await handler.onRepoSelect([interaction]);

        expect(handler['logger'].warn).toHaveBeenCalledWith(
          'File selection warning for owner/repo (network): Network timeout'
        );

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          selectedFilePaths: [],
          action: 'claude_prompt_input'
        });

        expect(interaction.reply).toHaveBeenCalledWith({
          embeds: [mockEmbed],
          components: [expect.any(Object)]
        });
      });

      it('should use info log level for info category errors', async () => {
        const interaction = createMockInteraction() as any;
        const infoError = new Error('Repository empty');
        mockFileExplorerService.getFileTree.mockRejectedValue(infoError);

        const { ErrorCategorizer } = require('@/utils/error.types');
        ErrorCategorizer.categorizeError.mockReturnValue({
          category: 'info',
          message: 'Repository is empty',
          userMessage: 'Repository appears to be empty.'
        });
        ErrorCategorizer.getLogLevel.mockReturnValue('info');

        const mockEmbed = new EmbedBuilder();
        mockEmbedService.createPromptReadyEmbed.mockReturnValue(mockEmbed as any);

        interaction.reply.mockResolvedValue(undefined);

        await handler.onRepoSelect([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith(
          'File selection info for owner/repo (info): Repository is empty'
        );
      });

      it('should always log debug information', async () => {
        const interaction = createMockInteraction() as any;
        const error = new Error('Test error');
        mockFileExplorerService.getFileTree.mockRejectedValue(error);

        const { ErrorCategorizer } = require('@/utils/error.types');
        ErrorCategorizer.categorizeError.mockReturnValue({
          category: 'network',
          message: 'Test error',
          userMessage: 'An error occurred.'
        });
        ErrorCategorizer.getLogLevel.mockReturnValue('error');

        interaction.reply.mockResolvedValue(undefined);

        await handler.onRepoSelect([interaction]);

        expect(handler['logger'].debug).toHaveBeenCalledWith(
          'Failed to show file selection for owner/repo (network): Test error',
          error
        );
      });
    });

    describe('Prompt Ready Message Components', () => {
      const repository = createMockRepository('owner/repo');
      const validSession = {
        userId: 'user123',
        paginatedData: {
          repositories: [repository]
        }
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
        mockFileExplorerService.getFileTree.mockResolvedValue({ items: [], truncated: false, totalItems: 0 });
        mockEmbedService.createPromptReadyEmbed.mockReturnValue(new EmbedBuilder() as any);
      });

      it('should create correct buttons for prompt ready message', async () => {
        const interaction = createMockInteraction() as any;
        interaction.reply.mockResolvedValue(undefined);

        await handler.onRepoSelect([interaction]);

        expect(mockButtonBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_PROMPT_MODAL + '_trigger');
        expect(mockButtonBuilder.setLabel).toHaveBeenCalledWith('📝 Enter Analysis Prompt');
        expect(mockButtonBuilder.setStyle).toHaveBeenCalledWith(1); // ButtonStyle.Primary

        expect(mockButtonBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.SKIP_FILE_SELECTION);
        expect(mockButtonBuilder.setLabel).toHaveBeenCalledWith('Skip File Selection');
        expect(mockButtonBuilder.setStyle).toHaveBeenCalledWith(2); // ButtonStyle.Secondary
      });

      it('should add both buttons to action row', async () => {
        const interaction = createMockInteraction() as any;
        interaction.reply.mockResolvedValue(undefined);

        await handler.onRepoSelect([interaction]);

        expect(mockActionRowBuilder.addComponents).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object)
        );
      });
    });

    describe('Edge Cases', () => {
      it('should handle complex repository names', async () => {
        const complexRepo = createMockRepository('my-org/my-complex-repo-name');
        const validSession = {
          userId: 'user123',
          paginatedData: {
            repositories: [complexRepo]
          }
        } as any;

        mockSessionService.getSession.mockReturnValue(validSession);

        const interaction = createMockInteraction({
          values: ['my-org/my-complex-repo-name']
        }) as any;

        mockFileExplorerService.getFileTree.mockResolvedValue({
          items: [{ name: 'file.ts', type: 'file', path: 'file.ts', isCommon: false }],
          truncated: false,
          totalItems: 1
        });
        mockEmbedService.createFileSelectionEmbed.mockReturnValue(new EmbedBuilder() as any);

        const { DiscordUtils } = require('@/utils/discord.utils');
        DiscordUtils.createFileSelectionComponents.mockReturnValue([]);

        interaction.reply.mockResolvedValue(undefined);

        await handler.onRepoSelect([interaction]);

        expect(mockFileExplorerService.getFileTree).toHaveBeenCalledWith('my-org', 'my-complex-repo-name');
        expect(handler['logger'].log).toHaveBeenCalledWith(
          'Repository selected: my-org/my-complex-repo-name by user: testuser#1234 (user123)'
        );
      });

      it('should handle empty values array', async () => {
        const interaction = createMockInteraction({
          values: []
        }) as any;

        const validSession = {
          userId: 'user123',
          paginatedData: {
            repositories: [createMockRepository()]
          }
        } as any;

        mockSessionService.getSession.mockReturnValue(validSession);

        await handler.onRepoSelect([interaction]);

        // Should try to find undefined repository and fail
        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.REPOSITORY_NOT_FOUND,
          flags: [MessageFlags.Ephemeral]
        });
      });

      it('should handle different user IDs', async () => {
        const interaction = createMockInteraction({
          userId: 'user456',
          userTag: 'differentuser#5678'
        }) as any;

        const validSession = {
          userId: 'user456',
          paginatedData: {
            repositories: [createMockRepository()]
          }
        } as any;

        mockSessionService.getSession.mockReturnValue(validSession);
        mockFileExplorerService.getFileTree.mockResolvedValue({ items: [], truncated: false, totalItems: 0 });
        mockEmbedService.createPromptReadyEmbed.mockReturnValue(new EmbedBuilder() as any);

        interaction.reply.mockResolvedValue(undefined);

        await handler.onRepoSelect([interaction]);

        expect(mockSessionService.getSession).toHaveBeenCalledWith('user456');
        expect(handler['logger'].log).toHaveBeenCalledWith(
          'Repository selected: owner/repo by user: differentuser#5678 (user456)'
        );
      });
    });
  });
});