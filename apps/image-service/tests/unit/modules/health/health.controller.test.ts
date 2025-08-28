import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '@/modules/health/health.controller';
import { HealthService, HealthStatus } from '@/modules/health/health.service';
import { HealthCheckService, HttpHealthIndicator, MemoryHealthIndicator, HealthCheckResult } from '@nestjs/terminus';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: jest.Mocked<HealthService>;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let httpIndicator: jest.Mocked<HttpHealthIndicator>;
  let memoryIndicator: jest.Mocked<MemoryHealthIndicator>;

  const mockHealthStatus: HealthStatus = {
    status: 'ok',
    timestamp: '2024-01-01T10:00:00.000Z',
    uptime: 30000,
    version: '1.0.0',
    environment: 'test',
    services: {
      redis: { status: 'healthy', responseTime: 10 },
      storage: { status: 'healthy', responseTime: 15 },
      auth: { status: 'healthy', responseTime: 5 },
      upload: { status: 'healthy', responseTime: 8 }
    },
    memory: {
      used: 50,
      total: 100,
      percentage: 50
    },
    system: {
      nodeVersion: 'v18.0.0',
      platform: 'linux',
      arch: 'x64'
    }
  };

  beforeEach(async () => {
    const mockHealthService = {
      getHealthStatus: jest.fn(),
      getLivenessStatus: jest.fn(),
      getReadinessStatus: jest.fn(),
    };

    const mockHealthCheckService = {
      check: jest.fn(),
    };

    const mockHttpIndicator = {};

    const mockMemoryIndicator = {
      checkHeap: jest.fn(),
      checkRSS: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: HttpHealthIndicator,
          useValue: mockHttpIndicator,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemoryIndicator,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get(HealthService);
    healthCheckService = module.get(HealthCheckService);
    httpIndicator = module.get(HttpHealthIndicator);
    memoryIndicator = module.get(MemoryHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealthStatus', () => {
    it('should return comprehensive health status', async () => {
      healthService.getHealthStatus.mockResolvedValue(mockHealthStatus);

      const result = await controller.getHealthStatus();

      expect(result).toEqual(mockHealthStatus);
      expect(healthService.getHealthStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      const error = new Error('Health check failed');
      healthService.getHealthStatus.mockRejectedValue(error);

      await expect(controller.getHealthStatus()).rejects.toThrow('Health check failed');
    });

    it('should return unhealthy status when services are down', async () => {
      const unhealthyStatus: HealthStatus = {
        ...mockHealthStatus,
        status: 'error',
        services: {
          redis: { status: 'unhealthy', error: 'Connection failed' },
          storage: { status: 'healthy', responseTime: 15 },
          auth: { status: 'healthy', responseTime: 5 },
          upload: { status: 'healthy', responseTime: 8 }
        }
      };

      healthService.getHealthStatus.mockResolvedValue(unhealthyStatus);

      const result = await controller.getHealthStatus();

      expect(result.status).toBe('error');
      expect(result.services.redis.status).toBe('unhealthy');
    });
  });

  describe('getLiveness', () => {
    it('should return liveness status', () => {
      const mockLivenessStatus = {
        status: 'ok' as const,
        uptime: 30000,
      };

      healthService.getLivenessStatus.mockReturnValue(mockLivenessStatus);

      const result = controller.getLiveness();

      expect(result).toEqual(mockLivenessStatus);
      expect(healthService.getLivenessStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle different uptime values', () => {
      const mockLivenessStatus = {
        status: 'ok' as const,
        uptime: 120000, // 2 minutes
      };

      healthService.getLivenessStatus.mockReturnValue(mockLivenessStatus);

      const result = controller.getLiveness();

      expect(result.uptime).toBe(120000);
      expect(result.status).toBe('ok');
    });

    it('should always return ok status for liveness', () => {
      const mockLivenessStatus = {
        status: 'ok' as const,
        uptime: 5000,
      };

      healthService.getLivenessStatus.mockReturnValue(mockLivenessStatus);

      const result = controller.getLiveness();

      expect(result.status).toBe('ok');
    });
  });

  describe('getReadiness', () => {
    it('should return ready status when all services are ready', async () => {
      const mockReadinessStatus = {
        status: 'ready' as const,
        services: ['redis', 'auth'],
      };

      healthService.getReadinessStatus.mockResolvedValue(mockReadinessStatus);

      const result = await controller.getReadiness();

      expect(result).toEqual(mockReadinessStatus);
      expect(healthService.getReadinessStatus).toHaveBeenCalledTimes(1);
    });

    it('should throw error when service is not ready', async () => {
      const mockReadinessStatus = {
        status: 'not-ready' as const,
        services: ['redis'],
      };

      healthService.getReadinessStatus.mockResolvedValue(mockReadinessStatus);

      await expect(controller.getReadiness()).rejects.toThrow('Service not ready');
    });

    it('should handle readiness service errors', async () => {
      const error = new Error('Readiness check failed');
      healthService.getReadinessStatus.mockRejectedValue(error);

      await expect(controller.getReadiness()).rejects.toThrow('Readiness check failed');
    });

    it('should return failed services when not ready', async () => {
      const mockReadinessStatus = {
        status: 'not-ready' as const,
        services: ['redis', 'auth'],
      };

      healthService.getReadinessStatus.mockResolvedValue(mockReadinessStatus);

      await expect(controller.getReadiness()).rejects.toThrow('Service not ready');
      expect(healthService.getReadinessStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('healthCheck', () => {
    it('should return Terminus health check result', async () => {
      const mockHealthCheckResult: HealthCheckResult = {
        status: 'ok',
        info: {
          memory_heap: {
            status: 'up',
          },
          memory_rss: {
            status: 'up',
          },
        },
        error: {},
        details: {
          memory_heap: {
            status: 'up',
          },
          memory_rss: {
            status: 'up',
          },
        },
      };

      memoryIndicator.checkHeap.mockResolvedValue({
        'memory_heap': {
          status: 'up',
        },
      });

      memoryIndicator.checkRSS.mockResolvedValue({
        'memory_rss': {
          status: 'up',
        },
      });

      healthCheckService.check.mockResolvedValue(mockHealthCheckResult);

      const result = await controller.healthCheck();

      expect(result).toEqual(mockHealthCheckResult);
      expect(healthCheckService.check).toHaveBeenCalledTimes(1);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function), // Memory heap check
        expect.any(Function), // Memory RSS check
      ]);
    });

    it('should configure memory checks with correct thresholds', async () => {
      const mockHealthCheckResult: HealthCheckResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      healthCheckService.check.mockResolvedValue(mockHealthCheckResult);

      await controller.healthCheck();

      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
      ]);

      // Test that the functions call the correct memory indicators
      const [heapCheckFn, rssCheckFn] = healthCheckService.check.mock.calls[0][0];
      
      // Call the functions to verify they invoke the correct methods
      await heapCheckFn();
      await rssCheckFn();

      expect(memoryIndicator.checkHeap).toHaveBeenCalledWith('memory_heap', 150 * 1024 * 1024);
      expect(memoryIndicator.checkRSS).toHaveBeenCalledWith('memory_rss', 200 * 1024 * 1024);
    });

    it('should handle memory check failures', async () => {
      const error = new Error('Memory check failed');
      healthCheckService.check.mockRejectedValue(error);

      await expect(controller.healthCheck()).rejects.toThrow('Memory check failed');
    });
  });

  describe('getStartup', () => {
    beforeEach(() => {
      // Mock process.uptime() to return consistent values
      jest.spyOn(process, 'uptime').mockReturnValue(30); // 30 seconds
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return startup status', () => {
      const result = controller.getStartup();

      expect(result).toEqual({
        status: 'started',
        uptime: 30000, // 30 seconds in milliseconds
        initializationTime: 10000, // Capped at 10 seconds
      });
    });

    it('should cap initialization time at 10 seconds', () => {
      jest.spyOn(process, 'uptime').mockReturnValue(15); // 15 seconds

      const result = controller.getStartup();

      expect(result.initializationTime).toBe(10000); // Capped at 10 seconds
      expect(result.uptime).toBe(15000); // Not capped
    });

    it('should return actual init time when under 10 seconds', () => {
      jest.spyOn(process, 'uptime').mockReturnValue(5); // 5 seconds

      const result = controller.getStartup();

      expect(result.initializationTime).toBe(5000); // Not capped
      expect(result.uptime).toBe(5000);
    });

    it('should always return started status', () => {
      const result = controller.getStartup();

      expect(result.status).toBe('started');
    });

    it('should convert uptime to milliseconds', () => {
      jest.spyOn(process, 'uptime').mockReturnValue(2.5); // 2.5 seconds

      const result = controller.getStartup();

      expect(result.uptime).toBe(2500); // 2.5 seconds in milliseconds
    });
  });

  describe('API Tags and Swagger Integration', () => {
    it('should have correct controller path', () => {
      const path = Reflect.getMetadata('path', HealthController);
      expect(path).toBe('health');
    });

    it('should have API tags metadata', () => {
      const tags = Reflect.getMetadata('swagger/apiUseTags', HealthController);
      expect(tags).toEqual(['health']);
    });
  });

  describe('Dependency Injection', () => {
    it('should inject all required dependencies', () => {
      expect(controller['healthService']).toBeDefined();
      expect(controller['health']).toBeDefined();
      expect(controller['http']).toBeDefined();
      expect(controller['memory']).toBeDefined();
    });
  });

  describe('Integration with multiple health checks', () => {
    it('should handle mixed health statuses', async () => {
      const mixedHealthStatus: HealthStatus = {
        ...mockHealthStatus,
        status: 'error',
        services: {
          redis: { status: 'healthy', responseTime: 10 },
          storage: { status: 'unhealthy', error: 'Storage failed', responseTime: 50 },
          auth: { status: 'healthy', responseTime: 5 },
          upload: { status: 'degraded', responseTime: 100, details: { warning: 'Slow performance' } }
        }
      };

      healthService.getHealthStatus.mockResolvedValue(mixedHealthStatus);

      const result = await controller.getHealthStatus();

      expect(result.status).toBe('error');
      expect(result.services.redis.status).toBe('healthy');
      expect(result.services.storage.status).toBe('unhealthy');
      expect(result.services.upload.status).toBe('degraded');
    });
  });

  describe('Error scenarios', () => {
    it('should propagate health service errors', async () => {
      const error = new Error('Critical system failure');
      healthService.getHealthStatus.mockRejectedValue(error);

      await expect(controller.getHealthStatus()).rejects.toThrow('Critical system failure');
    });

    it('should handle readiness timeout scenarios', async () => {
      const timeoutError = new Error('Operation timed out');
      healthService.getReadinessStatus.mockRejectedValue(timeoutError);

      await expect(controller.getReadiness()).rejects.toThrow('Operation timed out');
    });
  });
});