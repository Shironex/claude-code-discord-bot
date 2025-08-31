import { WorkflowMonitorService } from '@/services/workflow-monitor.service';
import { WorkflowService } from '@/services/workflow.service';
import { SessionService } from '@/services/session.service';
import { EmbedService } from '@/services/embed.service';
import { Client, TextChannel, Message, ActionRowBuilder, ButtonBuilder, EmbedBuilder } from 'discord.js';

// Mock Discord.js components
const mockMessage = {
  edit: jest.fn()
} as unknown as jest.Mocked<Message>;

const mockChannel = {
  messages: {
    fetch: jest.fn()
  }
} as unknown as jest.Mocked<TextChannel>;

const mockClient = {
  channels: {
    fetch: jest.fn()
  }
} as unknown as jest.Mocked<Client>;

// Mock services
const mockWorkflowService = {
  getWorkflowRunStatus: jest.fn(),
  isConfigured: jest.fn(),
  getRecentPullRequests: jest.fn()
} as unknown as jest.Mocked<WorkflowService>;

const mockSessionService = {
  updateWorkflowRun: jest.fn()
} as unknown as jest.Mocked<SessionService>;

const mockEmbedService = {
  createWorkflowCompletedEmbed: jest.fn(),
  createWorkflowStatusEmbed: jest.fn()
} as unknown as jest.Mocked<EmbedService>;

// Mock Discord.js ButtonBuilder
const mockButtonBuilder = {
  setURL: jest.fn().mockReturnThis(),
  setLabel: jest.fn().mockReturnThis(),
  setStyle: jest.fn().mockReturnThis(),
  setEmoji: jest.fn().mockReturnThis()
};

jest.mock('discord.js', () => ({
  ...jest.requireActual('discord.js'),
  ButtonBuilder: jest.fn().mockImplementation(() => mockButtonBuilder)
}));

// Mock DiscordUtils
jest.mock('@/utils/discord.utils', () => ({
  DiscordUtils: {
    createViewWorkflowButton: jest.fn(() => ({
      setURL: jest.fn().mockReturnThis(),
      setLabel: jest.fn().mockReturnThis(),
      setStyle: jest.fn().mockReturnThis(),
      setEmoji: jest.fn().mockReturnThis()
    })),
    createWorkflowStatusButton: jest.fn(() => ({
      setCustomId: jest.fn().mockReturnThis(),
      setLabel: jest.fn().mockReturnThis(),
      setStyle: jest.fn().mockReturnThis(),
      setEmoji: jest.fn().mockReturnThis()
    }))
  }
}));

// Mock timers
jest.useFakeTimers();

describe('WorkflowMonitorService', () => {
  let service: WorkflowMonitorService;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Clear mock button builder calls
    mockButtonBuilder.setURL.mockClear();
    mockButtonBuilder.setLabel.mockClear();
    mockButtonBuilder.setStyle.mockClear();
    mockButtonBuilder.setEmoji.mockClear();
    
    // Suppress console.log during tests
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Setup mock returns
    (mockClient.channels.fetch as jest.Mock).mockResolvedValue(mockChannel);
    (mockChannel.messages.fetch as jest.Mock).mockResolvedValue(mockMessage);
    
    // Create service instance
    service = new WorkflowMonitorService(
      mockWorkflowService,
      mockSessionService,
      mockEmbedService,
      mockClient
    );

    // Mock the logger to prevent actual logging
    Object.defineProperty(service, 'logger', {
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

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllTimers();
  });

  describe('Constructor', () => {
    it('should initialize with correct service name', () => {
      expect(service).toBeDefined();
      expect(service['monitoredWorkflows']).toBeInstanceOf(Map);
      expect(service['monitoredWorkflows'].size).toBe(0);
    });

    it('should initialize monitoring properties', () => {
      expect(service['monitorInterval']).toBeNull();
      expect(service['POLL_INTERVAL']).toBe(30000);
      expect(service['MAX_MONITOR_TIME']).toBe(3600000);
    });

    it('should extend BaseService', () => {
      expect(service).toBeDefined();
      expect(typeof service.onModuleInit).toBe('function');
      expect(typeof service.onModuleDestroy).toBe('function');
    });
  });

  describe('Lifecycle Methods', () => {
    describe('onModuleInit', () => {
      it('should start monitoring and log startup', () => {
        const startMonitoringSpy = jest.spyOn(service as any, 'startMonitoring');
        
        service.onModuleInit();

        expect(startMonitoringSpy).toHaveBeenCalledTimes(1);
        expect(service['logger'].log).toHaveBeenCalledWith('Workflow monitor service started');
      });

      it('should set up interval for monitoring', () => {
        service.onModuleInit();

        expect(service['monitorInterval']).not.toBeNull();
        expect(typeof service['monitorInterval']).toBe('object');
      });
    });

    describe('onModuleDestroy', () => {
      it('should stop monitoring and log shutdown', () => {
        const stopMonitoringSpy = jest.spyOn(service as any, 'stopMonitoring');
        
        service.onModuleDestroy();

        expect(stopMonitoringSpy).toHaveBeenCalledTimes(1);
        expect(service['logger'].log).toHaveBeenCalledWith('Workflow monitor service stopped');
      });

      it('should clear monitoring interval', () => {
        service.onModuleInit(); // Start monitoring first
        expect(service['monitorInterval']).not.toBeNull();
        
        service.onModuleDestroy();
        
        expect(service['monitorInterval']).toBeNull();
      });
    });
  });

  describe('addWorkflowToMonitor', () => {
    it('should add workflow to monitoring map', () => {
      const userId = 'user123';
      const repository = 'owner/repo';
      const runId = 456;
      const messageId = 'msg123';
      const channelId = 'ch123';

      service.addWorkflowToMonitor(userId, repository, runId, messageId, channelId);

      expect(service['monitoredWorkflows'].size).toBe(1);
      expect(service['monitoredWorkflows'].has('user123-456')).toBe(true);
    });

    it('should create workflow object with correct properties', () => {
      const userId = 'user123';
      const repository = 'owner/repo';
      const runId = 456;
      const messageId = 'msg123';
      const channelId = 'ch123';

      service.addWorkflowToMonitor(userId, repository, runId, messageId, channelId);

      const workflow = service['monitoredWorkflows'].get('user123-456');
      expect(workflow).toBeDefined();
      expect(workflow!.userId).toBe(userId);
      expect(workflow!.repository).toBe(repository);
      expect(workflow!.runId).toBe(runId);
      expect(workflow!.messageId).toBe(messageId);
      expect(workflow!.channelId).toBe(channelId);
      expect(workflow!.startTime).toBeInstanceOf(Date);
      expect(workflow!.lastChecked).toBeInstanceOf(Date);
    });

    it('should log workflow addition', () => {
      service.addWorkflowToMonitor('user123', 'owner/repo', 456, 'msg123', 'ch123');

      expect(service['logger'].log).toHaveBeenCalledWith(
        'Added workflow 456 for monitoring (User: user123, Repository: owner/repo)'
      );
    });

    it('should overwrite existing workflow with same key', () => {
      const userId = 'user123';
      const runId = 456;

      service.addWorkflowToMonitor(userId, 'owner/repo1', runId, 'msg1', 'ch1');
      service.addWorkflowToMonitor(userId, 'owner/repo2', runId, 'msg2', 'ch2');

      expect(service['monitoredWorkflows'].size).toBe(1);
      const workflow = service['monitoredWorkflows'].get('user123-456');
      expect(workflow!.repository).toBe('owner/repo2');
    });
  });

  describe('removeWorkflowFromMonitor', () => {
    beforeEach(() => {
      service.addWorkflowToMonitor('user123', 'owner/repo', 456, 'msg123', 'ch123');
    });

    it('should remove existing workflow and log removal', () => {
      service.removeWorkflowFromMonitor('user123', 456);

      expect(service['monitoredWorkflows'].size).toBe(0);
      expect(service['logger'].log).toHaveBeenCalledWith(
        'Removed workflow 456 from monitoring (User: user123)'
      );
    });

    it('should not log when workflow does not exist', () => {
      service.removeWorkflowFromMonitor('user999', 999);

      expect(service['monitoredWorkflows'].size).toBe(1); // Original workflow still there
      expect(service['logger'].log).not.toHaveBeenCalledWith(
        expect.stringContaining('Removed workflow 999')
      );
    });

    it('should handle removal of non-existent workflow gracefully', () => {
      expect(() => {
        service.removeWorkflowFromMonitor('nonexistent', 999);
      }).not.toThrow();
    });
  });

  describe('checkAllWorkflows', () => {
    it('should return early when no workflows to check', async () => {
      const checkWorkflowStatusSpy = jest.spyOn(service as any, 'checkWorkflowStatus');
      const cleanupOldWorkflowsSpy = jest.spyOn(service as any, 'cleanupOldWorkflows');

      await service['checkAllWorkflows']();

      expect(service['logger'].debug).not.toHaveBeenCalled();
      expect(checkWorkflowStatusSpy).not.toHaveBeenCalled();
      expect(cleanupOldWorkflowsSpy).not.toHaveBeenCalled();
    });

    it('should check each monitored workflow', async () => {
      const checkWorkflowStatusSpy = jest.spyOn(service as any, 'checkWorkflowStatus').mockResolvedValue(undefined);
      const cleanupOldWorkflowsSpy = jest.spyOn(service as any, 'cleanupOldWorkflows');

      service.addWorkflowToMonitor('user1', 'owner/repo1', 123, 'msg1', 'ch1');
      service.addWorkflowToMonitor('user2', 'owner/repo2', 456, 'msg2', 'ch2');

      await service['checkAllWorkflows']();

      expect(service['logger'].debug).toHaveBeenCalledWith('Checking 2 monitored workflows');
      expect(checkWorkflowStatusSpy).toHaveBeenCalledTimes(2);
      expect(cleanupOldWorkflowsSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in individual workflow checks', async () => {
      const error = new Error('Workflow check failed');
      jest.spyOn(service as any, 'checkWorkflowStatus').mockRejectedValue(error);

      service.addWorkflowToMonitor('user1', 'owner/repo1', 123, 'msg1', 'ch1');

      await service['checkAllWorkflows']();

      expect(service['logger'].error).toHaveBeenCalledWith(
        'Error checking workflow 123: Workflow check failed',
        error
      );
    });
  });

  describe('checkWorkflowStatus', () => {
    let workflow: any;

    beforeEach(() => {
      workflow = {
        userId: 'user123',
        repository: 'owner/repo',
        runId: 456,
        messageId: 'msg123',
        channelId: 'ch123',
        startTime: new Date(),
        lastChecked: new Date()
      };
    });

    it('should update lastChecked time', async () => {
      const originalTime = workflow.lastChecked;
      const mockWorkflowRun = {
        id: 456,
        status: 'in_progress',
        conclusion: null,
        html_url: 'https://github.com/owner/repo/actions/runs/456',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        head_branch: 'main'
      } as any;
      mockWorkflowService.getWorkflowRunStatus.mockResolvedValue(mockWorkflowRun);

      await service['checkWorkflowStatus'](workflow);

      // Check that lastChecked was updated (should be greater than or equal to original time)
      expect(workflow.lastChecked.getTime()).toBeGreaterThanOrEqual(originalTime.getTime());
      expect(workflow.lastChecked).toBeInstanceOf(Date);
    });

    it('should call handleWorkflowCompletion for completed workflows', async () => {
      const handleWorkflowCompletionSpy = jest.spyOn(service as any, 'handleWorkflowCompletion').mockResolvedValue(undefined);
      const removeWorkflowFromMonitorSpy = jest.spyOn(service, 'removeWorkflowFromMonitor');
      
      const mockWorkflowRun = {
        id: 456,
        status: 'completed',
        conclusion: 'success',
        html_url: 'https://github.com/owner/repo/actions/runs/456',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        head_branch: 'main'
      } as any;
      mockWorkflowService.getWorkflowRunStatus.mockResolvedValue(mockWorkflowRun);

      await service['checkWorkflowStatus'](workflow);

      expect(handleWorkflowCompletionSpy).toHaveBeenCalledWith(workflow, mockWorkflowRun);
      expect(removeWorkflowFromMonitorSpy).toHaveBeenCalledWith('user123', 456);
    });

    it('should update Discord message for in_progress workflows', async () => {
      const updateDiscordMessageSpy = jest.spyOn(service as any, 'updateDiscordMessage').mockResolvedValue(undefined);
      
      const mockWorkflowRun = {
        id: 456,
        status: 'in_progress',
        conclusion: null,
        html_url: 'https://github.com/owner/repo/actions/runs/456',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        head_branch: 'main'
      } as any;
      mockWorkflowService.getWorkflowRunStatus.mockResolvedValue(mockWorkflowRun);

      await service['checkWorkflowStatus'](workflow);

      expect(updateDiscordMessageSpy).toHaveBeenCalledWith(workflow, mockWorkflowRun, false);
    });

    it('should handle workflow service errors', async () => {
      const error = new Error('API Error');
      mockWorkflowService.getWorkflowRunStatus.mockRejectedValue(error);

      await service['checkWorkflowStatus'](workflow);

      expect(service['logger'].error).toHaveBeenCalledWith(
        'Failed to check workflow 456: API Error'
      );
    });
  });

  describe('handleWorkflowCompletion', () => {
    let workflow: any;
    let workflowRun: any;

    beforeEach(() => {
      workflow = {
        userId: 'user123',
        repository: 'owner/repo',
        runId: 456,
        messageId: 'msg123',
        channelId: 'ch123',
        startTime: new Date(),
        lastChecked: new Date()
      };

      workflowRun = {
        id: 456,
        status: 'completed',
        conclusion: 'success',
        html_url: 'https://github.com/owner/repo/actions/runs/456',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        head_branch: 'main'
      };
    });

    it('should log workflow completion', async () => {
      const updateDiscordMessageSpy = jest.spyOn(service as any, 'updateDiscordMessage').mockResolvedValue(undefined);

      await service['handleWorkflowCompletion'](workflow, workflowRun);

      expect(service['logger'].log).toHaveBeenCalledWith(
        'Workflow 456 completed with status: success'
      );
    });

    it('should update session with workflow status', async () => {
      const updateDiscordMessageSpy = jest.spyOn(service as any, 'updateDiscordMessage').mockResolvedValue(undefined);

      await service['handleWorkflowCompletion'](workflow, workflowRun);

      expect(mockSessionService.updateWorkflowRun).toHaveBeenCalledWith('user123', 456, {
        status: 'completed'
      });
    });

    it('should update Discord message as completed', async () => {
      const updateDiscordMessageSpy = jest.spyOn(service as any, 'updateDiscordMessage').mockResolvedValue(undefined);

      await service['handleWorkflowCompletion'](workflow, workflowRun);

      expect(updateDiscordMessageSpy).toHaveBeenCalledWith(workflow, workflowRun, true);
    });
  });

  describe('updateDiscordMessage', () => {
    let workflow: any;
    let workflowRun: any;

    beforeEach(() => {
      workflow = {
        userId: 'user123',
        repository: 'owner/repo',
        runId: 456,
        messageId: 'msg123',
        channelId: 'ch123',
        startTime: new Date(),
        lastChecked: new Date()
      };

      workflowRun = {
        id: 456,
        status: 'completed',
        conclusion: 'success',
        html_url: 'https://github.com/owner/repo/actions/runs/456',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        head_branch: 'main'
      };

      // Mock embed creation
      mockEmbedService.createWorkflowCompletedEmbed.mockReturnValue(new EmbedBuilder() as any);
      mockEmbedService.createWorkflowStatusEmbed.mockReturnValue(new EmbedBuilder() as any);
    });

    it('should update message for completed workflow', async () => {
      const tryGetPRButtonSpy = jest.spyOn(service as any, 'tryGetPRButton').mockResolvedValue(null);

      await service['updateDiscordMessage'](workflow, workflowRun, true);

      expect(mockClient.channels.fetch).toHaveBeenCalledWith('ch123');
      expect(mockChannel.messages.fetch).toHaveBeenCalledWith('msg123');
      expect(mockEmbedService.createWorkflowCompletedEmbed).toHaveBeenCalledWith(
        'owner/repo',
        workflowRun,
        workflow.startTime
      );
      expect(mockMessage.edit).toHaveBeenCalled();
      expect(service['logger'].log).toHaveBeenCalledWith('Updated Discord message for workflow 456');
    });

    it('should update message for in-progress workflow', async () => {
      workflowRun.status = 'in_progress';
      workflowRun.conclusion = null;

      await service['updateDiscordMessage'](workflow, workflowRun, false);

      expect(mockEmbedService.createWorkflowStatusEmbed).toHaveBeenCalledWith(workflowRun, 'owner/repo');
      expect(mockMessage.edit).toHaveBeenCalled();
    });

    it('should handle PR button for successful completed workflow', async () => {
      const mockPRButton = { setURL: jest.fn().mockReturnThis() } as any;
      const tryGetPRButtonSpy = jest.spyOn(service as any, 'tryGetPRButton').mockResolvedValue(mockPRButton);

      await service['updateDiscordMessage'](workflow, workflowRun, true);

      expect(tryGetPRButtonSpy).toHaveBeenCalledWith('owner/repo', workflowRun);
      // Get the actual call arguments to verify structure
      const editCall = mockMessage.edit.mock.calls[0][0] as any;
      expect(editCall).toHaveProperty('components');
      expect(editCall.components).toHaveLength(1);
      expect(editCall.components[0]).toHaveProperty('addComponents');
    });

    it('should warn when channel is not found', async () => {
      (mockClient.channels.fetch as jest.Mock).mockResolvedValue(null);

      await service['updateDiscordMessage'](workflow, workflowRun, true);

      expect(service['logger'].warn).toHaveBeenCalledWith('Channel ch123 not found');
      expect(mockMessage.edit).not.toHaveBeenCalled();
    });

    it('should warn when message is not found', async () => {
      (mockChannel.messages.fetch as jest.Mock).mockResolvedValue(null);

      await service['updateDiscordMessage'](workflow, workflowRun, true);

      expect(service['logger'].warn).toHaveBeenCalledWith('Message msg123 not found');
      expect(mockMessage.edit).not.toHaveBeenCalled();
    });

    it('should handle errors during message update', async () => {
      const error = new Error('Discord API error');
      mockMessage.edit.mockRejectedValue(error);

      await service['updateDiscordMessage'](workflow, workflowRun, true);

      expect(service['logger'].error).toHaveBeenCalledWith(
        'Failed to update Discord message: Discord API error',
        error
      );
    });
  });

  describe('tryGetPRButton', () => {
    let workflowRun: any;

    beforeEach(() => {
      workflowRun = {
        created_at: new Date().toISOString(),
        html_url: 'https://github.com/owner/repo/actions/runs/456'
      };
    });

    it('should return null when workflow service not configured', async () => {
      mockWorkflowService.isConfigured.mockReturnValue(false);

      const result = await service['tryGetPRButton']('owner/repo', workflowRun);

      expect(result).toBeNull();
      expect(mockWorkflowService.getRecentPullRequests).not.toHaveBeenCalled();
    });

    it('should return PR button when recent PR found', async () => {
      mockWorkflowService.isConfigured.mockReturnValue(true);
      
      const workflowTime = new Date();
      workflowRun.created_at = workflowTime.toISOString();
      
      const mockPR = {
        created_at: new Date(workflowTime.getTime() + 60000).toISOString(), // 1 minute after workflow
        html_url: 'https://github.com/owner/repo/pull/123'
      };
      
      mockWorkflowService.getRecentPullRequests.mockResolvedValue([mockPR]);

      const result = await service['tryGetPRButton']('owner/repo', workflowRun);

      expect(result).toBe(mockButtonBuilder);
      expect(mockButtonBuilder.setURL).toHaveBeenCalledWith('https://github.com/owner/repo/pull/123');
      expect(mockWorkflowService.getRecentPullRequests).toHaveBeenCalledWith('owner', 'repo', 5);
    });

    it('should return null when no recent PR found', async () => {
      mockWorkflowService.isConfigured.mockReturnValue(true);
      mockWorkflowService.getRecentPullRequests.mockResolvedValue([]);

      const result = await service['tryGetPRButton']('owner/repo', workflowRun);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully and return null', async () => {
      mockWorkflowService.isConfigured.mockReturnValue(true);
      mockWorkflowService.getRecentPullRequests.mockRejectedValue(new Error('API Error'));

      const result = await service['tryGetPRButton']('owner/repo', workflowRun);

      expect(result).toBeNull();
      expect(service['logger'].debug).toHaveBeenCalledWith('Could not find PR for workflow: API Error');
    });

    it('should match PR within time window', async () => {
      mockWorkflowService.isConfigured.mockReturnValue(true);
      
      const workflowTime = new Date();
      const prTime = new Date(workflowTime.getTime() + 120000); // 2 minutes later (within 5 min window)
      
      workflowRun.created_at = workflowTime.toISOString();
      
      const mockPR = {
        created_at: prTime.toISOString(),
        html_url: 'https://github.com/owner/repo/pull/123'
      };
      
      mockWorkflowService.getRecentPullRequests.mockResolvedValue([mockPR]);

      const result = await service['tryGetPRButton']('owner/repo', workflowRun);

      expect(result).toBe(mockButtonBuilder);
      expect(mockButtonBuilder.setURL).toHaveBeenCalledWith('https://github.com/owner/repo/pull/123');
    });

    it('should not match PR outside time window', async () => {
      mockWorkflowService.isConfigured.mockReturnValue(true);
      
      const workflowTime = new Date();
      const prTime = new Date(workflowTime.getTime() + 600000); // 10 minutes later (outside 5 min window)
      
      workflowRun.created_at = workflowTime.toISOString();
      
      const mockPR = {
        created_at: prTime.toISOString(),
        html_url: 'https://github.com/owner/repo/pull/123'
      };
      
      mockWorkflowService.getRecentPullRequests.mockResolvedValue([mockPR]);

      const result = await service['tryGetPRButton']('owner/repo', workflowRun);

      expect(result).toBeNull();
    });
  });

  describe('cleanupOldWorkflows', () => {
    it('should remove workflows older than MAX_MONITOR_TIME', () => {
      const now = new Date();
      const oldTime = new Date(now.getTime() - 7200000); // 2 hours ago

      service.addWorkflowToMonitor('user1', 'owner/repo1', 123, 'msg1', 'ch1');
      service.addWorkflowToMonitor('user2', 'owner/repo2', 456, 'msg2', 'ch2');

      // Make one workflow old
      const workflow = service['monitoredWorkflows'].get('user1-123');
      if (workflow) {
        workflow.startTime = oldTime;
      }

      service['cleanupOldWorkflows']();

      expect(service['monitoredWorkflows'].size).toBe(1);
      expect(service['monitoredWorkflows'].has('user2-456')).toBe(true);
      expect(service['monitoredWorkflows'].has('user1-123')).toBe(false);
      
      expect(service['logger'].log).toHaveBeenCalledWith(
        expect.stringContaining('Removing old workflow 123 from monitoring')
      );
    });

    it('should not remove workflows within MAX_MONITOR_TIME', () => {
      service.addWorkflowToMonitor('user1', 'owner/repo1', 123, 'msg1', 'ch1');

      service['cleanupOldWorkflows']();

      expect(service['monitoredWorkflows'].size).toBe(1);
    });

    it('should handle empty workflows map', () => {
      expect(() => {
        service['cleanupOldWorkflows']();
      }).not.toThrow();
    });
  });

  describe('Getter Methods', () => {
    describe('getMonitoredWorkflowsCount', () => {
      it('should return 0 for empty map', () => {
        expect(service.getMonitoredWorkflowsCount()).toBe(0);
      });

      it('should return correct count for populated map', () => {
        service.addWorkflowToMonitor('user1', 'owner/repo1', 123, 'msg1', 'ch1');
        service.addWorkflowToMonitor('user2', 'owner/repo2', 456, 'msg2', 'ch2');

        expect(service.getMonitoredWorkflowsCount()).toBe(2);
      });
    });

    describe('getMonitoredWorkflows', () => {
      it('should return empty array for empty map', () => {
        expect(service.getMonitoredWorkflows()).toEqual([]);
      });

      it('should return array of monitored workflows', () => {
        service.addWorkflowToMonitor('user1', 'owner/repo1', 123, 'msg1', 'ch1');
        service.addWorkflowToMonitor('user2', 'owner/repo2', 456, 'msg2', 'ch2');

        const workflows = service.getMonitoredWorkflows();
        
        expect(workflows).toHaveLength(2);
        expect(workflows[0]).toHaveProperty('userId');
        expect(workflows[0]).toHaveProperty('repository');
        expect(workflows[0]).toHaveProperty('runId');
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle full monitoring cycle', async () => {
      const checkAllWorkflowsSpy = jest.spyOn(service as any, 'checkAllWorkflows').mockResolvedValue(undefined);
      
      // Start monitoring
      service.onModuleInit();
      
      // Add workflow
      service.addWorkflowToMonitor('user1', 'owner/repo', 123, 'msg1', 'ch1');
      expect(service.getMonitoredWorkflowsCount()).toBe(1);
      
      // Advance timer to trigger monitoring
      jest.advanceTimersByTime(30000);
      await Promise.resolve(); // Allow promises to resolve
      
      expect(checkAllWorkflowsSpy).toHaveBeenCalled();
      
      // Clean up
      service.onModuleDestroy();
      expect(service['monitorInterval']).toBeNull();
    });

    it('should handle multiple workflows with different states', async () => {
      const updateDiscordMessageSpy = jest.spyOn(service as any, 'updateDiscordMessage').mockResolvedValue(undefined);
      
      service.addWorkflowToMonitor('user1', 'owner/repo1', 123, 'msg1', 'ch1');
      service.addWorkflowToMonitor('user2', 'owner/repo2', 456, 'msg2', 'ch2');

      // Mock different workflow states
      mockWorkflowService.getWorkflowRunStatus
        .mockResolvedValueOnce({
          id: 123,
          status: 'in_progress',
          conclusion: null,
          html_url: 'https://github.com/owner/repo1/actions/runs/123',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          head_branch: 'main'
        } as any)
        .mockResolvedValueOnce({
          id: 456,
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/owner/repo2/actions/runs/456',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          head_branch: 'main'
        } as any);

      await service['checkAllWorkflows']();

      expect(updateDiscordMessageSpy).toHaveBeenCalledTimes(2);
      expect(service.getMonitoredWorkflowsCount()).toBe(1); // One removed after completion
    });

    it('should handle service dependencies correctly', () => {
      expect(service['workflowService']).toBe(mockWorkflowService);
      expect(service['sessionService']).toBe(mockSessionService);
      expect(service['embedService']).toBe(mockEmbedService);
      expect(service['client']).toBe(mockClient);
    });
  });

  describe('Error Resilience', () => {
    it('should continue monitoring after individual workflow errors', async () => {
      service.addWorkflowToMonitor('user1', 'owner/repo1', 123, 'msg1', 'ch1');
      service.addWorkflowToMonitor('user2', 'owner/repo2', 456, 'msg2', 'ch2');

      // First workflow throws error, second succeeds
      mockWorkflowService.getWorkflowRunStatus
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          id: 456,
          status: 'in_progress',
          conclusion: null,
          html_url: 'https://github.com/owner/repo2/actions/runs/456',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          head_branch: 'main'
        } as any);

      await service['checkAllWorkflows']();

      expect(service['logger'].error).toHaveBeenCalledWith(
        'Failed to check workflow 123: API Error'
      );
      expect(service.getMonitoredWorkflowsCount()).toBe(2); // Both workflows still monitored
    });

    it('should handle Discord API failures gracefully', async () => {
      service.addWorkflowToMonitor('user1', 'owner/repo', 123, 'msg1', 'ch1');
      
      mockWorkflowService.getWorkflowRunStatus.mockResolvedValue({
        id: 123,
        status: 'completed',
        conclusion: 'success',
        html_url: 'https://github.com/owner/repo/actions/runs/123',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        head_branch: 'main'
      } as any);
      (mockClient.channels.fetch as jest.Mock).mockRejectedValue(new Error('Discord API Error'));

      await service['checkAllWorkflows']();

      expect(service['logger'].error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update Discord message'),
        expect.any(Error)
      );
    });
  });
});