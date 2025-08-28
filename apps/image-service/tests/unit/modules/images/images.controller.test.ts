import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { ImagesController } from '@/modules/images/images.controller';
import { ImagesService } from '@/modules/images/images.service';
import { CleanupScheduler } from '@/modules/images/schedulers/cleanup.scheduler';
import { ApiKeyGuard } from '@/common/guards';
import { IMAGE_CONSTANTS } from '@/common/constants';

describe('ImagesController', () => {
  let controller: ImagesController;
  let imagesService: jest.Mocked<ImagesService>;
  let cleanupScheduler: jest.Mocked<CleanupScheduler>;
  let mockResponse: Partial<Response>;

  const mockImage = {
    id: 'test-image-123',
    data: Buffer.from('fake-image-data'),
    metadata: {
      id: 'test-image-123',
      size: 1024,
      mimeType: 'image/jpeg',
      uploadedAt: new Date('2024-01-01T10:00:00Z'),
      expiresAt: new Date('2024-01-01T11:00:00Z'),
      originalName: 'test.jpg',
    },
  };

  beforeEach(async () => {
    const mockImagesService = {
      get: jest.fn(),
      getMetadata: jest.fn(),
      delete: jest.fn(),
      getStats: jest.fn(),
    };

    const mockCleanupScheduler = {
      triggerManualCleanup: jest.fn(),
      getCleanupStats: jest.fn(),
    };

    // Mock response object
    mockResponse = {
      set: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImagesController],
      providers: [
        {
          provide: ImagesService,
          useValue: mockImagesService,
        },
        {
          provide: CleanupScheduler,
          useValue: mockCleanupScheduler,
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ImagesController>(ImagesController);
    imagesService = module.get(ImagesService);
    cleanupScheduler = module.get(CleanupScheduler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getImage', () => {
    it('should retrieve and serve an image successfully', async () => {
      imagesService.get.mockResolvedValue(mockImage);

      await controller.getImage('test-image-123', mockResponse as Response);

      expect(imagesService.get).toHaveBeenCalledWith('test-image-123');
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'image/jpeg',
        'Content-Length': '1024',
        'Cache-Control': 'public, max-age=3600',
        ETag: '"test-image-123"',
        'Last-Modified': 'Mon, 01 Jan 2024 10:00:00 GMT',
      });
      expect(mockResponse.set).toHaveBeenCalledWith(
        'Content-Disposition',
        'inline; filename="test.jpg"'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith(mockImage.data);
    });

    it('should handle image without original name', async () => {
      const imageWithoutName = {
        ...mockImage,
        metadata: { ...mockImage.metadata, originalName: undefined },
      };
      imagesService.get.mockResolvedValue(imageWithoutName);

      await controller.getImage('test-image-123', mockResponse as Response);

      expect(mockResponse.set).toHaveBeenCalledTimes(1); // Only the main headers, not Content-Disposition
      expect(mockResponse.set).not.toHaveBeenCalledWith(
        'Content-Disposition',
        expect.any(String)
      );
    });

    it('should handle Date object for uploadedAt', async () => {
      const imageWithDateObject = {
        ...mockImage,
        metadata: {
          ...mockImage.metadata,
          uploadedAt: new Date('2024-01-01T10:00:00Z'),
        },
      };
      imagesService.get.mockResolvedValue(imageWithDateObject);

      await controller.getImage('test-image-123', mockResponse as Response);

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Last-Modified': 'Mon, 01 Jan 2024 10:00:00 GMT',
        })
      );
    });

    it('should handle string timestamp for uploadedAt', async () => {
      const imageWithStringDate = {
        ...mockImage,
        metadata: {
          ...mockImage.metadata,
          uploadedAt: '2024-01-01T10:00:00Z' as any,
        },
      };
      imagesService.get.mockResolvedValue(imageWithStringDate);

      await controller.getImage('test-image-123', mockResponse as Response);

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Last-Modified': 'Mon, 01 Jan 2024 10:00:00 GMT',
        })
      );
    });

    it('should throw BadRequestException for invalid image ID', async () => {
      await expect(
        controller.getImage('invalid!@#', mockResponse as Response)
      ).rejects.toThrow(new BadRequestException(IMAGE_CONSTANTS.ERRORS.INVALID_IMAGE_ID));

      expect(imagesService.get).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for empty image ID', async () => {
      await expect(
        controller.getImage('', mockResponse as Response)
      ).rejects.toThrow(new BadRequestException(IMAGE_CONSTANTS.ERRORS.INVALID_IMAGE_ID));
    });

    it('should throw BadRequestException for too short image ID', async () => {
      await expect(
        controller.getImage('short', mockResponse as Response)
      ).rejects.toThrow(new BadRequestException(IMAGE_CONSTANTS.ERRORS.INVALID_IMAGE_ID));
    });

    it('should throw BadRequestException for too long image ID', async () => {
      const longId = 'a'.repeat(33);
      await expect(
        controller.getImage(longId, mockResponse as Response)
      ).rejects.toThrow(new BadRequestException(IMAGE_CONSTANTS.ERRORS.INVALID_IMAGE_ID));
    });

    it('should throw NotFoundException when image does not exist', async () => {
      imagesService.get.mockResolvedValue(null);

      await expect(
        controller.getImage('test-image-123', mockResponse as Response)
      ).rejects.toThrow(new NotFoundException(IMAGE_CONSTANTS.ERRORS.IMAGE_NOT_FOUND));

      expect(imagesService.get).toHaveBeenCalledWith('test-image-123');
    });

    it('should accept valid image IDs with allowed characters', async () => {
      imagesService.get.mockResolvedValue(mockImage);

      // Test various valid ID formats
      const validIds = [
        'abcd1234',
        'test-image-123',
        'test_image_456',
        'ABC123def',
        'img_2024-01-01_abc123',
      ];

      for (const id of validIds) {
        await controller.getImage(id, mockResponse as Response);
        expect(imagesService.get).toHaveBeenCalledWith(id);
      }
    });
  });

  describe('getImageMetadata', () => {
    it('should return image metadata successfully', async () => {
      imagesService.getMetadata.mockResolvedValue(mockImage.metadata);

      const result = await controller.getImageMetadata('test-image-123');

      expect(imagesService.getMetadata).toHaveBeenCalledWith('test-image-123');
      expect(result).toEqual({
        id: 'test-image-123',
        size: 1024,
        mimeType: 'image/jpeg',
        uploadedAt: '2024-01-01T10:00:00.000Z',
        expiresAt: '2024-01-01T11:00:00.000Z',
        originalName: 'test.jpg',
      });
    });

    it('should throw BadRequestException for invalid image ID', async () => {
      await expect(
        controller.getImageMetadata('invalid!@#')
      ).rejects.toThrow(new BadRequestException(IMAGE_CONSTANTS.ERRORS.INVALID_IMAGE_ID));

      expect(imagesService.getMetadata).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when metadata does not exist', async () => {
      imagesService.getMetadata.mockResolvedValue(null);

      await expect(
        controller.getImageMetadata('test-image-123')
      ).rejects.toThrow(new NotFoundException(IMAGE_CONSTANTS.ERRORS.IMAGE_NOT_FOUND));

      expect(imagesService.getMetadata).toHaveBeenCalledWith('test-image-123');
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      imagesService.delete.mockResolvedValue(true);

      const result = await controller.deleteImage('test-image-123');

      expect(imagesService.delete).toHaveBeenCalledWith('test-image-123');
      expect(result).toEqual({
        success: true,
        message: 'Image deleted successfully',
        id: 'test-image-123',
      });
    });

    it('should throw BadRequestException for invalid image ID', async () => {
      await expect(
        controller.deleteImage('invalid!@#')
      ).rejects.toThrow(new BadRequestException(IMAGE_CONSTANTS.ERRORS.INVALID_IMAGE_ID));

      expect(imagesService.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when image does not exist', async () => {
      imagesService.delete.mockResolvedValue(false);

      await expect(
        controller.deleteImage('test-image-123')
      ).rejects.toThrow(new NotFoundException(IMAGE_CONSTANTS.ERRORS.IMAGE_NOT_FOUND));

      expect(imagesService.delete).toHaveBeenCalledWith('test-image-123');
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics successfully', async () => {
      const mockStats = {
        totalImages: 100,
        totalSize: 1024 * 1024 * 10, // 10MB
        expiredImages: 5,
        oldestImage: new Date('2024-01-01T08:00:00Z'),
        newestImage: new Date('2024-01-01T12:00:00Z'),
        averageSize: 1024 * 100, // 100KB
      };

      imagesService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStorageStats();

      expect(imagesService.getStats).toHaveBeenCalled();
      expect(result).toEqual({
        totalImages: 100,
        totalSize: 10485760,
        expiredImages: 5,
        oldestImage: '2024-01-01T08:00:00.000Z',
        newestImage: '2024-01-01T12:00:00.000Z',
        averageSize: 102400,
      });
    });

    it('should handle null oldest and newest image dates', async () => {
      const mockStats = {
        totalImages: 0,
        totalSize: 0,
        expiredImages: 0,
        oldestImage: null,
        newestImage: null,
        averageSize: 0,
      };

      imagesService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStorageStats();

      expect(result).toEqual({
        totalImages: 0,
        totalSize: 0,
        expiredImages: 0,
        oldestImage: null,
        newestImage: null,
        averageSize: 0,
      });
    });
  });

  describe('triggerCleanup', () => {
    it('should trigger manual cleanup successfully', async () => {
      const mockResult = {
        success: true,
        result: {
          cleanedCount: 10,
          totalSize: 1024 * 50,
          duration: 150,
          errors: [],
        },
      };

      cleanupScheduler.triggerManualCleanup.mockResolvedValue(mockResult);

      const result = await controller.triggerCleanup();

      expect(cleanupScheduler.triggerManualCleanup).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should handle cleanup failure', async () => {
      const mockResult = {
        success: false,
        error: 'Cleanup already running',
      };

      cleanupScheduler.triggerManualCleanup.mockResolvedValue(mockResult);

      const result = await controller.triggerCleanup();

      expect(result).toEqual(mockResult);
    });

    it('should handle cleanup with errors', async () => {
      const mockResult = {
        success: true,
        result: {
          cleanedCount: 5,
          totalSize: 1024 * 25,
          duration: 200,
          errors: ['Error 1', 'Error 2'],
        },
      };

      cleanupScheduler.triggerManualCleanup.mockResolvedValue(mockResult);

      const result = await controller.triggerCleanup();

      expect(result).toEqual(mockResult);
    });
  });

  describe('getCleanupStats', () => {
    it('should return cleanup statistics successfully', async () => {
      const mockStats = {
        isRunning: false,
        lastCleanup: new Date('2024-01-01T10:00:00Z'),
        stats: {
          totalRuns: 50,
          totalCleaned: 500,
          totalErrors: 2,
          averageDuration: 125.5,
        },
      };

      cleanupScheduler.getCleanupStats.mockReturnValue(mockStats);

      const result = controller.getCleanupStats();

      expect(cleanupScheduler.getCleanupStats).toHaveBeenCalled();
      expect(result).toEqual({
        isRunning: false,
        lastCleanup: '2024-01-01T10:00:00.000Z',
        stats: {
          totalRuns: 50,
          totalCleaned: 500,
          totalErrors: 2,
          averageDuration: 125.5,
        },
      });
    });

    it('should handle null lastCleanup', async () => {
      const mockStats = {
        isRunning: true,
        lastCleanup: null,
        stats: {
          totalRuns: 0,
          totalCleaned: 0,
          totalErrors: 0,
          averageDuration: 0,
        },
      };

      cleanupScheduler.getCleanupStats.mockReturnValue(mockStats);

      const result = controller.getCleanupStats();

      expect(result).toEqual({
        isRunning: true,
        lastCleanup: null,
        stats: {
          totalRuns: 0,
          totalCleaned: 0,
          totalErrors: 0,
          averageDuration: 0,
        },
      });
    });
  });

  describe('isValidImageId (private method validation)', () => {
    it('should validate image IDs through public methods', async () => {
      // Test the validation through public methods that use it
      const testCases = [
        { id: 'valid123', shouldPass: true },
        { id: 'test-image-123', shouldPass: true },
        { id: 'test_image_456', shouldPass: true },
        { id: 'ABC123def', shouldPass: true },
        { id: 'short', shouldPass: false }, // Too short
        { id: 'a'.repeat(33), shouldPass: false }, // Too long
        { id: 'invalid!@#', shouldPass: false }, // Invalid characters
        { id: '', shouldPass: false }, // Empty
        { id: 'valid-but-with space', shouldPass: false }, // Space not allowed
        { id: 'valid.extension', shouldPass: false }, // Dot not allowed
      ];

      for (const { id, shouldPass } of testCases) {
        if (shouldPass) {
          imagesService.get.mockResolvedValue(mockImage);
          await controller.getImage(id, mockResponse as Response);
          expect(imagesService.get).toHaveBeenCalledWith(id);
        } else {
          await expect(
            controller.getImage(id, mockResponse as Response)
          ).rejects.toThrow(BadRequestException);
        }
        jest.clearAllMocks();
      }
    });
  });

  describe('API Guards Integration', () => {
    it('should use ApiKeyGuard for all endpoints', () => {
      const guards = Reflect.getMetadata('__guards__', ImagesController);
      expect(guards).toContain(ApiKeyGuard);
    });
  });

  describe('API Tags and Swagger Integration', () => {
    it('should have correct controller path', () => {
      const path = Reflect.getMetadata('path', ImagesController);
      expect(path).toBe('images');
    });

    it('should have API tags metadata', () => {
      const tags = Reflect.getMetadata('swagger/apiUseTags', ImagesController);
      expect(tags).toEqual(['images']);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle service errors in getImage', async () => {
      imagesService.get.mockRejectedValue(new Error('Redis connection failed'));

      await expect(
        controller.getImage('test-image-123', mockResponse as Response)
      ).rejects.toThrow('Redis connection failed');
    });

    it('should handle service errors in getImageMetadata', async () => {
      imagesService.getMetadata.mockRejectedValue(new Error('Database error'));

      await expect(
        controller.getImageMetadata('test-image-123')
      ).rejects.toThrow('Database error');
    });

    it('should handle service errors in deleteImage', async () => {
      imagesService.delete.mockRejectedValue(new Error('Deletion failed'));

      await expect(
        controller.deleteImage('test-image-123')
      ).rejects.toThrow('Deletion failed');
    });

    it('should handle service errors in getStorageStats', async () => {
      imagesService.getStats.mockRejectedValue(new Error('Stats unavailable'));

      await expect(
        controller.getStorageStats()
      ).rejects.toThrow('Stats unavailable');
    });
  });

  describe('Response Headers and Content', () => {
    it('should set correct cache headers', async () => {
      imagesService.get.mockResolvedValue(mockImage);

      await controller.getImage('test-image-123', mockResponse as Response);

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Cache-Control': 'public, max-age=3600',
          ETag: '"test-image-123"',
        })
      );
    });

    it('should set correct content headers', async () => {
      imagesService.get.mockResolvedValue(mockImage);

      await controller.getImage('test-image-123', mockResponse as Response);

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'image/jpeg',
          'Content-Length': '1024',
        })
      );
    });
  });
});