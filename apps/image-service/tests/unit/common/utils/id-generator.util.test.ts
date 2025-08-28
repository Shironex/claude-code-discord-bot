/**
 * IdGeneratorUtil Unit Tests
 */

import { IdGeneratorUtil } from '../../../../src/common/utils/id-generator.util';

describe('IdGeneratorUtil', () => {
  describe('generateImageId', () => {
    it('should generate a 12-character image ID', () => {
      const id = IdGeneratorUtil.generateImageId();
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBe(12);
      expect(/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(id)).toBe(true);
    });

    it('should generate unique IDs', () => {
      const id1 = IdGeneratorUtil.generateImageId();
      const id2 = IdGeneratorUtil.generateImageId();
      
      expect(id1).not.toBe(id2);
    });

    it('should not contain confusing characters', () => {
      const id = IdGeneratorUtil.generateImageId();
      
      expect(id).not.toMatch(/[0OIl]/);
    });
  });

  describe('generateShortId', () => {
    it('should generate an 8-character short ID', () => {
      const id = IdGeneratorUtil.generateShortId();
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBe(8);
      expect(/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(id)).toBe(true);
    });

    it('should generate unique short IDs', () => {
      const id1 = IdGeneratorUtil.generateShortId();
      const id2 = IdGeneratorUtil.generateShortId();
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateLongId', () => {
    it('should generate a 16-character long ID', () => {
      const id = IdGeneratorUtil.generateLongId();
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBe(16);
      expect(/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(id)).toBe(true);
    });

    it('should generate unique long IDs', () => {
      const id1 = IdGeneratorUtil.generateLongId();
      const id2 = IdGeneratorUtil.generateLongId();
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateCustomId', () => {
    it('should generate ID with custom length', () => {
      const customLength = 10;
      const id = IdGeneratorUtil.generateCustomId(customLength);
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBe(customLength);
      expect(/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(id)).toBe(true);
    });

    it('should throw error for length below 4', () => {
      expect(() => IdGeneratorUtil.generateCustomId(3)).toThrow('ID length must be between 4 and 32 characters');
    });

    it('should throw error for length above 32', () => {
      expect(() => IdGeneratorUtil.generateCustomId(33)).toThrow('ID length must be between 4 and 32 characters');
    });

    it('should accept minimum valid length', () => {
      const id = IdGeneratorUtil.generateCustomId(4);
      expect(id.length).toBe(4);
    });

    it('should accept maximum valid length', () => {
      const id = IdGeneratorUtil.generateCustomId(32);
      expect(id.length).toBe(32);
    });
  });

  describe('generatePrefixedId', () => {
    it('should generate prefixed ID with default length', () => {
      const prefix = 'img';
      const id = IdGeneratorUtil.generatePrefixedId(prefix);
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.startsWith(`${prefix}_`)).toBe(true);
      expect(id.length).toBe(prefix.length + 1 + 12); // prefix + underscore + 12 chars
    });

    it('should generate prefixed ID with custom length', () => {
      const prefix = 'test';
      const customLength = 8;
      const id = IdGeneratorUtil.generatePrefixedId(prefix, customLength);
      
      expect(id).toBeDefined();
      expect(id.startsWith(`${prefix}_`)).toBe(true);
      expect(id.length).toBe(prefix.length + 1 + customLength);
    });

    it('should throw error for empty prefix', () => {
      expect(() => IdGeneratorUtil.generatePrefixedId('')).toThrow('Prefix must be provided and not exceed 10 characters');
    });

    it('should throw error for prefix exceeding 10 characters', () => {
      expect(() => IdGeneratorUtil.generatePrefixedId('verylongprefix')).toThrow('Prefix must be provided and not exceed 10 characters');
    });

    it('should accept maximum prefix length', () => {
      const prefix = '1234567890'; // exactly 10 characters
      const id = IdGeneratorUtil.generatePrefixedId(prefix);
      expect(id.startsWith(`${prefix}_`)).toBe(true);
    });
  });

  describe('generateTimestampId', () => {
    it('should generate timestamp-based ID', () => {
      const id = IdGeneratorUtil.generateTimestampId();
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(8); // timestamp + 8 random chars
    });

    it('should generate sortable IDs', () => {
      const id1 = IdGeneratorUtil.generateTimestampId();
      // Small delay to ensure different timestamps
      const start = Date.now();
      while (Date.now() - start < 1) {
        // Busy wait for 1ms
      }
      const id2 = IdGeneratorUtil.generateTimestampId();
      
      expect(id1.localeCompare(id2)).toBeLessThan(0); // Should be sortable
    });
  });

  describe('generateRequestId', () => {
    it('should generate request ID with req prefix', () => {
      const id = IdGeneratorUtil.generateRequestId();
      
      expect(id).toBeDefined();
      expect(id.startsWith('req_')).toBe(true);
      expect(id.length).toBe(4 + 10); // 'req_' + 10 chars
    });
  });

  describe('generateSessionId', () => {
    it('should generate session ID with ses prefix', () => {
      const id = IdGeneratorUtil.generateSessionId();
      
      expect(id).toBeDefined();
      expect(id.startsWith('ses_')).toBe(true);
      expect(id.length).toBe(4 + 16); // 'ses_' + 16 chars
    });
  });

  describe('generateCleanupId', () => {
    it('should generate cleanup ID with cleanup prefix', () => {
      const id = IdGeneratorUtil.generateCleanupId();
      
      expect(id).toBeDefined();
      expect(id.startsWith('cleanup_')).toBe(true);
      expect(id.length).toBe(8 + 8); // 'cleanup_' + 8 chars
    });
  });

  describe('isValidId', () => {
    it('should validate regular IDs', () => {
      const validId = IdGeneratorUtil.generateImageId();
      expect(IdGeneratorUtil.isValidId(validId)).toBe(true);
    });

    it('should validate prefixed IDs', () => {
      const validId = IdGeneratorUtil.generatePrefixedId('test', 8);
      expect(IdGeneratorUtil.isValidId(validId)).toBe(true);
    });

    it('should reject null/undefined', () => {
      expect(IdGeneratorUtil.isValidId(null as any)).toBe(false);
      expect(IdGeneratorUtil.isValidId(undefined as any)).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(IdGeneratorUtil.isValidId(123 as any)).toBe(false);
      expect(IdGeneratorUtil.isValidId({} as any)).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(IdGeneratorUtil.isValidId('')).toBe(false);
    });

    it('should reject IDs with invalid characters', () => {
      expect(IdGeneratorUtil.isValidId('abc0def')).toBe(false); // contains '0'
      expect(IdGeneratorUtil.isValidId('abcOdef')).toBe(false); // contains 'O'
      expect(IdGeneratorUtil.isValidId('abcIdef')).toBe(false); // contains 'I'
      expect(IdGeneratorUtil.isValidId('abcldef')).toBe(false); // contains 'l'
      expect(IdGeneratorUtil.isValidId('abc@def')).toBe(false); // contains '@'
    });

    it('should reject malformed prefixed IDs', () => {
      expect(IdGeneratorUtil.isValidId('prefix_part1_part2')).toBe(false); // multiple underscores
      expect(IdGeneratorUtil.isValidId('verylongprefix_abc')).toBe(false); // prefix too long
    });

    it('should reject IDs that are too short or too long', () => {
      expect(IdGeneratorUtil.isValidId('abc')).toBe(false); // too short
      expect(IdGeneratorUtil.isValidId('a'.repeat(33))).toBe(false); // too long
    });
  });

  describe('extractPrefix', () => {
    it('should extract prefix from prefixed ID', () => {
      const prefix = 'img';
      const id = IdGeneratorUtil.generatePrefixedId(prefix);
      const extractedPrefix = IdGeneratorUtil.extractPrefix(id);
      
      expect(extractedPrefix).toBe(prefix);
    });

    it('should return null for non-prefixed ID', () => {
      const id = IdGeneratorUtil.generateImageId();
      const extractedPrefix = IdGeneratorUtil.extractPrefix(id);
      
      expect(extractedPrefix).toBeNull();
    });

    it('should return null for malformed prefixed ID', () => {
      const extractedPrefix = IdGeneratorUtil.extractPrefix('prefix_part1_part2');
      
      expect(extractedPrefix).toBeNull();
    });
  });

  describe('extractRandomPart', () => {
    it('should extract random part from prefixed ID', () => {
      const prefix = 'test';
      const id = IdGeneratorUtil.generatePrefixedId(prefix, 8);
      const randomPart = IdGeneratorUtil.extractRandomPart(id);
      
      expect(randomPart).toBeDefined();
      expect(randomPart.length).toBe(8);
      expect(randomPart).not.toContain('_');
    });

    it('should return entire ID for non-prefixed ID', () => {
      const id = IdGeneratorUtil.generateImageId();
      const randomPart = IdGeneratorUtil.extractRandomPart(id);
      
      expect(randomPart).toBe(id);
    });

    it('should handle malformed prefixed ID gracefully', () => {
      const randomPart = IdGeneratorUtil.extractRandomPart('prefix_part1_part2');
      
      expect(randomPart).toBe('prefix_part1_part2'); // returns original if malformed
    });
  });

  describe('generateNanoId', () => {
    it('should generate standard nanoid with default length', () => {
      const id = IdGeneratorUtil.generateNanoId();
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBe(21);
    });

    it('should generate nanoid with custom length', () => {
      const customLength = 16;
      const id = IdGeneratorUtil.generateNanoId(customLength);
      
      expect(id).toBeDefined();
      expect(id.length).toBe(customLength);
    });

    it('should generate unique nanoids', () => {
      const id1 = IdGeneratorUtil.generateNanoId();
      const id2 = IdGeneratorUtil.generateNanoId();
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('Integration Tests', () => {
    it('should maintain consistency across different ID types', () => {
      const imageId = IdGeneratorUtil.generateImageId();
      const prefixedId = IdGeneratorUtil.generatePrefixedId('img');
      const customId = IdGeneratorUtil.generateCustomId(12);
      
      expect(IdGeneratorUtil.isValidId(imageId)).toBe(true);
      expect(IdGeneratorUtil.isValidId(prefixedId)).toBe(true);
      expect(IdGeneratorUtil.isValidId(customId)).toBe(true);
    });

    it('should handle edge cases for ID generation', () => {
      // Test minimum valid custom ID
      const minId = IdGeneratorUtil.generateCustomId(4);
      expect(IdGeneratorUtil.isValidId(minId)).toBe(true);
      
      // Test maximum valid custom ID  
      const maxId = IdGeneratorUtil.generateCustomId(32);
      expect(IdGeneratorUtil.isValidId(maxId)).toBe(true);
      
      // Test single character prefix
      const singleCharPrefix = IdGeneratorUtil.generatePrefixedId('a');
      expect(IdGeneratorUtil.extractPrefix(singleCharPrefix)).toBe('a');
    });
  });
});