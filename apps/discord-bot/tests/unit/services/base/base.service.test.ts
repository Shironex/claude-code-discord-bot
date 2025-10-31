import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggerService, LoggerFactory } from '@claude-code/shared';
import { Octokit } from '@octokit/rest';

import { BaseService } from '@/services/base/base.service';
import { 
  createMockConfigService, 
  createMockLoggerFactory,
  createMockLogger,
  setupTestEnvironment,
  cleanupTestEnvironment 
} from '@mocks/nestjs.mock';

// Test implementation of abstract BaseService
class TestBaseService extends BaseService {
  constructor(
    serviceName: string,
    loggerFactory?: LoggerFactory,
    configService?: ConfigService,
    requireGitHub: boolean = false
  ) {
    super(serviceName, loggerFactory, configService, requireGitHub);
  }

  // Expose protected methods for testing
  public testValidateGitHubAccess(): void {
    return this.validateGitHubAccess();
  }

  // Expose protected properties for testing
  public get testOctokit(): Octokit | null {
    return this.octokit;
  }

  public get testHasGitHubAccess(): boolean {
    return this.hasGitHubAccess;
  }

  public get testLogger(): LoggerService {
    return this.logger;
  }
}

// Mock LoggerService constructor
jest.mock('@claude-code/shared', () => ({
  LoggerService: jest.fn().mockImplementation((serviceName: string) => createMockLogger()),
  LoggerFactory: jest.fn(),
}));

// Mock Octokit
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      users: {
        getAuthenticated: jest.fn(),
      },
    },
  })),
}));

describe('BaseService', () => {
  let mockConfigService: any;
  let mockLoggerFactory: any;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    setupTestEnvironment();
    
    mockConfigService = createMockConfigService();
    mockLoggerFactory = createMockLoggerFactory();
    mockLogger = createMockLogger();
    
    // Reset mock implementations
    (LoggerService as jest.MockedClass<typeof LoggerService>).mockImplementation(() => mockLogger);
    mockLoggerFactory.createLogger.mockReturnValue(mockLogger);
    
    // Reset Octokit mock to default working implementation
    (Octokit as jest.MockedClass<typeof Octokit>).mockImplementation(() => ({
      rest: {
        users: {
          getAuthenticated: jest.fn(),
        },
      },
    }) as any);
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('Constructor - LoggerFactory Only (No GitHub)', () => {
    it('should initialize with LoggerFactory only', () => {
      const service = new TestBaseService('TestService', mockLoggerFactory);

      expect(mockLoggerFactory.createLogger).toHaveBeenCalledWith('TestService');
      expect(service.testLogger).toBe(mockLogger);
      expect(service.testOctokit).toBeNull();
      expect(service.testHasGitHubAccess).toBe(false);
    });

    it('should handle LoggerFactory creation', () => {
      const serviceName = 'MyTestService';
      const service = new TestBaseService(serviceName, mockLoggerFactory);

      expect(mockLoggerFactory.createLogger).toHaveBeenCalledTimes(1);
      expect(mockLoggerFactory.createLogger).toHaveBeenCalledWith(serviceName);
      expect(service.testLogger).toBeDefined();
    });
  });

  describe('Constructor - ConfigService + LoggerFactory (GitHub Optional)', () => {
    it('should initialize with both ConfigService and LoggerFactory when GitHub token is present', () => {
      mockConfigService.get.mockReturnValue('test-github-token');

      const service = new TestBaseService('TestService', mockLoggerFactory, mockConfigService, false);

      expect(mockLoggerFactory.createLogger).toHaveBeenCalledWith('TestService');
      expect(mockConfigService.get).toHaveBeenCalledWith('GITHUB_TOKEN');
      expect(Octokit).toHaveBeenCalledWith({ auth: 'test-github-token' });
      expect(service.testOctokit).toBeDefined();
      expect(service.testHasGitHubAccess).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith('TestService initialized with GitHub token');
    });

    it('should initialize without GitHub when token is missing (requireGitHub=false)', () => {
      mockConfigService.get.mockReturnValue(undefined);

      const service = new TestBaseService('TestService', mockLoggerFactory, mockConfigService, false);

      expect(mockLoggerFactory.createLogger).toHaveBeenCalledWith('TestService');
      expect(mockConfigService.get).toHaveBeenCalledWith('GITHUB_TOKEN');
      expect(Octokit).not.toHaveBeenCalled();
      expect(service.testOctokit).toBeNull();
      expect(service.testHasGitHubAccess).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('GitHub token not found - GitHub functionality disabled for TestService');
    });

    it('should initialize without GitHub when token is empty string (requireGitHub=false)', () => {
      mockConfigService.get.mockReturnValue('');

      const service = new TestBaseService('TestService', mockLoggerFactory, mockConfigService, false);

      expect(service.testOctokit).toBeNull();
      expect(service.testHasGitHubAccess).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('GitHub token not found - GitHub functionality disabled for TestService');
    });

    it('should initialize without GitHub when token is null (requireGitHub=false)', () => {
      mockConfigService.get.mockReturnValue(null);

      const service = new TestBaseService('TestService', mockLoggerFactory, mockConfigService, false);

      expect(service.testOctokit).toBeNull();
      expect(service.testHasGitHubAccess).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('GitHub token not found - GitHub functionality disabled for TestService');
    });
  });

  describe('Constructor - ConfigService + LoggerFactory (requireGitHub=true)', () => {
    it('should initialize successfully when GitHub token is present and required', () => {
      mockConfigService.get.mockReturnValue('test-github-token');

      const service = new TestBaseService('RequiredGitHubService', mockLoggerFactory, mockConfigService, true);

      expect(mockConfigService.get).toHaveBeenCalledWith('GITHUB_TOKEN');
      expect(Octokit).toHaveBeenCalledWith({ auth: 'test-github-token' });
      expect(service.testOctokit).toBeDefined();
      expect(service.testHasGitHubAccess).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith('RequiredGitHubService initialized with GitHub token');
    });

    it('should throw error when GitHub token is missing but required', () => {
      mockConfigService.get.mockReturnValue(undefined);

      expect(() => {
        new TestBaseService('RequiredGitHubService', mockLoggerFactory, mockConfigService, true);
      }).toThrow('GitHub token required for RequiredGitHubService but not configured');

      expect(mockConfigService.get).toHaveBeenCalledWith('GITHUB_TOKEN');
      expect(Octokit).not.toHaveBeenCalled();
    });

    it('should throw error when GitHub token is empty string but required', () => {
      mockConfigService.get.mockReturnValue('');

      expect(() => {
        new TestBaseService('RequiredGitHubService', mockLoggerFactory, mockConfigService, true);
      }).toThrow('GitHub token required for RequiredGitHubService but not configured');
    });

    it('should throw error when GitHub token is null but required', () => {
      mockConfigService.get.mockReturnValue(null);

      expect(() => {
        new TestBaseService('RequiredGitHubService', mockLoggerFactory, mockConfigService, true);
      }).toThrow('GitHub token required for RequiredGitHubService but not configured');
    });

    it('should accept whitespace-only token (baseservice does not validate token content)', () => {
      mockConfigService.get.mockReturnValue('   ');

      const service = new TestBaseService('RequiredGitHubService', mockLoggerFactory, mockConfigService, true);
      
      expect(Octokit).toHaveBeenCalledWith({ auth: '   ' });
      expect(service.testHasGitHubAccess).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith('RequiredGitHubService initialized with GitHub token');
    });
  });

  describe('Constructor - Backward Compatibility (ConfigService only)', () => {
    it('should use direct LoggerService instantiation when LoggerFactory is not provided', () => {
      mockConfigService.get.mockReturnValue('test-github-token');

      const service = new TestBaseService('BackwardCompatService', undefined, mockConfigService);

      expect(LoggerService).toHaveBeenCalledWith('BackwardCompatService', {}, mockConfigService);
      expect(mockLoggerFactory.createLogger).not.toHaveBeenCalled();
      expect(service.testLogger).toBe(mockLogger);
    });

    it('should initialize GitHub client in backward compatibility mode', () => {
      mockConfigService.get.mockReturnValue('backward-compat-token');

      const service = new TestBaseService('BackwardCompatService', undefined, mockConfigService);

      expect(mockConfigService.get).toHaveBeenCalledWith('GITHUB_TOKEN');
      expect(Octokit).toHaveBeenCalledWith({ auth: 'backward-compat-token' });
      expect(service.testOctokit).toBeDefined();
      expect(service.testHasGitHubAccess).toBe(true);
    });

    it('should handle missing GitHub token in backward compatibility mode', () => {
      mockConfigService.get.mockReturnValue(undefined);

      const service = new TestBaseService('BackwardCompatService', undefined, mockConfigService, false);

      expect(service.testOctokit).toBeNull();
      expect(service.testHasGitHubAccess).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('GitHub token not found - GitHub functionality disabled for BackwardCompatService');
    });

    it('should throw error for required GitHub in backward compatibility mode', () => {
      mockConfigService.get.mockReturnValue(undefined);

      expect(() => {
        new TestBaseService('BackwardCompatService', undefined, mockConfigService, true);
      }).toThrow('GitHub token required for BackwardCompatService but not configured');
    });
  });

  describe('Constructor - No Dependencies', () => {
    it('should handle instantiation with only service name', () => {
      const service = new TestBaseService('MinimalService');

      expect(LoggerService).toHaveBeenCalledWith('MinimalService', {}, undefined);
      expect(service.testLogger).toBe(mockLogger);
      expect(service.testOctokit).toBeNull();
      expect(service.testHasGitHubAccess).toBe(false);
    });

    it('should not attempt GitHub initialization without ConfigService', () => {
      const service = new TestBaseService('MinimalService');

      expect(mockConfigService.get).not.toHaveBeenCalled();
      expect(Octokit).not.toHaveBeenCalled();
      expect(service.testOctokit).toBeNull();
      expect(service.testHasGitHubAccess).toBe(false);
    });
  });

  describe('validateGitHubAccess', () => {
    it('should not throw when GitHub access is available', () => {
      mockConfigService.get.mockReturnValue('test-token');
      const service = new TestBaseService('TestService', mockLoggerFactory, mockConfigService);

      expect(() => service.testValidateGitHubAccess()).not.toThrow();
    });

    it('should throw error when GitHub access is not available', () => {
      mockConfigService.get.mockReturnValue(undefined);
      const service = new TestBaseService('TestService', mockLoggerFactory, mockConfigService, false);

      expect(() => service.testValidateGitHubAccess()).toThrow(
        'GitHub token not configured - operation requires GitHub access'
      );
    });

    it('should throw error when octokit is explicitly set to null', () => {
      const service = new TestBaseService('TestService', mockLoggerFactory);
      
      expect(() => service.testValidateGitHubAccess()).toThrow(
        'GitHub token not configured - operation requires GitHub access'
      );
    });
  });

  describe('GitHub Client Configuration', () => {
    it('should configure Octokit with correct authentication', () => {
      const testToken = 'ghp_test_token_12345';
      mockConfigService.get.mockReturnValue(testToken);

      new TestBaseService('TestService', mockLoggerFactory, mockConfigService);

      expect(Octokit).toHaveBeenCalledWith({ auth: testToken });
    });

    it('should handle different token formats', () => {
      const tokenFormats = [
        'ghp_classic_token',
        'github_pat_token',
        'ghs_installation_token',
        'simple_token_123'
      ];

      tokenFormats.forEach(token => {
        jest.clearAllMocks();
        mockConfigService.get.mockReturnValue(token);

        new TestBaseService('TestService', mockLoggerFactory, mockConfigService);

        expect(Octokit).toHaveBeenCalledWith({ auth: token });
      });
    });
  });

  describe('Logging Behavior', () => {
    it('should log successful GitHub initialization', () => {
      mockConfigService.get.mockReturnValue('test-token');

      new TestBaseService('LoggingTestService', mockLoggerFactory, mockConfigService);

      expect(mockLogger.log).toHaveBeenCalledWith('LoggingTestService initialized with GitHub token');
    });

    it('should warn about missing GitHub token when not required', () => {
      mockConfigService.get.mockReturnValue(undefined);

      new TestBaseService('LoggingTestService', mockLoggerFactory, mockConfigService, false);

      expect(mockLogger.warn).toHaveBeenCalledWith('GitHub token not found - GitHub functionality disabled for LoggingTestService');
    });

    it('should use correct service name in log messages', () => {
      const serviceName = 'UniqueServiceName123';
      mockConfigService.get.mockReturnValue('test-token');

      new TestBaseService(serviceName, mockLoggerFactory, mockConfigService);

      expect(mockLogger.log).toHaveBeenCalledWith(`${serviceName} initialized with GitHub token`);
    });

    it('should use correct service name in warning messages', () => {
      const serviceName = 'AnotherUniqueServiceName456';
      mockConfigService.get.mockReturnValue(undefined);

      new TestBaseService(serviceName, mockLoggerFactory, mockConfigService, false);

      expect(mockLogger.warn).toHaveBeenCalledWith(`GitHub token not found - GitHub functionality disabled for ${serviceName}`);
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle ConfigService that throws during get', () => {
      mockConfigService.get.mockImplementation(() => {
        throw new Error('Configuration service error');
      });

      expect(() => {
        new TestBaseService('TestService', mockLoggerFactory, mockConfigService);
      }).toThrow('Configuration service error');
    });

    it('should handle Octokit constructor failure', () => {
      mockConfigService.get.mockReturnValue('test-token');
      (Octokit as jest.MockedClass<typeof Octokit>).mockImplementation(() => {
        throw new Error('Octokit initialization failed');
      });

      expect(() => {
        new TestBaseService('TestService', mockLoggerFactory, mockConfigService);
      }).toThrow('Octokit initialization failed');
    });

    it('should handle LoggerFactory creation failure', () => {
      mockLoggerFactory.createLogger.mockImplementation(() => {
        throw new Error('Logger creation failed');
      });

      expect(() => {
        new TestBaseService('TestService', mockLoggerFactory);
      }).toThrow('Logger creation failed');
    });

    it('should handle direct LoggerService instantiation failure', () => {
      (LoggerService as jest.MockedClass<typeof LoggerService>).mockImplementation(() => {
        throw new Error('LoggerService instantiation failed');
      });

      expect(() => {
        new TestBaseService('TestService', undefined, mockConfigService);
      }).toThrow('LoggerService instantiation failed');
    });
  });

  describe('State Consistency', () => {
    beforeEach(() => {
      // Ensure fresh mocks for this test suite
      (Octokit as jest.MockedClass<typeof Octokit>).mockImplementation(() => ({
        rest: {
          users: {
            getAuthenticated: jest.fn(),
          },
        },
      }) as any);
    });

    it('should maintain consistent state when GitHub is available', () => {
      mockConfigService.get.mockReturnValue('test-token');
      const service = new TestBaseService('TestService', mockLoggerFactory, mockConfigService);

      expect(service.testOctokit).not.toBeNull();
      expect(service.testHasGitHubAccess).toBe(true);
    });

    it('should maintain consistent state when GitHub is not available', () => {
      mockConfigService.get.mockReturnValue(undefined);
      const service = new TestBaseService('TestService', mockLoggerFactory, mockConfigService, false);

      expect(service.testOctokit).toBeNull();
      expect(service.testHasGitHubAccess).toBe(false);
    });

    it('should maintain logger instance regardless of GitHub availability', () => {
      mockConfigService.get.mockReturnValue(undefined);
      const service = new TestBaseService('TestService', mockLoggerFactory, mockConfigService, false);

      expect(service.testLogger).toBeDefined();
      expect(service.testLogger).toBe(mockLogger);
    });
  });

  describe('Multiple Instantiation Scenarios', () => {
    beforeEach(() => {
      // Ensure fresh mocks for this test suite
      (Octokit as jest.MockedClass<typeof Octokit>).mockImplementation(() => ({
        rest: {
          users: {
            getAuthenticated: jest.fn(),
          },
        },
      }) as any);
    });

    it('should allow multiple instances with different configurations', () => {
      mockConfigService.get.mockReturnValueOnce('token1').mockReturnValueOnce(undefined);

      const service1 = new TestBaseService('Service1', mockLoggerFactory, mockConfigService);
      const service2 = new TestBaseService('Service2', mockLoggerFactory, mockConfigService, false);

      expect(service1.testHasGitHubAccess).toBe(true);
      expect(service2.testHasGitHubAccess).toBe(false);
      expect(service1.testOctokit).not.toBeNull();
      expect(service2.testOctokit).toBeNull();
    });

    it('should handle different service names correctly', () => {
      const serviceNames = ['Service1', 'Service2', 'Service3'];
      
      serviceNames.forEach((name, index) => {
        jest.clearAllMocks(); // Clear between iterations
        mockConfigService.get.mockReturnValue(`token-${index}`);
        const service = new TestBaseService(name, mockLoggerFactory, mockConfigService);
        
        expect(mockLoggerFactory.createLogger).toHaveBeenCalledWith(name);
        expect(mockLogger.log).toHaveBeenCalledWith(`${name} initialized with GitHub token`);
      });
    });
  });
});