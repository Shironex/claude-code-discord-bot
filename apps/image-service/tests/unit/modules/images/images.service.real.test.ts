/**
 * ImagesService Unit Tests - Based on ACTUAL implementation
 */

// Mock nanoid before importing anything else
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-nanoid-123'),
  customAlphabet: jest.fn(() => jest.fn(() => 'test-nanoid-123'))
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ImagesService } from '../../../../src/modules/images/images.service';
import { RedisService } from '../../../../src/modules/redis/redis.service';
import { ConfigService } from '@nestjs/config';

describe('ImagesService (REAL)', () => {
  let service: ImagesService;
  let redisService: jest.Mocked<RedisService>;
  let configService: ConfigService;

  beforeEach(async () => {
    // Create mock Redis service matching actual interface
    const mockRedisService = {
      get: jest.fn().mockResolvedValue(null),
      getBuffer: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(0),
      expire: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      ttl: jest.fn().mockResolvedValue(-1),
      scan: jest.fn().mockResolvedValue(['0', []]),
      incr: jest.fn().mockResolvedValue(1),
      incrby: jest.fn().mockResolvedValue(1),
      hset: jest.fn().mockResolvedValue(1),
      hget: jest.fn().mockResolvedValue(null),
      hgetall: jest.fn().mockResolvedValue({}),
      hdel: jest.fn().mockResolvedValue(0),
      ping: jest.fn().mockResolvedValue('PONG'),
      isHealthy: jest.fn().mockResolvedValue(true),
      getStatus: jest.fn().mockReturnValue({ connected: true, status: 'ready', reconnectAttempts: 0 }),
      execute: jest.fn(),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn()
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const configs: Record<string, any> = {
          'imageService.storage.path': '/tmp/test-uploads',
          'imageService.storage.maxFileSize': 10485760,
          'imageService.redis.keyPrefix': 'test:'
        };
        return configs[key] || defaultValue;
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImagesService,
        {
          provide: RedisService,
          useValue: mockRedisService
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        }
      ]
    }).compile();

    service = module.get<ImagesService>(ImagesService);
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe('generateId', () => {
    it('should generate a unique ID', () => {
      const id = service.generateId();
      expect(id).toBe('test-nanoid-123');
    });
  });

  describe('store', () => {
    it('should store image data and metadata', async () => {
      // Arrange
      const id = 'test-id';
      const imageData = Buffer.from('test image');
      const metadata = {
        id,
        size: 1000,
        mimeType: 'image/jpeg',
        uploadedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        originalName: 'test.jpg'
      };
      const ttl = 3600;

      // Act
      await service.store(id, imageData, metadata, ttl);

      // Assert
      expect(redisService.set).toHaveBeenCalledTimes(2); // Once for data, once for metadata
    });
  });

  describe('get', () => {
    it('should retrieve stored image', async () => {
      // Arrange
      const id = 'test-id';
      const imageData = Buffer.from('test image').toString('base64');
      const metadata = {
        id,
        size: 1000,
        mimeType: 'image/jpeg',
        uploadedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        originalName: 'test.jpg'
      };

      // Mock the getBuffer and get calls that the service makes
      redisService.getBuffer.mockResolvedValue(Buffer.from(imageData, 'base64'));
      redisService.get.mockResolvedValue(JSON.stringify(metadata));

      // Act
      const result = await service.get(id);

      // Assert
      expect(result).toBeDefined();
      expect(result?.data).toBeInstanceOf(Buffer);
      expect(result?.metadata.id).toBe(id);
    });

    it('should return null for non-existent image', async () => {
      // Arrange
      redisService.getBuffer.mockResolvedValue(null);
      redisService.get.mockResolvedValue(null);

      // Act
      const result = await service.get('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete image and metadata', async () => {
      // Arrange
      redisService.del.mockResolvedValue(2); // Deleted 2 keys

      // Act
      const result = await service.delete('test-id');

      // Assert
      expect(result).toBe(true);
      expect(redisService.del).toHaveBeenCalledTimes(2);
      expect(redisService.del).toHaveBeenCalledWith('image:test-id');
      expect(redisService.del).toHaveBeenCalledWith('image:meta:test-id');
    });

    it('should return false if nothing was deleted', async () => {
      // Arrange
      redisService.del.mockResolvedValue(0);

      // Act
      const result = await service.delete('non-existent');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true if image exists', async () => {
      // Arrange
      redisService.exists.mockResolvedValue(true);

      // Act
      const result = await service.exists('test-id');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false if image does not exist', async () => {
      // Arrange
      redisService.exists.mockResolvedValue(false);

      // Act
      const result = await service.exists('non-existent');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should cleanup expired images', async () => {
      // Arrange
      const expiredMetadata = {
        id: 'expired-id',
        size: 1000,
        mimeType: 'image/jpeg',
        uploadedAt: new Date(Date.now() - 7200000).toISOString(),
        expiresAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago (expired)
        originalName: 'expired.jpg'
      };
      
      // Mock getAllImageIds return (returns image IDs, not metadata keys)
      redisService.keys.mockResolvedValue(['image:expired-id']);
      // Mock getMetadata call for the expired image
      redisService.get.mockResolvedValue(JSON.stringify(expiredMetadata));
      // Mock delete operation
      redisService.del.mockResolvedValue(1);

      // Act
      const deletedCount = await service.cleanup();

      // Assert
      expect(deletedCount).toBeGreaterThan(0);
      expect(redisService.del).toHaveBeenCalled();
    });
  });
});
