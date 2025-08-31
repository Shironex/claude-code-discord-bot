import { SkipFileSelectionButtonHandler } from '@/interactions/buttons/skip-file-selection.button';
import { SessionService } from '@/services/session.service';
import { CUSTOM_IDS } from '@/utils/discord.constants';
import { MESSAGES } from '@/utils/messages.constants';
import { Repository } from '@/interfaces/models/repository.interface';
import { MessageFlags, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, EmbedBuilder } from 'discord.js';

// Mock Necord
jest.mock('necord', () => ({
  Context: () => () => ({}),
  Button: () => () => ({}),
  ButtonContext: {}
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

const mockEmbedBuilder = {
  setTitle: jest.fn().mockReturnThis(),
  setColor: jest.fn().mockReturnThis(),
  setDescription: jest.fn().mockReturnThis(),
  addFields: jest.fn().mockReturnThis()
};

jest.mock('discord.js', () => ({
  ...jest.requireActual('discord.js'),
  ModalBuilder: jest.fn().mockImplementation(() => mockModalBuilder),
  TextInputBuilder: jest.fn().mockImplementation(() => mockTextInputBuilder),
  ActionRowBuilder: jest.fn().mockImplementation(() => mockActionRowBuilder),
  EmbedBuilder: jest.fn().mockImplementation(() => mockEmbedBuilder),
  MessageFlags: {
    Ephemeral: 64
  },
  TextInputStyle: {
    Short: 1,
    Paragraph: 2
  }
}));

// Mock dynamic imports
jest.mock('@/services/embed.service', () => ({
  EmbedService: jest.fn()
}));

jest.mock('@/utils/discord.utils', () => ({
  createImageUploadPrompt: jest.fn()
}));

jest.mock('@/utils/file-tree.utils', () => ({
  FileTreeUtils: {
    formatFilePathsString: jest.fn()
  }
}));

// Mock button interaction
const createMockInteraction = (options: {
  userId?: string;
  userTag?: string;
  customId?: string;
} = {}) => ({
  user: {
    id: options.userId || 'user123',
    tag: options.userTag || 'testuser#1234'
  },
  customId: options.customId || CUSTOM_IDS.SKIP_FILE_SELECTION,
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

describe('SkipFileSelectionButtonHandler', () => {
  let handler: SkipFileSelectionButtonHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    
    handler = new SkipFileSelectionButtonHandler(mockSessionService);

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

    // Reset all mock builder methods to default behavior
    Object.values(mockModalBuilder).forEach(mock => {
      if (typeof mock === 'function') {
        mock.mockReturnThis();
      }
    });
    
    Object.values(mockTextInputBuilder).forEach(mock => {
      if (typeof mock === 'function') {
        mock.mockReturnThis();
      }
    });
    
    Object.values(mockActionRowBuilder).forEach(mock => {
      if (typeof mock === 'function') {
        mock.mockReturnThis();
      }
    });

    // Reset sessionService to default behavior
    mockSessionService.updateSession.mockImplementation(() => {});
  });

  describe('Constructor', () => {
    it('should initialize with correct service name and dependencies', () => {
      expect(handler).toBeDefined();
      expect(handler['sessionService']).toBe(mockSessionService);
    });

    it('should extend BaseService', () => {
      expect(handler).toBeDefined();
      expect(typeof handler['logger']).toBe('object');
    });
  });

  describe('onSkipFileSelection', () => {
    describe('Session Validation', () => {
      it('should reply with session expired when no session exists', async () => {
        const interaction = createMockInteraction() as any;
        mockSessionService.getSession.mockReturnValue(null);

        await handler.onSkipFileSelection([interaction]);

        expect(mockSessionService.getSession).toHaveBeenCalledWith('user123');
        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
        expect(interaction.update).not.toHaveBeenCalled();
      });

      it('should reply with session expired when session has no repository', async () => {
        const interaction = createMockInteraction() as any;
        const sessionWithoutRepo = {
          userId: 'user123',
          repository: null
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithoutRepo);

        await handler.onSkipFileSelection([interaction]);

        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
        expect(interaction.update).not.toHaveBeenCalled();
      });

      it('should reply with session expired when session has undefined repository', async () => {
        const interaction = createMockInteraction() as any;
        const sessionWithUndefinedRepo = {
          userId: 'user123'
          // repository is undefined
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithUndefinedRepo);

        await handler.onSkipFileSelection([interaction]);

        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
        expect(interaction.update).not.toHaveBeenCalled();
      });
    });

    describe('Successful Skip File Selection Flow', () => {
      const repository = createMockRepository('owner/test-repo');
      const validSession = {
        userId: 'user123',
        repository,
        selectedFilePaths: ['src/app.ts', 'README.md']
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should log user action', async () => {
        const interaction = createMockInteraction({
          userId: 'user456',
          userTag: 'developer#1234'
        }) as any;

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        createImageUploadPrompt.mockReturnValue({
          embed: mockEmbedBuilder,
          components: []
        });

        interaction.update.mockResolvedValue(undefined);

        await handler.onSkipFileSelection([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith('User developer#1234 (user456) skipped file selection');
      });

      it('should update session with correct action and clear file paths', async () => {
        const interaction = createMockInteraction() as any;

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        createImageUploadPrompt.mockReturnValue({
          embed: mockEmbedBuilder,
          components: []
        });

        interaction.update.mockResolvedValue(undefined);

        await handler.onSkipFileSelection([interaction]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          selectedFilePaths: [],
          action: 'claude_image_selection'
        });
      });

      it('should create image upload prompt with repository name', async () => {
        const interaction = createMockInteraction() as any;

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        createImageUploadPrompt.mockReturnValue({
          embed: mockEmbedBuilder,
          components: []
        });

        interaction.update.mockResolvedValue(undefined);

        await handler.onSkipFileSelection([interaction]);

        expect(createImageUploadPrompt).toHaveBeenCalledWith('test-repo');
      });

      it('should update interaction with embed and components', async () => {
        const interaction = createMockInteraction() as any;
        const mockComponents = [mockActionRowBuilder];

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        createImageUploadPrompt.mockReturnValue({
          embed: mockEmbedBuilder,
          components: mockComponents
        });

        interaction.update.mockResolvedValue(undefined);

        await handler.onSkipFileSelection([interaction]);

        expect(interaction.update).toHaveBeenCalledWith({
          embeds: [mockEmbedBuilder],
          components: mockComponents
        });
      });

      it('should log successful image upload prompt display', async () => {
        const interaction = createMockInteraction() as any;

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        createImageUploadPrompt.mockReturnValue({
          embed: mockEmbedBuilder,
          components: []
        });

        interaction.update.mockResolvedValue(undefined);

        await handler.onSkipFileSelection([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith('Image upload prompt displayed for owner/test-repo');
      });

      it('should handle session with no previously selected file paths', async () => {
        const sessionWithoutPaths = {
          userId: 'user123',
          repository,
          selectedFilePaths: null
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithoutPaths);

        const interaction = createMockInteraction() as any;

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        createImageUploadPrompt.mockReturnValue({
          embed: mockEmbedBuilder,
          components: []
        });

        interaction.update.mockResolvedValue(undefined);

        await handler.onSkipFileSelection([interaction]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          selectedFilePaths: [],
          action: 'claude_image_selection'
        });
        expect(handler['logger'].log).toHaveBeenCalledWith('Image upload prompt displayed for owner/test-repo');
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

      it('should handle session service update errors', async () => {
        const interaction = createMockInteraction() as any;
        const updateError = new Error('Session update failed');

        mockSessionService.updateSession.mockImplementation(() => {
          throw updateError;
        });

        await handler.onSkipFileSelection([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Failed to handle skip file selection: Session update failed', updateError);
        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'Failed to show image upload step. Please try again.',
          flags: [MessageFlags.Ephemeral]
        });
        expect(interaction.update).not.toHaveBeenCalled();
      });


      it('should handle createImageUploadPrompt errors', async () => {
        const interaction = createMockInteraction() as any;
        const promptError = new Error('Image upload prompt creation failed');

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        createImageUploadPrompt.mockImplementation(() => {
          throw promptError;
        });

        await handler.onSkipFileSelection([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Failed to handle skip file selection: Image upload prompt creation failed', promptError);
        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'Failed to show image upload step. Please try again.',
          flags: [MessageFlags.Ephemeral]
        });
      });

      it('should handle interaction update errors', async () => {
        const interaction = createMockInteraction() as any;
        const updateError = new Error('Interaction update failed');

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        createImageUploadPrompt.mockReturnValue({
          embed: mockEmbedBuilder,
          components: []
        });

        interaction.update.mockRejectedValue(updateError);

        await handler.onSkipFileSelection([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Failed to handle skip file selection: Interaction update failed', updateError);
        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'Failed to show image upload step. Please try again.',
          flags: [MessageFlags.Ephemeral]
        });
      });

      it('should handle general unexpected errors', async () => {
        const interaction = createMockInteraction() as any;
        const unexpectedError = new Error('Unexpected error');

        // Mock logger to throw during the first log call
        handler['logger'].log = jest.fn().mockImplementation(() => {
          throw unexpectedError;
        });

        await handler.onSkipFileSelection([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Failed to handle skip file selection: Unexpected error', unexpectedError);
        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'Failed to show image upload step. Please try again.',
          flags: [MessageFlags.Ephemeral]
        });
      });
    });

    describe('Different Repository Configurations', () => {
      beforeEach(() => {
        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        createImageUploadPrompt.mockReturnValue({
          embed: mockEmbedBuilder,
          components: []
        });
      });

      it('should handle repository with different names', async () => {
        const repository = createMockRepository('facebook/react');
        const validSession = {
          userId: 'user123',
          repository
        } as any;

        mockSessionService.getSession.mockReturnValue(validSession);

        const interaction = createMockInteraction() as any;
        interaction.update.mockResolvedValue(undefined);

        await handler.onSkipFileSelection([interaction]);

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        expect(createImageUploadPrompt).toHaveBeenCalledWith('react');
        expect(handler['logger'].log).toHaveBeenCalledWith('Image upload prompt displayed for facebook/react');
      });

      it('should handle repository with complex names', async () => {
        const repository = createMockRepository('microsoft/typescript-eslint-parser');
        const validSession = {
          userId: 'user123',
          repository
        } as any;

        mockSessionService.getSession.mockReturnValue(validSession);

        const interaction = createMockInteraction() as any;
        interaction.update.mockResolvedValue(undefined);

        await handler.onSkipFileSelection([interaction]);

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        expect(createImageUploadPrompt).toHaveBeenCalledWith('typescript-eslint-parser');
        expect(handler['logger'].log).toHaveBeenCalledWith('Image upload prompt displayed for microsoft/typescript-eslint-parser');
      });
    });

    describe('User Information Variations', () => {
      const repository = createMockRepository('owner/repo');
      const validSession = {
        userId: 'user123',
        repository
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
        
        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        createImageUploadPrompt.mockReturnValue({
          embed: mockEmbedBuilder,
          components: []
        });
      });

      it('should handle different user IDs correctly', async () => {
        const interaction = createMockInteraction({
          userId: 'user789',
          userTag: 'newuser#9999'
        }) as any;

        const userSession = {
          userId: 'user789',
          repository
        } as any;

        mockSessionService.getSession.mockReturnValue(userSession);
        interaction.update.mockResolvedValue(undefined);

        await handler.onSkipFileSelection([interaction]);

        expect(mockSessionService.getSession).toHaveBeenCalledWith('user789');
        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user789', expect.any(Object));
        expect(handler['logger'].log).toHaveBeenCalledWith('User newuser#9999 (user789) skipped file selection');
      });

      it('should handle user without discriminator', async () => {
        const interaction = createMockInteraction({
          userId: 'user456',
          userTag: 'simpleuser'
        }) as any;

        const userSession = {
          userId: 'user456',
          repository
        } as any;

        mockSessionService.getSession.mockReturnValue(userSession);
        interaction.update.mockResolvedValue(undefined);

        await handler.onSkipFileSelection([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith('User simpleuser (user456) skipped file selection');
      });
    });

    describe('File Path Clearing Behavior', () => {
      it('should clear previously selected file paths when skipping', async () => {
        const repository = createMockRepository('owner/repo');
        const sessionWithPaths = {
          userId: 'user123',
          repository,
          selectedFilePaths: [
            'src/components/Button.tsx',
            'tests/__tests__/utils.test.ts',
            'docs/api/endpoints.md'
          ]
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithPaths);

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        createImageUploadPrompt.mockReturnValue({
          embed: mockEmbedBuilder,
          components: []
        });

        const interaction = createMockInteraction() as any;
        interaction.update.mockResolvedValue(undefined);

        await handler.onSkipFileSelection([interaction]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          selectedFilePaths: [], // Should be cleared to empty array
          action: 'claude_image_selection'
        });
      });

      it('should handle session that already has empty file paths', async () => {
        const repository = createMockRepository('owner/repo');
        const sessionWithEmptyPaths = {
          userId: 'user123',
          repository,
          selectedFilePaths: []
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithEmptyPaths);

        const { createImageUploadPrompt } = require('@/utils/discord.utils');
        createImageUploadPrompt.mockReturnValue({
          embed: mockEmbedBuilder,
          components: []
        });

        const interaction = createMockInteraction() as any;
        interaction.update.mockResolvedValue(undefined);

        await handler.onSkipFileSelection([interaction]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          selectedFilePaths: [], // Should remain empty array
          action: 'claude_image_selection'
        });
      });
    });
  });

  describe('createPromptModal', () => {
    const repositoryName = 'test-repo';

    it('should create modal with correct configuration', () => {
      const modal = handler['createPromptModal'](repositoryName);

      expect(ModalBuilder).toHaveBeenCalled();
      expect(mockModalBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_PROMPT_MODAL);
      expect(mockModalBuilder.setTitle).toHaveBeenCalledWith('🤖 Analyze test-repo');
      expect(mockModalBuilder.addComponents).toHaveBeenCalled();
    });

    it('should create prompt input with correct configuration', () => {
      handler['createPromptModal'](repositoryName);

      expect(TextInputBuilder).toHaveBeenCalled();
      expect(mockTextInputBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_PROMPT_INPUT);
      expect(mockTextInputBuilder.setLabel).toHaveBeenCalledWith('Analysis Prompt');
      expect(mockTextInputBuilder.setStyle).toHaveBeenCalledWith(TextInputStyle.Paragraph);
      expect(mockTextInputBuilder.setPlaceholder).toHaveBeenCalledWith('Describe what you want Claude to analyze or do...');
      expect(mockTextInputBuilder.setRequired).toHaveBeenCalledWith(true);
      expect(mockTextInputBuilder.setMinLength).toHaveBeenCalledWith(10);
      expect(mockTextInputBuilder.setMaxLength).toHaveBeenCalledWith(2000);
    });

    it('should create branch input with default value', () => {
      handler['createPromptModal'](repositoryName);

      expect(mockTextInputBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_BRANCH_INPUT);
      expect(mockTextInputBuilder.setLabel).toHaveBeenCalledWith('Target Branch (optional)');
      expect(mockTextInputBuilder.setStyle).toHaveBeenCalledWith(TextInputStyle.Short);
      expect(mockTextInputBuilder.setPlaceholder).toHaveBeenCalledWith('main');
      expect(mockTextInputBuilder.setRequired).toHaveBeenCalledWith(false);
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('main');
      expect(mockTextInputBuilder.setMaxLength).toHaveBeenCalledWith(100);
    });

    it('should create file context input without pre-filled value', () => {
      handler['createPromptModal'](repositoryName);

      expect(mockTextInputBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_FILE_CONTEXT_INPUT);
      expect(mockTextInputBuilder.setLabel).toHaveBeenCalledWith('File Context (optional)');
      expect(mockTextInputBuilder.setStyle).toHaveBeenCalledWith(TextInputStyle.Paragraph);
      expect(mockTextInputBuilder.setPlaceholder).toHaveBeenCalledWith('src/services/, README.md (comma-separated paths)');
      expect(mockTextInputBuilder.setRequired).toHaveBeenCalledWith(false);
      expect(mockTextInputBuilder.setMaxLength).toHaveBeenCalledWith(2000);
      // setValue should only be called once for branch input ('main'), not for file context
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledTimes(1);
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('main');
    });

    it('should create action rows for all components', () => {
      handler['createPromptModal'](repositoryName);

      expect(ActionRowBuilder).toHaveBeenCalledTimes(3); // prompt, branch, file context
      expect(mockActionRowBuilder.addComponents).toHaveBeenCalledTimes(3);
    });

    it('should handle different repository names', () => {
      handler['createPromptModal']('my-awesome-project');

      expect(mockModalBuilder.setTitle).toHaveBeenCalledWith('🤖 Analyze my-awesome-project');
    });

    it('should not include image URLs input field', () => {
      handler['createPromptModal'](repositoryName);

      // Should not set custom ID for image URLs input
      expect(mockTextInputBuilder.setCustomId).not.toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_IMAGE_URLS_INPUT);
      
      // Should only create 3 action rows (prompt, branch, file context) - no image URLs row
      expect(ActionRowBuilder).toHaveBeenCalledTimes(3);
    });
  });
});