import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { HealthService, HealthStatus, ServiceHealth } from '@/modules/health/health.service';
import { RedisService } from '@/modules/redis/redis.service';
import { IMAGE_CONSTANTS } from '@/common/constants';

describe('HealthService', () => {
  let service: HealthService;
  let configService: jest.Mocked<ConfigService>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const mockRedisService = {
      isHealthy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    configService = module.get(ConfigService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealthStatus', () => {
    beforeEach(() => {
      // Mock Date to get consistent timestamps
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T10:00:00Z'));

      // Mock process.memoryUsage only
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 104857600, // 100MB
        heapTotal: 52428800, // 50MB
        heapUsed: 26214400, // 25MB
        external: 1048576, // 1MB
        arrayBuffers: 0,
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return comprehensive health status when all services are healthy', async () => {
      redisService.isHealthy.mockResolvedValue(true);
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'npm_package_version':
            return '1.0.0';
          case 'NODE_ENV':
            return 'test';
          case 'DISCORD_BOT_API_KEY':
            return 'discord-key';
          case 'CLAUDE_CODE_API_KEY':
            return 'claude-key';
          case 'HMAC_SECRET':
            return 'hmac-secret';
          case 'imageService.upload.maxFileSize':
            return defaultValue; // Use default
          case 'imageService.upload.allowedMimeTypes':
            return defaultValue; // Use default
          default:
            return defaultValue;
        }
      });

      const result = await service.getHealthStatus();

      expect(result).toMatchObject({
        status: 'ok',
        timestamp: '2024-01-01T10:00:00.000Z',
        version: '1.0.0',
        environment: 'test',
        memory: {
          used: 25, // 25MB
          total: 50, // 50MB
          percentage: 50,
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      });

      expect(result.services.redis.status).toBe('healthy');
      expect(result.services.storage.status).toBe('healthy');
      expect(result.services.auth.status).toBe('healthy');
      expect(result.services.upload.status).toBe('healthy');
    });

    it('should return error status when Redis is unhealthy', async () => {
      redisService.isHealthy.mockResolvedValue(false);
      configService.get
        .mockReturnValueOnce('1.0.0') // version
        .mockReturnValueOnce('test') // NODE_ENV
        .mockReturnValueOnce('discord-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce('claude-key') // CLAUDE_CODE_API_KEY
        .mockReturnValueOnce('hmac-secret') // HMAC_SECRET
        .mockReturnValueOnce(5242880) // maxFileSize
        .mockReturnValueOnce(['image/jpeg']); // allowedMimeTypes

      const result = await service.getHealthStatus();

      expect(result.status).toBe('error');
      expect(result.services.redis.status).toBe('unhealthy');
      expect(result.services.storage.status).toBe('unhealthy'); // Storage depends on Redis
    });

    it('should return error status when auth keys are missing', async () => {
      redisService.isHealthy.mockResolvedValue(true);
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'npm_package_version':
            return '1.0.0';
          case 'NODE_ENV':
            return 'test';
          case 'DISCORD_BOT_API_KEY':
            return undefined; // Missing key
          case 'CLAUDE_CODE_API_KEY':
            return undefined; // Missing key
          case 'HMAC_SECRET':
            return 'hmac-secret';
          case 'imageService.upload.maxFileSize':
            return defaultValue;
          case 'imageService.upload.allowedMimeTypes':
            return defaultValue;
          default:
            return defaultValue;
        }
      });

      const result = await service.getHealthStatus();

      expect(result.status).toBe('error');
      expect(result.services.auth.status).toBe('unhealthy');
      expect(result.services.auth.error).toBe('Missing required API keys');
    });

    it('should handle Redis connection errors', async () => {
      redisService.isHealthy.mockRejectedValue(new Error('Connection failed'));
      configService.get
        .mockReturnValueOnce('1.0.0') // version
        .mockReturnValueOnce('test') // NODE_ENV
        .mockReturnValueOnce('discord-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce('claude-key') // CLAUDE_CODE_API_KEY
        .mockReturnValueOnce('hmac-secret') // HMAC_SECRET
        .mockReturnValueOnce(5242880) // maxFileSize
        .mockReturnValueOnce(['image/jpeg']); // allowedMimeTypes

      const result = await service.getHealthStatus();

      expect(result.status).toBe('error');
      expect(result.services.redis.status).toBe('unhealthy');
      expect(result.services.redis.error).toBe('Connection failed');
    });

    it('should use default values for missing configuration', async () => {
      redisService.isHealthy.mockResolvedValue(true);
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'npm_package_version':
            return defaultValue; // Should return '1.0.0' (the default)
          case 'NODE_ENV':
            return defaultValue; // Should return 'development' (the default)
          case 'DISCORD_BOT_API_KEY':
            return 'discord-key';
          case 'CLAUDE_CODE_API_KEY':
            return 'claude-key';
          case 'HMAC_SECRET':
            return 'hmac-secret';
          case 'imageService.upload.maxFileSize':
            return defaultValue; // Use default
          case 'imageService.upload.allowedMimeTypes':
            return defaultValue; // Use default
          default:
            return defaultValue;
        }
      });

      const result = await service.getHealthStatus();

      expect(result.version).toBe('1.0.0');
      expect(result.environment).toBe('development');
      expect(result.services.upload.details?.maxFileSize).toBe(IMAGE_CONSTANTS.MAX_FILE_SIZE);
    });

    it('should include response times for all services', async () => {
      redisService.isHealthy.mockResolvedValue(true);
      configService.get
        .mockReturnValueOnce('1.0.0') // version
        .mockReturnValueOnce('test') // NODE_ENV
        .mockReturnValueOnce('discord-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce('claude-key') // CLAUDE_CODE_API_KEY
        .mockReturnValueOnce('hmac-secret') // HMAC_SECRET
        .mockReturnValueOnce(5242880) // maxFileSize
        .mockReturnValueOnce(['image/jpeg']); // allowedMimeTypes

      const result = await service.getHealthStatus();

      expect(result.services.redis.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.services.storage.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.services.auth.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.services.upload.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getLivenessStatus', () => {
    it('should return liveness status with uptime', () => {
      const result = service.getLivenessStatus();

      expect(result).toEqual({
        status: 'ok',
        uptime: expect.any(Number),
      });
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should always return ok status', () => {
      const result = service.getLivenessStatus();

      expect(result.status).toBe('ok');
    });

    it('should calculate uptime correctly', () => {
      const result = service.getLivenessStatus();
      
      // Uptime should be a positive number (service was created recently)
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.uptime).toBeLessThan(10000); // Should be less than 10 seconds for test
    });
  });

  describe('getReadinessStatus', () => {
    it('should return ready when all critical services are healthy', async () => {
      redisService.isHealthy.mockResolvedValue(true);
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'DISCORD_BOT_API_KEY':
            return 'discord-key';
          case 'CLAUDE_CODE_API_KEY':
            return 'claude-key';
          case 'HMAC_SECRET':
            return 'hmac-secret';
          default:
            return undefined;
        }
      });

      const result = await service.getReadinessStatus();

      expect(result).toEqual({
        status: 'ready',
        services: ['redis', 'auth'],
      });
    });

    it('should return not-ready when Redis is unhealthy', async () => {
      redisService.isHealthy.mockRejectedValue(new Error('Redis connection failed'));
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'DISCORD_BOT_API_KEY':
            return 'discord-key';
          case 'CLAUDE_CODE_API_KEY':
            return 'claude-key';
          case 'HMAC_SECRET':
            return 'hmac-secret';
          default:
            return undefined;
        }
      });

      const result = await service.getReadinessStatus();

      expect(result).toEqual({
        status: 'not-ready',
        services: ['redis'],
      });
    });

    it('should return not-ready when auth is not configured', async () => {
      redisService.isHealthy.mockResolvedValue(true);
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'DISCORD_BOT_API_KEY':
          case 'CLAUDE_CODE_API_KEY':
            return undefined;
          case 'HMAC_SECRET':
            return 'hmac-secret';
          default:
            return undefined;
        }
      });

      const result = await service.getReadinessStatus();

      expect(result).toEqual({
        status: 'not-ready',
        services: ['auth'],
      });
    });

    it('should return not-ready when both services are failing', async () => {
      redisService.isHealthy.mockRejectedValue(new Error('Redis failed'));
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'DISCORD_BOT_API_KEY':
          case 'CLAUDE_CODE_API_KEY':
            return undefined;
          case 'HMAC_SECRET':
            return 'hmac-secret';
          default:
            return undefined;
        }
      });

      const result = await service.getReadinessStatus();

      expect(result).toEqual({
        status: 'not-ready',
        services: ['redis', 'auth'],
      });
    });

    it('should return not-ready status when Redis fails', async () => {
      redisService.isHealthy.mockRejectedValue(new Error('Redis connection failed'));
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'DISCORD_BOT_API_KEY':
            return 'discord-key';
          case 'CLAUDE_CODE_API_KEY':
            return 'claude-key';
          case 'HMAC_SECRET':
            return 'hmac-secret';
          default:
            return undefined;
        }
      });

      const result = await service.getReadinessStatus();
      
      expect(result.status).toBe('not-ready');
      expect(result.services).toContain('redis');
    });
  });

  describe('checkRedisHealth', () => {
    it('should return healthy status when Redis is healthy', async () => {
      redisService.isHealthy.mockResolvedValue(true);

      const result = await service['checkRedisHealth']();

      expect(result).toMatchObject({
        status: 'healthy',
        responseTime: expect.any(Number),
        details: {
          connected: true,
        },
      });
    });

    it('should return unhealthy status when Redis check fails', async () => {
      redisService.isHealthy.mockResolvedValue(false);

      const result = await service['checkRedisHealth']();

      expect(result).toMatchObject({
        status: 'unhealthy',
        responseTime: expect.any(Number),
        error: 'Redis health check failed',
      });
    });

    it('should handle Redis service errors', async () => {
      redisService.isHealthy.mockRejectedValue(new Error('Connection timeout'));

      const result = await service['checkRedisHealth']();

      expect(result).toMatchObject({
        status: 'unhealthy',
        responseTime: expect.any(Number),
        error: 'Connection timeout',
      });
    });

    it('should measure response time', async () => {
      redisService.isHealthy.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 10))
      );

      const result = await service['checkRedisHealth']();

      expect(result.responseTime).toBeGreaterThanOrEqual(10);
    });
  });

  describe('checkStorageHealth', () => {
    it('should return healthy when Redis is healthy', async () => {
      redisService.isHealthy.mockResolvedValue(true);

      const result = await service['checkStorageHealth']();

      expect(result).toMatchObject({
        status: 'healthy',
        responseTime: expect.any(Number),
        details: {
          provider: 'redis',
          connected: true,
        },
      });
    });

    it('should return unhealthy when Redis is unhealthy', async () => {
      redisService.isHealthy.mockResolvedValue(false);

      const result = await service['checkStorageHealth']();

      expect(result).toMatchObject({
        status: 'unhealthy',
        responseTime: expect.any(Number),
        error: 'Storage backend (Redis) is unhealthy',
      });
    });

    it('should handle Redis service errors', async () => {
      redisService.isHealthy.mockRejectedValue(new Error('Storage backend error'));

      const result = await service['checkStorageHealth']();

      expect(result).toMatchObject({
        status: 'unhealthy',
        responseTime: expect.any(Number),
        error: 'Storage backend error',
      });
    });
  });

  describe('checkAuthHealth', () => {
    it('should return healthy when all API keys are configured', () => {
      configService.get
        .mockReturnValueOnce('discord-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce('claude-key') // CLAUDE_CODE_API_KEY
        .mockReturnValueOnce('hmac-secret'); // HMAC_SECRET

      const result = service['checkAuthHealth']();

      expect(result).toMatchObject({
        status: 'healthy',
        responseTime: expect.any(Number),
        details: {
          discordKeyConfigured: true,
          claudeKeyConfigured: true,
          hmacSecretConfigured: true,
        },
      });
    });

    it('should return unhealthy when Discord key is missing', () => {
      configService.get
        .mockReturnValueOnce(undefined) // DISCORD_BOT_API_KEY - missing
        .mockReturnValueOnce('claude-key') // CLAUDE_CODE_API_KEY
        .mockReturnValueOnce('hmac-secret'); // HMAC_SECRET

      const result = service['checkAuthHealth']();

      expect(result).toMatchObject({
        status: 'unhealthy',
        error: 'Missing required API keys',
        details: {
          discordKeyConfigured: false,
          claudeKeyConfigured: true,
          hmacSecretConfigured: true,
        },
      });
    });

    it('should return unhealthy when Claude key is missing', () => {
      configService.get
        .mockReturnValueOnce('discord-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce(undefined) // CLAUDE_CODE_API_KEY - missing
        .mockReturnValueOnce('hmac-secret'); // HMAC_SECRET

      const result = service['checkAuthHealth']();

      expect(result).toMatchObject({
        status: 'unhealthy',
        error: 'Missing required API keys',
        details: {
          discordKeyConfigured: true,
          claudeKeyConfigured: false,
          hmacSecretConfigured: true,
        },
      });
    });

    it('should return healthy even when HMAC secret is missing', () => {
      configService.get
        .mockReturnValueOnce('discord-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce('claude-key') // CLAUDE_CODE_API_KEY
        .mockReturnValueOnce(undefined); // HMAC_SECRET - optional

      const result = service['checkAuthHealth']();

      expect(result).toMatchObject({
        status: 'healthy',
        details: {
          discordKeyConfigured: true,
          claudeKeyConfigured: true,
          hmacSecretConfigured: false,
        },
      });
    });

    it('should handle configuration service errors', () => {
      configService.get.mockImplementation(() => {
        throw new Error('Configuration service error');
      });

      const result = service['checkAuthHealth']();

      expect(result).toMatchObject({
        status: 'unhealthy',
        responseTime: expect.any(Number),
        error: 'Configuration service error',
      });
    });
  });

  describe('checkUploadHealth', () => {
    it('should return healthy status with upload configuration', () => {
      configService.get
        .mockReturnValueOnce(5242880) // maxFileSize
        .mockReturnValueOnce(['image/jpeg', 'image/png', 'image/gif']); // allowedMimeTypes

      const result = service['checkUploadHealth']();

      expect(result).toMatchObject({
        status: 'healthy',
        responseTime: expect.any(Number),
        details: {
          maxFileSize: 5242880,
          allowedTypesCount: 3,
          allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
        },
      });
    });

    it('should use default values when configuration is missing', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        return defaultValue; // Return the default value provided
      });

      const result = service['checkUploadHealth']();

      expect(result).toMatchObject({
        status: 'healthy',
        details: {
          maxFileSize: IMAGE_CONSTANTS.MAX_FILE_SIZE,
          allowedTypesCount: IMAGE_CONSTANTS.ALLOWED_MIMETYPES.length,
        },
      });
    });

    it('should handle configuration service errors', () => {
      configService.get.mockImplementation(() => {
        throw new Error('Upload config error');
      });

      const result = service['checkUploadHealth']();

      expect(result).toMatchObject({
        status: 'unhealthy',
        responseTime: expect.any(Number),
        error: 'Upload config error',
      });
    });

    it('should limit displayed allowed types to first 3', () => {
      const manyTypes = Array.from({ length: 10 }, (_, i) => `image/type${i}`);
      configService.get
        .mockReturnValueOnce(5242880) // maxFileSize
        .mockReturnValueOnce(manyTypes); // allowedMimeTypes

      const result = service['checkUploadHealth']();

      expect(result.details?.allowedTypesCount).toBe(10);
      expect(result.details?.allowedTypes).toHaveLength(3);
      expect(result.details?.allowedTypes).toEqual(['image/type0', 'image/type1', 'image/type2']);
    });
  });

  describe('getMemoryInfo', () => {
    beforeEach(() => {
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 104857600, // 100MB
        heapTotal: 52428800, // 50MB
        heapUsed: 26214400, // 25MB
        external: 1048576, // 1MB
        arrayBuffers: 0,
      });
    });

    it('should return memory information in MB', () => {
      const result = service['getMemoryInfo']();

      expect(result).toEqual({
        used: 25, // 25MB
        total: 50, // 50MB
        percentage: 50,
      });
    });

    it('should calculate percentage correctly', () => {
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 104857600,
        heapTotal: 104857600, // 100MB
        heapUsed: 83886080, // 80MB
        external: 1048576,
        arrayBuffers: 0,
      });

      const result = service['getMemoryInfo']();

      expect(result.percentage).toBe(80);
    });

    it('should handle edge case with zero total memory', () => {
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0,
        arrayBuffers: 0,
      });

      const result = service['getMemoryInfo']();

      expect(result.used).toBe(0);
      expect(result.total).toBe(0);
      // Note: 0/0 results in NaN, Math.round(NaN) returns NaN
      expect(isNaN(result.percentage)).toBe(true);
    });
  });

  describe('determineOverallStatus', () => {
    it('should return ok when all services are healthy', () => {
      const services = {
        redis: { status: 'healthy' as const },
        storage: { status: 'healthy' as const },
        auth: { status: 'healthy' as const },
        upload: { status: 'healthy' as const },
      };

      const result = service['determineOverallStatus'](services);

      expect(result).toBe('ok');
    });

    it('should return error when any service is unhealthy', () => {
      const services = {
        redis: { status: 'healthy' as const },
        storage: { status: 'unhealthy' as const },
        auth: { status: 'healthy' as const },
        upload: { status: 'healthy' as const },
      };

      const result = service['determineOverallStatus'](services);

      expect(result).toBe('error');
    });

    it('should return ok when services are degraded but not unhealthy', () => {
      const services = {
        redis: { status: 'healthy' as const },
        storage: { status: 'degraded' as const },
        auth: { status: 'healthy' as const },
        upload: { status: 'degraded' as const },
      };

      const result = service['determineOverallStatus'](services);

      expect(result).toBe('ok');
    });

    it('should handle empty services object', () => {
      const services = {};

      const result = service['determineOverallStatus'](services);

      expect(result).toBe('ok');
    });
  });

  describe('getResultValue', () => {
    it('should return value from fulfilled promise', () => {
      const result: PromiseSettledResult<ServiceHealth> = {
        status: 'fulfilled',
        value: { status: 'healthy', responseTime: 10 },
      };

      const value = service['getResultValue'](result);

      expect(value).toEqual({ status: 'healthy', responseTime: 10 });
    });

    it('should return unhealthy service health from rejected promise', () => {
      const result: PromiseSettledResult<ServiceHealth> = {
        status: 'rejected',
        reason: new Error('Service failed'),
      };

      const value = service['getResultValue'](result);

      expect(value).toEqual({
        status: 'unhealthy',
        error: 'Service failed',
      });
    });

    it('should handle rejected promise without message', () => {
      const result: PromiseSettledResult<ServiceHealth> = {
        status: 'rejected',
        reason: null,
      };

      const value = service['getResultValue'](result);

      expect(value).toEqual({
        status: 'unhealthy',
        error: 'Health check failed',
      });
    });

    it('should handle rejected promise with non-error reason', () => {
      const result: PromiseSettledResult<ServiceHealth> = {
        status: 'rejected',
        reason: 'String error',
      };

      const value = service['getResultValue'](result);

      expect(value).toEqual({
        status: 'unhealthy',
        error: 'Health check failed',
      });
    });
  });

  describe('Logger Integration', () => {
    it('should have a logger instance', () => {
      expect(service['logger']).toBeDefined();
      expect(service['logger'].constructor.name).toBe('Logger');
    });

    it('should log debug messages during health checks', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'debug').mockImplementation();

      redisService.isHealthy.mockResolvedValue(true);
      configService.get.mockReturnValue('test-value');

      await service.getHealthStatus();

      expect(loggerSpy).toHaveBeenCalledWith('Performing health check');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle mixed service health statuses', async () => {
      redisService.isHealthy
        .mockResolvedValueOnce(true) // Redis check - healthy
        .mockResolvedValueOnce(false); // Storage check - unhealthy

      configService.get
        .mockReturnValueOnce('1.0.0') // version
        .mockReturnValueOnce('test') // NODE_ENV
        .mockReturnValueOnce('discord-key') // DISCORD_BOT_API_KEY
        .mockReturnValueOnce('claude-key') // CLAUDE_CODE_API_KEY
        .mockReturnValueOnce('hmac-secret') // HMAC_SECRET
        .mockReturnValueOnce(5242880) // maxFileSize
        .mockReturnValueOnce(['image/jpeg']); // allowedMimeTypes

      const result = await service.getHealthStatus();

      expect(result.status).toBe('error'); // Overall status should be error
      expect(result.services.redis.status).toBe('healthy');
      expect(result.services.storage.status).toBe('unhealthy');
      expect(result.services.auth.status).toBe('healthy');
      expect(result.services.upload.status).toBe('healthy');
    });
  });
});