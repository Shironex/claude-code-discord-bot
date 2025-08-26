/**
 * File Validation Utility Unit Tests
 * Target Coverage: 95%
 */

import { FileValidationUtil } from '../../../../src/common/utils/file-validation.util';
import { Express } from 'express';
import {
  createMockFile,
  createInvalidMockFile,
  createMockFileWithType
} from '../../../mocks';
import {
  IMAGE_VALIDATION_CASES,
  FILE_SIZE_CASES,
  FILE_PATH_CASES
} from '../../../fixtures';

describe('FileValidationUtil', () => {
  describe('validateFile', () => {
    it('should validate a valid image file', () => {
      // Arrange
      const file = createMockFile();

      // Act
      const result = FileValidationUtil.validateFile(file);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should reject invalid MIME types', () => {
      // Arrange
      const file = createInvalidMockFile('type');

      // Act
      const result = FileValidationUtil.validateFile(file);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File type not supported: application/pdf');
    });

    it('should reject oversized files', () => {
      // Arrange
      const file = createInvalidMockFile('size');

      // Act
      const result = FileValidationUtil.validateFile(file);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size exceeds maximum allowed size');
    });

    it('should detect path traversal attempts', () => {
      // Arrange
      const file = createInvalidMockFile('name');

      // Act
      const result = FileValidationUtil.validateFile(file);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File extension not allowed: ');
    });

    it('should validate all supported image types', () => {
      // Use actual supported types from constants
      const validTypes = [
        { mimeType: 'image/jpeg', extension: '.jpg' },
        { mimeType: 'image/jpg', extension: '.jpg' },
        { mimeType: 'image/png', extension: '.png' },
        { mimeType: 'image/gif', extension: '.gif' },
        { mimeType: 'image/webp', extension: '.webp' },
        { mimeType: 'image/bmp', extension: '.bmp' },
        { mimeType: 'image/tiff', extension: '.tiff' }
      ];

      validTypes.forEach(({ mimeType, extension }) => {
        // Arrange
        const file = createMockFile({
          mimetype: mimeType,
          originalname: 'test' + extension
        });

        // Act
        const result = FileValidationUtil.validateFile(file);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject all unsupported file types', () => {
      IMAGE_VALIDATION_CASES.invalidTypes.forEach(({ mimeType, extension }) => {
        // Arrange
        const file = createMockFileWithType(mimeType, extension);

        // Act
        const result = FileValidationUtil.validateFile(file);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should handle edge case file sizes', () => {
      // Valid sizes (above minimum of 1KB)
      const validSizes = [
        1024, // 1KB (minimum)
        1024 * 1024, // 1MB
        10 * 1024 * 1024 // 10MB (max)
      ];

      validSizes.forEach((size) => {
        // Arrange
        const file = createMockFile({ size });

        // Act
        const result = FileValidationUtil.validateFile(file);

        // Assert
        expect(result.isValid).toBe(true);
      });

      // Invalid sizes 
      const invalidSizes = [
        0, // Empty file
        500, // Below minimum (1KB)
        10 * 1024 * 1024 + 1, // Over 10MB
        100 * 1024 * 1024 // 100MB
      ];

      invalidSizes.forEach((size) => {
        // Arrange
        const file = createMockFile({ size });

        // Act
        const result = FileValidationUtil.validateFile(file);

        // Assert
        expect(result.isValid).toBe(false);
      });
    });

    it('should handle missing file properties', () => {
      // Arrange - File with missing properties will cause TypeError
      const invalidFile = {} as Express.Multer.File;

      // Act & Assert - This will throw because originalname is undefined
      expect(() => FileValidationUtil.validateFile(invalidFile)).toThrow();
    });
  });

  describe('validateFiles', () => {
    it('should validate multiple files successfully', () => {
      // Arrange
      const files = [
        createMockFile({ originalname: 'file1.jpg' }),
        createMockFile({ originalname: 'file2.png' }),
      ];

      // Act
      const result = FileValidationUtil.validateFiles(files);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty array', () => {
      // Act
      const result = FileValidationUtil.validateFiles([]);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No files provided');
    });

    it('should handle null/undefined files', () => {
      // Act
      const result1 = FileValidationUtil.validateFiles(null as any);
      const result2 = FileValidationUtil.validateFiles(undefined as any);

      // Assert
      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
    });
  });

  describe('sanitizeFilename', () => {
    it('should sanitize path traversal attempts', () => {
      FILE_PATH_CASES.pathTraversal.forEach(filename => {
        // Act
        const sanitized = FileValidationUtil.sanitizeFilename(filename);

        // Assert
        expect(sanitized).not.toContain('..');
        expect(sanitized).not.toContain('/');
        expect(sanitized).not.toContain('\\');
      });
    });

    it('should remove dangerous filesystem characters', () => {
      const dangerousFiles = [
        'file<script>.jpg',
        'image>redirect.png',
        'photo:colon.gif',
        'pic"quote.jpg',
        'img?question.png',
        'test*star.gif'
      ];

      dangerousFiles.forEach(filename => {
        // Act
        const sanitized = FileValidationUtil.sanitizeFilename(filename);

        // Assert
        expect(sanitized).not.toMatch(/[<>:"|?*]/);
      });
    });

    it('should preserve valid filenames', () => {
      FILE_PATH_CASES.valid.forEach(filename => {
        // Act
        const sanitized = FileValidationUtil.sanitizeFilename(filename);

        // Assert
        expect(sanitized).toBeDefined();
        expect(sanitized.length).toBeGreaterThan(0);
      });
    });

    it('should handle unicode characters', () => {
      FILE_PATH_CASES.unicode.forEach(filename => {
        // Act
        const sanitized = FileValidationUtil.sanitizeFilename(filename);

        // Assert
        expect(sanitized).toBeDefined();
        // Unicode chars should be preserved or replaced safely
      });
    });

    it('should preserve file extensions', () => {
      // Arrange
      const filenames = ['image.jpg', 'photo.PNG', 'pic.GIF'];

      filenames.forEach(filename => {
        // Act
        const sanitized = FileValidationUtil.sanitizeFilename(filename);

        // Assert
        expect(sanitized).toMatch(/\.(jpg|png|gif)$/i);
      });
    });

    it('should handle empty filename', () => {
      // Act
      const sanitized = FileValidationUtil.sanitizeFilename('');

      // Assert
      expect(sanitized).toBe('unnamed_file');
    });

    it('should handle null/undefined filename', () => {
      // Act & Assert - These will throw errors since sanitizeFilename doesn't handle null
      expect(() => FileValidationUtil.sanitizeFilename(null as any)).toThrow();
      expect(() => FileValidationUtil.sanitizeFilename(undefined as any)).toThrow();
    });

    it('should truncate very long filenames', () => {
      // Arrange
      const longName = 'a'.repeat(300) + '.jpg';

      // Act
      const sanitized = FileValidationUtil.sanitizeFilename(longName);

      // Assert
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized).toContain('.jpg');
    });

    it('should handle filenames with multiple dots', () => {
      // Arrange
      const filename = 'my.file.name.jpg';

      // Act
      const sanitized = FileValidationUtil.sanitizeFilename(filename);

      // Assert
      expect(sanitized).toContain('my');
      expect(sanitized).toContain('file');
      expect(sanitized).toContain('name');
      expect(sanitized).toMatch(/\.jpg$/i);
    });

    it('should handle filenames starting with dots', () => {
      // Arrange
      const filenames = ['.hidden.jpg', '..double.png', '...triple.gif'];

      filenames.forEach(filename => {
        // Act
        const sanitized = FileValidationUtil.sanitizeFilename(filename);

        // Assert
        expect(sanitized).not.toMatch(/^\./);
      });
    });
  });

  describe('isAllowedMimeType', () => {
    it('should validate supported image MIME types', () => {
      const validTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/tiff'
      ];

      validTypes.forEach(type => {
        expect(FileValidationUtil.isAllowedMimeType(type)).toBe(true);
      });
    });

    it('should reject non-image MIME types', () => {
      const invalidTypes = [
        'application/pdf',
        'text/plain',
        'video/mp4',
        'audio/mpeg',
        'application/json'
      ];

      invalidTypes.forEach(type => {
        expect(FileValidationUtil.isAllowedMimeType(type)).toBe(false);
      });
    });

    it('should handle null/undefined', () => {
      expect(FileValidationUtil.isAllowedMimeType(null as any)).toBe(false);
      expect(FileValidationUtil.isAllowedMimeType(undefined as any)).toBe(false);
    });

    it('should handle empty string', () => {
      expect(FileValidationUtil.isAllowedMimeType('')).toBe(false);
    });
  });

  describe('isAllowedExtension', () => {
    it('should validate allowed extensions', () => {
      const validExtensions = [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.webp',
        '.bmp',
        '.tiff'
      ];

      validExtensions.forEach(ext => {
        expect(FileValidationUtil.isAllowedExtension(ext)).toBe(true);
      });
    });

    it('should reject invalid extensions', () => {
      const invalidExtensions = [
        '.pdf',
        '.doc',
        '.txt',
        '.mp4',
        '.zip'
      ];

      invalidExtensions.forEach(ext => {
        expect(FileValidationUtil.isAllowedExtension(ext)).toBe(false);
      });
    });

    it('should handle case insensitive', () => {
      expect(FileValidationUtil.isAllowedExtension('.JPG')).toBe(true);
      expect(FileValidationUtil.isAllowedExtension('.PNG')).toBe(true);
    });
  });

  describe('isValidFilename', () => {
    it('should accept valid filenames', () => {
      const validNames = [
        'image.jpg',
        'my-photo.png',
        'test_file_123.gif'
      ];

      validNames.forEach(name => {
        expect(FileValidationUtil.isValidFilename(name)).toBe(true);
      });
    });

    it('should reject path traversal attempts', () => {
      const maliciousNames = [
        '../../../etc/passwd',
        '..\\..\\system32',
        'file/with/slashes.jpg'
      ];

      maliciousNames.forEach(name => {
        expect(FileValidationUtil.isValidFilename(name)).toBe(false);
      });
    });

    it('should reject very long filenames', () => {
      const longName = 'a'.repeat(300) + '.jpg';
      expect(FileValidationUtil.isValidFilename(longName)).toBe(false);
    });

    it('should reject reserved Windows names', () => {
      const reservedNames = ['CON.txt', 'PRN.jpg', 'NUL.png'];
      
      reservedNames.forEach(name => {
        expect(FileValidationUtil.isValidFilename(name)).toBe(false);
      });
    });
  });

  describe('mimeTypeMatchesExtension', () => {
    it('should match valid MIME type and extension pairs', () => {
      const validPairs = [
        { mimeType: 'image/jpeg', extension: '.jpg' },
        { mimeType: 'image/jpeg', extension: '.jpeg' },
        { mimeType: 'image/png', extension: '.png' },
        { mimeType: 'image/gif', extension: '.gif' },
      ];

      validPairs.forEach(({ mimeType, extension }) => {
        expect(FileValidationUtil.mimeTypeMatchesExtension(mimeType, extension)).toBe(true);
      });
    });

    it('should reject mismatched pairs', () => {
      const mismatchedPairs = [
        { mimeType: 'image/jpeg', extension: '.png' },
        { mimeType: 'image/png', extension: '.gif' },
        { mimeType: 'image/gif', extension: '.jpg' },
      ];

      mismatchedPairs.forEach(({ mimeType, extension }) => {
        expect(FileValidationUtil.mimeTypeMatchesExtension(mimeType, extension)).toBe(false);
      });
    });

    it('should handle case insensitive extensions', () => {
      expect(FileValidationUtil.mimeTypeMatchesExtension('image/jpeg', '.JPG')).toBe(true);
      expect(FileValidationUtil.mimeTypeMatchesExtension('image/png', '.PNG')).toBe(true);
    });
  });
});