import { WorkflowStatusButtonHandler } from '@/interactions/buttons/workflow-status.button';
import { SessionService } from '@/services/session.service';
import { WorkflowService } from '@/services/workflow.service';
import { EmbedService } from '@/services/embed.service';
import { CUSTOM_IDS } from '@/utils/discord.constants';
import { MESSAGES } from '@/utils/messages.constants';
import { ActionRowBuilder, ButtonBuilder, MessageFlags, EmbedBuilder } from 'discord.js';

// Mock Necord
jest.mock('necord', () => ({
  Context: () => () => ({}),
  Button: () => () => ({}),
  ButtonContext: {}
}));

// Mock Discord.js components
const mockActionRowBuilder = {
  addComponents: jest.fn().mockReturnThis()
};

jest.mock('discord.js', () => ({
  ...jest.requireActual('discord.js'),
  ActionRowBuilder: jest.fn().mockImplementation(() => mockActionRowBuilder),
  MessageFlags: {
    Ephemeral: 64
  }
}));

// Mock DiscordUtils
jest.mock('@/utils/discord.utils', () => ({
  DiscordUtils: {
    createViewWorkflowButton: jest.fn().mockReturnValue({ setURL: jest.fn().mockReturnThis() }),
    createWorkflowStatusButton: jest.fn().mockReturnValue({ setCustomId: jest.fn().mockReturnThis() })
  }
}));

// Mock Discord.js interaction
const mockInteraction = {
  user: {
    id: 'user123',
    tag: 'testuser#1234'
  },
  reply: jest.fn(),
  deferReply: jest.fn(),
  editReply: jest.fn()
} as any;

// Mock Services
const mockSessionService = {
  getSession: jest.fn()
} as unknown as jest.Mocked<SessionService>;

const mockWorkflowService = {
  getWorkflowRuns: jest.fn()
} as unknown as jest.Mocked<WorkflowService>;

const mockEmbedService = {
  createWarningEmbed: jest.fn(),
  createWorkflowStatusEmbed: jest.fn(),
  createErrorEmbed: jest.fn()
} as unknown as jest.Mocked<EmbedService>;

describe('WorkflowStatusButtonHandler', () => {
  let handler: WorkflowStatusButtonHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock ActionRowBuilder calls
    mockActionRowBuilder.addComponents.mockClear();
    
    // Reset interaction mock
    mockInteraction.reply.mockClear();
    mockInteraction.deferReply.mockClear();
    mockInteraction.editReply.mockClear();
    
    // Reset service mocks to default behavior
    mockInteraction.reply.mockResolvedValue(undefined);
    mockInteraction.deferReply.mockResolvedValue(undefined);
    mockInteraction.editReply.mockResolvedValue(undefined);
    
    handler = new WorkflowStatusButtonHandler(
      mockSessionService,
      mockWorkflowService,
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
      expect(handler['workflowService']).toBe(mockWorkflowService);
      expect(handler['embedService']).toBe(mockEmbedService);
    });

    it('should extend BaseService', () => {
      expect(handler).toBeDefined();
      expect(typeof handler['logger']).toBe('object');
    });
  });

  describe('onWorkflowStatus', () => {
    describe('Session Validation', () => {
      it('should reply with session expired when no session exists', async () => {
        mockSessionService.getSession.mockReturnValue(null);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(mockSessionService.getSession).toHaveBeenCalledWith('user123');
        expect(mockInteraction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
        expect(mockInteraction.deferReply).not.toHaveBeenCalled();
        expect(mockWorkflowService.getWorkflowRuns).not.toHaveBeenCalled();
      });

      it('should reply with session expired when session has no repository', async () => {
        const sessionWithoutRepo = {
          userId: 'user123',
          repository: null,
          paginatedData: null,
          searchQuery: null,
          action: null,
          createdAt: new Date()
          // repository is null
        } as any;
        mockSessionService.getSession.mockReturnValue(sessionWithoutRepo);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(mockInteraction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
        expect(mockInteraction.deferReply).not.toHaveBeenCalled();
      });

      it('should reply with session expired when session repository is null', async () => {
        const sessionWithNullRepo = {
          userId: 'user123',
          repository: null,
          paginatedData: null,
          searchQuery: null,
          action: null,
          createdAt: new Date()
        } as any;
        mockSessionService.getSession.mockReturnValue(sessionWithNullRepo);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(mockInteraction.reply).toHaveBeenCalledWith({
          content: MESSAGES.SESSION_EXPIRED,
          flags: [MessageFlags.Ephemeral]
        });
      });
    });

    describe('Valid Session Workflow', () => {
      const validSession = {
        userId: 'user123',
        repository: {
          fullName: 'owner/repo',
          name: 'repo',
          owner: 'owner'
        },
        paginatedData: null,
        searchQuery: null,
        action: null,
        createdAt: new Date()
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should defer reply for valid session', async () => {
        const mockWorkflowRuns = [{
          id: 123,
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/owner/repo/actions/runs/123',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:10:00Z',
          run_number: 42,
          head_branch: 'main'
        }];
        
        mockWorkflowService.getWorkflowRuns.mockResolvedValue(mockWorkflowRuns);
        mockEmbedService.createWorkflowStatusEmbed.mockReturnValue(new EmbedBuilder() as any);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(mockInteraction.deferReply).toHaveBeenCalledWith({
          flags: [MessageFlags.Ephemeral]
        });
      });

      it('should fetch workflow runs with correct parameters', async () => {
        const mockWorkflowRuns = [{
          id: 123,
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/owner/repo/actions/runs/123',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:10:00Z',
          run_number: 42,
          head_branch: 'main'
        }];
        
        mockWorkflowService.getWorkflowRuns.mockResolvedValue(mockWorkflowRuns);
        mockEmbedService.createWorkflowStatusEmbed.mockReturnValue(new EmbedBuilder() as any);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(mockWorkflowService.getWorkflowRuns).toHaveBeenCalledWith(
          'owner',
          'repo',
          'claude.yml',
          5
        );
      });
    });

    describe('No Workflow Runs', () => {
      const validSession = {
        userId: 'user123',
        repository: {
          fullName: 'owner/repo',
          name: 'repo',
          owner: 'owner'
        },
        paginatedData: null,
        searchQuery: null,
        action: null,
        createdAt: new Date()
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
        mockWorkflowService.getWorkflowRuns.mockResolvedValue([]);
      });

      it('should show warning embed when no workflow runs exist', async () => {
        const mockWarningEmbed = new EmbedBuilder();
        mockEmbedService.createWarningEmbed.mockReturnValue(mockWarningEmbed as any);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(mockEmbedService.createWarningEmbed).toHaveBeenCalledWith(
          'No Workflow Runs',
          'No Claude Code workflow runs found for `owner/repo`.'
        );
        expect(mockInteraction.editReply).toHaveBeenCalledWith({
          embeds: [mockWarningEmbed]
        });
      });

      it('should not create buttons when no workflow runs exist', async () => {
        const mockWarningEmbed = new EmbedBuilder();
        mockEmbedService.createWarningEmbed.mockReturnValue(mockWarningEmbed as any);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(ActionRowBuilder).not.toHaveBeenCalled();
        expect(mockActionRowBuilder.addComponents).not.toHaveBeenCalled();
      });

      it('should not log workflow status when no runs exist', async () => {
        const mockWarningEmbed = new EmbedBuilder();
        mockEmbedService.createWarningEmbed.mockReturnValue(mockWarningEmbed as any);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(handler['logger'].log).not.toHaveBeenCalled();
      });
    });

    describe('Successful Workflow Status Display', () => {
      const validSession = {
        userId: 'user123',
        repository: {
          fullName: 'owner/repo',
          name: 'repo',
          owner: 'owner'
        },
        paginatedData: null,
        searchQuery: null,
        action: null,
        createdAt: new Date()
      } as any;

      const mockWorkflowRuns = [
        {
          id: 123,
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/owner/repo/actions/runs/123',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:10:00Z',
          run_number: 42,
          head_branch: 'main'
        },
        {
          id: 122,
          status: 'completed',
          conclusion: 'failure',
          html_url: 'https://github.com/owner/repo/actions/runs/122',
          created_at: '2022-12-31T00:00:00Z',
          updated_at: '2022-12-31T00:10:00Z',
          run_number: 41,
          head_branch: 'main'
        }
      ];

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
        mockWorkflowService.getWorkflowRuns.mockResolvedValue(mockWorkflowRuns);
      });

      it('should create workflow status embed for latest run', async () => {
        const mockStatusEmbed = new EmbedBuilder();
        mockEmbedService.createWorkflowStatusEmbed.mockReturnValue(mockStatusEmbed as any);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(mockEmbedService.createWorkflowStatusEmbed).toHaveBeenCalledWith(
          mockWorkflowRuns[0], // Latest run
          'owner/repo'
        );
      });

      it('should create view workflow button with correct URL', async () => {
        const mockStatusEmbed = new EmbedBuilder();
        mockEmbedService.createWorkflowStatusEmbed.mockReturnValue(mockStatusEmbed as any);

        await handler.onWorkflowStatus([mockInteraction]);

        const { DiscordUtils } = require('@/utils/discord.utils');
        expect(DiscordUtils.createViewWorkflowButton).toHaveBeenCalledWith(
          'https://github.com/owner/repo/actions/runs/123'
        );
      });

      it('should create refresh status button', async () => {
        const mockStatusEmbed = new EmbedBuilder();
        mockEmbedService.createWorkflowStatusEmbed.mockReturnValue(mockStatusEmbed as any);

        await handler.onWorkflowStatus([mockInteraction]);

        const { DiscordUtils } = require('@/utils/discord.utils');
        expect(DiscordUtils.createWorkflowStatusButton).toHaveBeenCalledTimes(1);
      });

      it('should create action row with both buttons', async () => {
        const mockStatusEmbed = new EmbedBuilder();
        mockEmbedService.createWorkflowStatusEmbed.mockReturnValue(mockStatusEmbed as any);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(ActionRowBuilder).toHaveBeenCalledTimes(1);
        expect(mockActionRowBuilder.addComponents).toHaveBeenCalledWith(
          expect.objectContaining({ setURL: expect.any(Function) }),
          expect.objectContaining({ setCustomId: expect.any(Function) })
        );
      });

      it('should edit reply with embed and components', async () => {
        const mockStatusEmbed = new EmbedBuilder();
        mockEmbedService.createWorkflowStatusEmbed.mockReturnValue(mockStatusEmbed as any);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(mockInteraction.editReply).toHaveBeenCalledWith({
          embeds: [mockStatusEmbed],
          components: [mockActionRowBuilder]
        });
      });

      it('should log workflow status display', async () => {
        const mockStatusEmbed = new EmbedBuilder();
        mockEmbedService.createWorkflowStatusEmbed.mockReturnValue(mockStatusEmbed as any);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(handler['logger'].log).toHaveBeenCalledWith(
          'Displayed workflow status for owner/repo - Run 123: completed'
        );
      });

      it('should use latest run even when multiple runs exist', async () => {
        const mockStatusEmbed = new EmbedBuilder();
        mockEmbedService.createWorkflowStatusEmbed.mockReturnValue(mockStatusEmbed as any);

        await handler.onWorkflowStatus([mockInteraction]);

        // Should use first run (latest)
        expect(mockEmbedService.createWorkflowStatusEmbed).toHaveBeenCalledWith(
          mockWorkflowRuns[0],
          'owner/repo'
        );
        expect(handler['logger'].log).toHaveBeenCalledWith(
          expect.stringContaining('Run 123:') // First run ID
        );
      });
    });

    describe('Error Handling', () => {
      const validSession = {
        userId: 'user123',
        repository: {
          fullName: 'owner/repo',
          name: 'repo',
          owner: 'owner'
        },
        paginatedData: null,
        searchQuery: null,
        action: null,
        createdAt: new Date()
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should handle workflow service errors', async () => {
        const workflowError = new Error('API rate limit exceeded');
        mockWorkflowService.getWorkflowRuns.mockRejectedValue(workflowError);
        
        const mockErrorEmbed = new EmbedBuilder();
        mockEmbedService.createErrorEmbed.mockReturnValue(mockErrorEmbed as any);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(handler['logger'].error).toHaveBeenCalledWith(
          'Failed to get workflow status: API rate limit exceeded',
          workflowError
        );
        expect(mockEmbedService.createErrorEmbed).toHaveBeenCalledWith(
          'Status Check Failed',
          'Failed to check workflow status:\n`API rate limit exceeded`'
        );
        expect(mockInteraction.editReply).toHaveBeenCalledWith({
          embeds: [mockErrorEmbed]
        });
      });

      it('should handle embed service errors', async () => {
        const mockWorkflowRuns = [{
          id: 123,
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/owner/repo/actions/runs/123',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:10:00Z',
          run_number: 42,
          head_branch: 'main'
        }];
        
        mockWorkflowService.getWorkflowRuns.mockResolvedValue(mockWorkflowRuns);
        const embedError = new Error('Embed creation failed');
        mockEmbedService.createWorkflowStatusEmbed.mockImplementation(() => {
          throw embedError;
        });

        const mockErrorEmbed = new EmbedBuilder();
        mockEmbedService.createErrorEmbed.mockReturnValue(mockErrorEmbed as any);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(handler['logger'].error).toHaveBeenCalledWith(
          'Failed to get workflow status: Embed creation failed',
          embedError
        );
        expect(mockEmbedService.createErrorEmbed).toHaveBeenCalled();
      });

      it('should handle interaction.editReply throwing an error', async () => {
        const mockWorkflowRuns = [{
          id: 123,
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/owner/repo/actions/runs/123',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:10:00Z',
          run_number: 42,
          head_branch: 'main'
        }];
        
        mockWorkflowService.getWorkflowRuns.mockResolvedValue(mockWorkflowRuns);
        mockEmbedService.createWorkflowStatusEmbed.mockReturnValue(new EmbedBuilder() as any);
        
        const editError = new Error('Discord API error');
        mockInteraction.editReply.mockRejectedValueOnce(editError).mockResolvedValueOnce(undefined);

        const mockErrorEmbed = new EmbedBuilder();
        mockEmbedService.createErrorEmbed.mockReturnValue(mockErrorEmbed as any);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(handler['logger'].error).toHaveBeenCalledWith(
          'Failed to get workflow status: Discord API error',
          editError
        );
        expect(mockEmbedService.createErrorEmbed).toHaveBeenCalledWith(
          'Status Check Failed',
          'Failed to check workflow status:\n`Discord API error`'
        );
        expect(mockInteraction.editReply).toHaveBeenCalledTimes(2);
      });

      it('should handle session service throwing an error', async () => {
        const sessionError = new Error('Session retrieval failed');
        mockSessionService.getSession.mockImplementation(() => {
          throw sessionError;
        });

        await expect(handler.onWorkflowStatus([mockInteraction])).rejects.toThrow('Session retrieval failed');

        // Should not proceed to other service calls
        expect(mockWorkflowService.getWorkflowRuns).not.toHaveBeenCalled();
      });
    });

    describe('Repository Name Parsing', () => {
      it('should handle repository names with complex paths', async () => {
        const sessionWithComplexRepo = {
          userId: 'user123',
          repository: {
            fullName: 'my-org/my-complex-repo-name',
            name: 'my-complex-repo-name',
            owner: 'my-org'
          },
          paginatedData: null,
          searchQuery: null,
          action: null,
          createdAt: new Date()
        } as any;
        
        mockSessionService.getSession.mockReturnValue(sessionWithComplexRepo);
        mockWorkflowService.getWorkflowRuns.mockResolvedValue([{
          id: 123,
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/my-org/my-complex-repo-name/actions/runs/123',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:10:00Z',
          run_number: 42,
          head_branch: 'main'
        }]);
        mockEmbedService.createWorkflowStatusEmbed.mockReturnValue(new EmbedBuilder() as any);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(mockWorkflowService.getWorkflowRuns).toHaveBeenCalledWith(
          'my-org',
          'my-complex-repo-name',
          'claude.yml',
          5
        );
      });

      it('should handle repository names with numbers and special characters', async () => {
        const sessionWithSpecialRepo = {
          userId: 'user123',
          repository: {
            fullName: 'user-123/repo_v2.0',
            name: 'repo_v2.0',
            owner: 'user-123'
          },
          paginatedData: null,
          searchQuery: null,
          action: null,
          createdAt: new Date()
        } as any;
        
        mockSessionService.getSession.mockReturnValue(sessionWithSpecialRepo);
        mockWorkflowService.getWorkflowRuns.mockResolvedValue([{
          id: 123,
          status: 'running',
          conclusion: null,
          html_url: 'https://github.com/user-123/repo_v2.0/actions/runs/123',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:05:00Z',
          run_number: 42,
          head_branch: 'main'
        }]);
        mockEmbedService.createWorkflowStatusEmbed.mockReturnValue(new EmbedBuilder() as any);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(mockWorkflowService.getWorkflowRuns).toHaveBeenCalledWith(
          'user-123',
          'repo_v2.0',
          'claude.yml',
          5
        );
      });
    });

    describe('Different Workflow States', () => {
      const validSession = {
        userId: 'user123',
        repository: {
          fullName: 'owner/repo',
          name: 'repo',
          owner: 'owner'
        },
        paginatedData: null,
        searchQuery: null,
        action: null,
        createdAt: new Date()
      } as any;

      beforeEach(() => {
        mockSessionService.getSession.mockReturnValue(validSession);
      });

      it('should handle running workflow', async () => {
        const runningWorkflow = [{
          id: 456,
          status: 'in_progress',
          conclusion: null,
          html_url: 'https://github.com/owner/repo/actions/runs/456',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:05:00Z',
          run_number: 43,
          head_branch: 'main'
        }];
        
        mockWorkflowService.getWorkflowRuns.mockResolvedValue(runningWorkflow);
        mockEmbedService.createWorkflowStatusEmbed.mockReturnValue(new EmbedBuilder() as any);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(handler['logger'].log).toHaveBeenCalledWith(
          'Displayed workflow status for owner/repo - Run 456: in_progress'
        );
      });

      it('should handle failed workflow', async () => {
        const failedWorkflow = [{
          id: 789,
          status: 'completed',
          conclusion: 'failure',
          html_url: 'https://github.com/owner/repo/actions/runs/789',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:10:00Z',
          run_number: 44,
          head_branch: 'main'
        }];
        
        mockWorkflowService.getWorkflowRuns.mockResolvedValue(failedWorkflow);
        mockEmbedService.createWorkflowStatusEmbed.mockReturnValue(new EmbedBuilder() as any);

        await handler.onWorkflowStatus([mockInteraction]);

        expect(handler['logger'].log).toHaveBeenCalledWith(
          'Displayed workflow status for owner/repo - Run 789: completed'
        );
      });
    });

    describe('User Information Variations', () => {
      const validSession = {
        userId: 'user456',
        repository: {
          fullName: 'owner/repo',
          name: 'repo',
          owner: 'owner'
        },
        paginatedData: null,
        searchQuery: null,
        action: null,
        createdAt: new Date()
      } as any;

      it('should handle different user IDs correctly', async () => {
        const differentUser = {
          user: {
            id: 'user456',
            tag: 'anotheruser#5678'
          },
          reply: jest.fn().mockResolvedValue(undefined),
          deferReply: jest.fn().mockResolvedValue(undefined),
          editReply: jest.fn().mockResolvedValue(undefined)
        } as any;

        mockSessionService.getSession.mockReturnValue(validSession);
        mockWorkflowService.getWorkflowRuns.mockResolvedValue([{
          id: 123,
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/owner/repo/actions/runs/123',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:10:00Z',
          run_number: 42,
          head_branch: 'main'
        }]);
        mockEmbedService.createWorkflowStatusEmbed.mockReturnValue(new EmbedBuilder() as any);

        await handler.onWorkflowStatus([differentUser]);

        expect(mockSessionService.getSession).toHaveBeenCalledWith('user456');
      });
    });

    describe('Integration Scenarios', () => {
      it('should handle complete successful workflow status check', async () => {
        const validSession = {
          userId: 'user123',
          repository: {
            fullName: 'owner/repo',
            name: 'repo',
            owner: 'owner'
          },
          paginatedData: null,
          searchQuery: null,
          action: null,
          createdAt: new Date()
        } as any;

        const mockWorkflowRuns = [{
          id: 123,
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/owner/repo/actions/runs/123',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:10:00Z',
          run_number: 42,
          head_branch: 'main'
        }];

        mockSessionService.getSession.mockReturnValue(validSession);
        mockWorkflowService.getWorkflowRuns.mockResolvedValue(mockWorkflowRuns);
        const mockStatusEmbed = new EmbedBuilder();
        mockEmbedService.createWorkflowStatusEmbed.mockReturnValue(mockStatusEmbed as any);

        await handler.onWorkflowStatus([mockInteraction]);

        // Verify complete flow
        expect(mockSessionService.getSession).toHaveBeenCalledWith('user123');
        expect(mockInteraction.deferReply).toHaveBeenCalledWith({
          flags: [MessageFlags.Ephemeral]
        });
        expect(mockWorkflowService.getWorkflowRuns).toHaveBeenCalledWith(
          'owner',
          'repo',
          'claude.yml',
          5
        );
        expect(mockEmbedService.createWorkflowStatusEmbed).toHaveBeenCalledWith(
          mockWorkflowRuns[0],
          'owner/repo'
        );
        expect(mockInteraction.editReply).toHaveBeenCalledWith({
          embeds: [mockStatusEmbed],
          components: [mockActionRowBuilder]
        });
        expect(handler['logger'].log).toHaveBeenCalledWith(
          'Displayed workflow status for owner/repo - Run 123: completed'
        );
      });
    });
  });
});