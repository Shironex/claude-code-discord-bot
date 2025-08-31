import { SkipImagesButtonHandler } from '@/interactions/buttons/skip-images.button';
import { SessionService } from '@/services/session.service';
import { CUSTOM_IDS } from '@/utils/discord.constants';
import { MESSAGES } from '@/utils/messages.constants';
import { Repository } from '@/interfaces/models/repository.interface';
import { MessageFlags, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } from 'discord.js';

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
  customId: options.customId || CUSTOM_IDS.SKIP_IMAGES,
  reply: jest.fn(),
  showModal: jest.fn()
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

describe('SkipImagesButtonHandler', () => {
  let handler: SkipImagesButtonHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    
    handler = new SkipImagesButtonHandler(mockSessionService);

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

  describe('onSkipImages', () => {
    describe('Session Validation', () => {
      it('should reply with session expired when no session exists', async () => {
        const interaction = createMockInteraction() as any;
        mockSessionService.getSession.mockReturnValue(null);

        await handler.onSkipImages([interaction]);

        expect(mockSessionService.getSession).toHaveBeenCalledWith('user123');
        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
        expect(interaction.showModal).not.toHaveBeenCalled();
      });

      it('should reply with session expired when session has no repository', async () => {
        const interaction = createMockInteraction() as any;
        const sessionWithoutRepo = {
          userId: 'user123',
          repository: null
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithoutRepo);

        await handler.onSkipImages([interaction]);

        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
        expect(interaction.showModal).not.toHaveBeenCalled();
      });

      it('should reply with session expired when session has undefined repository', async () => {
        const interaction = createMockInteraction() as any;
        const sessionWithUndefinedRepo = {
          userId: 'user123'
          // repository is undefined
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithUndefinedRepo);

        await handler.onSkipImages([interaction]);

        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
        expect(interaction.showModal).not.toHaveBeenCalled();
      });
    });

    describe('Successful Skip Images Flow', () => {
      const repository = createMockRepository('owner/test-repo');
      const validSession = {
        userId: 'user123',
        repository,
        selectedFilePaths: ['src/app.ts', 'README.md'],
        uploadedImages: [
          { id: 'img1', url: 'https://example.com/img1.png' }
        ]
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should log user action', async () => {
        const interaction = createMockInteraction({
          userId: 'user456',
          userTag: 'developer#1234'
        }) as any;
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onSkipImages([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith('User developer#1234 (user456) skipped image upload');
      });

      it('should update session with correct action and state', async () => {
        const interaction = createMockInteraction() as any;
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onSkipImages([interaction]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          action: 'claude_prompt_input',
          uploadedImages: [],
          awaitingImages: false
        });
      });

      it('should create and show modal', async () => {
        const interaction = createMockInteraction() as any;
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onSkipImages([interaction]);

        expect(interaction.showModal).toHaveBeenCalledWith(mockModalBuilder);
      });

      it('should log successful modal display', async () => {
        const interaction = createMockInteraction() as any;
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onSkipImages([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith('Prompt modal displayed (no images) for owner/test-repo');
      });

      it('should handle session with no selected file paths', async () => {
        const sessionWithoutPaths = {
          userId: 'user123',
          repository,
          selectedFilePaths: null
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithoutPaths);

        const interaction = createMockInteraction() as any;
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onSkipImages([interaction]);

        expect(interaction.showModal).toHaveBeenCalledWith(mockModalBuilder);
        expect(handler['logger'].log).toHaveBeenCalledWith('Prompt modal displayed (no images) for owner/test-repo');
      });

      it('should handle session with undefined selected file paths', async () => {
        const sessionWithUndefinedPaths = {
          userId: 'user123',
          repository
          // selectedFilePaths is undefined
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithUndefinedPaths);

        const interaction = createMockInteraction() as any;
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onSkipImages([interaction]);

        expect(interaction.showModal).toHaveBeenCalledWith(mockModalBuilder);
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

        await handler.onSkipImages([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Failed to handle skip images: Session update failed', updateError);
        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'Failed to open prompt modal. Please try again.',
          flags: [MessageFlags.Ephemeral]
        });
        expect(interaction.showModal).not.toHaveBeenCalled();
      });

      it('should handle modal creation errors', async () => {
        const interaction = createMockInteraction() as any;
        const modalError = new Error('Modal creation failed');

        mockModalBuilder.setCustomId.mockImplementation(() => {
          throw modalError;
        });

        await handler.onSkipImages([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Failed to handle skip images: Modal creation failed', modalError);
        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'Failed to open prompt modal. Please try again.',
          flags: [MessageFlags.Ephemeral]
        });
        expect(interaction.showModal).not.toHaveBeenCalled();
      });

      it('should handle showModal interaction errors', async () => {
        const interaction = createMockInteraction() as any;
        const showModalError = new Error('showModal failed');

        interaction.showModal.mockRejectedValue(showModalError);

        await handler.onSkipImages([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Failed to handle skip images: showModal failed', showModalError);
        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'Failed to open prompt modal. Please try again.',
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

        await handler.onSkipImages([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Failed to handle skip images: Unexpected error', unexpectedError);
        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'Failed to open prompt modal. Please try again.',
          flags: [MessageFlags.Ephemeral]
        });
      });
    });

    describe('Different Repository Configurations', () => {
      beforeEach(() => {
        // Reset all mock builder methods
        Object.values(mockModalBuilder).forEach(mock => {
          if (typeof mock === 'function') {
            mock.mockReturnThis();
          }
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
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onSkipImages([interaction]);

        expect(mockModalBuilder.setTitle).toHaveBeenCalledWith('🤖 Analyze react');
        expect(handler['logger'].log).toHaveBeenCalledWith('Prompt modal displayed (no images) for facebook/react');
      });

      it('should handle repository with complex names', async () => {
        const repository = createMockRepository('microsoft/typescript-eslint-parser');
        const validSession = {
          userId: 'user123',
          repository
        } as any;

        mockSessionService.getSession.mockReturnValue(validSession);

        const interaction = createMockInteraction() as any;
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onSkipImages([interaction]);

        expect(mockModalBuilder.setTitle).toHaveBeenCalledWith('🤖 Analyze typescript-eslint-parser');
        expect(handler['logger'].log).toHaveBeenCalledWith('Prompt modal displayed (no images) for microsoft/typescript-eslint-parser');
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
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onSkipImages([interaction]);

        expect(mockSessionService.getSession).toHaveBeenCalledWith('user789');
        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user789', expect.any(Object));
        expect(handler['logger'].log).toHaveBeenCalledWith('User newuser#9999 (user789) skipped image upload');
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
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onSkipImages([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith('User simpleuser (user456) skipped image upload');
      });
    });

    describe('State Clearing Behavior', () => {
      it('should clear uploaded images and awaiting images state', async () => {
        const repository = createMockRepository('owner/repo');
        const sessionWithImages = {
          userId: 'user123',
          repository,
          uploadedImages: [
            { id: 'img1', url: 'https://example.com/img1.png' },
            { id: 'img2', url: 'https://example.com/img2.png' }
          ],
          awaitingImages: true
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithImages);

        const interaction = createMockInteraction() as any;
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onSkipImages([interaction]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          action: 'claude_prompt_input',
          uploadedImages: [], // Should be cleared
          awaitingImages: false // Should be set to false
        });
      });
    });
  });

  describe('createPromptModal', () => {
    const repositoryName = 'test-repo';
    const selectedFilePaths = ['src/app.ts', 'README.md'];

    it('should create modal with correct configuration', () => {
      const modal = handler['createPromptModal'](repositoryName, selectedFilePaths);

      expect(ModalBuilder).toHaveBeenCalled();
      expect(mockModalBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_PROMPT_MODAL);
      expect(mockModalBuilder.setTitle).toHaveBeenCalledWith('🤖 Analyze test-repo');
      expect(mockModalBuilder.addComponents).toHaveBeenCalled();
    });

    it('should create prompt input with correct configuration', () => {
      handler['createPromptModal'](repositoryName, selectedFilePaths);

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
      handler['createPromptModal'](repositoryName, selectedFilePaths);

      expect(mockTextInputBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_BRANCH_INPUT);
      expect(mockTextInputBuilder.setLabel).toHaveBeenCalledWith('Target Branch (optional)');
      expect(mockTextInputBuilder.setStyle).toHaveBeenCalledWith(TextInputStyle.Short);
      expect(mockTextInputBuilder.setPlaceholder).toHaveBeenCalledWith('main');
      expect(mockTextInputBuilder.setRequired).toHaveBeenCalledWith(false);
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('main');
      expect(mockTextInputBuilder.setMaxLength).toHaveBeenCalledWith(100);
    });

    it('should create file context input with pre-filled selected paths', () => {
      handler['createPromptModal'](repositoryName, selectedFilePaths);

      expect(mockTextInputBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_FILE_CONTEXT_INPUT);
      expect(mockTextInputBuilder.setLabel).toHaveBeenCalledWith('File Context (optional)');
      expect(mockTextInputBuilder.setStyle).toHaveBeenCalledWith(TextInputStyle.Paragraph);
      expect(mockTextInputBuilder.setPlaceholder).toHaveBeenCalledWith('src/services/, README.md (comma-separated paths)');
      expect(mockTextInputBuilder.setRequired).toHaveBeenCalledWith(false);
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('src/app.ts, README.md');
      expect(mockTextInputBuilder.setMaxLength).toHaveBeenCalledWith(2000);
    });

    it('should create image URLs input with empty value', () => {
      handler['createPromptModal'](repositoryName, selectedFilePaths);

      expect(mockTextInputBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_IMAGE_URLS_INPUT);
      expect(mockTextInputBuilder.setLabel).toHaveBeenCalledWith('Image URLs (optional)');
      expect(mockTextInputBuilder.setStyle).toHaveBeenCalledWith(TextInputStyle.Paragraph);
      expect(mockTextInputBuilder.setPlaceholder).toHaveBeenCalledWith('https://example.com/image1.png, https://example.com/image2.jpg');
      expect(mockTextInputBuilder.setRequired).toHaveBeenCalledWith(false);
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith(''); // Should be empty
      expect(mockTextInputBuilder.setMaxLength).toHaveBeenCalledWith(2000);
    });

    it('should not set file context value when no selected paths', () => {
      handler['createPromptModal'](repositoryName, []);

      // setValue should be called for branch ('main') and imageUrls (''), but not for file context
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('main'); // branch
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith(''); // image URLs
      // Should not set file context value when selectedFilePaths is empty
    });

    it('should create action rows for all components', () => {
      handler['createPromptModal'](repositoryName, selectedFilePaths);

      expect(ActionRowBuilder).toHaveBeenCalledTimes(4);
      expect(mockActionRowBuilder.addComponents).toHaveBeenCalledTimes(4);
    });

    it('should handle different repository names', () => {
      handler['createPromptModal']('my-awesome-project', selectedFilePaths);

      expect(mockModalBuilder.setTitle).toHaveBeenCalledWith('🤖 Analyze my-awesome-project');
    });

    it('should handle complex file path arrays', () => {
      const complexPaths = [
        'src/components/Button.tsx',
        'tests/__tests__/utils.test.ts',
        'docs/api/endpoints.md',
        'config/webpack.config.js'
      ];

      handler['createPromptModal'](repositoryName, complexPaths);

      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith(
        'src/components/Button.tsx, tests/__tests__/utils.test.ts, docs/api/endpoints.md, config/webpack.config.js'
      );
    });

    it('should handle single selected file path', () => {
      handler['createPromptModal'](repositoryName, ['src/main.ts']);

      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('src/main.ts');
    });
  });
});