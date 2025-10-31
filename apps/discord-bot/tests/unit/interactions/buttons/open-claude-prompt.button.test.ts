import { OpenClaudePromptButtonHandler } from '@/interactions/buttons/open-claude-prompt.button';
import { SessionService } from '@/services/session.service';
import { CUSTOM_IDS } from '@/utils/discord.constants';
import { Repository } from '@/interfaces/models/repository.interface';
import { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } from 'discord.js';
import { LoggerFactory } from '@claude-code/shared';

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
  TextInputStyle: {
    Short: 1,
    Paragraph: 2
  }
}));

// Mock LoggerFactory
const mockLoggerFactory = {
  createLogger: jest.fn().mockReturnValue({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn()
  })
} as unknown as jest.Mocked<LoggerFactory>;

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
  customId: options.customId || CUSTOM_IDS.OPEN_CLAUDE_PROMPT,
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

describe('OpenClaudePromptButtonHandler', () => {
  let handler: OpenClaudePromptButtonHandler;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn()
    };
    
    mockLoggerFactory.createLogger.mockReturnValue(mockLogger);
    
    handler = new OpenClaudePromptButtonHandler(
      mockLoggerFactory,
      mockSessionService
    );

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
      expect(mockLoggerFactory.createLogger).toHaveBeenCalledWith('OpenClaudePromptButtonHandler');
    });

    it('should extend BaseService', () => {
      expect(handler).toBeDefined();
      expect(typeof handler['logger']).toBe('object');
    });
  });

  describe('onOpenClaudePrompt', () => {
    describe('Session Validation', () => {
      it('should reply with session expired when no session exists', async () => {
        const interaction = createMockInteraction() as any;
        mockSessionService.getSession.mockReturnValue(null);

        await handler.onOpenClaudePrompt([interaction]);

        expect(mockSessionService.getSession).toHaveBeenCalledWith('user123');
        expect(mockLogger.warn).toHaveBeenCalledWith('No valid session found for user user123', 'onOpenClaudePrompt');
        expect(interaction.reply).toHaveBeenCalledWith({
          content: '❌ Session expired. Please use `/claude` command to start over.',
          ephemeral: true
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

        await handler.onOpenClaudePrompt([interaction]);

        expect(mockLogger.warn).toHaveBeenCalledWith('No valid session found for user user123', 'onOpenClaudePrompt');
        expect(interaction.reply).toHaveBeenCalledWith({
          content: '❌ Session expired. Please use `/claude` command to start over.',
          ephemeral: true
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

        await handler.onOpenClaudePrompt([interaction]);

        expect(interaction.reply).toHaveBeenCalledWith({
          content: '❌ Session expired. Please use `/claude` command to start over.',
          ephemeral: true
        });
        expect(interaction.showModal).not.toHaveBeenCalled();
      });
    });

    describe('Successful Modal Display', () => {
      const repository = createMockRepository('owner/test-repo');
      const validSession = {
        userId: 'user123',
        repository,
        selectedFilePaths: ['src/app.ts', 'README.md'],
        uploadedImages: [
          { id: 'img1', url: 'https://example.com/img1.png', originalName: 'image1.png', size: 1024, expires: '2024-01-01' },
          { id: 'img2', url: 'https://example.com/img2.jpg', originalName: 'image2.jpg', size: 2048, expires: '2024-01-01' }
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

        await handler.onOpenClaudePrompt([interaction]);

        expect(mockLogger.log).toHaveBeenCalledWith(
          'User developer#1234 (user456) opening Claude prompt with uploaded images',
          'onOpenClaudePrompt'
        );
      });

      it('should create modal with uploaded image URLs', async () => {
        const interaction = createMockInteraction() as any;
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onOpenClaudePrompt([interaction]);

        expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('https://example.com/img1.png, https://example.com/img2.jpg');
        expect(interaction.showModal).toHaveBeenCalledWith(mockModalBuilder);
      });

      it('should update session with correct action and state', async () => {
        const interaction = createMockInteraction() as any;
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onOpenClaudePrompt([interaction]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          action: 'claude_prompt_input',
          awaitingImages: false
        });
      });

      it('should log successful modal opening with image count', async () => {
        const interaction = createMockInteraction({
          userTag: 'developer#5678'
        }) as any;
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onOpenClaudePrompt([interaction]);

        expect(mockLogger.log).toHaveBeenCalledWith(
          'Opened Claude prompt modal for user developer#5678 with 2 images',
          'onOpenClaudePrompt'
        );
      });

      it('should handle session with no uploaded images', async () => {
        const sessionWithoutImages = {
          userId: 'user123',
          repository,
          selectedFilePaths: ['src/app.ts'],
          uploadedImages: null
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithoutImages);

        const interaction = createMockInteraction() as any;
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onOpenClaudePrompt([interaction]);

        expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('');
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('with 0 images'),
          'onOpenClaudePrompt'
        );
      });

      it('should handle session with empty uploaded images array', async () => {
        const sessionWithEmptyImages = {
          userId: 'user123',
          repository,
          uploadedImages: []
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithEmptyImages);

        const interaction = createMockInteraction() as any;
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onOpenClaudePrompt([interaction]);

        expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('');
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('with 0 images'),
          'onOpenClaudePrompt'
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

      it('should handle modal creation errors', async () => {
        const interaction = createMockInteraction() as any;
        const modalError = new Error('Modal creation failed');

        mockModalBuilder.setCustomId.mockImplementation(() => {
          throw modalError;
        });

        await handler.onOpenClaudePrompt([interaction]);

        expect(mockLogger.error).toHaveBeenCalledWith('Error opening Claude prompt modal: Modal creation failed', modalError, 'onOpenClaudePrompt');
        expect(interaction.reply).toHaveBeenCalledWith({
          content: '❌ Error opening prompt modal. Please try again or use `/claude` command.',
          ephemeral: true
        });
        expect(interaction.showModal).not.toHaveBeenCalled();
      });

      it('should handle showModal interaction errors', async () => {
        const interaction = createMockInteraction() as any;
        const showModalError = new Error('showModal failed');

        interaction.showModal.mockRejectedValue(showModalError);

        await handler.onOpenClaudePrompt([interaction]);

        expect(mockLogger.error).toHaveBeenCalledWith('Error opening Claude prompt modal: showModal failed', showModalError, 'onOpenClaudePrompt');
        expect(interaction.reply).toHaveBeenCalledWith({
          content: '❌ Error opening prompt modal. Please try again or use `/claude` command.',
          ephemeral: true
        });
      });

      it('should handle session service update errors', async () => {
        const interaction = createMockInteraction() as any;
        const updateError = new Error('Session update failed');

        interaction.showModal.mockResolvedValue(undefined);
        mockSessionService.updateSession.mockImplementation(() => {
          throw updateError;
        });

        await handler.onOpenClaudePrompt([interaction]);

        expect(mockLogger.error).toHaveBeenCalledWith('Error opening Claude prompt modal: Session update failed', updateError, 'onOpenClaudePrompt');
        expect(interaction.reply).toHaveBeenCalledWith({
          content: '❌ Error opening prompt modal. Please try again or use `/claude` command.',
          ephemeral: true
        });
      });

      it('should handle general unexpected errors', async () => {
        const interaction = createMockInteraction() as any;
        const unexpectedError = new Error('Unexpected error');

        // Mock uploadedImages map to throw an error during processing
        const sessionWithBadImages = {
          userId: 'user123',
          repository,
          uploadedImages: {
            map: jest.fn().mockImplementation(() => {
              throw unexpectedError;
            })
          }
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithBadImages);

        await handler.onOpenClaudePrompt([interaction]);

        expect(mockLogger.error).toHaveBeenCalledWith('Error opening Claude prompt modal: Unexpected error', unexpectedError, 'onOpenClaudePrompt');
        expect(interaction.reply).toHaveBeenCalledWith({
          content: '❌ Error opening prompt modal. Please try again or use `/claude` command.',
          ephemeral: true
        });
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

        await handler.onOpenClaudePrompt([interaction]);

        expect(mockSessionService.getSession).toHaveBeenCalledWith('user789');
        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user789', expect.any(Object));
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('newuser#9999 (user789)'),
          'onOpenClaudePrompt'
        );
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

        await handler.onOpenClaudePrompt([interaction]);

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('simpleuser (user456)'),
          'onOpenClaudePrompt'
        );
      });
    });
  });

  describe('createPromptModalWithImages', () => {
    const repositoryName = 'test-repo';
    const selectedFilePaths = ['src/app.ts', 'README.md'];
    const imageUrls = 'https://example.com/img1.png, https://example.com/img2.jpg';

    it('should create modal with correct configuration', () => {
      const modal = handler['createPromptModalWithImages'](repositoryName, selectedFilePaths, imageUrls);

      expect(ModalBuilder).toHaveBeenCalled();
      expect(mockModalBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_PROMPT_MODAL);
      expect(mockModalBuilder.setTitle).toHaveBeenCalledWith('🤖 Analyze test-repo');
      expect(mockModalBuilder.addComponents).toHaveBeenCalled();
    });

    it('should create prompt input with correct configuration', () => {
      handler['createPromptModalWithImages'](repositoryName, selectedFilePaths, imageUrls);

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
      handler['createPromptModalWithImages'](repositoryName, selectedFilePaths, imageUrls);

      expect(mockTextInputBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_BRANCH_INPUT);
      expect(mockTextInputBuilder.setLabel).toHaveBeenCalledWith('Target Branch (optional)');
      expect(mockTextInputBuilder.setStyle).toHaveBeenCalledWith(TextInputStyle.Short);
      expect(mockTextInputBuilder.setPlaceholder).toHaveBeenCalledWith('main');
      expect(mockTextInputBuilder.setRequired).toHaveBeenCalledWith(false);
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('main');
      expect(mockTextInputBuilder.setMaxLength).toHaveBeenCalledWith(100);
    });

    it('should create file context input with pre-filled selected paths', () => {
      handler['createPromptModalWithImages'](repositoryName, selectedFilePaths, imageUrls);

      expect(mockTextInputBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_FILE_CONTEXT_INPUT);
      expect(mockTextInputBuilder.setLabel).toHaveBeenCalledWith('File Context (optional)');
      expect(mockTextInputBuilder.setStyle).toHaveBeenCalledWith(TextInputStyle.Paragraph);
      expect(mockTextInputBuilder.setPlaceholder).toHaveBeenCalledWith('src/services/, README.md (comma-separated paths)');
      expect(mockTextInputBuilder.setRequired).toHaveBeenCalledWith(false);
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('src/app.ts, README.md');
      expect(mockTextInputBuilder.setMaxLength).toHaveBeenCalledWith(2000);
    });

    it('should create image URLs input with pre-filled URLs', () => {
      handler['createPromptModalWithImages'](repositoryName, selectedFilePaths, imageUrls);

      expect(mockTextInputBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_IMAGE_URLS_INPUT);
      expect(mockTextInputBuilder.setLabel).toHaveBeenCalledWith('Image URLs (pre-filled from uploads)');
      expect(mockTextInputBuilder.setStyle).toHaveBeenCalledWith(TextInputStyle.Paragraph);
      expect(mockTextInputBuilder.setPlaceholder).toHaveBeenCalledWith('https://example.com/image1.png, https://example.com/image2.jpg');
      expect(mockTextInputBuilder.setRequired).toHaveBeenCalledWith(false);
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith(imageUrls);
      expect(mockTextInputBuilder.setMaxLength).toHaveBeenCalledWith(2000);
    });

    it('should not set file context value when no selected paths', () => {
      handler['createPromptModalWithImages'](repositoryName, [], imageUrls);

      // setValue should be called for branch and imageUrls, but not for file context
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('main'); // branch
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith(imageUrls); // image URLs
      expect(mockTextInputBuilder.setValue).not.toHaveBeenCalledWith(''); // file context shouldn't be set
    });

    it('should create action rows for all components', () => {
      handler['createPromptModalWithImages'](repositoryName, selectedFilePaths, imageUrls);

      expect(ActionRowBuilder).toHaveBeenCalledTimes(4);
      expect(mockActionRowBuilder.addComponents).toHaveBeenCalledTimes(4);
    });

    it('should handle empty image URLs', () => {
      handler['createPromptModalWithImages'](repositoryName, selectedFilePaths, '');

      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('');
    });

    it('should handle different repository names', () => {
      handler['createPromptModalWithImages']('my-awesome-project', selectedFilePaths, imageUrls);

      expect(mockModalBuilder.setTitle).toHaveBeenCalledWith('🤖 Analyze my-awesome-project');
    });

    it('should handle complex file path arrays', () => {
      const complexPaths = [
        'src/components/Button.tsx',
        'tests/__tests__/utils.test.ts',
        'docs/api/endpoints.md',
        'config/webpack.config.js'
      ];

      handler['createPromptModalWithImages'](repositoryName, complexPaths, imageUrls);

      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith(
        'src/components/Button.tsx, tests/__tests__/utils.test.ts, docs/api/endpoints.md, config/webpack.config.js'
      );
    });

    it('should handle single selected file path', () => {
      handler['createPromptModalWithImages'](repositoryName, ['src/main.ts'], imageUrls);

      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('src/main.ts');
    });
  });
});