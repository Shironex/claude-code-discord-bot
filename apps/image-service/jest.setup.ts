/**
 * Jest global setup file for @claude-code/image-service
 */

import 'reflect-metadata';

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Keep logs quiet during tests
process.env.PORT = '3001';

// Image service specific env vars
process.env.UPLOAD_PATH = '/tmp/test-uploads';
process.env.MAX_FILE_SIZE = '10485760'; // 10MB
process.env.DEFAULT_TTL = '3600'; // 1 hour
process.env.CLEANUP_INTERVAL = '300'; // 5 minutes

// Auth configuration for tests
process.env.DISCORD_BOT_API_KEY = 'test-discord-bot-key';
process.env.CLAUDE_CODE_API_KEY = 'test-claude-code-key';
process.env.HMAC_SECRET = 'test-hmac-secret-key';
process.env.REQUIRE_HMAC = 'false';

// Redis test configuration
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = '';
process.env.REDIS_DB = '1'; // Use DB 1 for tests

// Mock timers and performance
const originalPerformanceNow = performance.now;
let mockTime = 1000;

beforeAll(() => {
  // Mock performance.now for predictable timing tests
  jest.spyOn(performance, 'now').mockImplementation(() => {
    mockTime += 100; // Increment by 100ms each call
    return mockTime;
  });
});

afterAll(() => {
  // Restore original performance.now
  jest.restoreAllMocks();
});

// Global test timeout
jest.setTimeout(10000);

// Suppress console outputs during tests unless explicitly testing them
const originalConsole = { ...console };

beforeEach(() => {
  // Reset console mocks for each test
  jest.clearAllMocks();
  
  // Mock console methods to prevent test output pollution
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'warn').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
  jest.spyOn(console, 'debug').mockImplementation();
  jest.spyOn(console, 'info').mockImplementation();
  
  // Reset mock time
  mockTime = 1000;
});

afterEach(() => {
  // Clean up any file handles or timers that might be left open
  jest.clearAllTimers();
  jest.useRealTimers();
});

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Helper function to restore console for specific tests
export const restoreConsole = () => {
  Object.assign(console, originalConsole);
};

// Helper function to mock console for specific tests
export const mockConsole = () => {
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'warn').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
  jest.spyOn(console, 'debug').mockImplementation();
  jest.spyOn(console, 'info').mockImplementation();
};

// Custom matchers for image service specific assertions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidImageId(): R;
      toBeValidMimeType(): R;
      toBeValidImageMetadata(): R;
      toHaveValidHmacSignature(secret: string): R;
      toBeWithinTTL(ttl: number): R;
      toBeValidFileSize(maxSize: number): R;
    }
  }
}

// Custom matchers implementation
expect.extend({
  toBeValidImageId(received: string) {
    // Image IDs should be alphanumeric with specific length (nanoid format)
    const validIdRegex = /^[a-zA-Z0-9_-]{21}$/;
    const pass = validIdRegex.test(received);
    
    if (pass) {
      return {
        message: () => 'expected ' + received + ' not to be a valid image ID',
        pass: true,
      };
    } else {
      return {
        message: () => 'expected ' + received + ' to be a valid image ID (21 character nanoid)',
        pass: false,
      };
    }
  },

  toBeValidMimeType(received: string) {
    const validMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff'
    ];
    const pass = validMimeTypes.includes(received);
    
    if (pass) {
      return {
        message: () => 'expected ' + received + ' not to be a valid image MIME type',
        pass: true,
      };
    } else {
      return {
        message: () => 'expected ' + received + ' to be a valid image MIME type (one of: ' + validMimeTypes.join(', ') + ')',
        pass: false,
      };
    }
  },

  toBeValidImageMetadata(received: any) {
    const hasRequiredFields = 
      received &&
      typeof received === 'object' &&
      'id' in received &&
      'size' in received &&
      'mimeType' in received &&
      'uploadedAt' in received &&
      'expiresAt' in received &&
      'originalName' in received;
    
    const pass = hasRequiredFields;
    
    if (pass) {
      return {
        message: () => 'expected ' + JSON.stringify(received) + ' not to be valid image metadata',
        pass: true,
      };
    } else {
      return {
        message: () => 'expected ' + JSON.stringify(received) + ' to have all required metadata fields (id, size, mimeType, uploadedAt, expiresAt, originalName)',
        pass: false,
      };
    }
  },

  toHaveValidHmacSignature(received: string, secret: string) {
    // Check if the signature format is valid (hex string of specific length)
    const hmacRegex = /^[a-f0-9]{64}$/i; // SHA256 produces 64 hex characters
    const pass = hmacRegex.test(received);
    
    if (pass) {
      return {
        message: () => 'expected ' + received + ' not to be a valid HMAC signature',
        pass: true,
      };
    } else {
      return {
        message: () => 'expected ' + received + ' to be a valid HMAC-SHA256 signature (64 hex characters)',
        pass: false,
      };
    }
  },

  toBeWithinTTL(received: Date | string, ttl: number) {
    const expirationTime = new Date(received).getTime();
    const now = Date.now();
    const expectedExpiration = now + (ttl * 1000);
    const tolerance = 1000; // 1 second tolerance
    
    const pass = Math.abs(expirationTime - expectedExpiration) <= tolerance;
    
    if (pass) {
      return {
        message: () => 'expected ' + received + ' not to be within TTL of ' + ttl + ' seconds',
        pass: true,
      };
    } else {
      return {
        message: () => 'expected ' + received + ' to be within TTL of ' + ttl + ' seconds from now',
        pass: false,
      };
    }
  },

  toBeValidFileSize(received: number, maxSize: number) {
    const pass = received > 0 && received <= maxSize;
    
    if (pass) {
      return {
        message: () => 'expected ' + received + ' not to be a valid file size',
        pass: true,
      };
    } else {
      return {
        message: () => 'expected ' + received + ' to be between 0 and ' + maxSize + ' bytes',
        pass: false,
      };
    }
  }
});

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    ...jest.requireActual('fs').promises,
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(Buffer.from('test image data')),
    unlink: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ size: 1024, isFile: () => true }),
    access: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn().mockResolvedValue([])
  }
}));

// Mock Redis module by default
jest.mock('ioredis', () => {
  const Redis = jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(-1),
    keys: jest.fn().mockResolvedValue([]),
    scan: jest.fn().mockResolvedValue(['0', []]),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined)
  }));
  return Redis;
});

// Export test utilities
export { mockTime, originalPerformanceNow };
