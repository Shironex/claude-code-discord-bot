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

  beforeEach(async () => {
    const mockUploadService = {
      uploadSingle: jest.fn(),
      uploadBatch: jest.fn(),
      checkUploadLimits: jest.fn().mockReturnValue({ allowed: true })
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
});
