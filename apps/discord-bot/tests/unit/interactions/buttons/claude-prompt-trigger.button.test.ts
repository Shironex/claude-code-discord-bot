import { ClaudePromptTriggerButtonHandler } from '@/interactions/buttons/claude-prompt-trigger.button';
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

// Mock FileTreeUtils
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
  customId: options.customId || CUSTOM_IDS.CLAUDE_PROMPT_MODAL + '_trigger',
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

describe('ClaudePromptTriggerButtonHandler', () => {
  let handler: ClaudePromptTriggerButtonHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    
    handler = new ClaudePromptTriggerButtonHandler(mockSessionService);

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

    // Reset FileTreeUtils mock
    const { FileTreeUtils } = require('@/utils/file-tree.utils');
    FileTreeUtils.formatFilePathsString.mockImplementation((paths: string[]) => paths.join(', '));
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

  describe('onClaudePromptTrigger', () => {
    describe('Session Validation', () => {
      it('should reply with session expired when no session exists', async () => {
        const interaction = createMockInteraction() as any;
        mockSessionService.getSession.mockReturnValue(null);

        await handler.onClaudePromptTrigger([interaction]);

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

        await handler.onClaudePromptTrigger([interaction]);

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

        await handler.onClaudePromptTrigger([interaction]);

        expect(interaction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
        expect(interaction.showModal).not.toHaveBeenCalled();
      });
    });

    describe('Successful Prompt Trigger Flow', () => {
      const repository = createMockRepository('owner/test-repo');
      const validSession = {
        userId: 'user123',
        repository,
        selectedFilePaths: ['src/app.ts', 'README.md']
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should log user action with selected paths count', async () => {
        const interaction = createMockInteraction({
          userId: 'user456',
          userTag: 'developer#1234'
        }) as any;

        interaction.showModal.mockResolvedValue(undefined);

        await handler.onClaudePromptTrigger([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith('User developer#1234 (user456) triggered prompt modal with 2 selected paths');
      });

      it('should create and show modal', async () => {
        const interaction = createMockInteraction() as any;
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onClaudePromptTrigger([interaction]);

        expect(interaction.showModal).toHaveBeenCalledWith(mockModalBuilder);
      });

      it('should log successful modal display with paths count', async () => {
        const interaction = createMockInteraction() as any;
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onClaudePromptTrigger([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith('Prompt modal displayed with 2 pre-selected file paths');
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

        await handler.onClaudePromptTrigger([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith('User testuser#1234 (user123) triggered prompt modal with 0 selected paths');
        expect(handler['logger'].log).toHaveBeenCalledWith('Prompt modal displayed with 0 pre-selected file paths');
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

        await handler.onClaudePromptTrigger([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith('User testuser#1234 (user123) triggered prompt modal with 0 selected paths');
        expect(handler['logger'].log).toHaveBeenCalledWith('Prompt modal displayed with 0 pre-selected file paths');
      });

      it('should handle session with empty selected file paths array', async () => {
        const sessionWithEmptyPaths = {
          userId: 'user123',
          repository,
          selectedFilePaths: []
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithEmptyPaths);

        const interaction = createMockInteraction() as any;
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onClaudePromptTrigger([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith('User testuser#1234 (user123) triggered prompt modal with 0 selected paths');
        expect(handler['logger'].log).toHaveBeenCalledWith('Prompt modal displayed with 0 pre-selected file paths');
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

        await handler.onClaudePromptTrigger([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Failed to handle claude prompt trigger: Modal creation failed', modalError);
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

        await handler.onClaudePromptTrigger([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Failed to handle claude prompt trigger: showModal failed', showModalError);
        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'Failed to open prompt modal. Please try again.',
          flags: [MessageFlags.Ephemeral]
        });
      });

      it('should handle FileTreeUtils formatting errors', async () => {
        const interaction = createMockInteraction() as any;
        const formatError = new Error('File path formatting failed');

        const sessionWithPaths = {
          userId: 'user123',
          repository,
          selectedFilePaths: ['src/app.ts', 'README.md']
        } as any;

        mockSessionService.getSession.mockReturnValue(sessionWithPaths);

        const { FileTreeUtils } = require('@/utils/file-tree.utils');
        FileTreeUtils.formatFilePathsString.mockImplementation(() => {
          throw formatError;
        });

        await handler.onClaudePromptTrigger([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Failed to handle claude prompt trigger: File path formatting failed', formatError);
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

        await handler.onClaudePromptTrigger([interaction]);

        expect(handler['logger'].error).toHaveBeenCalledWith('Failed to handle claude prompt trigger: Unexpected error', unexpectedError);
        expect(interaction.reply).toHaveBeenCalledWith({
          content: 'Failed to open prompt modal. Please try again.',
          flags: [MessageFlags.Ephemeral]
        });
      });
    });

    describe('Different Repository Configurations', () => {
      it('should handle repository with different names', async () => {
        const repository = createMockRepository('facebook/react');
        const validSession = {
          userId: 'user123',
          repository
        } as any;

        mockSessionService.getSession.mockReturnValue(validSession);

        const interaction = createMockInteraction() as any;
        interaction.showModal.mockResolvedValue(undefined);

        await handler.onClaudePromptTrigger([interaction]);

        expect(mockModalBuilder.setTitle).toHaveBeenCalledWith('🤖 Analyze react');
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

        await handler.onClaudePromptTrigger([interaction]);

        expect(mockModalBuilder.setTitle).toHaveBeenCalledWith('🤖 Analyze typescript-eslint-parser');
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

        await handler.onClaudePromptTrigger([interaction]);

        expect(mockSessionService.getSession).toHaveBeenCalledWith('user789');
        expect(handler['logger'].log).toHaveBeenCalledWith('User newuser#9999 (user789) triggered prompt modal with 0 selected paths');
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

        await handler.onClaudePromptTrigger([interaction]);

        expect(handler['logger'].log).toHaveBeenCalledWith('User simpleuser (user456) triggered prompt modal with 0 selected paths');
      });
    });
  });

  describe('createPromptModal', () => {
    const repositoryName = 'test-repo';

    it('should create modal with correct configuration', () => {
      const selectedPaths = ['src/app.ts', 'README.md'];
      const modal = handler['createPromptModal'](repositoryName, selectedPaths);

      expect(ModalBuilder).toHaveBeenCalled();
      expect(mockModalBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_PROMPT_MODAL);
      expect(mockModalBuilder.setTitle).toHaveBeenCalledWith('🤖 Analyze test-repo');
      expect(mockModalBuilder.addComponents).toHaveBeenCalled();
    });

    it('should create prompt input with correct configuration', () => {
      handler['createPromptModal'](repositoryName, []);

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
      handler['createPromptModal'](repositoryName, []);

      expect(mockTextInputBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_BRANCH_INPUT);
      expect(mockTextInputBuilder.setLabel).toHaveBeenCalledWith('Target Branch (optional)');
      expect(mockTextInputBuilder.setStyle).toHaveBeenCalledWith(TextInputStyle.Short);
      expect(mockTextInputBuilder.setPlaceholder).toHaveBeenCalledWith('main');
      expect(mockTextInputBuilder.setRequired).toHaveBeenCalledWith(false);
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('main');
      expect(mockTextInputBuilder.setMaxLength).toHaveBeenCalledWith(100);
    });

    it('should create file context input with appropriate label', () => {
      handler['createPromptModal'](repositoryName, []);

      expect(mockTextInputBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_FILE_CONTEXT_INPUT);
      expect(mockTextInputBuilder.setLabel).toHaveBeenCalledWith('File Context (optional - edit as needed)');
      expect(mockTextInputBuilder.setStyle).toHaveBeenCalledWith(TextInputStyle.Paragraph);
      expect(mockTextInputBuilder.setPlaceholder).toHaveBeenCalledWith('src/services/, README.md (comma-separated paths)');
      expect(mockTextInputBuilder.setRequired).toHaveBeenCalledWith(false);
      expect(mockTextInputBuilder.setMaxLength).toHaveBeenCalledWith(2000);
    });

    it('should pre-fill file context input with selected paths when provided', () => {
      const selectedPaths = ['src/app.ts', 'README.md'];
      const { FileTreeUtils } = require('@/utils/file-tree.utils');
      FileTreeUtils.formatFilePathsString.mockReturnValue('src/app.ts, README.md');

      handler['createPromptModal'](repositoryName, selectedPaths);

      expect(FileTreeUtils.formatFilePathsString).toHaveBeenCalledWith(selectedPaths);
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('src/app.ts, README.md');
    });

    it('should not pre-fill file context input when no paths selected', () => {
      handler['createPromptModal'](repositoryName, []);

      const { FileTreeUtils } = require('@/utils/file-tree.utils');
      expect(FileTreeUtils.formatFilePathsString).not.toHaveBeenCalled();
      // setValue should only be called once for branch input ('main')
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledTimes(1);
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('main');
    });

    it('should not pre-fill file context input when paths are null', () => {
      handler['createPromptModal'](repositoryName, null as any);

      const { FileTreeUtils } = require('@/utils/file-tree.utils');
      expect(FileTreeUtils.formatFilePathsString).not.toHaveBeenCalled();
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledTimes(1);
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('main');
    });

    it('should create action rows for all components', () => {
      handler['createPromptModal'](repositoryName, []);

      expect(ActionRowBuilder).toHaveBeenCalledTimes(3); // prompt, branch, file context
      expect(mockActionRowBuilder.addComponents).toHaveBeenCalledTimes(3);
    });

    it('should handle different repository names', () => {
      handler['createPromptModal']('my-awesome-project', []);

      expect(mockModalBuilder.setTitle).toHaveBeenCalledWith('🤖 Analyze my-awesome-project');
    });

    it('should handle complex file path arrays with formatting', () => {
      const complexPaths = [
        'src/components/Button.tsx',
        'tests/__tests__/utils.test.ts',
        'docs/api/endpoints.md',
        'config/webpack.config.js'
      ];

      const { FileTreeUtils } = require('@/utils/file-tree.utils');
      const formattedPaths = 'src/components/Button.tsx, tests/__tests__/utils.test.ts, docs/api/endpoints.md, config/webpack.config.js';
      FileTreeUtils.formatFilePathsString.mockReturnValue(formattedPaths);

      handler['createPromptModal'](repositoryName, complexPaths);

      expect(FileTreeUtils.formatFilePathsString).toHaveBeenCalledWith(complexPaths);
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith(formattedPaths);
    });

    it('should handle single selected file path', () => {
      const singlePath = ['src/main.ts'];
      const { FileTreeUtils } = require('@/utils/file-tree.utils');
      FileTreeUtils.formatFilePathsString.mockReturnValue('src/main.ts');

      handler['createPromptModal'](repositoryName, singlePath);

      expect(FileTreeUtils.formatFilePathsString).toHaveBeenCalledWith(singlePath);
      expect(mockTextInputBuilder.setValue).toHaveBeenCalledWith('src/main.ts');
    });

    it('should not include image URLs input field', () => {
      handler['createPromptModal'](repositoryName, []);

      // Should not set custom ID for image URLs input
      expect(mockTextInputBuilder.setCustomId).not.toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_IMAGE_URLS_INPUT);
      
      // Should only create 3 action rows (prompt, branch, file context) - no image URLs row
      expect(ActionRowBuilder).toHaveBeenCalledTimes(3);
    });
  });
});