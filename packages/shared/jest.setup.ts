/**
 * Jest global setup file for @claude-code/shared package
 */

import 'jest-extended/all';

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'debug';
process.env.ENABLE_FILE_LOGS = 'false';
process.env.MEMORY_WARNING_THRESHOLD = '90';
process.env.MEMORY_DEBUG_THRESHOLD = '75';
process.env.MEMORY_CHECK_INTERVAL = '30000';

// Mock performance.now() for consistent timing tests
const originalPerformanceNow = performance.now;

beforeAll(() => {
  // Mock performance.now for predictable timing tests
  let mockTime = 1000;
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
  // These can be overridden in individual tests if needed
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'warn').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
  jest.spyOn(console, 'debug').mockImplementation();
  jest.spyOn(console, 'info').mockImplementation();
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

// Type assertion helper for better test type safety
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidLogLevel(): R;
      toBeValidTimestamp(): R;
    }
  }
}

// Custom matchers for logger-specific assertions
expect.extend({
  toBeValidLogLevel(received: string) {
    const validLevels = ['error', 'warn', 'info', 'debug', 'verbose'];
    const pass = validLevels.includes(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid log level`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid log level (one of: ${validLevels.join(', ')})`,
        pass: false,
      };
    }
  },

  toBeValidTimestamp(received: string) {
    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    const pass = timestampRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ISO timestamp`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ISO timestamp (ISO 8601 format)`,
        pass: false,
      };
    }
  },
});