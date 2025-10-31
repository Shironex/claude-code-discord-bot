import { ClaudeCommand } from '@/commands/repository/claude.command';
import { GitHubService } from '@/services/github.service';
import { SessionService } from '@/services/session.service';
import { EmbedService } from '@/services/embed.service';
import { MessageFlags, EmbedBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder } from 'discord.js';
import { CUSTOM_IDS } from '@/utils/discord.constants';

// Mock Discord.js components
const mockInteraction = {
  user: {
    id: 'user123',
    tag: 'testuser#1234'
  },
  reply: jest.fn(),
  showModal: jest.fn()
} as any;

// Mock services
const mockGitHubService = {
  isConfigured: jest.fn()
} as unknown as jest.Mocked<GitHubService>;

const mockSessionService = {
  hasSession: jest.fn(),
  createSession: jest.fn(),
  updateSession: jest.fn()
} as unknown as jest.Mocked<SessionService>;

const mockEmbedService = {
  createGitHubNotConfiguredEmbed: jest.fn()
} as unknown as jest.Mocked<EmbedService>;

// Mock Discord.js builders
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
  setMaxLength: jest.fn().mockReturnThis()
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
    Short: 1
  }
}));

describe('ClaudeCommand', () => {
  let command: ClaudeCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock builder calls
    mockModalBuilder.setCustomId.mockClear();
    mockModalBuilder.setTitle.mockClear();
    mockModalBuilder.addComponents.mockClear();
    mockTextInputBuilder.setCustomId.mockClear();
    mockTextInputBuilder.setLabel.mockClear();
    mockTextInputBuilder.setStyle.mockClear();
    mockTextInputBuilder.setPlaceholder.mockClear();
    mockTextInputBuilder.setRequired.mockClear();
    mockTextInputBuilder.setMaxLength.mockClear();
    mockActionRowBuilder.addComponents.mockClear();
    
    // Reset interaction mock
    mockInteraction.reply.mockClear();
    mockInteraction.showModal.mockClear();
    
    // Reset service mocks to default behavior
    mockGitHubService.isConfigured.mockReturnValue(true);
    mockSessionService.hasSession.mockReturnValue(false);
    mockSessionService.createSession.mockImplementation(() => {});
    mockSessionService.updateSession.mockImplementation(() => {});
    mockInteraction.showModal.mockResolvedValue(undefined);
    
    command = new ClaudeCommand(mockGitHubService, mockSessionService, mockEmbedService);

    // Mock the logger to prevent actual logging
    Object.defineProperty(command, 'logger', {
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
    it('should initialize with correct service name', () => {
      expect(command).toBeDefined();
      expect(command['githubService']).toBe(mockGitHubService);
      expect(command['sessionService']).toBe(mockSessionService);
      expect(command['embedService']).toBe(mockEmbedService);
    });

    it('should extend BaseService', () => {
      expect(command).toBeDefined();
      // Check if it has BaseService properties/methods
      expect(typeof command['logger']).toBe('object');
    });
  });

  describe('onClaudeCommand', () => {
    describe('GitHub Service Not Configured', () => {
      beforeEach(() => {
        mockGitHubService.isConfigured.mockReturnValue(false);
      });

      it('should reply with GitHub not configured embed when service is not configured', async () => {
        const mockEmbed = new EmbedBuilder();
        mockEmbedService.createGitHubNotConfiguredEmbed.mockReturnValue(mockEmbed as any);

        await command.onClaudeCommand([mockInteraction]);

        expect(mockGitHubService.isConfigured).toHaveBeenCalledTimes(1);
        expect(mockEmbedService.createGitHubNotConfiguredEmbed).toHaveBeenCalledTimes(1);
        expect(mockInteraction.reply).toHaveBeenCalledWith({
          embeds: [mockEmbed],
          flags: [MessageFlags.Ephemeral]
        });
      });

      it('should not create or update session when GitHub is not configured', async () => {
        const mockEmbed = new EmbedBuilder();
        mockEmbedService.createGitHubNotConfiguredEmbed.mockReturnValue(mockEmbed as any);

        await command.onClaudeCommand([mockInteraction]);

        expect(mockSessionService.hasSession).not.toHaveBeenCalled();
        expect(mockSessionService.createSession).not.toHaveBeenCalled();
        expect(mockSessionService.updateSession).not.toHaveBeenCalled();
      });

      it('should not show modal when GitHub is not configured', async () => {
        const mockEmbed = new EmbedBuilder();
        mockEmbedService.createGitHubNotConfiguredEmbed.mockReturnValue(mockEmbed as any);

        await command.onClaudeCommand([mockInteraction]);

        expect(mockInteraction.showModal).not.toHaveBeenCalled();
      });

      it('should not log command initiation when GitHub is not configured', async () => {
        const mockEmbed = new EmbedBuilder();
        mockEmbedService.createGitHubNotConfiguredEmbed.mockReturnValue(mockEmbed as any);

        await command.onClaudeCommand([mockInteraction]);

        expect(command['logger'].log).not.toHaveBeenCalled();
      });
    });

    describe('GitHub Service Configured - New Session', () => {
      beforeEach(() => {
        mockGitHubService.isConfigured.mockReturnValue(true);
        mockSessionService.hasSession.mockReturnValue(false);
      });

      it('should create new session when user does not have existing session', async () => {
        await command.onClaudeCommand([mockInteraction]);

        expect(mockSessionService.hasSession).toHaveBeenCalledWith('user123');
        expect(mockSessionService.createSession).toHaveBeenCalledWith('user123');
      });

      it('should update session with claude_repository_search action', async () => {
        await command.onClaudeCommand([mockInteraction]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          action: 'claude_repository_search'
        });
      });

      it('should log command initiation with user information', async () => {
        await command.onClaudeCommand([mockInteraction]);

        expect(command['logger'].log).toHaveBeenCalledWith(
          'Claude command initiated by user: testuser#1234 (user123)'
        );
      });

      it('should create and show repository search modal', async () => {
        await command.onClaudeCommand([mockInteraction]);

        // Check ModalBuilder setup
        expect(ModalBuilder).toHaveBeenCalledTimes(1);
        expect(mockModalBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_REPO_SEARCH_MODAL);
        expect(mockModalBuilder.setTitle).toHaveBeenCalledWith('🤖 Claude Code Analysis');
        expect(mockModalBuilder.addComponents).toHaveBeenCalledTimes(1);

        // Check TextInputBuilder setup
        expect(TextInputBuilder).toHaveBeenCalledTimes(1);
        expect(mockTextInputBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_REPO_SEARCH_INPUT);
        expect(mockTextInputBuilder.setLabel).toHaveBeenCalledWith('Repository Name or Search Term');
        expect(mockTextInputBuilder.setStyle).toHaveBeenCalledWith(1); // TextInputStyle.Short
        expect(mockTextInputBuilder.setPlaceholder).toHaveBeenCalledWith('e.g., "discord-bot" or "microsoft/vscode"');
        expect(mockTextInputBuilder.setRequired).toHaveBeenCalledWith(true);
        expect(mockTextInputBuilder.setMaxLength).toHaveBeenCalledWith(100);

        // Check ActionRowBuilder setup
        expect(ActionRowBuilder).toHaveBeenCalledTimes(1);
        expect(mockActionRowBuilder.addComponents).toHaveBeenCalledWith(mockTextInputBuilder);

        // Check modal is shown
        expect(mockInteraction.showModal).toHaveBeenCalledWith(mockModalBuilder);
      });

      it('should not call reply when successfully showing modal', async () => {
        await command.onClaudeCommand([mockInteraction]);

        expect(mockInteraction.reply).not.toHaveBeenCalled();
      });
    });

    describe('GitHub Service Configured - Existing Session', () => {
      beforeEach(() => {
        mockGitHubService.isConfigured.mockReturnValue(true);
        mockSessionService.hasSession.mockReturnValue(true);
      });

      it('should not create new session when user already has existing session', async () => {
        await command.onClaudeCommand([mockInteraction]);

        expect(mockSessionService.hasSession).toHaveBeenCalledWith('user123');
        expect(mockSessionService.createSession).not.toHaveBeenCalled();
      });

      it('should still update session with claude_repository_search action', async () => {
        await command.onClaudeCommand([mockInteraction]);

        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
          action: 'claude_repository_search'
        });
      });

      it('should still log command initiation', async () => {
        await command.onClaudeCommand([mockInteraction]);

        expect(command['logger'].log).toHaveBeenCalledWith(
          'Claude command initiated by user: testuser#1234 (user123)'
        );
      });

      it('should still create and show modal', async () => {
        await command.onClaudeCommand([mockInteraction]);

        expect(mockInteraction.showModal).toHaveBeenCalledWith(mockModalBuilder);
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockGitHubService.isConfigured.mockReturnValue(true);
        mockSessionService.hasSession.mockReturnValue(false);
      });

      it('should handle session service errors gracefully', async () => {
        const error = new Error('Session creation failed');
        mockSessionService.createSession.mockImplementation(() => {
          throw error;
        });

        await expect(command.onClaudeCommand([mockInteraction])).rejects.toThrow('Session creation failed');
      });

      it('should handle modal creation errors gracefully', async () => {
        const error = new Error('Modal creation failed');
        mockInteraction.showModal.mockRejectedValue(error);

        await expect(command.onClaudeCommand([mockInteraction])).rejects.toThrow('Modal creation failed');
      });

      it('should handle embed service errors when GitHub not configured', async () => {
        mockGitHubService.isConfigured.mockReturnValue(false);
        const error = new Error('Embed creation failed');
        mockEmbedService.createGitHubNotConfiguredEmbed.mockImplementation(() => {
          throw error;
        });

        await expect(command.onClaudeCommand([mockInteraction])).rejects.toThrow('Embed creation failed');
      });
    });

    describe('User Information Variations', () => {
      it('should handle different user IDs correctly', async () => {
        mockGitHubService.isConfigured.mockReturnValue(true);
        mockSessionService.hasSession.mockReturnValue(false);
        
        const differentUser = {
          user: {
            id: 'user456',
            tag: 'anotheruser#5678'
          },
          reply: jest.fn(),
          showModal: jest.fn()
        } as any;

        await command.onClaudeCommand([differentUser]);

        expect(mockSessionService.hasSession).toHaveBeenCalledWith('user456');
        expect(mockSessionService.createSession).toHaveBeenCalledWith('user456');
        expect(mockSessionService.updateSession).toHaveBeenCalledWith('user456', {
          action: 'claude_repository_search'
        });
        expect(command['logger'].log).toHaveBeenCalledWith(
          'Claude command initiated by user: anotheruser#5678 (user456)'
        );
      });

      it('should handle user without tag', async () => {
        mockGitHubService.isConfigured.mockReturnValue(true);
        mockSessionService.hasSession.mockReturnValue(false);
        
        const userWithoutTag = {
          user: {
            id: 'user789',
            tag: null
          },
          reply: jest.fn(),
          showModal: jest.fn()
        } as any;

        await command.onClaudeCommand([userWithoutTag]);

        expect(command['logger'].log).toHaveBeenCalledWith(
          'Claude command initiated by user: null (user789)'
        );
      });
    });

    describe('Modal Configuration Verification', () => {
      beforeEach(() => {
        mockGitHubService.isConfigured.mockReturnValue(true);
        mockSessionService.hasSession.mockReturnValue(false);
      });

      it('should configure modal with correct custom ID and title', async () => {
        await command.onClaudeCommand([mockInteraction]);

        expect(mockModalBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_REPO_SEARCH_MODAL);
        expect(mockModalBuilder.setTitle).toHaveBeenCalledWith('🤖 Claude Code Analysis');
      });

      it('should configure text input with correct properties', async () => {
        await command.onClaudeCommand([mockInteraction]);

        expect(mockTextInputBuilder.setCustomId).toHaveBeenCalledWith(CUSTOM_IDS.CLAUDE_REPO_SEARCH_INPUT);
        expect(mockTextInputBuilder.setLabel).toHaveBeenCalledWith('Repository Name or Search Term');
        expect(mockTextInputBuilder.setStyle).toHaveBeenCalledWith(1); // Short style
        expect(mockTextInputBuilder.setPlaceholder).toHaveBeenCalledWith('e.g., "discord-bot" or "microsoft/vscode"');
        expect(mockTextInputBuilder.setRequired).toHaveBeenCalledWith(true);
        expect(mockTextInputBuilder.setMaxLength).toHaveBeenCalledWith(100);
      });

      it('should verify all builder method calls are made', async () => {
        await command.onClaudeCommand([mockInteraction]);

        // Verify all ModalBuilder methods are called
        expect(mockModalBuilder.setCustomId).toHaveBeenCalledTimes(1);
        expect(mockModalBuilder.setTitle).toHaveBeenCalledTimes(1);
        expect(mockModalBuilder.addComponents).toHaveBeenCalledTimes(1);

        // Verify all TextInputBuilder methods are called
        expect(mockTextInputBuilder.setCustomId).toHaveBeenCalledTimes(1);
        expect(mockTextInputBuilder.setLabel).toHaveBeenCalledTimes(1);
        expect(mockTextInputBuilder.setStyle).toHaveBeenCalledTimes(1);
        expect(mockTextInputBuilder.setPlaceholder).toHaveBeenCalledTimes(1);
        expect(mockTextInputBuilder.setRequired).toHaveBeenCalledTimes(1);
        expect(mockTextInputBuilder.setMaxLength).toHaveBeenCalledTimes(1);
      });
    });

    describe('Service Method Call Verification', () => {
      beforeEach(() => {
        mockGitHubService.isConfigured.mockReturnValue(true);
        mockSessionService.hasSession.mockReturnValue(false);
      });

      it('should call all required methods for new session', async () => {
        await command.onClaudeCommand([mockInteraction]);

        // Verify all service methods are called
        expect(mockGitHubService.isConfigured).toHaveBeenCalledTimes(1);
        expect(mockSessionService.hasSession).toHaveBeenCalledTimes(1);
        expect(mockSessionService.createSession).toHaveBeenCalledTimes(1);
        expect(mockSessionService.updateSession).toHaveBeenCalledTimes(1);
        expect(command['logger'].log).toHaveBeenCalledTimes(1);
      });

      it('should call required methods for existing session (skip createSession)', async () => {
        mockSessionService.hasSession.mockReturnValue(true);

        await command.onClaudeCommand([mockInteraction]);

        // Verify service method calls
        expect(mockGitHubService.isConfigured).toHaveBeenCalledTimes(1);
        expect(mockSessionService.hasSession).toHaveBeenCalledTimes(1);
        expect(mockSessionService.createSession).not.toHaveBeenCalled();
        expect(mockSessionService.updateSession).toHaveBeenCalledTimes(1);
        expect(command['logger'].log).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete workflow for new user', async () => {
      mockGitHubService.isConfigured.mockReturnValue(true);
      mockSessionService.hasSession.mockReturnValue(false);

      await command.onClaudeCommand([mockInteraction]);

      // Verify complete flow
      expect(mockGitHubService.isConfigured).toHaveBeenCalledTimes(1);
      expect(mockSessionService.hasSession).toHaveBeenCalledWith('user123');
      expect(mockSessionService.createSession).toHaveBeenCalledWith('user123');
      expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
        action: 'claude_repository_search'
      });
      expect(command['logger'].log).toHaveBeenCalledWith(
        'Claude command initiated by user: testuser#1234 (user123)'
      );
      expect(mockInteraction.showModal).toHaveBeenCalledTimes(1);
    });

    it('should handle complete workflow for returning user', async () => {
      mockGitHubService.isConfigured.mockReturnValue(true);
      mockSessionService.hasSession.mockReturnValue(true);

      await command.onClaudeCommand([mockInteraction]);

      // Verify complete flow (without session creation)
      expect(mockGitHubService.isConfigured).toHaveBeenCalledTimes(1);
      expect(mockSessionService.hasSession).toHaveBeenCalledWith('user123');
      expect(mockSessionService.createSession).not.toHaveBeenCalled();
      expect(mockSessionService.updateSession).toHaveBeenCalledWith('user123', {
        action: 'claude_repository_search'
      });
      expect(command['logger'].log).toHaveBeenCalledWith(
        'Claude command initiated by user: testuser#1234 (user123)'
      );
      expect(mockInteraction.showModal).toHaveBeenCalledTimes(1);
    });
  });
});