/**
 * Upload Controller Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadController } from '../../../../src/modules/upload/upload.controller';
import { UploadService } from '../../../../src/modules/upload/upload.service';
import { FileValidator } from '../../../../src/modules/upload/validators/file.validator';
import { ApiKeyGuard } from '../../../../src/common/guards';
import {
  createMockFile,
  createMockFiles,
  createMockConfigService
} from '../../../mocks';
import {
  IMAGE_UPLOAD_RESPONSE_FIXTURES,
  UPLOAD_OPTIONS_FIXTURES
} from '../../../fixtures';

describe('UploadController', () => {
  let controller: UploadController;
  let uploadService: jest.Mocked<UploadService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockUploadService = {
      uploadSingle: jest.fn(),
      uploadBatch: jest.fn(),
      checkUploadLimits: jest.fn().mockReturnValue({ allowed: true }),
      getUploadStats: jest.fn()
    };

    const mockFileValidator = {
      validateSingleFile: jest.fn(),
      validateMultipleFiles: jest.fn()
    };

    const mockConfigService = createMockConfigService({
      'imageService.auth.apiKey': 'test-api-key',
      'imageService.upload.maxFileSize': 10485760
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        {
          provide: UploadService,
          useValue: mockUploadService
        },
        {
          provide: FileValidator,
          useValue: mockFileValidator
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        }
      ]
    }).overrideGuard(ApiKeyGuard).useValue({ canActivate: () => true }).compile();

    controller = module.get<UploadController>(UploadController);
    uploadService = module.get(UploadService) as jest.Mocked<UploadService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;

    jest.clearAllMocks();
  });

  describe('POST /upload', () => {
    it('should upload a single file successfully', async () => {
      // Arrange
      const mockFile = createMockFile();
      const expectedResponse = IMAGE_UPLOAD_RESPONSE_FIXTURES.success;
      uploadService.uploadSingle.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.uploadSingle(mockFile, '3600', undefined);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(uploadService.uploadSingle).toHaveBeenCalledWith(mockFile, { ttl: 3600, userId: undefined });
    });

    it('should handle missing file', async () => {
      // Act & Assert
      await expect(controller.uploadSingle(undefined as any, undefined, undefined)).rejects.toThrow(BadRequestException);
      expect(uploadService.uploadSingle).not.toHaveBeenCalled();
    });

    it('should pass TTL parameter to service', async () => {
      // Arrange
      const mockFile = createMockFile();
      const ttl = 7200;
      uploadService.uploadSingle.mockResolvedValue(IMAGE_UPLOAD_RESPONSE_FIXTURES.success);

      // Act
      await controller.uploadSingle(mockFile, '7200', undefined);

      // Assert
      expect(uploadService.uploadSingle).toHaveBeenCalledWith(mockFile, { ttl: 7200, userId: undefined });
    });

    it('should handle service errors', async () => {
      // Arrange
      const mockFile = createMockFile();
      uploadService.uploadSingle.mockRejectedValue(new BadRequestException('Invalid file'));

      // Act & Assert
      await expect(controller.uploadSingle(mockFile, undefined, undefined)).rejects.toThrow(BadRequestException);
    });

    it('should use default options when not provided', async () => {
      // Arrange
      const mockFile = createMockFile();
      uploadService.uploadSingle.mockResolvedValue(IMAGE_UPLOAD_RESPONSE_FIXTURES.success);

      // Act
      await controller.uploadSingle(mockFile, undefined, undefined);

      // Assert
      expect(uploadService.uploadSingle).toHaveBeenCalledWith(mockFile, { ttl: undefined, userId: undefined });
    });
  });

  describe('POST /upload/batch', () => {
    it('should upload multiple files successfully', async () => {
      // Arrange
      const mockFiles = createMockFiles(3);
      const expectedResponse = IMAGE_UPLOAD_RESPONSE_FIXTURES.batchSuccess;
      uploadService.uploadBatch.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.uploadBatch(mockFiles, {});

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(uploadService.uploadBatch).toHaveBeenCalledWith(mockFiles, {});
    });

    it('should handle empty file array', async () => {
      // Act & Assert
      await expect(controller.uploadBatch([], {})).rejects.toThrow(BadRequestException);
    });

    it('should handle partial batch success', async () => {
      // Arrange
      const mockFiles = createMockFiles(3);
      const expectedResponse = IMAGE_UPLOAD_RESPONSE_FIXTURES.partialBatchSuccess;
      uploadService.uploadBatch.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.uploadBatch(mockFiles, {});

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.successCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should pass batch options to service', async () => {
      // Arrange
      const mockFiles = createMockFiles(2);
      const options = { ttl: 1800, userId: 'batch-user' };
      uploadService.uploadBatch.mockResolvedValue(IMAGE_UPLOAD_RESPONSE_FIXTURES.batchSuccess);

      // Act
      await controller.uploadBatch(mockFiles, options);

      // Assert
      expect(uploadService.uploadBatch).toHaveBeenCalledWith(mockFiles, options);
    });

    it('should handle service errors', async () => {
      // Arrange
      const mockFiles = createMockFiles(2);
      uploadService.uploadBatch.mockRejectedValue(new BadRequestException('Batch too large'));

      // Act & Assert
      await expect(controller.uploadBatch(mockFiles, {})).rejects.toThrow(BadRequestException);
    });

    it('should validate file array', async () => {
      // Act & Assert
      await expect(controller.uploadBatch(undefined as any, {})).rejects.toThrow(BadRequestException);
      await expect(controller.uploadBatch(null as any, {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('Input Validation', () => {
    it('should validate TTL parameter', async () => {
      // Arrange
      const mockFile = createMockFile();
      uploadService.uploadSingle.mockResolvedValue(IMAGE_UPLOAD_RESPONSE_FIXTURES.success);

      // Valid TTL values
      const validTtls = [300, 3600, 86400];
      
      for (const ttl of validTtls) {
        // Act
        await controller.uploadSingle(mockFile, ttl.toString(), undefined);
        
        // Assert
        expect(uploadService.uploadSingle).toHaveBeenCalledWith(mockFile, { ttl, userId: undefined });
      }
    });

    it('should handle file metadata', async () => {
      // Arrange
      const mockFile = createMockFile({
        originalname: 'test.jpg',
        size: 100000,
        mimetype: 'image/jpeg'
      });
      uploadService.uploadSingle.mockResolvedValue(IMAGE_UPLOAD_RESPONSE_FIXTURES.success);

      // Act
      const result = await controller.uploadSingle(mockFile, undefined, undefined);

      // Assert
      expect(uploadService.uploadSingle).toHaveBeenCalledWith(
        expect.objectContaining({
          originalname: 'test.jpg',
          size: 100000,
          mimetype: 'image/jpeg'
        }),
        { ttl: undefined, userId: undefined }
      );
    });
  });

  describe('Response Formatting', () => {
    it('should return proper status codes', async () => {
      // Arrange
      const mockFile = createMockFile();
      uploadService.uploadSingle.mockResolvedValue(IMAGE_UPLOAD_RESPONSE_FIXTURES.success);

      // Act
      const result = await controller.uploadSingle(mockFile, undefined, undefined);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should include proper error messages', async () => {
      // Arrange
      const mockFile = createMockFile();
      const errorMessage = 'File validation failed';
      uploadService.uploadSingle.mockRejectedValue(new BadRequestException(errorMessage));

      // Act & Assert
      try {
        await controller.uploadSingle(mockFile, undefined, undefined);
      } catch (error: any) {
        expect(error.message).toBe(errorMessage);
      }
    });
  });

  describe('GET /upload/stats', () => {
    it('should return upload statistics', async () => {
      // Arrange
      const mockStats = {
        totalUploads: 100,
        totalSize: 50 * 1024 * 1024,
        averageFileSize: 512 * 1024,
        supportedFormats: ['image/jpeg', 'image/png'],
        limits: {
          maxFileSize: 10 * 1024 * 1024,
          maxFiles: 10,
          maxTotalSize: 50 * 1024 * 1024,
          maxFilesPerHour: 100
        }
      };
      uploadService.getUploadStats.mockResolvedValue(mockStats);

      // Act
      const result = await controller.getUploadStats();

      // Assert
      expect(result).toEqual(mockStats);
      expect(uploadService.getUploadStats).toHaveBeenCalledWith();
    });

    it('should handle service errors', async () => {
      // Arrange
      uploadService.getUploadStats.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(controller.getUploadStats()).rejects.toThrow('Database error');
    });
  });

  describe('GET /upload/limits', () => {
    it('should return upload limits and configuration', () => {
      // Act
      const result = controller.getUploadLimits();

      // Assert
      expect(result).toBeDefined();
      expect(result.maxFileSize).toBe(10 * 1024 * 1024);
      expect(result.maxFiles).toBe(10);
      expect(result.maxTotalSize).toBe(50 * 1024 * 1024);
      expect(result.maxFilesPerHour).toBe(50); // From IMAGE_CONSTANTS
      expect(result.supportedFormats).toEqual(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff']);
      expect(result.supportedExtensions).toEqual(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff']);
      expect(result.ttlLimits).toEqual({
        default: 1800,
        min: 300,
        max: 7200
      });
    });

    it('should use config service values', () => {
      // Arrange
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        const customConfig: Record<string, any> = {
          'imageService.upload.maxFileSize': 20 * 1024 * 1024,
          'imageService.upload.maxFiles': 20,
          'imageService.rateLimit.maxTotalSizePerRequest': 100 * 1024 * 1024,
          'imageService.rateLimit.maxFilesPerHour': 200,
          'imageService.upload.defaultTtl': 3600,
          'imageService.upload.minTtl': 600,
          'imageService.upload.maxTtl': 14400
        };
        return customConfig[key] ?? defaultValue;
      });

      // Act
      const result = controller.getUploadLimits();

      // Assert
      expect(result.maxFileSize).toBe(20 * 1024 * 1024);
      expect(result.maxFiles).toBe(20);
      expect(result.maxTotalSize).toBe(100 * 1024 * 1024);
      expect(result.maxFilesPerHour).toBe(200);
      expect(result.ttlLimits.default).toBe(3600);
      expect(result.ttlLimits.min).toBe(600);
      expect(result.ttlLimits.max).toBe(14400);
    });
  });

  describe('TTL Parameter Handling', () => {
    it('should parse valid TTL string', async () => {
      // Arrange
      const mockFile = createMockFile();
      uploadService.checkUploadLimits.mockReturnValue({
        allowed: true,
        limits: { maxFiles: 10, maxSize: 10 * 1024 * 1024, maxFilesPerHour: 100 }
      });
      uploadService.uploadSingle.mockResolvedValue({
        id: 'test-id',
        url: 'http://example.com/test-id', 
        expires: new Date().toISOString(),
        size: 100000,
        mimeType: 'image/jpeg'
      });

      // Act
      await controller.uploadSingle(mockFile, '7200', 'user123');

      // Assert
      expect(uploadService.uploadSingle).toHaveBeenCalledWith(
        mockFile,
        { ttl: 7200, userId: 'user123' }
      );
    });

    it('should throw error for invalid TTL string', async () => {
      // Arrange
      const mockFile = createMockFile();

      // Act & Assert
      await expect(controller.uploadSingle(
        mockFile,
        'invalid-ttl',
        'user123'
      )).rejects.toThrow(BadRequestException);
      await expect(controller.uploadSingle(
        mockFile,
        'invalid-ttl',
        'user123'
      )).rejects.toThrow('Invalid TTL value');
    });

    it('should handle undefined TTL', async () => {
      // Arrange
      const mockFile = createMockFile();
      uploadService.checkUploadLimits.mockReturnValue({
        allowed: true,
        limits: { maxFiles: 10, maxSize: 10 * 1024 * 1024, maxFilesPerHour: 100 }
      });
      uploadService.uploadSingle.mockResolvedValue({
        id: 'test-id',
        url: 'http://example.com/test-id',
        expires: new Date().toISOString(),
        size: 100000,
        mimeType: 'image/jpeg'
      });

      // Act
      await controller.uploadSingle(mockFile, undefined, 'user123');

      // Assert
      expect(uploadService.uploadSingle).toHaveBeenCalledWith(
        mockFile,
        { ttl: undefined, userId: 'user123' }
      );
    });
  });
});
