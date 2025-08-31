import { FilePathSelectHandler } from '@/interactions/selects/file-path.select';
import { SessionService } from '@/services/session.service';
import { FileExplorerService } from '@/services/file-explorer.service';
import { CUSTOM_IDS } from '@/utils/discord.constants';
import { MESSAGES } from '@/utils/messages.constants';
import { Repository } from '@/interfaces/models/repository.interface';
import { MessageFlags, EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder } from 'discord.js';

// Mock Necord
jest.mock('necord', () => ({
  Context: () => () => ({}),
  StringSelect: () => () => ({}),
  StringSelectContext: {}
}));

// Mock Discord.js components
const mockModalBuilder = {
  setCustomId: jest.fn().mockReturnThis(),
  setTitle: jest.fn().mockReturnThis(),
  addComponents: jest.fn().mockReturnThis()
};

const mockTextInputBuilder = {
  setCustomId: jest.fn().mockReturnThis(),
  setLabel: jest.fn().mockReturnThis(),
  setStyle: jest.fn().mockReturnThis(),
  setPlaceholder: jest.fn().mockReturnThis(),
  setRequired: jest.fn().mockReturnThis(),
  setMinLength: jest.fn().mockReturnThis(),
  setMaxLength: jest.fn().mockReturnThis(),
  setValue: jest.fn().mockReturnThis()
};

const mockActionRowBuilder = {
  addComponents: jest.fn().mockReturnThis()
};

jest.mock('discord.js', () => ({
  ...jest.requireActual('discord.js'),
  ModalBuilder: jest.fn().mockImplementation(() => mockModalBuilder),
  TextInputBuilder: jest.fn().mockImplementation(() => mockTextInputBuilder),
  ActionRowBuilder: jest.fn().mockImplementation(() => mockActionRowBuilder),
  MessageFlags: {
    Ephemeral: 64
  },
  TextInputStyle: {
    Short: 1,
    Paragraph: 2
  }
}));

// Mock utilities
jest.mock('@/utils/discord.utils', () => ({
  createImageUploadPrompt: jest.fn()
}));

jest.mock('@/utils/file-tree.utils', () => ({
  FileTreeUtils: {
    formatFilePathsString: jest.fn()
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
  customId: options.customId || CUSTOM_IDS.FILE_PATH_SELECT,
  values: options.values || ['src/app.ts', 'README.md'],
  reply: jest.fn(),
  update: jest.fn()
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

describe('FilePathSelectHandler', () => {
  let handler: FilePathSelectHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    
    handler = new FilePathSelectHandler(
      mockSessionService,
      mockFileExplorerService
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
    });

    it('should extend BaseService', () => {
      expect(handler).toBeDefined();
      expect(typeof handler['logger']).toBe('object');
    });
  });

  describe('onFilePathSelect', () => {
    describe('Session Validation', () => {
      it('should reply with session expired when no session exists', async () => {
        const interaction = createMockInteraction() as any;
        mockSessionService.getSession.mockReturnValue(null);

        await handler.onFilePathSelect([interaction]);

        expect(mockSessionService.getSession).toHaveBeenCalledWith('user123');
        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
      });

      it('should reply with session expired when session has no repository', async () => {
        const interaction = createMockInteraction() as any;
        const sessionWithoutRepo = {
          userId: 'user123',
          repository: null
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithoutRepo);

        await handler.onFilePathSelect([interaction]);

        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
      });

      it('should reply with session expired when session has undefined repository', async () => {
        const interaction = createMockInteraction() as any;
        const sessionWithUndefinedRepo = {
          userId: 'user123'
          // repository is undefined
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithUndefinedRepo);

        await handler.onFilePathSelect([interaction]);

        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
      });
    });

    describe('File Path Selection Processing', () => {
      const repository = createMockRepository('owner/repo');
      const validSession = {
        userId: 'user123',
        repository
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should process single file path selection', async () => {
        const interaction = createMockInteraction({
          values: ['src/app.ts']
        }) as any;

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        const mockEmbed = new EmbedBuilder();
        const mockComponents = [mockActionRowBuilder];
        
        createImageUploadPrompt.mockReturnValue({
          embed: mockEmbed,
          components: mockComponents
        });

        interaction.update.mockResolvedValue(undefined);

        await handler.onFilePathSelect([interaction]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          selectedFilePaths: ['src/app.ts'],
          action: 'claude_image_selection'
        });

        expect(interaction.update).toHaveBeenCalledWith({
          embeds: [mockEmbed],
          components: mockComponents
        });
      });

      it('should process multiple file path selections', async () => {
        const selectedPaths = ['src/app.ts', 'src/utils/helpers.ts', 'README.md'];
        const interaction = createMockInteraction({
          values: selectedPaths
        }) as any;

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        const mockEmbed = new EmbedBuilder();
        const mockComponents = [mockActionRowBuilder];
        
        createImageUploadPrompt.mockReturnValue({
          embed: mockEmbed,
          components: mockComponents
        });

        interaction.update.mockResolvedValue(undefined);

        await handler.onFilePathSelect([interaction]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          selectedFilePaths: selectedPaths,
          action: 'claude_image_selection'
        });

        expect(handler['logger'].log).toHaveBeenCalledWith(
          'File path selection: 3 paths selected by testuser#1234'
        );
        expect(handler['logger'].log).toHaveBeenCalledWith(
          'Selected paths: src/app.ts, src/utils/helpers.ts, README.md'
        );
      });

      it('should handle empty file path selection', async () => {
        const interaction = createMockInteraction({
          values: []
        }) as any;

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        const mockEmbed = new EmbedBuilder();
        const mockComponents = [mockActionRowBuilder];
        
        createImageUploadPrompt.mockReturnValue({
          embed: mockEmbed,
          components: mockComponents
        });

        interaction.update.mockResolvedValue(undefined);

        await handler.onFilePathSelect([interaction]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          selectedFilePaths: [],
          action: 'claude_image_selection'
        });

        expect(handler['logger'].log).toHaveBeenCalledWith(
          'File path selection: 0 paths selected by testuser#1234'
        );
      });

      it('should call createImageUploadPrompt with repository name', async () => {
        const interaction = createMockInteraction() as any;

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        const mockEmbed = new EmbedBuilder();
        const mockComponents = [mockActionRowBuilder];
        
        createImageUploadPrompt.mockReturnValue({
          embed: mockEmbed,
          components: mockComponents
        });

        interaction.update.mockResolvedValue(undefined);

        await handler.onFilePathSelect([interaction]);

        expect(createImageUploadPrompt).toHaveBeenCalledWith('repo');
      });

      it('should log successful completion', async () => {
        const interaction = createMockInteraction({
          values: ['src/app.ts', 'README.md']
        }) as any;

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        const mockEmbed = new EmbedBuilder();
        const mockComponents = [mockActionRowBuilder];
        
        createImageUploadPrompt.mockReturnValue({
          embed: mockEmbed,
          components: mockComponents
        });

        interaction.update.mockResolvedValue(undefined);

        await handler.onFilePathSelect([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith(
          'Image upload prompt displayed for owner/repo with 2 pre-selected files'
        );
      });
    });

    describe('Error Handling', () => {
      const repository = createMockRepository('owner/repo');
      const validSession = {
        userId: 'user123',
        repository
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should handle discord utils import errors with error level logging', async () => {
        const interaction = createMockInteraction() as any;
        const importError = new Error('Dynamic import failed');

        // Mock createImageUploadPrompt to throw an error
        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        createImageUploadPrompt.mockImplementation(() => {
          throw importError;
        });

        const { ErrorCategorizer } = require('@/utils/error.types');
        ErrorCategorizer.categorizeError.mockReturnValue({
          category: 'internal',
          message: 'Dynamic import failed',
          userMessage: 'An internal error occurred'
        });
        ErrorCategorizer.getLogLevel.mockReturnValue('error');

        interaction.reply.mockResolvedValue(undefined);

        await handler.onFilePathSelect([interaction]);

        expect(ErrorCategorizer.categorizeError).toHaveBeenCalledWith(importError);
        expect(handler['logger'].error).toHaveBeenCalledWith(
          'Failed to handle file path selection (internal): Dynamic import failed',
          importError
        );
        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'Failed to show image upload step. Please try again.',
          flags: [MessageFlags.Ephemeral]
        });
      });

      it('should handle session service errors with warn level logging', async () => {
        const interaction = createMockInteraction() as any;
        const sessionError = new Error('Session update failed');

        mockSessionService.updateSession.mockImplementation(() => {
          throw sessionError;
        });

        const { ErrorCategorizer } = require('@/utils/error.types');
        ErrorCategorizer.categorizeError.mockReturnValue({
          category: 'session',
          message: 'Session update failed',
          userMessage: 'Session error occurred'
        });
        ErrorCategorizer.getLogLevel.mockReturnValue('warn');

        interaction.reply.mockResolvedValue(undefined);

        await handler.onFilePathSelect([interaction]);

        expect(handler['logger'].warn).toHaveBeenCalledWith(
          'File path selection warning (session): Session update failed'
        );
      });

      it('should handle network errors with info level logging', async () => {
        const interaction = createMockInteraction() as any;
        const networkError = new Error('Network timeout');

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        createImageUploadPrompt.mockImplementation(() => {
          throw networkError;
        });

        const { ErrorCategorizer } = require('@/utils/error.types');
        ErrorCategorizer.categorizeError.mockReturnValue({
          category: 'network',
          message: 'Network timeout',
          userMessage: 'Network error occurred'
        });
        ErrorCategorizer.getLogLevel.mockReturnValue('info');

        interaction.reply.mockResolvedValue(undefined);

        await handler.onFilePathSelect([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith(
          'File path selection info (network): Network timeout'
        );
      });

      it('should handle interaction update failures', async () => {
        const interaction = createMockInteraction() as any;
        const updateError = new Error('Interaction update failed');

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        createImageUploadPrompt.mockReturnValue({
          embed: new EmbedBuilder(),
          components: []
        });

        interaction.update.mockRejectedValue(updateError);

        const { ErrorCategorizer } = require('@/utils/error.types');
        ErrorCategorizer.categorizeError.mockReturnValue({
          category: 'discord_api',
          message: 'Interaction update failed',
          userMessage: 'Discord API error occurred'
        });
        ErrorCategorizer.getLogLevel.mockReturnValue('error');

        interaction.reply.mockResolvedValue(undefined);

        await handler.onFilePathSelect([interaction]);

        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'Failed to show image upload step. Please try again.',
          flags: [MessageFlags.Ephemeral]
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle different user IDs', async () => {
        const interaction = createMockInteraction({
          userId: 'user456',
          userTag: 'differentuser#5678',
          values: ['src/main.ts']
        }) as any;

        const repository = createMockRepository('different/repo');
        const validSession = {
          userId: 'user456',
          repository
        } as any;

        mockSessionService.getSession.mockReturnValue(validSession);

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        createImageUploadPrompt.mockReturnValue({
          embed: new EmbedBuilder(),
          components: []
        });

        interaction.update.mockResolvedValue(undefined);

        await handler.onFilePathSelect([interaction]);

        expect(mockSessionService.getSession).toHaveBeenCalledWith('user456');
        expect(handler['logger'].log).toHaveBeenCalledWith(
          'File path selection: 1 paths selected by differentuser#5678'
        );
      });

      it('should handle complex file paths with special characters', async () => {
        const complexPaths = [
          'src/components/Button.component.tsx',
          'tests/__tests__/utils.test.ts',
          'docs/api/v2/endpoints.md',
          'config/env/.env.production'
        ];

        const interaction = createMockInteraction({
          values: complexPaths
        }) as any;

        const repository = createMockRepository('complex/repo-name');
        const validSession = {
          userId: 'user123',
          repository
        } as any;

        mockSessionService.getSession.mockReturnValue(validSession);

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        createImageUploadPrompt.mockReturnValue({
          embed: new EmbedBuilder(),
          components: []
        });

        interaction.update.mockResolvedValue(undefined);

        await handler.onFilePathSelect([interaction]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          selectedFilePaths: complexPaths,
          action: 'claude_image_selection'
        });

        expect(handler['logger'].log).toHaveBeenCalledWith(
          'Selected paths: src/components/Button.component.tsx, tests/__tests__/utils.test.ts, docs/api/v2/endpoints.md, config/env/.env.production'
        );
      });
    });
  });

  describe('createPromptModal', () => {
    it('should create modal with correct configuration', async () => {
      const selectedPaths = ['src/app.ts', 'README.md'];

      const modal = await handler['createPromptModal'](selectedPaths);

      expect(ModalBuilder).toHaveBeenCalled();
      expect(mockModalBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_PROMPT_MODAL);
      expect(mockModalBuilder.setTitle).toHaveBeenCalledWith('Claude Code Analysis');
      expect(mockModalBuilder.addComponents).toHaveBeenCalled();
    });

    it('should create prompt input with correct configuration', async () => {
      const selectedPaths = ['src/app.ts'];

      await handler['createPromptModal'](selectedPaths);

      expect(TextInputBuilder).toHaveBeenCalled();
      expect(mockTextInputBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_PROMPT_INPUT);
      expect(mockTextInputBuilder.setLabel).toHaveBeenCalledWith('Analysis Prompt');
      expect(mockTextInputBuilder.setPlaceholder).toHaveBeenCalledWith('Describe what you want Claude to analyze or do...');
      expect(mockTextInputBuilder.setRequired).toHaveBeenCalledWith(true);
      expect(mockTextInputBuilder.setMinLength).toHaveBeenCalledWith(10);
      expect(mockTextInputBuilder.setMaxLength).toHaveBeenCalledWith(2000);
    });

    it('should create branch input with correct configuration', async () => {
      const selectedPaths = ['src/app.ts'];

      await handler['createPromptModal'](selectedPaths);

      expect(mockTextInputBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_BRANCH_INPUT);
      expect(mockTextInputBuilder.setLabel).toHaveBeenCalledWith('Target Branch (optional)');
      expect(mockTextInputBuilder.setPlaceholder).toHaveBeenCalledWith('main');
      expect(mockTextInputBuilder.setRequired).toHaveBeenCalledWith(false);
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('main');
      expect(mockTextInputBuilder.setMaxLength).toHaveBeenCalledWith(100);
    });

    it('should create file context input with pre-filled selected paths', async () => {
      const selectedPaths = ['src/app.ts', 'README.md'];

      const { FileTreeUtils } = require('@/utils/file-tree.utils');
      const formattedPaths = 'src/app.ts, README.md';
      FileTreeUtils.formatFilePathsString.mockReturnValue(formattedPaths);

      await handler['createPromptModal'](selectedPaths);

      expect(FileTreeUtils.formatFilePathsString).toHaveBeenCalledWith(selectedPaths);
      expect(mockTextInputBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_FILE_CONTEXT_INPUT);
      expect(mockTextInputBuilder.setLabel).toHaveBeenCalledWith('File Context (optional - edit as needed)');
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith(formattedPaths);
      expect(mockTextInputBuilder.setRequired).toHaveBeenCalledWith(false);
      expect(mockTextInputBuilder.setMaxLength).toHaveBeenCalledWith(2000);
    });

    it('should create file context input without pre-filled paths when empty', async () => {
      const selectedPaths: string[] = [];

      const { FileTreeUtils } = require('@/utils/file-tree.utils');
      FileTreeUtils.formatFilePathsString.mockReturnValue('');

      await handler['createPromptModal'](selectedPaths);

      // setValue is called once for branch input ('main'), but not for file context input
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledTimes(1);
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('main');
      expect(FileTreeUtils.formatFilePathsString).not.toHaveBeenCalled();
    });

    it('should create file context input without pre-filled paths when null', async () => {
      const selectedPaths = null as any;

      const { FileTreeUtils } = require('@/utils/file-tree.utils');
      FileTreeUtils.formatFilePathsString.mockReturnValue('');

      await handler['createPromptModal'](selectedPaths);

      // setValue is called once for branch input ('main'), but not for file context input
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledTimes(1);
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('main');
      expect(FileTreeUtils.formatFilePathsString).not.toHaveBeenCalled();
    });

    it('should create action rows for all components', async () => {
      const selectedPaths = ['src/app.ts'];

      await handler['createPromptModal'](selectedPaths);

      expect(ActionRowBuilder).toHaveBeenCalledTimes(3);
      expect(mockActionRowBuilder.addComponents).toHaveBeenCalledTimes(3);
    });
  });
});