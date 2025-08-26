/**
 * Upload Service Unit Tests
 * Target Coverage: 95%
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadService } from '../../../../src/modules/upload/upload.service';
import { ImagesService } from '../../../../src/modules/images/images.service';
import { FileValidationUtil } from '../../../../src/common/utils';
import {
  createMockConfigService,
  createMockLogger,
  createMockFile,
  createMockFiles,
  createInvalidMockFile
} from '../../../mocks';
import {
  IMAGE_METADATA_FIXTURES,
  UPLOAD_OPTIONS_FIXTURES,
  BATCH_UPLOAD_FIXTURES
} from '../../../fixtures';

// Mock the utilities
jest.mock('../../../../src/common/utils/file-validation.util');

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-nanoid-123456789'),
  customAlphabet: jest.fn(() => jest.fn(() => 'test-nanoid-123456789'))
}));

describe('UploadService', () => {
  let service: UploadService;
  let imagesService: jest.Mocked<ImagesService>;
  let configService: ConfigService;

  beforeEach(async () => {
    // Create mocks
    const mockConfigService = createMockConfigService({
      'imageService.upload.maxFileSize': 10485760,
      'imageService.upload.defaultTtl': 1800, // 30 minutes
      'imageService.upload.minTtl': 300,  // 5 minutes
      'imageService.upload.maxTtl': 7200  // 2 hours
    });

    const mockImagesService = {
      generateId: jest.fn().mockReturnValue('test-id-123'),
      store: jest.fn().mockResolvedValue(IMAGE_METADATA_FIXTURES.basic),
      get: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      cleanup: jest.fn(),
      getStats: jest.fn().mockResolvedValue({ totalImages: 0, totalSize: 0, averageSize: 0 })
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
    imagesService = module.get(ImagesService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock behavior
    (FileValidationUtil.validateFile as jest.Mock).mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    });
    
    (FileValidationUtil.validateFiles as jest.Mock).mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    });
    
    (FileValidationUtil.sanitizeFilename as jest.Mock).mockImplementation(
      (filename: string) => filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadSingle', () => {
    it('should successfully upload a valid image file', async () => {
      // Arrange
      const mockFile = createMockFile();
      const options = UPLOAD_OPTIONS_FIXTURES.default;

      // Act
      const result = await service.uploadSingle(mockFile, options);

      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveProperty('id', 'test-id-123');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('expires');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('mimeType');
      expect(imagesService.generateId).toHaveBeenCalledTimes(1);
      expect(imagesService.store).toHaveBeenCalledTimes(1);
      expect(FileValidationUtil.validateFile).toHaveBeenCalledWith(mockFile);
    });

    it('should throw BadRequestException for invalid file', async () => {
      // Arrange
      const mockFile = createInvalidMockFile('type');
      (FileValidationUtil.validateFile as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Invalid file type'],
        warnings: []
      });

      // Act & Assert
      await expect(service.uploadSingle(mockFile)).rejects.toThrow(BadRequestException);
      expect(imagesService.store).not.toHaveBeenCalled();
    });

    it('should handle file validation warnings', async () => {
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
      expect(result).toBeDefined();
      expect(imagesService.store).toHaveBeenCalled();
    });

    it('should use default TTL when not provided', async () => {
      // Arrange
      const mockFile = createMockFile();

      // Act
      const result = await service.uploadSingle(mockFile);

      // Assert
      expect(result).toBeDefined();
      const storedMetadata = imagesService.store.mock.calls[0][2];
      expect(storedMetadata.expiresAt).toBeDefined();
    });

    it('should validate and use custom TTL', async () => {
      // Arrange
      const mockFile = createMockFile();
      const options = UPLOAD_OPTIONS_FIXTURES.shortTtl;

      // Act
      const result = await service.uploadSingle(mockFile, options);

      // Assert
      expect(result).toBeDefined();
      const storedMetadata = imagesService.store.mock.calls[0][2];
      expect(storedMetadata.expiresAt).toBeDefined();
    });

    it('should clamp negative TTL values', async () => {
      // Arrange
      const mockFile = createMockFile();
      const options = { ttl: -1 };

      // Act
      const result = await service.uploadSingle(mockFile, options);

      // Assert  
      expect(result).toBeDefined();
      const storedMetadata = imagesService.store.mock.calls[0][2];
      expect(storedMetadata.expiresAt).toBeDefined();
    });

    it('should handle storage errors gracefully', async () => {
      // Arrange
      const mockFile = createMockFile();
      imagesService.store.mockRejectedValue(new Error('Storage failed'));

      // Act & Assert
      await expect(service.uploadSingle(mockFile)).rejects.toThrow('Storage failed');
    });

    it('should sanitize file names', async () => {
      // Arrange
      const mockFile = createMockFile({
        originalname: '../../../etc/passwd'
      });

      // Act
      const result = await service.uploadSingle(mockFile);

      // Assert
      expect(result).toBeDefined();
      expect(FileValidationUtil.sanitizeFilename).toHaveBeenCalledWith('../../../etc/passwd');
    });

    it('should include userId in metadata when provided', async () => {
      // Arrange
      const mockFile = createMockFile();
      const options = { userId: 'user-123', ttl: 3600 };

      // Act
      await service.uploadSingle(mockFile, options);

      // Assert
      const storedMetadata = imagesService.store.mock.calls[0][2];
      expect(storedMetadata.userId).toBe('user-123');
    });

    it('should handle large files correctly', async () => {
      // Arrange
      const largeFile = createMockFile({
        size: 10 * 1024 * 1024 // 10MB - at limit
      });

      // Act
      const result = await service.uploadSingle(largeFile);

      // Assert
      expect(result).toBeDefined();
      expect(imagesService.store).toHaveBeenCalled();
    });
  });

  describe('uploadBatch', () => {
    it('should successfully upload multiple files', async () => {
      // Arrange
      const mockFiles = createMockFiles(3);
      const options = UPLOAD_OPTIONS_FIXTURES.default;
      
      imagesService.generateId
        .mockReturnValueOnce('id-1')
        .mockReturnValueOnce('id-2')
        .mockReturnValueOnce('id-3');

      // Act
      const result = await service.uploadBatch(mockFiles, options);

      // Assert
      expect(result).toBeDefined();
      expect(result.images).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.errors).toBeUndefined();
      expect(imagesService.store).toHaveBeenCalledTimes(3);
    });

    it('should handle partial batch failures', async () => {
      // Arrange
      const mockFiles = createMockFiles(3);
      
      // Make second file fail validation
      (FileValidationUtil.validateFile as jest.Mock)
        .mockReturnValueOnce({ isValid: true, errors: [], warnings: [] })
        .mockReturnValueOnce({ isValid: false, errors: ['Invalid type'], warnings: [] })
        .mockReturnValueOnce({ isValid: true, errors: [], warnings: [] });

      // Act
      const result = await service.uploadBatch(mockFiles);

      // Assert
      expect(result).toBeDefined();
      expect(result.images).toHaveLength(2);
      expect(result.totalCount).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle empty batch', async () => {
      // Act
      const result = await service.uploadBatch([]);

      // Assert
      expect(result).toBeDefined();
      expect(result.images).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.errors).toBeUndefined();
      expect(imagesService.store).not.toHaveBeenCalled();
    });

    it('should process files independently', async () => {
      // Arrange
      const mockFiles = createMockFiles(2);
      imagesService.store
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Storage error'));

      // Act
      const result = await service.uploadBatch(mockFiles);

      // Assert
      expect(result).toBeDefined();
      expect(result.images).toHaveLength(1);
      expect(result.totalCount).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].error).toContain('Storage error');
    });

    it('should respect batch size limits', async () => {
      // Arrange
      const mockFiles = createMockFiles(11); // Over typical limit of 10
      (FileValidationUtil.validateFiles as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Too many files'],
        warnings: []
      });

      // Act & Assert
      await expect(service.uploadBatch(mockFiles)).rejects.toThrow(BadRequestException);
    });

    it('should apply same TTL to all files in batch', async () => {
      // Arrange
      const mockFiles = createMockFiles(2);
      const options = { ttl: 7200 };

      // Act
      await service.uploadBatch(mockFiles, options);

      // Assert
      const calls = imagesService.store.mock.calls;
      expect(calls[0][2].expiresAt).toBeDefined();
      expect(calls[1][2].expiresAt).toBeDefined();
    });
  });

  describe('validateTtl', () => {
    it('should return default TTL when not provided', () => {
      const ttl = service['validateTtl'](undefined);
      expect(ttl).toBe(1800); // 30 minutes
    });

    it('should accept valid TTL values', () => {
      expect(service['validateTtl'](600)).toBe(600);
      expect(service['validateTtl'](3600)).toBe(3600);
    });

    it('should clamp TTL values to minimum', () => {
      expect(service['validateTtl'](100)).toBe(300); // Clamped to 5 minutes
      expect(service['validateTtl'](-1)).toBe(300);  // Clamped to 5 minutes
      expect(service['validateTtl'](0)).toBe(1800);   // Returns default for falsy values
    });

    it('should clamp TTL values to maximum', () => {
      expect(service['validateTtl'](10000)).toBe(7200); // Clamped to 2 hours
    });
  });
});
