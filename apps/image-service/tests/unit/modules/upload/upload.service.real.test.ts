/**
 * UploadService Unit Tests - Based on ACTUAL implementation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadService } from '../../../../src/modules/upload/upload.service';
import { ImagesService } from '../../../../src/modules/images/images.service';
import { FileValidationUtil } from '../../../../src/common/utils';

// Mock the FileValidationUtil
jest.mock('../../../../src/common/utils/file-validation.util');

describe('UploadService (REAL)', () => {
  let service: UploadService;
  let imagesService: jest.Mocked<ImagesService>;
  let configService: ConfigService;

  beforeEach(async () => {
    // Create mock services
    const mockImagesService = {
      generateId: jest.fn().mockReturnValue('test-id-123'),
      store: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      getMetadata: jest.fn(),
      extendTtl: jest.fn(),
      getAllImageIds: jest.fn(),
      cleanup: jest.fn(),
      getStats: jest.fn()
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const configs: Record<string, any> = {
          'imageService.upload.defaultTtl': 3600,
          'imageService.upload.minTtl': 300,
          'imageService.upload.maxTtl': 7200,
          'imageService.upload.maxFiles': 10,
          'imageService.upload.maxTotalSize': 50 * 1024 * 1024,
          'imageService.baseUrl': 'http://localhost:3001'
        };
        return configs[key] || defaultValue;
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ImagesService,
          useValue: mockImagesService
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        }
      ]
    }).compile();

    service = module.get<UploadService>(UploadService);
    imagesService = module.get(ImagesService) as jest.Mocked<ImagesService>;
    configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock behavior for FileValidationUtil
    (FileValidationUtil.validateFile as jest.Mock).mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    });
    
    (FileValidationUtil.sanitizeFilename as jest.Mock).mockImplementation(
      (filename: string) => filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    );

    (FileValidationUtil.validateFiles as jest.Mock).mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    });
  });

  describe('uploadSingle', () => {
    const createMockFile = (): Express.Multer.File => ({
      fieldname: 'image',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 100000,
      destination: '/tmp',
      filename: 'test.jpg',
      path: '/tmp/test.jpg',
      buffer: Buffer.from('test image data'),
      stream: {} as any
    });

    it('should successfully upload a valid file', async () => {
      // Arrange
      const mockFile = createMockFile();
      const options = { ttl: 3600, userId: 'user-123' };
      
      // Act
      const result = await service.uploadSingle(mockFile, options);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('test-id-123');
      expect(result.url).toBeDefined();
      expect(result.expires).toBeDefined();
      expect(imagesService.generateId).toHaveBeenCalledTimes(1);
      expect(imagesService.store).toHaveBeenCalledWith(
        'test-id-123',
        mockFile.buffer,
        expect.objectContaining({
          id: 'test-id-123',
          size: 100000,
          mimeType: 'image/jpeg',
          userId: 'user-123'
        }),
        3600
      );
    });

    it('should throw BadRequestException for invalid file', async () => {
      // Arrange
      const mockFile = createMockFile();
      (FileValidationUtil.validateFile as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Invalid file type'],
        warnings: []
      });

      // Act & Assert
      await expect(service.uploadSingle(mockFile)).rejects.toThrow(BadRequestException);
      expect(imagesService.store).not.toHaveBeenCalled();
    });

    it('should use default TTL when not provided', async () => {
      // Arrange
      const mockFile = createMockFile();

      // Act
      await service.uploadSingle(mockFile);

      // Assert
      expect(imagesService.store).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Buffer),
        expect.any(Object),
        3600 // default TTL from config
      );
    });

    it('should handle file with warnings', async () => {
      // Arrange
      const mockFile = createMockFile();
      (FileValidationUtil.validateFile as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: ['File name contains special characters']
      });

      // Act
      const result = await service.uploadSingle(mockFile);

      // Assert
      expect(result.id).toBeDefined();
      expect(result.url).toBeDefined();
      expect(imagesService.store).toHaveBeenCalled();
    });
  });

  describe('uploadBatch', () => {
    const createMockFiles = (count: number): Express.Multer.File[] => {
      return Array.from({ length: count }, (_, i) => ({
        fieldname: 'images',
        originalname: `test${i}.jpg`,
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 100000,
        destination: '/tmp',
        filename: `test${i}.jpg`,
        path: `/tmp/test${i}.jpg`,
        buffer: Buffer.from(`test image ${i}`),
        stream: {} as any
      }));
    };

    it('should successfully upload multiple files', async () => {
      // Arrange
      const mockFiles = createMockFiles(3);
      let idCounter = 0;
      imagesService.generateId.mockImplementation(() => `id-${++idCounter}`);

      // Act
      const result = await service.uploadBatch(mockFiles);

      // Assert
      expect(result).toBeDefined();
      expect(result.images).toHaveLength(3);
      expect(result.errors).toBeUndefined();
      expect(result.totalCount).toBe(3);
      expect(result.successCount).toBe(3);
      expect(imagesService.store).toHaveBeenCalledTimes(3);
    });

    it('should handle validation failures in batch', async () => {
      // Arrange
      const mockFiles = createMockFiles(2);
      (FileValidationUtil.validateFiles as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Too many files'],
        warnings: []
      });

      // Act & Assert
      await expect(service.uploadBatch(mockFiles)).rejects.toThrow(BadRequestException);
      expect(imagesService.store).not.toHaveBeenCalled();
    });

    it('should handle empty file array', async () => {
      // Act
      const result = await service.uploadBatch([]);
      
      // Assert - empty batch returns empty result, not an error
      expect(result).toBeDefined();
      expect(result.images).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.successCount).toBe(0);
    });
  });

  describe('validateTtl', () => {
    it('should return valid TTL values', () => {
      expect(service['validateTtl'](3600)).toBe(3600);
      expect(service['validateTtl'](300)).toBe(300);
      expect(service['validateTtl'](7200)).toBe(7200);
    });

    it('should return default TTL when undefined', () => {
      expect(service['validateTtl'](undefined)).toBe(3600);
    });

    it('should clamp invalid TTL values to valid range', () => {
      expect(service['validateTtl'](100)).toBe(300); // Clamped to minimum
      expect(service['validateTtl'](10000)).toBe(7200); // Clamped to maximum
    });
  });

  describe('getUploadStats', () => {
    it('should return upload statistics', async () => {
      // Arrange
      imagesService.getStats.mockResolvedValue({
        totalImages: 10,
        totalSize: 1000000,
        expiredImages: 0,
        averageSize: 100000,
        oldestImage: new Date(),
        newestImage: new Date()
      });

      // Act
      const stats = await service.getUploadStats();

      // Assert
      expect(stats).toBeDefined();
      expect(stats.totalUploads).toBe(10); // Service returns totalUploads, not totalImages
      expect(stats.totalSize).toBe(1000000);
      expect(stats.averageFileSize).toBe(100000);
      expect(imagesService.getStats).toHaveBeenCalled();
    });
  });
});
