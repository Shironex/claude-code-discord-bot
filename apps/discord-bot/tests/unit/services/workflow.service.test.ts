import { ConfigService } from '@nestjs/config';
import { WorkflowService } from '@/services/workflow.service';
import { WorkflowDispatchRequest, WorkflowRun, WorkflowFile } from '@/interfaces/models/workflow.interface';
import { LoggerFactory } from '@claude-code/shared';

describe('WorkflowService', () => {
  let workflowService: WorkflowService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockLoggerFactory: jest.Mocked<LoggerFactory>;
  let mockLogger: any;
  let mockOctokit: any;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockLoggerFactory = {
      createLogger: jest.fn().mockReturnValue(mockLogger),
      getAllLoggers: jest.fn(),
      flushAll: jest.fn(),
      clear: jest.fn(),
    } as any;

    mockConfigService = {
      get: jest.fn(),
      getOrThrow: jest.fn(),
      set: jest.fn(),
      setEnvFilePaths: jest.fn(),
      changes$: {} as any,
    } as any;

    // Mock GitHub token to be present
    mockConfigService.get.mockReturnValue('mock-github-token');

    workflowService = new WorkflowService(mockConfigService, mockLoggerFactory);

    // Mock the Octokit instance
    mockOctokit = {
      rest: {
        repos: {
          getContent: jest.fn(),
        },
        actions: {
          createWorkflowDispatch: jest.fn(),
          listWorkflowRuns: jest.fn(),
          getWorkflowRun: jest.fn(),
          listRepoWorkflows: jest.fn(),
        },
        pulls: {
          list: jest.fn(),
        },
      },
    };

    (workflowService as any).octokit = mockOctokit;
  });

  describe('Constructor', () => {
    it('should initialize with required GitHub access', () => {
      expect(workflowService).toBeInstanceOf(WorkflowService);
      expect(mockConfigService.get).toHaveBeenCalledWith('GITHUB_TOKEN');
    });

    it('should throw error when GitHub token is missing', () => {
      mockConfigService.get.mockReturnValue(null);
      
      expect(() => {
        new WorkflowService(mockConfigService, mockLoggerFactory);
      }).toThrow();
    });
  });

  describe('checkWorkflowExists', () => {
    it('should return true when workflow file exists', async () => {
      const mockContent = {
        name: 'claude.yml',
        path: '.github/workflows/claude.yml',
        type: 'file',
      };
      
      mockOctokit.rest.repos.getContent.mockResolvedValue({ data: mockContent });

      const result = await workflowService.checkWorkflowExists('owner', 'repo');

      expect(result).toBe(true);
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: '.github/workflows/claude.yml',
      });
      expect(mockLogger.log).toHaveBeenCalledWith('Found workflow file: claude.yml in owner/repo');
    });

    it('should return false when workflow file does not exist (404)', async () => {
      const error = new Error('Not Found');
      (error as any).status = 404;
      
      mockOctokit.rest.repos.getContent.mockRejectedValue(error);

      const result = await workflowService.checkWorkflowExists('owner', 'repo');

      expect(result).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith('Workflow file not found: claude.yml in owner/repo');
    });

    it('should check custom workflow file name', async () => {
      const mockContent = {
        name: 'custom.yml',
        path: '.github/workflows/custom.yml',
        type: 'file',
      };
      
      mockOctokit.rest.repos.getContent.mockResolvedValue({ data: mockContent });

      await workflowService.checkWorkflowExists('owner', 'repo', 'custom.yml');

      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: '.github/workflows/custom.yml',
      });
    });

    it('should throw error for non-404 errors', async () => {
      const error = new Error('Server Error');
      (error as any).status = 500;
      
      mockOctokit.rest.repos.getContent.mockRejectedValue(error);

      await expect(
        workflowService.checkWorkflowExists('owner', 'repo')
      ).rejects.toThrow('Failed to check workflow file: Server Error');

      expect(mockLogger.error).toHaveBeenCalledWith('Error checking workflow file: Server Error');
    });

    it('should throw error when GitHub access is not configured', async () => {
      (workflowService as any).hasGitHubAccess = false;
      (workflowService as any).octokit = null;

      await expect(
        workflowService.checkWorkflowExists('owner', 'repo')
      ).rejects.toThrow();
    });
  });

  describe('dispatchWorkflow', () => {
    const mockRequest: WorkflowDispatchRequest = {
      owner: 'owner',
      repo: 'repo',
      workflowId: 'workflow.yml',
      ref: 'main',
      inputs: {
        prompt: 'test prompt for dispatch workflow',
        tracking_id: 'track-123',
      },
    };

    it('should successfully dispatch workflow', async () => {
      mockOctokit.rest.actions.createWorkflowDispatch.mockResolvedValue({});

      await workflowService.dispatchWorkflow(mockRequest);

      expect(mockOctokit.rest.actions.createWorkflowDispatch).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        workflow_id: 'workflow.yml',
        ref: 'main',
        inputs: {
          prompt: 'test prompt for dispatch workflow',
          tracking_id: 'track-123',
        },
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Successfully dispatched workflow: workflow.yml'
      );
    });

    it('should log prompt and tracking ID', async () => {
      mockOctokit.rest.actions.createWorkflowDispatch.mockResolvedValue({});

      await workflowService.dispatchWorkflow(mockRequest);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Prompt: test prompt for dispatch workflow...'
      );
      expect(mockLogger.log).toHaveBeenCalledWith('Tracking ID: track-123');
    });

    it('should handle long prompts by truncating', async () => {
      mockOctokit.rest.actions.createWorkflowDispatch.mockResolvedValue({});
      
      const longPromptRequest = {
        ...mockRequest,
        inputs: {
          prompt: 'a'.repeat(200), // 200 character prompt
        },
      };

      await workflowService.dispatchWorkflow(longPromptRequest);

      expect(mockLogger.log).toHaveBeenCalledWith(
        `Prompt: ${'a'.repeat(100)}...`
      );
    });

    it('should not log tracking ID when not provided', async () => {
      mockOctokit.rest.actions.createWorkflowDispatch.mockResolvedValue({});
      
      const requestWithoutTracking = {
        ...mockRequest,
        inputs: { prompt: 'test prompt' },
      };

      await workflowService.dispatchWorkflow(requestWithoutTracking);

      expect(mockLogger.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Tracking ID:')
      );
    });

    it('should throw error when dispatch fails', async () => {
      const error = new Error('Dispatch failed');
      mockOctokit.rest.actions.createWorkflowDispatch.mockRejectedValue(error);

      await expect(
        workflowService.dispatchWorkflow(mockRequest)
      ).rejects.toThrow('Failed to dispatch workflow: Dispatch failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to dispatch workflow: Dispatch failed',
        error
      );
    });

    it('should throw error when GitHub access is not configured', async () => {
      (workflowService as any).hasGitHubAccess = false;
      (workflowService as any).octokit = null;

      await expect(
        workflowService.dispatchWorkflow(mockRequest)
      ).rejects.toThrow();
    });
  });

  describe('getWorkflowRuns', () => {
    const mockWorkflowRuns: WorkflowRun[] = [
      {
        id: 1,
        status: 'completed',
        conclusion: 'success',
        html_url: 'https://github.com/owner/repo/actions/runs/1',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:05:00Z',
        run_number: 1,
        head_branch: 'main',
      },
      {
        id: 2,
        status: 'in_progress',
        conclusion: null,
        html_url: 'https://github.com/owner/repo/actions/runs/2',
        created_at: '2023-01-01T01:00:00Z',
        updated_at: '2023-01-01T01:02:00Z',
        run_number: 2,
        head_branch: 'main',
      },
    ];

    it('should return workflow runs', async () => {
      mockOctokit.rest.actions.listWorkflowRuns.mockResolvedValue({
        data: {
          total_count: 2,
          workflow_runs: mockWorkflowRuns,
        },
      });

      const result = await workflowService.getWorkflowRuns('owner', 'repo', 'workflow.yml');

      expect(result).toEqual(mockWorkflowRuns);
      expect(mockOctokit.rest.actions.listWorkflowRuns).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        workflow_id: 'workflow.yml',
        per_page: 5,
      });
    });

    it('should use custom limit', async () => {
      mockOctokit.rest.actions.listWorkflowRuns.mockResolvedValue({
        data: {
          total_count: 0,
          workflow_runs: [],
        },
      });

      await workflowService.getWorkflowRuns('owner', 'repo', 'workflow.yml', 10);

      expect(mockOctokit.rest.actions.listWorkflowRuns).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        workflow_id: 'workflow.yml',
        per_page: 10,
      });
    });

    it('should log the number of runs found', async () => {
      mockOctokit.rest.actions.listWorkflowRuns.mockResolvedValue({
        data: {
          total_count: 2,
          workflow_runs: mockWorkflowRuns,
        },
      });

      await workflowService.getWorkflowRuns('owner', 'repo', 'workflow.yml');

      expect(mockLogger.log).toHaveBeenCalledWith('Found 2 workflow runs');
    });

    it('should throw error when fetching runs fails', async () => {
      const error = new Error('API Error');
      mockOctokit.rest.actions.listWorkflowRuns.mockRejectedValue(error);

      await expect(
        workflowService.getWorkflowRuns('owner', 'repo', 'workflow.yml')
      ).rejects.toThrow('Failed to fetch workflow runs: API Error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch workflow runs: API Error',
        error
      );
    });

    it('should throw error when GitHub access is not configured', async () => {
      (workflowService as any).hasGitHubAccess = false;
      (workflowService as any).octokit = null;

      await expect(
        workflowService.getWorkflowRuns('owner', 'repo', 'workflow.yml')
      ).rejects.toThrow();
    });
  });

  describe('getWorkflowRunStatus', () => {
    const mockWorkflowRun: WorkflowRun = {
      id: 123,
      status: 'completed',
      conclusion: 'success',
      html_url: 'https://github.com/owner/repo/actions/runs/123',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:05:00Z',
      run_number: 1,
      head_branch: 'main',
    };

    it('should return workflow run status', async () => {
      mockOctokit.rest.actions.getWorkflowRun.mockResolvedValue({
        data: mockWorkflowRun,
      });

      const result = await workflowService.getWorkflowRunStatus('owner', 'repo', 123);

      expect(result).toEqual(mockWorkflowRun);
      expect(mockOctokit.rest.actions.getWorkflowRun).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        run_id: 123,
      });
    });

    it('should log fetching status', async () => {
      mockOctokit.rest.actions.getWorkflowRun.mockResolvedValue({
        data: mockWorkflowRun,
      });

      await workflowService.getWorkflowRunStatus('owner', 'repo', 123);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Fetching workflow run status: owner/repo run: 123'
      );
    });

    it('should throw error when fetching status fails', async () => {
      const error = new Error('Run not found');
      mockOctokit.rest.actions.getWorkflowRun.mockRejectedValue(error);

      await expect(
        workflowService.getWorkflowRunStatus('owner', 'repo', 123)
      ).rejects.toThrow('Failed to fetch workflow run status: Run not found');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch workflow run status: Run not found',
        error
      );
    });

    it('should throw error when GitHub access is not configured', async () => {
      (workflowService as any).hasGitHubAccess = false;

      await expect(
        workflowService.getWorkflowRunStatus('owner', 'repo', 123)
      ).rejects.toThrow();
    });
  });

  describe('getLatestWorkflowRun', () => {
    const mockWorkflowRun: WorkflowRun = {
      id: 123,
      status: 'completed',
      conclusion: 'success',
      html_url: 'https://github.com/owner/repo/actions/runs/123',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:05:00Z',
      run_number: 1,
      head_branch: 'main',
    };

    it('should return latest workflow run when runs exist', async () => {
      mockOctokit.rest.actions.listWorkflowRuns.mockResolvedValue({
        data: {
          total_count: 1,
          workflow_runs: [mockWorkflowRun],
        },
      });

      const result = await workflowService.getLatestWorkflowRun('owner', 'repo', 'workflow.yml');

      expect(result).toEqual(mockWorkflowRun);
    });

    it('should return null when no runs exist', async () => {
      mockOctokit.rest.actions.listWorkflowRuns.mockResolvedValue({
        data: {
          total_count: 0,
          workflow_runs: [],
        },
      });

      const result = await workflowService.getLatestWorkflowRun('owner', 'repo', 'workflow.yml');

      expect(result).toBeNull();
    });

    it('should return null when API call fails', async () => {
      const error = new Error('API Error');
      mockOctokit.rest.actions.listWorkflowRuns.mockRejectedValue(error);

      const result = await workflowService.getLatestWorkflowRun('owner', 'repo', 'workflow.yml');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get latest workflow run: Failed to fetch workflow runs: API Error'
      );
    });

    it('should request only 1 run', async () => {
      mockOctokit.rest.actions.listWorkflowRuns.mockResolvedValue({
        data: {
          total_count: 0,
          workflow_runs: [],
        },
      });

      await workflowService.getLatestWorkflowRun('owner', 'repo', 'workflow.yml');

      expect(mockOctokit.rest.actions.listWorkflowRuns).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        workflow_id: 'workflow.yml',
        per_page: 1,
      });
    });
  });

  describe('listWorkflows', () => {
    const mockWorkflows: WorkflowFile[] = [
      {
        name: 'CI',
        path: '.github/workflows/ci.yml',
        state: 'active',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:05:00Z',
        url: 'https://api.github.com/repos/owner/repo/actions/workflows/ci.yml',
        html_url: 'https://github.com/owner/repo/actions/workflows/ci.yml',
        badge_url: 'https://github.com/owner/repo/workflows/CI/badge.svg',
      },
    ];

    it('should return list of workflows', async () => {
      mockOctokit.rest.actions.listRepoWorkflows.mockResolvedValue({
        data: {
          workflows: mockWorkflows,
        },
      });

      const result = await workflowService.listWorkflows('owner', 'repo');

      expect(result).toEqual(mockWorkflows);
      expect(mockOctokit.rest.actions.listRepoWorkflows).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
      });
    });

    it('should log listing workflows', async () => {
      mockOctokit.rest.actions.listRepoWorkflows.mockResolvedValue({
        data: {
          workflows: mockWorkflows,
        },
      });

      await workflowService.listWorkflows('owner', 'repo');

      expect(mockLogger.log).toHaveBeenCalledWith('Listing workflows for: owner/repo');
    });

    it('should throw error when listing workflows fails', async () => {
      const error = new Error('Access denied');
      mockOctokit.rest.actions.listRepoWorkflows.mockRejectedValue(error);

      await expect(
        workflowService.listWorkflows('owner', 'repo')
      ).rejects.toThrow('Failed to list workflows: Access denied');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to list workflows: Access denied',
        error
      );
    });

    it('should throw error when GitHub access is not configured', async () => {
      (workflowService as any).hasGitHubAccess = false;

      await expect(
        workflowService.listWorkflows('owner', 'repo')
      ).rejects.toThrow();
    });
  });

  describe('findWorkflowRunByTrackingId', () => {
    const mockDispatchTime = Date.now();

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(mockDispatchTime);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should find workflow run by tracking ID', async () => {
      const mockRun: WorkflowRun = {
        id: 123,
        status: 'queued',
        conclusion: null,
        html_url: 'https://github.com/owner/repo/actions/runs/123',
        created_at: new Date(mockDispatchTime + 1000).toISOString(), // Created after dispatch
        updated_at: new Date(mockDispatchTime + 1000).toISOString(),
        run_number: 1,
        head_branch: 'main',
      };

      // Mock listWorkflowRuns for both queued and in_progress
      mockOctokit.rest.actions.listWorkflowRuns
        .mockResolvedValueOnce({ data: { workflow_runs: [mockRun] } }) // queued
        .mockResolvedValueOnce({ data: { workflow_runs: [] } }); // in_progress

      // Mock getWorkflowRun
      mockOctokit.rest.actions.getWorkflowRun.mockResolvedValue({
        data: mockRun,
      });

      const result = await workflowService.findWorkflowRunByTrackingId(
        'owner',
        'repo',
        'workflow.yml',
        'track-123',
        mockDispatchTime,
        1
      );

      expect(result).toEqual(mockRun);
    });

    it('should handle multiple polling attempts', async () => {
      // First attempt - no runs found
      mockOctokit.rest.actions.listWorkflowRuns
        .mockResolvedValueOnce({ data: { workflow_runs: [] } })
        .mockResolvedValueOnce({ data: { workflow_runs: [] } });

      const result = await workflowService.findWorkflowRunByTrackingId(
        'owner',
        'repo',
        'workflow.yml',
        'track-123',
        mockDispatchTime,
        1
      );

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not find workflow run with tracking ID track-123')
      );
    });

    it('should respect time window constraints', async () => {
      const tooOldRun: WorkflowRun = {
        id: 123,
        status: 'queued',
        conclusion: null,
        html_url: 'https://github.com/owner/repo/actions/runs/123',
        created_at: new Date(mockDispatchTime - 10000).toISOString(), // Too old
        updated_at: new Date(mockDispatchTime - 10000).toISOString(),
        run_number: 1,
        head_branch: 'main',
      };

      mockOctokit.rest.actions.listWorkflowRuns
        .mockResolvedValue({ data: { workflow_runs: [tooOldRun] } });

      const result = await workflowService.findWorkflowRunByTrackingId(
        'owner',
        'repo',
        'workflow.yml',
        'track-123',
        mockDispatchTime,
        1
      );

      expect(result).toBeNull();
      expect(mockOctokit.rest.actions.getWorkflowRun).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockOctokit.rest.actions.listWorkflowRuns.mockRejectedValue(error);

      const result = await workflowService.findWorkflowRunByTrackingId(
        'owner',
        'repo',
        'workflow.yml',
        'track-123',
        mockDispatchTime,
        1
      );

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error searching for workflow run: API Error'
      );
    });


    it('should handle getWorkflowRun failures for individual runs', async () => {
      const mockRun: WorkflowRun = {
        id: 123,
        status: 'queued',
        conclusion: null,
        html_url: 'https://github.com/owner/repo/actions/runs/123',
        created_at: new Date(mockDispatchTime + 1000).toISOString(),
        updated_at: new Date(mockDispatchTime + 1000).toISOString(),
        run_number: 1,
        head_branch: 'main',
      };

      mockOctokit.rest.actions.listWorkflowRuns
        .mockResolvedValueOnce({ data: { workflow_runs: [mockRun] } })
        .mockResolvedValueOnce({ data: { workflow_runs: [] } });

      // getWorkflowRun fails for this specific run
      const error = new Error('Run details not found');
      mockOctokit.rest.actions.getWorkflowRun.mockRejectedValue(error);

      const result = await workflowService.findWorkflowRunByTrackingId(
        'owner',
        'repo',
        'workflow.yml',
        'track-123',
        mockDispatchTime,
        1
      );

      expect(result).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Error fetching run details for 123: Run details not found'
      );
    });
  });

  describe('getRecentPullRequests', () => {
    const mockPRs = [
      {
        id: 1,
        number: 1,
        title: 'Test PR',
        state: 'open',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:05:00Z',
        html_url: 'https://github.com/owner/repo/pull/1',
      },
    ];

    it('should return recent pull requests', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: mockPRs,
      });

      const result = await workflowService.getRecentPullRequests('owner', 'repo');

      expect(result).toEqual(mockPRs);
      expect(mockOctokit.rest.pulls.list).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        state: 'open',
        sort: 'created',
        direction: 'desc',
        per_page: 5,
      });
    });

    it('should use custom limit', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: mockPRs,
      });

      await workflowService.getRecentPullRequests('owner', 'repo', 10);

      expect(mockOctokit.rest.pulls.list).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        state: 'open',
        sort: 'created',
        direction: 'desc',
        per_page: 10,
      });
    });

    it('should throw error when fetching PRs fails', async () => {
      const error = new Error('API Error');
      mockOctokit.rest.pulls.list.mockRejectedValue(error);

      await expect(
        workflowService.getRecentPullRequests('owner', 'repo')
      ).rejects.toThrow('Failed to fetch pull requests: API Error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch pull requests: API Error',
        error
      );
    });

    it('should throw error when GitHub access is not configured', async () => {
      (workflowService as any).hasGitHubAccess = false;

      await expect(
        workflowService.getRecentPullRequests('owner', 'repo')
      ).rejects.toThrow();
    });
  });

  describe('isConfigured', () => {
    it('should return true when GitHub access is available', () => {
      (workflowService as any).hasGitHubAccess = true;

      const result = workflowService.isConfigured();

      expect(result).toBe(true);
    });

    it('should return false when GitHub access is not available', () => {
      (workflowService as any).hasGitHubAccess = false;

      const result = workflowService.isConfigured();

      expect(result).toBe(false);
    });
  });
});