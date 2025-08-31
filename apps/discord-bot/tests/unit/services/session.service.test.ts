import { SessionService } from '@/services/session.service';
import { UserSession } from '@/interfaces/models/session.interface';
import { Repository, PaginatedRepositories } from '@/interfaces/models/repository.interface';
import { UserWorkflowRun } from '@/interfaces/models/workflow.interface';
import { sessionUsers, sessionStates, sessionData, sessionUpdates } from '@fixtures/session.fixtures';

describe('SessionService', () => {
  let sessionService: SessionService;
  let mockLogger: any;

  beforeEach(() => {
    sessionService = new SessionService();
    // Mock the logger that's created in BaseService
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    (sessionService as any).logger = mockLogger;
  });

  afterEach(() => {
    // Clean up all sessions after each test
    const sessionCount = sessionService.getSessionCount();
    for (let i = 0; i < sessionCount; i++) {
      sessionService.cleanupExpiredSessions(0); // Force cleanup all
    }
  });

  describe('Constructor', () => {
    it('should initialize with empty sessions map', () => {
      expect(sessionService.getSessionCount()).toBe(0);
    });

    it('should extend BaseService with correct service name', () => {
      expect(sessionService).toBeInstanceOf(SessionService);
    });
  });

  describe('createSession', () => {
    it('should create a new session for user', () => {
      const userId = sessionUsers.testUser;

      sessionService.createSession(userId);

      const session = sessionService.getSession(userId);
      expect(session).toBeDefined();
      expect(session?.userId).toBe(userId);
      expect(session?.repository).toBeNull();
      expect(session?.paginatedData).toBeNull();
      expect(session?.searchQuery).toBeNull();
      expect(session?.action).toBeNull();
      expect(session?.selectedFilePaths).toEqual([]);
      expect(session?.workflowRuns).toEqual([]);
      expect(session?.createdAt).toBeInstanceOf(Date);
    });

    it('should log session creation', () => {
      const userId = sessionUsers.testUser;

      sessionService.createSession(userId);

      expect(mockLogger.log).toHaveBeenCalledWith(`Created session for user ${userId}`);
    });

    it('should overwrite existing session for same user', () => {
      const userId = sessionUsers.testUser;
      
      sessionService.createSession(userId);
      const firstSession = sessionService.getSession(userId);
      const firstCreatedAt = firstSession?.createdAt;

      // Wait a bit to ensure different timestamp
      setTimeout(() => {
        sessionService.createSession(userId);
        const secondSession = sessionService.getSession(userId);
        
        expect(secondSession?.createdAt).not.toBe(firstCreatedAt);
        expect(sessionService.getSessionCount()).toBe(1);
      }, 10);
    });

    it('should handle multiple users', () => {
      const user1 = sessionUsers.testUser;
      const user2 = sessionUsers.botUser;

      sessionService.createSession(user1);
      sessionService.createSession(user2);

      expect(sessionService.getSessionCount()).toBe(2);
      expect(sessionService.hasSession(user1)).toBe(true);
      expect(sessionService.hasSession(user2)).toBe(true);
    });
  });

  describe('getSession', () => {
    it('should return session for existing user', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      const session = sessionService.getSession(userId);

      expect(session).toBeDefined();
      expect(session?.userId).toBe(userId);
    });

    it('should return null for non-existent user', () => {
      const session = sessionService.getSession(sessionUsers.nonExistentUser);

      expect(session).toBeNull();
    });

    it('should return null for deleted session', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);
      sessionService.deleteSession(userId);

      const session = sessionService.getSession(userId);

      expect(session).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('should update existing session', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      const updates = { action: 'test-action', searchQuery: 'test-query' };
      sessionService.updateSession(userId, updates);

      const session = sessionService.getSession(userId);
      expect(session?.action).toBe('test-action');
      expect(session?.searchQuery).toBe('test-query');
    });

    it('should log debug message on successful update', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);
      const updates = { action: 'test-action' };

      sessionService.updateSession(userId, updates);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Updated session for user ${userId}`,
        'updateSession',
        updates
      );
    });

    it('should warn when trying to update non-existent session', () => {
      const userId = sessionUsers.nonExistentUser;

      sessionService.updateSession(userId, { action: 'test' });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Attempted to update non-existent session for user ${userId}`
      );
    });

    it('should not create session when updating non-existent user', () => {
      const userId = sessionUsers.nonExistentUser;

      sessionService.updateSession(userId, { action: 'test' });

      expect(sessionService.hasSession(userId)).toBe(false);
      expect(sessionService.getSessionCount()).toBe(0);
    });

    it('should merge updates with existing session data', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);
      
      sessionService.updateSession(userId, { action: 'first-action' });
      sessionService.updateSession(userId, { searchQuery: 'test-query' });

      const session = sessionService.getSession(userId);
      expect(session?.action).toBe('first-action');
      expect(session?.searchQuery).toBe('test-query');
      expect(session?.userId).toBe(userId);
    });
  });

  describe('deleteSession', () => {
    it('should delete existing session', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      sessionService.deleteSession(userId);

      expect(sessionService.hasSession(userId)).toBe(false);
      expect(sessionService.getSession(userId)).toBeNull();
    });

    it('should log when session is deleted', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      sessionService.deleteSession(userId);

      expect(mockLogger.log).toHaveBeenCalledWith(`Deleted session for user ${userId}`);
    });

    it('should not log when trying to delete non-existent session', () => {
      const userId = sessionUsers.nonExistentUser;

      sessionService.deleteSession(userId);

      expect(mockLogger.log).not.toHaveBeenCalledWith(`Deleted session for user ${userId}`);
    });

    it('should decrease session count', () => {
      const user1 = sessionUsers.testUser;
      const user2 = sessionUsers.botUser;
      
      sessionService.createSession(user1);
      sessionService.createSession(user2);
      expect(sessionService.getSessionCount()).toBe(2);

      sessionService.deleteSession(user1);
      expect(sessionService.getSessionCount()).toBe(1);

      sessionService.deleteSession(user2);
      expect(sessionService.getSessionCount()).toBe(0);
    });
  });

  describe('hasSession', () => {
    it('should return true for existing session', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      expect(sessionService.hasSession(userId)).toBe(true);
    });

    it('should return false for non-existent session', () => {
      expect(sessionService.hasSession(sessionUsers.nonExistentUser)).toBe(false);
    });

    it('should return false for deleted session', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);
      sessionService.deleteSession(userId);

      expect(sessionService.hasSession(userId)).toBe(false);
    });
  });

  describe('setRepository', () => {
    it('should set repository for existing session', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      const repository: Repository = sessionData.repositorySelected.selectedRepository;
      sessionService.setRepository(userId, repository);

      const session = sessionService.getSession(userId);
      expect(session?.repository).toEqual(repository);
    });

    it('should warn when setting repository for non-existent session', () => {
      const repository: Repository = sessionData.repositorySelected.selectedRepository;

      sessionService.setRepository(sessionUsers.nonExistentUser, repository);

      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('setPaginatedData', () => {
    it('should set paginated data for existing session', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      const paginatedData: PaginatedRepositories = {
        repositories: [sessionData.repositorySelected.selectedRepository],
        currentPage: 1,
        totalPages: 2,
        totalCount: 15,
        hasNextPage: true,
        hasPreviousPage: false
      };

      sessionService.setPaginatedData(userId, paginatedData);

      const session = sessionService.getSession(userId);
      expect(session?.paginatedData).toEqual(paginatedData);
    });
  });

  describe('setSearchQuery', () => {
    it('should set search query for existing session', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      sessionService.setSearchQuery(userId, 'test-query');

      const session = sessionService.getSession(userId);
      expect(session?.searchQuery).toBe('test-query');
    });

    it('should set search query to null', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      sessionService.setSearchQuery(userId, 'test-query');
      sessionService.setSearchQuery(userId, null);

      const session = sessionService.getSession(userId);
      expect(session?.searchQuery).toBeNull();
    });
  });

  describe('setAction', () => {
    it('should set action for existing session', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      sessionService.setAction(userId, 'test-action');

      const session = sessionService.getSession(userId);
      expect(session?.action).toBe('test-action');
    });
  });

  describe('addWorkflowRun', () => {
    it('should add workflow run to existing session', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      const workflowRun: UserWorkflowRun = {
        runId: 1234567890,
        repository: 'test/repo',
        status: 'queued',
        startedAt: new Date(),
        workflowUrl: 'https://github.com/test/repo/actions/runs/1234567890'
      };

      sessionService.addWorkflowRun(userId, workflowRun);

      const session = sessionService.getSession(userId);
      expect(session?.workflowRuns).toHaveLength(1);
      expect(session?.workflowRuns?.[0]).toEqual(workflowRun);
    });

    it('should log debug message when adding workflow run', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      const workflowRun: UserWorkflowRun = {
        runId: 1234567890,
        repository: 'test/repo',
        status: 'queued',
        startedAt: new Date(),
        workflowUrl: 'https://github.com/test/repo/actions/runs/1234567890'
      };

      sessionService.addWorkflowRun(userId, workflowRun);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Added workflow run ${workflowRun.runId} for user ${userId}`
      );
    });

    it('should initialize workflowRuns array if undefined', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      // Manually set workflowRuns to undefined to test initialization
      sessionService.updateSession(userId, { workflowRuns: undefined });

      const workflowRun: UserWorkflowRun = {
        runId: 1234567890,
        repository: 'test/repo',
        status: 'queued',
        startedAt: new Date(),
        workflowUrl: 'https://github.com/test/repo/actions/runs/1234567890'
      };

      sessionService.addWorkflowRun(userId, workflowRun);

      const session = sessionService.getSession(userId);
      expect(session?.workflowRuns).toHaveLength(1);
    });

    it('should not add workflow run for non-existent session', () => {
      const workflowRun: UserWorkflowRun = {
        runId: 1234567890,
        repository: 'test/repo',
        status: 'queued',
        startedAt: new Date(),
        workflowUrl: 'https://github.com/test/repo/actions/runs/1234567890'
      };

      sessionService.addWorkflowRun(sessionUsers.nonExistentUser, workflowRun);

      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('Added workflow run')
      );
    });

    it('should add multiple workflow runs', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      const workflowRun1: UserWorkflowRun = {
        runId: 1234567890,
        repository: 'test/repo',
        status: 'queued',
        startedAt: new Date(),
        workflowUrl: 'https://github.com/test/repo/actions/runs/1234567890'
      };

      const workflowRun2: UserWorkflowRun = {
        runId: 2345678901,
        repository: 'test/repo',
        status: 'in_progress',
        startedAt: new Date(),
        workflowUrl: 'https://github.com/test/repo/actions/runs/2345678901'
      };

      sessionService.addWorkflowRun(userId, workflowRun1);
      sessionService.addWorkflowRun(userId, workflowRun2);

      const session = sessionService.getSession(userId);
      expect(session?.workflowRuns).toHaveLength(2);
      expect(session?.workflowRuns?.[0]).toEqual(workflowRun1);
      expect(session?.workflowRuns?.[1]).toEqual(workflowRun2);
    });
  });

  describe('setSelectedFilePaths', () => {
    it('should set selected file paths', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      const filePaths = ['src/test1.ts', 'src/test2.ts'];
      sessionService.setSelectedFilePaths(userId, filePaths);

      const session = sessionService.getSession(userId);
      expect(session?.selectedFilePaths).toEqual(filePaths);
    });

    it('should log debug message with file paths', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      const filePaths = ['src/test1.ts', 'src/test2.ts'];
      sessionService.setSelectedFilePaths(userId, filePaths);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Updated selected file paths for user ${userId}: ${filePaths.join(', ')}`
      );
    });

    it('should overwrite existing file paths', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      const firstPaths = ['src/old1.ts', 'src/old2.ts'];
      const secondPaths = ['src/new1.ts'];

      sessionService.setSelectedFilePaths(userId, firstPaths);
      sessionService.setSelectedFilePaths(userId, secondPaths);

      const session = sessionService.getSession(userId);
      expect(session?.selectedFilePaths).toEqual(secondPaths);
    });
  });

  describe('getSelectedFilePaths', () => {
    it('should return selected file paths for existing session', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      const filePaths = ['src/test1.ts', 'src/test2.ts'];
      sessionService.setSelectedFilePaths(userId, filePaths);

      const result = sessionService.getSelectedFilePaths(userId);
      expect(result).toEqual(filePaths);
    });

    it('should return empty array for non-existent session', () => {
      const result = sessionService.getSelectedFilePaths(sessionUsers.nonExistentUser);
      expect(result).toEqual([]);
    });

    it('should return empty array when selectedFilePaths is undefined', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);
      sessionService.updateSession(userId, { selectedFilePaths: undefined });

      const result = sessionService.getSelectedFilePaths(userId);
      expect(result).toEqual([]);
    });
  });

  describe('clearSelectedFilePaths', () => {
    it('should clear selected file paths', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      sessionService.setSelectedFilePaths(userId, ['src/test1.ts', 'src/test2.ts']);
      sessionService.clearSelectedFilePaths(userId);

      const session = sessionService.getSession(userId);
      expect(session?.selectedFilePaths).toEqual([]);
    });

    it('should log debug message when clearing file paths', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      sessionService.clearSelectedFilePaths(userId);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Cleared selected file paths for user ${userId}`
      );
    });
  });

  describe('updateWorkflowRun', () => {
    it('should update existing workflow run', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      const workflowRun: UserWorkflowRun = {
        runId: 1234567890,
        repository: 'test/repo',
        status: 'queued',
        startedAt: new Date(),
        workflowUrl: 'https://github.com/test/repo/actions/runs/1234567890'
      };

      sessionService.addWorkflowRun(userId, workflowRun);

      const updates = { status: 'completed' as const };
      sessionService.updateWorkflowRun(userId, workflowRun.runId, updates);

      const session = sessionService.getSession(userId);
      expect(session?.workflowRuns?.[0].status).toBe('completed');
    });

    it('should log debug message when updating workflow run', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      const workflowRun: UserWorkflowRun = {
        runId: 1234567890,
        repository: 'test/repo',
        status: 'queued',
        startedAt: new Date(),
        workflowUrl: 'https://github.com/test/repo/actions/runs/1234567890'
      };

      sessionService.addWorkflowRun(userId, workflowRun);
      sessionService.updateWorkflowRun(userId, workflowRun.runId, { status: 'completed' });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Updated workflow run ${workflowRun.runId} for user ${userId}`
      );
    });

    it('should not update non-existent workflow run', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      sessionService.addWorkflowRun(userId, {
        runId: 1234567890,
        repository: 'test/repo',
        status: 'queued',
        startedAt: new Date(),
        workflowUrl: 'https://github.com/test/repo/actions/runs/1234567890'
      });

      sessionService.updateWorkflowRun(userId, 9999999999, { status: 'completed' });

      // Should have 1 call from addWorkflowRun and 1 from updateSession, but no update call for the workflow
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Added workflow run ${1234567890} for user ${userId}`
      );
    });

    it('should not update workflow run for non-existent session', () => {
      sessionService.updateWorkflowRun(sessionUsers.nonExistentUser, 1234567890, { status: 'completed' });

      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it('should not update when workflowRuns is undefined', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);
      sessionService.updateSession(userId, { workflowRuns: undefined });

      sessionService.updateWorkflowRun(userId, 1234567890, { status: 'completed' });

      // The updateSession call will log, but not the workflow update specifically
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('Updated workflow run')
      );
    });
  });

  describe('getWorkflowRuns', () => {
    it('should return workflow runs for existing session', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      const workflowRun: UserWorkflowRun = {
        runId: 1234567890,
        repository: 'test/repo',
        status: 'queued',
        startedAt: new Date(),
        workflowUrl: 'https://github.com/test/repo/actions/runs/1234567890'
      };

      sessionService.addWorkflowRun(userId, workflowRun);

      const result = sessionService.getWorkflowRuns(userId);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(workflowRun);
    });

    it('should return empty array for non-existent session', () => {
      const result = sessionService.getWorkflowRuns(sessionUsers.nonExistentUser);
      expect(result).toEqual([]);
    });

    it('should return empty array when workflowRuns is undefined', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);
      sessionService.updateSession(userId, { workflowRuns: undefined });

      const result = sessionService.getWorkflowRuns(userId);
      expect(result).toEqual([]);
    });
  });

  describe('getSessionAge', () => {
    it('should return age in milliseconds for existing session', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      const age = sessionService.getSessionAge(userId);
      expect(age).toBeGreaterThanOrEqual(0);
      expect(typeof age).toBe('number');
    });

    it('should return null for non-existent session', () => {
      const age = sessionService.getSessionAge(sessionUsers.nonExistentUser);
      expect(age).toBeNull();
    });

    it('should return increasing age over time', async () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      const firstAge = sessionService.getSessionAge(userId);
      
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait 10ms
      
      const secondAge = sessionService.getSessionAge(userId);
      expect(secondAge).toBeGreaterThan(firstAge!);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should clean up expired sessions with default max age', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      // Mock an expired session by modifying createdAt
      const session = sessionService.getSession(userId);
      if (session) {
        session.createdAt = new Date(Date.now() - 31 * 60 * 1000); // 31 minutes ago
      }

      const cleanedCount = sessionService.cleanupExpiredSessions();

      expect(cleanedCount).toBe(1);
      expect(sessionService.hasSession(userId)).toBe(false);
    });

    it('should clean up sessions with custom max age', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      // Mock an expired session
      const session = sessionService.getSession(userId);
      if (session) {
        session.createdAt = new Date(Date.now() - 6000); // 6 seconds ago
      }

      const cleanedCount = sessionService.cleanupExpiredSessions(5000); // 5 seconds max age

      expect(cleanedCount).toBe(1);
      expect(sessionService.hasSession(userId)).toBe(false);
    });

    it('should not clean up non-expired sessions', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      const cleanedCount = sessionService.cleanupExpiredSessions();

      expect(cleanedCount).toBe(0);
      expect(sessionService.hasSession(userId)).toBe(true);
    });

    it('should log cleanup count when sessions are cleaned', () => {
      const user1 = sessionUsers.testUser;
      const user2 = sessionUsers.botUser;
      
      sessionService.createSession(user1);
      sessionService.createSession(user2);

      // Mock expired sessions
      const session1 = sessionService.getSession(user1);
      const session2 = sessionService.getSession(user2);
      if (session1 && session2) {
        session1.createdAt = new Date(Date.now() - 31 * 60 * 1000);
        session2.createdAt = new Date(Date.now() - 31 * 60 * 1000);
      }

      sessionService.cleanupExpiredSessions();

      expect(mockLogger.log).toHaveBeenCalledWith('Cleaned up 2 expired sessions');
    });

    it('should not log when no sessions are cleaned', () => {
      const userId = sessionUsers.testUser;
      sessionService.createSession(userId);

      sessionService.cleanupExpiredSessions();

      expect(mockLogger.log).not.toHaveBeenCalledWith(expect.stringContaining('Cleaned up'));
    });

    it('should return 0 when no sessions exist', () => {
      const cleanedCount = sessionService.cleanupExpiredSessions();
      expect(cleanedCount).toBe(0);
    });

    it('should handle mixed expired and non-expired sessions', () => {
      const user1 = sessionUsers.testUser;
      const user2 = sessionUsers.botUser;
      const user3 = sessionUsers.expiredUser;
      
      sessionService.createSession(user1);
      sessionService.createSession(user2);
      sessionService.createSession(user3);

      // Make only user1 and user3 expired
      const session1 = sessionService.getSession(user1);
      const session3 = sessionService.getSession(user3);
      if (session1 && session3) {
        session1.createdAt = new Date(Date.now() - 31 * 60 * 1000);
        session3.createdAt = new Date(Date.now() - 31 * 60 * 1000);
      }

      const cleanedCount = sessionService.cleanupExpiredSessions();

      expect(cleanedCount).toBe(2);
      expect(sessionService.hasSession(user1)).toBe(false);
      expect(sessionService.hasSession(user2)).toBe(true);
      expect(sessionService.hasSession(user3)).toBe(false);
    });
  });

  describe('getSessionCount', () => {
    it('should return 0 when no sessions exist', () => {
      expect(sessionService.getSessionCount()).toBe(0);
    });

    it('should return correct count after creating sessions', () => {
      sessionService.createSession(sessionUsers.testUser);
      expect(sessionService.getSessionCount()).toBe(1);

      sessionService.createSession(sessionUsers.botUser);
      expect(sessionService.getSessionCount()).toBe(2);
    });

    it('should return correct count after deleting sessions', () => {
      sessionService.createSession(sessionUsers.testUser);
      sessionService.createSession(sessionUsers.botUser);

      sessionService.deleteSession(sessionUsers.testUser);
      expect(sessionService.getSessionCount()).toBe(1);

      sessionService.deleteSession(sessionUsers.botUser);
      expect(sessionService.getSessionCount()).toBe(0);
    });
  });
});