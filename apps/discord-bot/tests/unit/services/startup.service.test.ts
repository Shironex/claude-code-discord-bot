import { StartupService } from '@/services/startup.service';
import { ImageServiceClient } from '@/services/image-service/image-service.client';
import { LoggerFactory } from '@claude-code/shared';

// Mock ImageServiceClient with all required methods
const mockImageServiceClient = {
  getDiagnosticInfo: jest.fn(),
  testConnection: jest.fn(),
  getHealth: jest.fn(),
  isAvailable: jest.fn(),
  uploadImage: jest.fn(),
  uploadBatch: jest.fn(),
  getImageMetadata: jest.fn(),
  deleteImage: jest.fn(),
  deleteBatch: jest.fn(),
  getStorageStats: jest.fn(),
  getConfig: jest.fn()
} as unknown as jest.Mocked<ImageServiceClient>;

// Mock LoggerFactory and Logger
const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn()
};

const mockLoggerFactory = {
  createLogger: jest.fn(() => mockLogger),
  getAllLoggers: jest.fn(),
  flushAll: jest.fn(),
  clear: jest.fn()
} as unknown as jest.Mocked<LoggerFactory>;

describe('StartupService', () => {
  let service: StartupService;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create service instance
    service = new StartupService(mockLoggerFactory, mockImageServiceClient);
  });

  describe('Constructor', () => {
    it('should initialize with correct service name', () => {
      expect(mockLoggerFactory.createLogger).toHaveBeenCalledWith('StartupService');
    });

    it('should extend BaseService', () => {
      expect(service).toBeDefined();
      expect(typeof service.onModuleInit).toBe('function');
    });

    it('should store image service client reference', () => {
      expect(service['imageServiceClient']).toBe(mockImageServiceClient);
    });
  });

  describe('onModuleInit', () => {
    beforeEach(() => {
      // Mock successful diagnostic info by default
      mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
        isConfigured: true,
        hasApiKey: true,
        baseUrl: 'http://localhost:3001',
        apiKeyPrefix: 'bot_***',
        timeout: 30000,
        isAvailable: true
      });
      
      // Mock successful connection test by default
      mockImageServiceClient.testConnection.mockResolvedValue(true);
      
      // Mock successful health check by default
      mockImageServiceClient.getHealth.mockResolvedValue({
        status: 'healthy',
        timestamp: new Date(),
        services: { redis: 'connected' }
      } as any);
    });

    it('should perform startup logging', async () => {
      await service.onModuleInit();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Discord bot starting up - performing health checks...',
        'onModuleInit'
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Startup health checks completed',
        'onModuleInit'
      );
    });

    it('should call checkImageServiceConnection', async () => {
      const checkImageServiceSpy = jest.spyOn(service as any, 'checkImageServiceConnection');

      await service.onModuleInit();

      expect(checkImageServiceSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in checkImageServiceConnection gracefully', async () => {
      mockImageServiceClient.testConnection.mockRejectedValue(new Error('Connection failed'));

      await expect(service.onModuleInit()).resolves.not.toThrow();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Startup health checks completed',
        'onModuleInit'
      );
    });
  });

  describe('checkImageServiceConnection', () => {
    describe('when image service is properly configured', () => {
      beforeEach(() => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: true,
          hasApiKey: true,
          baseUrl: 'http://localhost:3001',
          apiKeyPrefix: 'bot_***',
          timeout: 30000,
          isAvailable: true
        });
      });

      it('should log diagnostic information', async () => {
        mockImageServiceClient.testConnection.mockResolvedValue(true);

        await service.onModuleInit();

        expect(mockLogger.log).toHaveBeenCalledWith(
          'Testing image service connection...',
          'checkImageServiceConnection'
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Image service client configuration:',
          {
            isConfigured: true,
            hasApiKey: true,
            baseUrl: 'http://localhost:3001',
            apiKeyPrefix: 'bot_***',
            timeout: 30000,
            isAvailable: true
          }
        );
      });

      it('should test connection and log success', async () => {
        mockImageServiceClient.testConnection.mockResolvedValue(true);

        await service.onModuleInit();

        expect(mockImageServiceClient.testConnection).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalledWith(
          '✅ Image service connection test successful - image uploads are ready',
          'checkImageServiceConnection'
        );
      });

      it('should get health status after successful connection', async () => {
        const mockHealth = {
          status: 'healthy',
          timestamp: new Date(),
          services: { redis: 'connected' }
        };
        
        mockImageServiceClient.testConnection.mockResolvedValue(true);
        mockImageServiceClient.getHealth.mockResolvedValue(mockHealth);

        await service.onModuleInit();

        expect(mockImageServiceClient.getHealth).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Image service health status:',
          mockHealth
        );
      });

      it('should handle health check failure gracefully', async () => {
        const healthError = new Error('Health check failed');
        
        mockImageServiceClient.testConnection.mockResolvedValue(true);
        mockImageServiceClient.getHealth.mockRejectedValue(healthError);

        await service.onModuleInit();

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Could not retrieve image service health status',
          'checkImageServiceConnection',
          { error: 'Health check failed' }
        );
      });

      it('should log error when connection test fails', async () => {
        mockImageServiceClient.testConnection.mockResolvedValue(false);

        await service.onModuleInit();

        expect(mockLogger.error).toHaveBeenCalledWith(
          '❌ Image service connection test failed - image uploads will not work',
          'checkImageServiceConnection'
        );
        expect(mockImageServiceClient.getHealth).not.toHaveBeenCalled();
      });

      it('should handle connection test throwing an error', async () => {
        const connectionError = new Error('Connection timeout');
        connectionError.stack = 'Error stack trace';
        (connectionError as any).cause = 'Network timeout';
        (connectionError as any).details = { code: 'TIMEOUT' };

        mockImageServiceClient.testConnection.mockRejectedValue(connectionError);

        await service.onModuleInit();

        expect(mockLogger.error).toHaveBeenCalledWith(
          '❌ Image service connection test threw an error:',
          connectionError,
          'checkImageServiceConnection'
        );

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Connection test error details:',
          'checkImageServiceConnection',
          {
            message: 'Connection timeout',
            stack: 'Error stack trace',
            cause: 'Network timeout',
            details: { code: 'TIMEOUT' },
            troubleshooting: {
              if401: 'API key mismatch - ensure DISCORD_BOT_API_KEY matches in both Discord bot and image service .env files',
              if404: 'Image service endpoint not found - check IMAGE_SERVICE_BASE_URL and verify service is running',
              if503: 'Image service unavailable - check service health and dependencies (Redis)',
              ifTimeout: 'Connection timeout - verify network connectivity and service responsiveness'
            }
          }
        );
      });
    });

    describe('when image service is not configured', () => {
      it('should warn when service is not configured due to missing API key', async () => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: false,
          hasApiKey: false,
          baseUrl: 'http://localhost:3001',
          apiKeyPrefix: '',
          timeout: 30000,
          isAvailable: false
        });

        await service.onModuleInit();

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Image service is not properly configured - image upload features will be unavailable',
          'checkImageServiceConnection',
          {
            issues: {
              hasApiKey: false,
              baseUrl: 'http://localhost:3001',
              isAvailable: false
            },
            troubleshooting: {
              step1: 'Check DISCORD_BOT_API_KEY is set in Discord bot .env file',
              step2: 'Check IMAGE_SERVICE_BASE_URL points to running image service',
              step3: 'Ensure image service is running on the configured URL',
              step4: 'Verify DISCORD_BOT_API_KEY is also set in image service .env file (must match!)'
            }
          }
        );

        // Should not test connection when not configured
        expect(mockImageServiceClient.testConnection).not.toHaveBeenCalled();
      });

      it('should warn when service is not configured due to missing base URL', async () => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: false,
          hasApiKey: true,
          baseUrl: '',
          apiKeyPrefix: 'bot_***',
          timeout: 30000,
          isAvailable: false
        });

        await service.onModuleInit();

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Image service is not properly configured - image upload features will be unavailable',
          'checkImageServiceConnection',
          expect.objectContaining({
            issues: {
              hasApiKey: true,
              baseUrl: '',
              isAvailable: false
            }
          })
        );

        expect(mockImageServiceClient.testConnection).not.toHaveBeenCalled();
      });

      it('should warn when service is not available', async () => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: false,
          hasApiKey: true,
          baseUrl: 'http://localhost:3001',
          apiKeyPrefix: 'bot_***',
          timeout: 30000,
          isAvailable: false
        });

        await service.onModuleInit();

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Image service is not properly configured - image upload features will be unavailable',
          'checkImageServiceConnection',
          expect.objectContaining({
            issues: {
              hasApiKey: true,
              baseUrl: 'http://localhost:3001',
              isAvailable: false
            }
          })
        );
      });
    });

    describe('error handling edge cases', () => {
      beforeEach(() => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: true,
          hasApiKey: true,
          baseUrl: 'http://localhost:3001',
          apiKeyPrefix: 'bot_***',
          timeout: 30000,
          isAvailable: true
        });
      });

      it('should handle error without stack trace', async () => {
        const simpleError = new Error('Simple error');
        delete simpleError.stack;

        mockImageServiceClient.testConnection.mockRejectedValue(simpleError);

        await service.onModuleInit();

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Connection test error details:',
          'checkImageServiceConnection',
          expect.objectContaining({
            message: 'Simple error',
            stack: undefined
          })
        );
      });

      it('should handle error without additional properties', async () => {
        const basicError = new Error('Basic error');

        mockImageServiceClient.testConnection.mockRejectedValue(basicError);

        await service.onModuleInit();

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Connection test error details:',
          'checkImageServiceConnection',
          expect.objectContaining({
            message: 'Basic error',
            cause: undefined,
            details: undefined
          })
        );
      });

      it('should handle non-Error objects being thrown', async () => {
        const stringError = 'String error';
        mockImageServiceClient.testConnection.mockRejectedValue(stringError);

        await service.onModuleInit();

        expect(mockLogger.error).toHaveBeenCalledWith(
          '❌ Image service connection test threw an error:',
          stringError,
          'checkImageServiceConnection'
        );
      });
    });

    describe('integration scenarios', () => {
      it('should complete full successful startup flow', async () => {
        const mockHealth = {
          status: 'healthy',
          timestamp: new Date(),
          uptime: 12345,
          services: {
            redis: 'connected',
            storage: 'available'
          }
        };

        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: true,
          hasApiKey: true,
          baseUrl: 'http://localhost:3001',
          apiKeyPrefix: 'bot_***',
          timeout: 30000,
          isAvailable: true
        });
        mockImageServiceClient.testConnection.mockResolvedValue(true);
        mockImageServiceClient.getHealth.mockResolvedValue(mockHealth);

        await service.onModuleInit();

        // Should log all expected messages in order
        expect(mockLogger.log).toHaveBeenNthCalledWith(1,
          'Discord bot starting up - performing health checks...',
          'onModuleInit'
        );
        expect(mockLogger.log).toHaveBeenNthCalledWith(2,
          'Testing image service connection...',
          'checkImageServiceConnection'
        );
        expect(mockLogger.log).toHaveBeenNthCalledWith(3,
          'Image service client configuration:',
          expect.any(Object)
        );
        expect(mockLogger.log).toHaveBeenNthCalledWith(4,
          '✅ Image service connection test successful - image uploads are ready',
          'checkImageServiceConnection'
        );
        expect(mockLogger.log).toHaveBeenNthCalledWith(5,
          'Image service health status:',
          mockHealth
        );
        expect(mockLogger.log).toHaveBeenNthCalledWith(6,
          'Startup health checks completed',
          'onModuleInit'
        );

        // Should not have any warnings or errors
        expect(mockLogger.warn).not.toHaveBeenCalled();
        expect(mockLogger.error).not.toHaveBeenCalled();
      });

      it('should handle mixed success/failure scenarios', async () => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: true,
          hasApiKey: true,
          baseUrl: 'http://localhost:3001',
          apiKeyPrefix: 'bot_***',
          timeout: 30000,
          isAvailable: true
        });
        mockImageServiceClient.testConnection.mockResolvedValue(true);
        mockImageServiceClient.getHealth.mockRejectedValue(new Error('Health unavailable'));

        await service.onModuleInit();

        // Should log success for connection but warn about health
        expect(mockLogger.log).toHaveBeenCalledWith(
          '✅ Image service connection test successful - image uploads are ready',
          'checkImageServiceConnection'
        );
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Could not retrieve image service health status',
          'checkImageServiceConnection',
          { error: 'Health unavailable' }
        );

        // Should still complete startup
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Startup health checks completed',
          'onModuleInit'
        );
      });

      it('should handle complete failure scenario gracefully', async () => {
        mockImageServiceClient.getDiagnosticInfo.mockReturnValue({
          isConfigured: false,
          hasApiKey: false,
          baseUrl: '',
          apiKeyPrefix: '',
          timeout: 30000,
          isAvailable: false
        });

        await service.onModuleInit();

        // Should warn about configuration but still complete startup
        expect(mockLogger.warn).toHaveBeenCalled();
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Startup health checks completed',
          'onModuleInit'
        );

        // Should not attempt connection tests
        expect(mockImageServiceClient.testConnection).not.toHaveBeenCalled();
        expect(mockImageServiceClient.getHealth).not.toHaveBeenCalled();
      });
    });
  });
});