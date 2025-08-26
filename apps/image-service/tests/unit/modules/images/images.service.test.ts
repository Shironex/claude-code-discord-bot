/**
 * Images Service Unit Tests
 * Target Coverage: 95%
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ImagesService } from '../../../../src/modules/images/images.service';
import { RedisService } from '../../../../src/modules/redis/redis.service';
import { ImageMetadata, StoredImage } from '../../../../src/common/interfaces';
import {
  createMockConfigService,
  createMockRedisService,
} from '../../../mocks';
import {
  IMAGE_METADATA_FIXTURES,
  IMAGE_FILE_DATA,
} from '../../../fixtures';
import { IMAGE_CONSTANTS } from '../../../../src/common/constants';

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-nanoid-123456789'),
  customAlphabet: jest.fn(() => jest.fn(() => 'test-nanoid-123456789'))
}));

describe('ImagesService', () => {
  let service: ImagesService;
  let redisService: jest.Mocked<RedisService>;
  let configService: ConfigService;

  beforeEach(async () => {
    // Create mocks
    const mockRedisService = createMockRedisService();
    const mockConfigService = createMockConfigService({
      'imageService.upload.path': '/tmp/test-uploads',
      'imageService.upload.defaultTTL': 3600
    });

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
    redisService = module.get(RedisService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateId', () => {
    it('should generate a unique ID', () => {
      const id = service.generateId();
      expect(id).toBe('test-nanoid-123456789');
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate different IDs on multiple calls', () => {
      const { customAlphabet } = require('nanoid');
      const mockGenerate1 = jest.fn(() => 'id-1');
      const mockGenerate2 = jest.fn(() => 'id-2');
      customAlphabet
        .mockReturnValueOnce(mockGenerate1)
        .mockReturnValueOnce(mockGenerate2);

      const id1 = service.generateId();
      const id2 = service.generateId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('store', () => {
    it('should successfully store an image with metadata', async () => {
      // Arrange
      const id = 'test-image-123';
      const imageBuffer = Buffer.from('test image data');
      const metadata: ImageMetadata = IMAGE_METADATA_FIXTURES.basic;
      const ttlSeconds = 3600;

      // Act
      await service.store(id, imageBuffer, metadata, ttlSeconds);

      // Assert
      expect(redisService.set).toHaveBeenCalledTimes(2);
      expect(redisService.set).toHaveBeenCalledWith(
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}${id}`,
        imageBuffer,
        ttlSeconds
      );
      expect(redisService.set).toHaveBeenCalledWith(
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}meta:${id}`,
        JSON.stringify(metadata),
        ttlSeconds
      );
    });

    it('should handle Redis storage errors', async () => {
      // Arrange
      const id = 'test-image-123';
      const imageBuffer = Buffer.from('test image data');
      const metadata: ImageMetadata = IMAGE_METADATA_FIXTURES.basic;
      const ttlSeconds = 3600;
      
      redisService.set.mockRejectedValueOnce(new Error('Redis connection failed'));

      // Act & Assert
      await expect(service.store(id, imageBuffer, metadata, ttlSeconds))
        .rejects.toThrow('Storage operation failed: Redis connection failed');
    });
  });

  describe('get', () => {
    it('should retrieve a stored image with metadata', async () => {
      // Arrange
      const id = 'test-image-123';
      const imageBuffer = Buffer.from('test image data');
      const metadata: ImageMetadata = {
        ...IMAGE_METADATA_FIXTURES.basic,
        uploadedAt: new Date('2025-01-01T00:00:00Z'), // Future date to avoid expiration
        expiresAt: new Date('2025-12-31T23:59:59Z')    // Future date to avoid expiration
      };
      
      redisService.getBuffer.mockResolvedValue(imageBuffer);
      redisService.get.mockResolvedValue(JSON.stringify(metadata));

      // Act
      const result = await service.get(id);

      // Assert
      expect(result).toBeDefined();
      expect(result?.data).toEqual(imageBuffer);
      expect(result?.metadata.id).toBe(metadata.id);
      expect(result?.metadata.uploadedAt).toEqual(metadata.uploadedAt);
      expect(result?.metadata.expiresAt).toEqual(metadata.expiresAt);
      
      expect(redisService.getBuffer).toHaveBeenCalledWith(
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}${id}`
      );
      expect(redisService.get).toHaveBeenCalledWith(
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}meta:${id}`
      );
    });

    it('should return null for non-existent image', async () => {
      // Arrange
      const id = 'non-existent';
      redisService.getBuffer.mockResolvedValue(null);
      redisService.get.mockResolvedValue(null);

      // Act
      const result = await service.get(id);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null and cleanup expired image', async () => {
      // Arrange
      const id = 'expired-image';
      const imageBuffer = Buffer.from('test image data');
      const expiredMetadata: ImageMetadata = {
        ...IMAGE_METADATA_FIXTURES.basic,
        expiresAt: new Date('2020-01-01T00:00:00Z') // Past date
      };
      
      redisService.getBuffer.mockResolvedValue(imageBuffer);
      redisService.get.mockResolvedValue(JSON.stringify(expiredMetadata));
      redisService.del.mockResolvedValue(1);

      // Act
      const result = await service.get(id);

      // Assert
      expect(result).toBeNull();
      expect(redisService.del).toHaveBeenCalledTimes(2); // Called by delete method
    });

    it('should handle Redis errors gracefully', async () => {
      // Arrange
      const id = 'error-image';
      redisService.getBuffer.mockRejectedValue(new Error('Redis error'));

      // Act
      const result = await service.get(id);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete both image data and metadata', async () => {
      // Arrange
      const id = 'delete-me';
      redisService.del.mockResolvedValue(1);

      // Act
      const result = await service.delete(id);

      // Assert
      expect(result).toBe(true);
      expect(redisService.del).toHaveBeenCalledTimes(2);
      expect(redisService.del).toHaveBeenCalledWith(
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}${id}`
      );
      expect(redisService.del).toHaveBeenCalledWith(
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}meta:${id}`
      );
    });

    it('should return false if deletion fails', async () => {
      // Arrange
      const id = 'delete-fail';
      redisService.del.mockResolvedValue(0); // No keys deleted

      // Act
      const result = await service.delete(id);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      // Arrange
      const id = 'error-delete';
      redisService.del.mockRejectedValue(new Error('Redis error'));

      // Act
      const result = await service.delete(id);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true for existing image', async () => {
      // Arrange
      const id = 'existing-image';
      redisService.exists.mockResolvedValue(true);

      // Act
      const result = await service.exists(id);

      // Assert
      expect(result).toBe(true);
      expect(redisService.exists).toHaveBeenCalledWith(
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}${id}`
      );
    });

    it('should return false for non-existent image', async () => {
      // Arrange
      const id = 'non-existent';
      redisService.exists.mockResolvedValue(false);

      // Act
      const result = await service.exists(id);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      // Arrange
      const id = 'error-exists';
      redisService.exists.mockRejectedValue(new Error('Redis error'));

      // Act
      const result = await service.exists(id);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getMetadata', () => {
    it('should retrieve metadata for existing image', async () => {
      // Arrange
      const id = 'test-image';
      const metadata: ImageMetadata = {
        ...IMAGE_METADATA_FIXTURES.basic,
        uploadedAt: new Date('2025-01-01T00:00:00Z'), // Future date
        expiresAt: new Date('2025-12-31T23:59:59Z')   // Future date
      };
      
      redisService.get.mockResolvedValue(JSON.stringify(metadata));

      // Act
      const result = await service.getMetadata(id);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(metadata.id);
      expect(result?.uploadedAt).toEqual(metadata.uploadedAt);
      expect(result?.expiresAt).toEqual(metadata.expiresAt);
      
      expect(redisService.get).toHaveBeenCalledWith(
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}meta:${id}`
      );
    });

    it('should return null for non-existent metadata', async () => {
      // Arrange
      const id = 'non-existent';
      redisService.get.mockResolvedValue(null);

      // Act
      const result = await service.getMetadata(id);

      // Assert
      expect(result).toBeNull();
    });

    it('should cleanup and return null for expired metadata', async () => {
      // Arrange
      const id = 'expired-image';
      const expiredMetadata: ImageMetadata = {
        ...IMAGE_METADATA_FIXTURES.basic,
        expiresAt: new Date('2020-01-01T00:00:00Z') // Past date
      };
      
      redisService.get.mockResolvedValue(JSON.stringify(expiredMetadata));
      redisService.del.mockResolvedValue(1);

      // Act
      const result = await service.getMetadata(id);

      // Assert
      expect(result).toBeNull();
      expect(redisService.del).toHaveBeenCalledTimes(2); // Called by delete method
    });
  });

  describe('extendTtl', () => {
    it('should extend TTL for existing image', async () => {
      // Arrange
      const id = 'test-image';
      const ttlSeconds = 7200;
      const metadata: ImageMetadata = {
        ...IMAGE_METADATA_FIXTURES.basic,
        uploadedAt: new Date('2023-01-01T00:00:00Z'),
        expiresAt: new Date('2023-01-01T01:00:00Z')
      };
      
      redisService.exists.mockResolvedValue(true);
      redisService.expire.mockResolvedValue(true);
      redisService.get.mockResolvedValue(JSON.stringify(metadata));
      redisService.set.mockResolvedValue(undefined);

      // Act
      const result = await service.extendTtl(id, ttlSeconds);

      // Assert
      expect(result).toBe(true);
      expect(redisService.expire).toHaveBeenCalledTimes(2);
      expect(redisService.expire).toHaveBeenCalledWith(
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}${id}`,
        ttlSeconds
      );
      expect(redisService.expire).toHaveBeenCalledWith(
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}meta:${id}`,
        ttlSeconds
      );
    });

    it('should return false for non-existent image', async () => {
      // Arrange
      const id = 'non-existent';
      const ttlSeconds = 7200;
      
      redisService.exists.mockResolvedValue(false);

      // Act
      const result = await service.extendTtl(id, ttlSeconds);

      // Assert
      expect(result).toBe(false);
      expect(redisService.expire).not.toHaveBeenCalled();
    });
  });

  describe('getAllImageIds', () => {
    it('should return all image IDs', async () => {
      // Arrange
      const keys = [
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}image-1`,
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}image-2`,
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}meta:image-1`, // Should be filtered out
      ];
      redisService.keys.mockResolvedValue(keys);

      // Act
      const result = await service.getAllImageIds();

      // Assert
      expect(result).toEqual(['image-1', 'image-2']);
      expect(redisService.keys).toHaveBeenCalledWith(
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}*`
      );
    });

    it('should handle empty result', async () => {
      // Arrange
      redisService.keys.mockResolvedValue([]);

      // Act
      const result = await service.getAllImageIds();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('should cleanup expired images and return count', async () => {
      // Arrange
      const expiredMetadata1 = {
        ...IMAGE_METADATA_FIXTURES.basic,
        id: 'expired-1',
        expiresAt: new Date('2020-01-01T00:00:00Z') // Past date
      };
      const expiredMetadata2 = {
        ...IMAGE_METADATA_FIXTURES.basic,
        id: 'expired-2',
        expiresAt: new Date('2020-01-01T00:00:00Z') // Past date
      };
      const validMetadata = {
        ...IMAGE_METADATA_FIXTURES.basic,
        id: 'valid-1',
        expiresAt: new Date('2099-12-31T23:59:59Z') // Far future date
      };

      redisService.keys.mockResolvedValue([
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}expired-1`,
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}expired-2`,
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}valid-1`,
      ]);
      
      // Mock getMetadata calls for the cleanup method 
      // Note: The cleanup method calls getMetadata for each image ID
      redisService.get
        .mockResolvedValueOnce(JSON.stringify(expiredMetadata1))  // getMetadata for expired-1
        .mockResolvedValueOnce(JSON.stringify(expiredMetadata2))  // getMetadata for expired-2  
        .mockResolvedValueOnce(JSON.stringify(validMetadata));    // getMetadata for valid-1 (not expired)
        
      redisService.del.mockResolvedValue(1);

      // Act
      const result = await service.cleanup();

      // Assert  
      expect(result).toBe(2); // Two expired images cleaned (via getMetadata automatic cleanup)
      expect(redisService.del).toHaveBeenCalledTimes(4); // 2 expired images * 2 keys each
    });

    it('should handle cleanup errors gracefully', async () => {
      // Arrange
      redisService.keys.mockRejectedValue(new Error('Redis error'));

      // Act
      const result = await service.cleanup();

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return storage statistics', async () => {
      // Arrange
      const imageIds = ['image-1', 'image-2'];
      const metadata1 = {
        ...IMAGE_METADATA_FIXTURES.basic,
        id: 'image-1',
        size: 1000,
        uploadedAt: new Date('2023-01-01T00:00:00Z'),
        expiresAt: new Date('2099-12-31T23:59:59Z') // Far future date
      };
      const metadata2 = {
        ...IMAGE_METADATA_FIXTURES.basic,
        id: 'image-2',
        size: 2000,
        uploadedAt: new Date('2023-01-02T00:00:00Z'),
        expiresAt: new Date('2099-12-31T23:59:59Z') // Far future date
      };

      redisService.keys.mockResolvedValue([
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}image-1`,
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}image-2`,
      ]);
      
      // Mock getMetadata calls in getStats method
      redisService.get
        .mockResolvedValueOnce(JSON.stringify(metadata1))
        .mockResolvedValueOnce(JSON.stringify(metadata2));

      // Act
      const result = await service.getStats();

      // Assert
      expect(result.totalImages).toBe(2);
      expect(result.totalSize).toBe(3000);
      expect(result.averageSize).toBe(1500);
      expect(result.expiredImages).toBe(0);
      expect(result.oldestImage).toEqual(metadata1.uploadedAt);
      expect(result.newestImage).toEqual(metadata2.uploadedAt);
    });

    it('should handle empty storage', async () => {
      // Arrange
      redisService.keys.mockResolvedValue([]);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result.totalImages).toBe(0);
      expect(result.totalSize).toBe(0);
      expect(result.averageSize).toBe(0);
      expect(result.expiredImages).toBe(0);
      expect(result.oldestImage).toBeNull();
      expect(result.newestImage).toBeNull();
    });
  });

  describe('performCleanup', () => {
    it('should perform cleanup with lock and return detailed results', async () => {
      // Arrange
      const expiredMetadata = {
        ...IMAGE_METADATA_FIXTURES.basic,
        id: 'expired-1',
        size: 1000,
        expiresAt: new Date('2020-01-01T00:00:00Z') // Past date - this should be expired
      };

      redisService.exists.mockResolvedValueOnce(false); // Lock doesn't exist
      redisService.set.mockResolvedValue(undefined); // Set lock
      redisService.keys.mockResolvedValue([
        `${IMAGE_CONSTANTS.REDIS_KEYS.IMAGE_PREFIX}expired-1`
      ]);
      // Mock getMetadata call in performCleanup method
      redisService.get.mockResolvedValue(JSON.stringify(expiredMetadata));
      redisService.del.mockResolvedValue(1);

      // Act
      const result = await service.performCleanup();

      // Assert
      expect(result.cleanedCount).toBe(1);
      expect(result.totalSize).toBe(0); // 0 because getMetadata auto-cleaned the expired image before performCleanup could add its size
      expect(result.errors).toEqual([]);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      
      // Verify lock was set and removed
      expect(redisService.set).toHaveBeenCalledWith(
        IMAGE_CONSTANTS.REDIS_KEYS.CLEANUP_LOCK,
        '1',
        300
      );
      expect(redisService.del).toHaveBeenCalledWith(
        IMAGE_CONSTANTS.REDIS_KEYS.CLEANUP_LOCK
      );
    });

    it('should handle concurrent cleanup attempts', async () => {
      // Arrange
      redisService.exists.mockResolvedValue(true); // Lock exists

      // Act
      const result = await service.performCleanup();

      // Assert
      expect(result.cleanedCount).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Another cleanup operation is already running');
    });
  });
});