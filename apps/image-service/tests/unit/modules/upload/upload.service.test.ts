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
import { IMAGE_CONSTANTS } from '../../../../src/common/constants';
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
// nanoid mock removed - using real implementation for better test coverage

describe('UploadService', () => {
  let service: UploadService;
  let imagesService: jest.Mocked<ImagesService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // Create mocks
    const mockConfigService = createMockConfigService({
      'imageService.upload.maxFileSize': 10485760,
      'imageService.upload.defaultTtl': 1800, // 30 minutes
      'imageService.upload.minTtl': 300,  // 5 minutes
      'imageService.upload.maxTtl': 7200,  // 2 hours
      'imageService.baseUrl': 'http://localhost:3001'  // Base URL for image URLs
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
    configService = module.get<ConfigService>(ConfigService) as jest.Mocked<ConfigService>;

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

  describe('checkUploadLimits', () => {
    it('should allow uploads within limits', () => {
      const result = service.checkUploadLimits('user123', 3, 5 * 1024 * 1024);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.limits).toBeDefined();
      expect(result.limits.maxFiles).toBe(10);
      expect(result.limits.maxSize).toBeDefined();
      expect(result.limits.maxFilesPerHour).toBeDefined();
    });

    it('should reject when file count exceeds limit', () => {
      const result = service.checkUploadLimits('user123', 15, 1024);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Too many files');
      expect(result.reason).toContain('Maximum 10 files');
      expect(result.limits).toBeDefined();
    });

    it('should reject when total size exceeds limit', () => {
      const largeSize = 100 * 1024 * 1024; // 100MB
      const result = service.checkUploadLimits('user123', 1, largeSize);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Total size too large');
      expect(result.reason).toContain('MB per request');
      expect(result.limits).toBeDefined();
    });

    it('should use default values when parameters not provided', () => {
      const result = service.checkUploadLimits();

      expect(result.allowed).toBe(true);
      expect(result.limits).toBeDefined();
    });

    it('should handle edge case file counts and sizes', () => {
      // Test exactly at limit
      const result1 = service.checkUploadLimits('user123', 10, 0);
      expect(result1.allowed).toBe(true);

      // Test just over limit
      const result2 = service.checkUploadLimits('user123', 11, 0);
      expect(result2.allowed).toBe(false);
    });
  });

  describe('getUploadStats', () => {
    it('should return comprehensive upload statistics', async () => {
      // Arrange
      imagesService.getStats.mockResolvedValue({
        totalImages: 150,
        totalSize: 50 * 1024 * 1024,
        expiredImages: 5,
        averageSize: 333333,
        oldestImage: new Date('2023-01-01'),
        newestImage: new Date('2023-12-31')
      });

      // Act
      const stats = await service.getUploadStats();

      // Assert
      expect(stats).toBeDefined();
      expect(stats.totalUploads).toBe(150);
      expect(stats.totalSize).toBe(50 * 1024 * 1024);
      expect(stats.averageFileSize).toBe(333333);
      expect(stats.supportedFormats).toEqual([...IMAGE_CONSTANTS.ALLOWED_MIMETYPES]);
      expect(stats.limits).toBeDefined();
      expect(stats.limits.maxFileSize).toBe(IMAGE_CONSTANTS.MAX_FILE_SIZE);
      expect(stats.limits.maxFiles).toBeDefined();
      expect(stats.limits.maxTotalSize).toBeDefined();
      expect(stats.limits.maxFilesPerHour).toBeDefined();
    });

    it('should handle empty storage stats', async () => {
      // Arrange
      imagesService.getStats.mockResolvedValue({
        totalImages: 0,
        totalSize: 0,
        expiredImages: 0,
        averageSize: 0,
        oldestImage: null,
        newestImage: null
      });

      // Act
      const stats = await service.getUploadStats();

      // Assert
      expect(stats.totalUploads).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.averageFileSize).toBe(0);
      expect(stats.supportedFormats).toEqual([...IMAGE_CONSTANTS.ALLOWED_MIMETYPES]);
    });

    it('should include current configuration limits', async () => {
      // Arrange
      imagesService.getStats.mockResolvedValue({
        totalImages: 1,
        totalSize: 1024,
        expiredImages: 0,
        averageSize: 1024,
        oldestImage: new Date(),
        newestImage: new Date()
      });

      // Act
      const stats = await service.getUploadStats();

      // Assert
      expect(stats.limits.maxFileSize).toBe(IMAGE_CONSTANTS.MAX_FILE_SIZE);
      expect(stats.limits.maxFiles).toBe(10); // From config mock
      expect(stats.limits.maxTotalSize).toBe(IMAGE_CONSTANTS.MAX_TOTAL_SIZE_PER_REQUEST);
      expect(stats.limits.maxFilesPerHour).toBe(IMAGE_CONSTANTS.MAX_FILES_PER_USER_PER_HOUR);
    });
  });

  describe('Private Helper Methods', () => {
    describe('generateImageUrl', () => {
      it('should generate correct image URL', () => {
        const testId = 'test123';
        const url = service['generateImageUrl'](testId);
        
        expect(url).toBe(`http://localhost:3001/api/v1/images/${testId}`);
      });

      it('should handle different base URLs', () => {
        // Mock different base URL
        configService.get.mockImplementation((key: string, defaultValue?: any) => {
          if (key === 'imageService.baseUrl') return 'https://api.example.com';
          return defaultValue;
        });
        
        const testId = 'test456';
        const url = service['generateImageUrl'](testId);
        
        expect(url).toBe(`https://api.example.com/api/v1/images/${testId}`);
      });
    });

    describe('validateUploadFile', () => {
      it('should validate file successfully', () => {
        const validFile = createMockFile();
        
        expect(() => service['validateUploadFile'](validFile)).not.toThrow();
      });

      it('should throw for null file', () => {
        expect(() => service['validateUploadFile'](null as any)).toThrow(BadRequestException);
        expect(() => service['validateUploadFile'](null as any)).toThrow('No file provided');
      });

      it('should throw for undefined file', () => {
        expect(() => service['validateUploadFile'](undefined as any)).toThrow(BadRequestException);
      });

      it('should throw for file without buffer', () => {
        const fileWithoutBuffer = createMockFile();
        delete (fileWithoutBuffer as any).buffer;
        
        expect(() => service['validateUploadFile'](fileWithoutBuffer)).toThrow(BadRequestException);
        expect(() => service['validateUploadFile'](fileWithoutBuffer)).toThrow('File is empty');
      });

      it('should throw for file with empty buffer', () => {
        const fileWithEmptyBuffer = createMockFile({
          buffer: Buffer.alloc(0)
        });
        
        expect(() => service['validateUploadFile'](fileWithEmptyBuffer)).toThrow(BadRequestException);
        expect(() => service['validateUploadFile'](fileWithEmptyBuffer)).toThrow('File is empty');
      });
    });

    describe('calculateTotalSize', () => {
      it('should calculate total size of multiple files', () => {
        const files = [
          createMockFile({ size: 1000 }),
          createMockFile({ size: 2000 }),
          createMockFile({ size: 3000 })
        ];
        
        const totalSize = service['calculateTotalSize'](files);
        
        expect(totalSize).toBe(6000);
      });

      it('should return 0 for empty array', () => {
        const totalSize = service['calculateTotalSize']([]);
        
        expect(totalSize).toBe(0);
      });

      it('should handle single file', () => {
        const files = [createMockFile({ size: 5000 })];
        
        const totalSize = service['calculateTotalSize'](files);
        
        expect(totalSize).toBe(5000);
      });
    });

    describe('generateUploadSummary', () => {
      it('should generate summary for single file', () => {
        const files = [createMockFile({ size: 1024 * 1024 })]; // 1MB
        const options = { ttl: 3600, userId: 'user123' };
        
        const summary = service['generateUploadSummary'](files, options);
        
        expect(summary).toContain('1 files');
        expect(summary).toContain('1MB total');
        expect(summary).toContain('TTL: 3600s');
        expect(summary).toContain('User: user123');
      });

      it('should generate summary for multiple files', () => {
        const files = [
          createMockFile({ size: 1024 * 1024 }), // 1MB
          createMockFile({ size: 2 * 1024 * 1024 }), // 2MB
        ];
        const options = { ttl: 1800, userId: 'user456' };
        
        const summary = service['generateUploadSummary'](files, options);
        
        expect(summary).toContain('2 files');
        expect(summary).toContain('3MB total');
        expect(summary).toContain('TTL: 1800s');
        expect(summary).toContain('User: user456');
      });

      it('should handle missing options', () => {
        const files = [createMockFile({ size: 500 * 1024 })]; // 0.5MB
        
        const summary = service['generateUploadSummary'](files);
        
        expect(summary).toContain('1 files');
        expect(summary).toContain('0.49MB total');
        expect(summary).toContain('TTL: defaults');
        expect(summary).toContain('User: anonymous');
      });

      it('should round MB values correctly', () => {
        const files = [createMockFile({ size: 1536 * 1024 })]; // 1.5MB exactly
        
        const summary = service['generateUploadSummary'](files);
        
        expect(summary).toContain('1.5MB total');
      });

      it('should handle very small files', () => {
        const files = [createMockFile({ size: 512 })]; // 512 bytes
        
        const summary = service['generateUploadSummary'](files);
        
        expect(summary).toContain('0MB total'); // Rounded down
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle ImagesService errors gracefully in uploadSingle', async () => {
      // Arrange
      const mockFile = createMockFile();
      imagesService.store.mockRejectedValue(new Error('Redis connection failed'));

      // Act & Assert
      await expect(service.uploadSingle(mockFile)).rejects.toThrow('Redis connection failed');
    });

    it('should handle FileValidationUtil errors in uploadSingle', async () => {
      // Arrange
      const mockFile = createMockFile();
      (FileValidationUtil.validateFile as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Invalid MIME type', 'File too large'],
        warnings: []
      });

      // Act & Assert
      await expect(service.uploadSingle(mockFile)).rejects.toThrow(BadRequestException);
      await expect(service.uploadSingle(mockFile)).rejects.toThrow('Invalid MIME type, File too large');
    });

    it('should handle very large batch uploads', async () => {
      // Arrange - Create files that would exceed batch validation
      const files = Array.from({ length: 15 }, (_, i) => 
        createMockFile({ originalname: `file${i}.jpg` })
      );
      
      (FileValidationUtil.validateFiles as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Too many files in batch'],
        warnings: []
      });

      // Act & Assert
      await expect(service.uploadBatch(files)).rejects.toThrow(BadRequestException);
      await expect(service.uploadBatch(files)).rejects.toThrow('Too many files in batch');
    });

    it('should handle mixed success/failure in batch upload', async () => {
      // Arrange
      const files = [
        createMockFile({ originalname: 'success.jpg' }),
        createMockFile({ originalname: 'failure.jpg' })
      ];
      
      imagesService.store
        .mockResolvedValueOnce(undefined) // First file succeeds
        .mockRejectedValueOnce(new Error('Storage error')); // Second file fails

      // Act
      const result = await service.uploadBatch(files);

      // Assert
      expect(result.images).toHaveLength(1);
      expect(result.totalCount).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].error).toContain('Storage error');
      expect(result.errors![0].filename).toBe('failure.jpg');
      expect(result.errors![0].index).toBe(1);
    });

    it('should preserve warnings from file validation', async () => {
      // Arrange
      const mockFile = createMockFile();
      (FileValidationUtil.validateFile as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: ['Large file size', 'Unusual filename']
      });

      // Act
      const result = await service.uploadSingle(mockFile);

      // Assert - Should still succeed but log warnings
      expect(result).toBeDefined();
      expect(result.id).toBe('test-id-123');
      expect(imagesService.store).toHaveBeenCalled();
    });
  });
});
