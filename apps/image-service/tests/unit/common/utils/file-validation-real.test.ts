/**
 * File Validation Utility Tests - Matching Real Implementation
 */

import { FileValidationUtil } from '../../../../src/common/utils/file-validation.util';
import { Express } from 'express';

describe('FileValidationUtil (Real Implementation)', () => {
  describe('validateFile', () => {
    it('should validate a valid image file', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'image',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 100000,
        destination: '/tmp',
        filename: 'test.jpg',
        path: '/tmp/test.jpg',
        buffer: Buffer.from('test')
      } as Express.Multer.File;

      const result = FileValidationUtil.validateFile(mockFile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject files that are too large', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'image',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 15 * 1024 * 1024, // 15MB, over typical 10MB limit
        destination: '/tmp',
        filename: 'test.jpg',
        path: '/tmp/test.jpg',
        buffer: Buffer.from('test')
      } as Express.Multer.File;

      const result = FileValidationUtil.validateFile(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid MIME types', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 100000,
        destination: '/tmp',
        filename: 'test.pdf',
        path: '/tmp/test.pdf',
        buffer: Buffer.from('test')
      } as Express.Multer.File;

      const result = FileValidationUtil.validateFile(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('isAllowedMimeType', () => {
    it('should allow valid image MIME types', () => {
      expect(FileValidationUtil.isAllowedMimeType('image/jpeg')).toBe(true);
      expect(FileValidationUtil.isAllowedMimeType('image/png')).toBe(true);
      expect(FileValidationUtil.isAllowedMimeType('image/gif')).toBe(true);
    });

    it('should reject non-image MIME types', () => {
      expect(FileValidationUtil.isAllowedMimeType('application/pdf')).toBe(false);
      expect(FileValidationUtil.isAllowedMimeType('text/plain')).toBe(false);
    });
  });

  describe('sanitizeFilename', () => {
    it('should sanitize dangerous characters', () => {
      const dangerous = '../../../etc/passwd';
      const sanitized = FileValidationUtil.sanitizeFilename(dangerous);
      
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
    });

    it('should handle normal filenames', () => {
      const normal = 'my-photo.jpg';
      const sanitized = FileValidationUtil.sanitizeFilename(normal);
      
      expect(sanitized).toBe('my-photo.jpg');
    });

    it('should limit filename length', () => {
      const longName = 'a'.repeat(200) + '.jpg';
      const sanitized = FileValidationUtil.sanitizeFilename(longName);
      
      expect(sanitized.length).toBeLessThanOrEqual(104); // 100 chars + .jpg
    });
  });

  describe('isValidFilename', () => {
    it('should accept valid filenames', () => {
      expect(FileValidationUtil.isValidFilename('photo.jpg')).toBe(true);
      expect(FileValidationUtil.isValidFilename('my-image_123.png')).toBe(true);
    });

    it('should reject path traversal attempts', () => {
      expect(FileValidationUtil.isValidFilename('../etc/passwd')).toBe(false);
      expect(FileValidationUtil.isValidFilename('../../file.jpg')).toBe(false);
    });

    it('should reject reserved Windows names', () => {
      expect(FileValidationUtil.isValidFilename('CON.txt')).toBe(false);
      expect(FileValidationUtil.isValidFilename('PRN.jpg')).toBe(false);
    });
  });
});
