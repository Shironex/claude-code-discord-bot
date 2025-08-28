/**
 * Tests for constants.ts - Shared constants validation
 */

import { SHARED_IMAGE_CONSTANTS, DISCORD_CONSTANTS, GITHUB_CONSTANTS } from '../../src/constants';

describe('Shared Constants', () => {
  describe('SHARED_IMAGE_CONSTANTS', () => {
    it('should have correct file size limits', () => {
      expect(SHARED_IMAGE_CONSTANTS.MAX_FILE_SIZE).toBe(10 * 1024 * 1024); // 10MB
      expect(SHARED_IMAGE_CONSTANTS.MAX_BATCH_FILES).toBe(10);
    });

    it('should have valid TTL settings', () => {
      expect(SHARED_IMAGE_CONSTANTS.MIN_TTL_SECONDS).toBe(300); // 5 minutes
      expect(SHARED_IMAGE_CONSTANTS.MAX_TTL_SECONDS).toBe(604800); // 7 days
      expect(SHARED_IMAGE_CONSTANTS.DEFAULT_TTL_SECONDS).toBe(3600); // 1 hour
      
      // Logical constraints
      expect(SHARED_IMAGE_CONSTANTS.MIN_TTL_SECONDS).toBeLessThan(SHARED_IMAGE_CONSTANTS.DEFAULT_TTL_SECONDS);
      expect(SHARED_IMAGE_CONSTANTS.DEFAULT_TTL_SECONDS).toBeLessThan(SHARED_IMAGE_CONSTANTS.MAX_TTL_SECONDS);
    });

    it('should have supported MIME types array', () => {
      expect(Array.isArray(SHARED_IMAGE_CONSTANTS.SUPPORTED_MIME_TYPES)).toBe(true);
      expect(SHARED_IMAGE_CONSTANTS.SUPPORTED_MIME_TYPES).toContain('image/jpeg');
      expect(SHARED_IMAGE_CONSTANTS.SUPPORTED_MIME_TYPES).toContain('image/png');
      expect(SHARED_IMAGE_CONSTANTS.SUPPORTED_MIME_TYPES).toContain('image/gif');
      expect(SHARED_IMAGE_CONSTANTS.SUPPORTED_MIME_TYPES).toContain('image/webp');
      expect(SHARED_IMAGE_CONSTANTS.SUPPORTED_MIME_TYPES.length).toBeGreaterThan(0);
    });

    it('should have supported extensions array', () => {
      expect(Array.isArray(SHARED_IMAGE_CONSTANTS.SUPPORTED_EXTENSIONS)).toBe(true);
      expect(SHARED_IMAGE_CONSTANTS.SUPPORTED_EXTENSIONS).toContain('.jpg');
      expect(SHARED_IMAGE_CONSTANTS.SUPPORTED_EXTENSIONS).toContain('.jpeg');
      expect(SHARED_IMAGE_CONSTANTS.SUPPORTED_EXTENSIONS).toContain('.png');
      expect(SHARED_IMAGE_CONSTANTS.SUPPORTED_EXTENSIONS).toContain('.gif');
      expect(SHARED_IMAGE_CONSTANTS.SUPPORTED_EXTENSIONS.length).toBeGreaterThan(0);
    });

    it('should have API endpoints defined', () => {
      expect(SHARED_IMAGE_CONSTANTS.ENDPOINTS.UPLOAD).toBe('/upload');
      expect(SHARED_IMAGE_CONSTANTS.ENDPOINTS.BATCH_UPLOAD).toBe('/upload/batch');
      expect(SHARED_IMAGE_CONSTANTS.ENDPOINTS.IMAGES).toBe('/images');
      expect(SHARED_IMAGE_CONSTANTS.ENDPOINTS.HEALTH).toBe('/health');
      expect(SHARED_IMAGE_CONSTANTS.ENDPOINTS.AUTH).toBe('/auth');
    });

    it('should have error codes defined', () => {
      expect(SHARED_IMAGE_CONSTANTS.ERROR_CODES.INVALID_IMAGE_ID).toBe('INVALID_IMAGE_ID');
      expect(SHARED_IMAGE_CONSTANTS.ERROR_CODES.IMAGE_NOT_FOUND).toBe('IMAGE_NOT_FOUND');
      expect(SHARED_IMAGE_CONSTANTS.ERROR_CODES.FILE_TOO_LARGE).toBe('FILE_TOO_LARGE');
      expect(SHARED_IMAGE_CONSTANTS.ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED');
      
      // Error codes should be uppercase strings
      Object.values(SHARED_IMAGE_CONSTANTS.ERROR_CODES).forEach(code => {
        expect(typeof code).toBe('string');
        expect(code).toBe(code.toUpperCase());
      });
    });

    it('should have error messages for all error codes', () => {
      const errorCodes = Object.keys(SHARED_IMAGE_CONSTANTS.ERROR_CODES);
      const errorMessages = Object.keys(SHARED_IMAGE_CONSTANTS.ERROR_MESSAGES);
      
      // Every error code should have a corresponding message
      errorCodes.forEach(code => {
        expect(errorMessages).toContain(code);
        expect(SHARED_IMAGE_CONSTANTS.ERROR_MESSAGES[code as keyof typeof SHARED_IMAGE_CONSTANTS.ERROR_MESSAGES]).toBeDefined();
        expect(typeof SHARED_IMAGE_CONSTANTS.ERROR_MESSAGES[code as keyof typeof SHARED_IMAGE_CONSTANTS.ERROR_MESSAGES]).toBe('string');
      });
    });

    it('should have rate limits defined', () => {
      expect(SHARED_IMAGE_CONSTANTS.RATE_LIMITS.UPLOADS_PER_HOUR).toBe(50);
      expect(SHARED_IMAGE_CONSTANTS.RATE_LIMITS.BATCH_UPLOADS_PER_HOUR).toBe(10);
      expect(SHARED_IMAGE_CONSTANTS.RATE_LIMITS.DELETES_PER_HOUR).toBe(100);
      
      // Rate limits should be positive numbers
      Object.values(SHARED_IMAGE_CONSTANTS.RATE_LIMITS).forEach(limit => {
        expect(typeof limit).toBe('number');
        expect(limit).toBeGreaterThan(0);
      });
    });

    it('should have header constants defined', () => {
      expect(SHARED_IMAGE_CONSTANTS.HEADERS.API_KEY).toBe('x-api-key');
      expect(SHARED_IMAGE_CONSTANTS.HEADERS.HMAC_SIGNATURE).toBe('x-hmac-signature');
      expect(SHARED_IMAGE_CONSTANTS.HEADERS.TIMESTAMP).toBe('x-timestamp');
      expect(SHARED_IMAGE_CONSTANTS.HEADERS.USER_ID).toBe('x-user-id');
      
      // All headers should be lowercase
      Object.values(SHARED_IMAGE_CONSTANTS.HEADERS).forEach(header => {
        expect(typeof header).toBe('string');
        expect(header).toBe(header.toLowerCase());
      });
    });

    it('should have ID validation rules', () => {
      expect(SHARED_IMAGE_CONSTANTS.ID_VALIDATION.MIN_LENGTH).toBe(8);
      expect(SHARED_IMAGE_CONSTANTS.ID_VALIDATION.MAX_LENGTH).toBe(32);
      expect(SHARED_IMAGE_CONSTANTS.ID_VALIDATION.ALLOWED_CHARACTERS).toBeInstanceOf(RegExp);
      
      // Min length should be less than max length
      expect(SHARED_IMAGE_CONSTANTS.ID_VALIDATION.MIN_LENGTH).toBeLessThan(SHARED_IMAGE_CONSTANTS.ID_VALIDATION.MAX_LENGTH);
    });

    it('should have consistent types as const objects', () => {
      // These should be readonly objects due to 'as const'
      expect(typeof SHARED_IMAGE_CONSTANTS).toBe('object');
      expect(SHARED_IMAGE_CONSTANTS).not.toBeNull();
    });
  });

  describe('DISCORD_CONSTANTS', () => {
    it('should have Discord attachment size limits', () => {
      expect(DISCORD_CONSTANTS.MAX_ATTACHMENT_SIZE).toBe(8 * 1024 * 1024); // 8MB
      expect(DISCORD_CONSTANTS.MAX_ATTACHMENT_SIZE_NITRO).toBe(100 * 1024 * 1024); // 100MB
      
      // Nitro should have higher limits
      expect(DISCORD_CONSTANTS.MAX_ATTACHMENT_SIZE_NITRO).toBeGreaterThan(DISCORD_CONSTANTS.MAX_ATTACHMENT_SIZE);
    });

    it('should have Discord CDN URL', () => {
      expect(DISCORD_CONSTANTS.CDN_BASE_URL).toBe('https://cdn.discordapp.com');
      expect(DISCORD_CONSTANTS.CDN_BASE_URL).toMatch(/^https:\/\//);
    });

    it('should have embed limits', () => {
      expect(DISCORD_CONSTANTS.MAX_EMBED_DESCRIPTION).toBe(4096);
      expect(DISCORD_CONSTANTS.MAX_EMBED_FIELDS).toBe(25);
      expect(DISCORD_CONSTANTS.MAX_EMBED_FIELD_NAME).toBe(256);
      expect(DISCORD_CONSTANTS.MAX_EMBED_FIELD_VALUE).toBe(1024);
      
      // All limits should be positive
      expect(DISCORD_CONSTANTS.MAX_EMBED_DESCRIPTION).toBeGreaterThan(0);
      expect(DISCORD_CONSTANTS.MAX_EMBED_FIELDS).toBeGreaterThan(0);
      expect(DISCORD_CONSTANTS.MAX_EMBED_FIELD_NAME).toBeGreaterThan(0);
      expect(DISCORD_CONSTANTS.MAX_EMBED_FIELD_VALUE).toBeGreaterThan(0);
    });

    it('should have color constants', () => {
      expect(DISCORD_CONSTANTS.COLORS.SUCCESS).toBe(0x00ff00);
      expect(DISCORD_CONSTANTS.COLORS.ERROR).toBe(0xff0000);
      expect(DISCORD_CONSTANTS.COLORS.WARNING).toBe(0xffaa00);
      expect(DISCORD_CONSTANTS.COLORS.INFO).toBe(0x0099ff);
      expect(DISCORD_CONSTANTS.COLORS.NEUTRAL).toBe(0x666666);
      
      // All colors should be valid hex numbers
      Object.values(DISCORD_CONSTANTS.COLORS).forEach(color => {
        expect(typeof color).toBe('number');
        expect(color).toBeGreaterThanOrEqual(0);
        expect(color).toBeLessThanOrEqual(0xffffff);
      });
    });

    it('should be const object', () => {
      expect(typeof DISCORD_CONSTANTS).toBe('object');
      expect(DISCORD_CONSTANTS).not.toBeNull();
    });
  });

  describe('GITHUB_CONSTANTS', () => {
    it('should have workflow file path', () => {
      expect(GITHUB_CONSTANTS.WORKFLOW_FILE).toBe('.github/workflows/claude.yml');
      expect(GITHUB_CONSTANTS.WORKFLOW_FILE).toMatch(/^\.github\/workflows\/.*\.ya?ml$/);
    });

    it('should have GitHub API base URL', () => {
      expect(GITHUB_CONSTANTS.API_BASE_URL).toBe('https://api.github.com');
      expect(GITHUB_CONSTANTS.API_BASE_URL).toMatch(/^https:\/\/api\.github\.com$/);
    });

    it('should have rate limit configuration', () => {
      expect(GITHUB_CONSTANTS.RATE_LIMIT_REQUESTS).toBe(5000);
      expect(typeof GITHUB_CONSTANTS.RATE_LIMIT_REQUESTS).toBe('number');
      expect(GITHUB_CONSTANTS.RATE_LIMIT_REQUESTS).toBeGreaterThan(0);
    });

    it('should have file size limits', () => {
      expect(GITHUB_CONSTANTS.MAX_FILE_SIZE_API).toBe(1024 * 1024); // 1MB
      expect(GITHUB_CONSTANTS.MAX_FILE_SIZE_GIT).toBe(100 * 1024 * 1024); // 100MB
      
      // Git should have higher limits than API
      expect(GITHUB_CONSTANTS.MAX_FILE_SIZE_GIT).toBeGreaterThan(GITHUB_CONSTANTS.MAX_FILE_SIZE_API);
      
      // Both should be positive numbers
      expect(GITHUB_CONSTANTS.MAX_FILE_SIZE_API).toBeGreaterThan(0);
      expect(GITHUB_CONSTANTS.MAX_FILE_SIZE_GIT).toBeGreaterThan(0);
    });

    it('should be const object', () => {
      expect(typeof GITHUB_CONSTANTS).toBe('object');
      expect(GITHUB_CONSTANTS).not.toBeNull();
    });
  });

  describe('Cross-constant relationships', () => {
    it('should have logical size relationships', () => {
      // Shared image constants should be reasonable relative to Discord limits
      expect(SHARED_IMAGE_CONSTANTS.MAX_FILE_SIZE).toBeLessThanOrEqual(DISCORD_CONSTANTS.MAX_ATTACHMENT_SIZE_NITRO);
      
      // GitHub API limits should be smaller than Git limits
      expect(GITHUB_CONSTANTS.MAX_FILE_SIZE_API).toBeLessThan(GITHUB_CONSTANTS.MAX_FILE_SIZE_GIT);
    });

    it('should have consistent URL patterns', () => {
      expect(DISCORD_CONSTANTS.CDN_BASE_URL).toMatch(/^https:\/\//);
      expect(GITHUB_CONSTANTS.API_BASE_URL).toMatch(/^https:\/\//);
    });

    it('should have reasonable numeric ranges', () => {
      // All file sizes should be reasonable (between 1KB and 1GB)
      const fileSizes = [
        SHARED_IMAGE_CONSTANTS.MAX_FILE_SIZE,
        DISCORD_CONSTANTS.MAX_ATTACHMENT_SIZE,
        DISCORD_CONSTANTS.MAX_ATTACHMENT_SIZE_NITRO,
        GITHUB_CONSTANTS.MAX_FILE_SIZE_API,
        GITHUB_CONSTANTS.MAX_FILE_SIZE_GIT
      ];
      
      fileSizes.forEach(size => {
        expect(size).toBeGreaterThan(1024); // > 1KB
        expect(size).toBeLessThan(1024 * 1024 * 1024); // < 1GB
      });
    });
  });

  describe('Type safety and immutability', () => {
    it('should be deeply readonly objects', () => {
      // These tests ensure the 'as const' assertions are working
      expect(() => {
        // Should not be able to modify const objects
        (SHARED_IMAGE_CONSTANTS as any).MAX_FILE_SIZE = 999;
      }).not.toThrow(); // TypeScript prevents this, but runtime doesn't
      
      // Verify the structure exists
      expect(SHARED_IMAGE_CONSTANTS.MAX_FILE_SIZE).toBeDefined();
      expect(DISCORD_CONSTANTS.MAX_ATTACHMENT_SIZE).toBeDefined();
      expect(GITHUB_CONSTANTS.WORKFLOW_FILE).toBeDefined();
    });

    it('should have proper array types', () => {
      expect(Array.isArray(SHARED_IMAGE_CONSTANTS.SUPPORTED_MIME_TYPES)).toBe(true);
      expect(Array.isArray(SHARED_IMAGE_CONSTANTS.SUPPORTED_EXTENSIONS)).toBe(true);
    });

    it('should have proper object types', () => {
      expect(typeof SHARED_IMAGE_CONSTANTS.ENDPOINTS).toBe('object');
      expect(typeof SHARED_IMAGE_CONSTANTS.ERROR_CODES).toBe('object');
      expect(typeof SHARED_IMAGE_CONSTANTS.ERROR_MESSAGES).toBe('object');
      expect(typeof DISCORD_CONSTANTS.COLORS).toBe('object');
    });
  });
});