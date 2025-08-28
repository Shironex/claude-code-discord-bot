/**
 * Test fixtures for logger testing
 */

// Sample log messages for testing
export const LOG_MESSAGES = {
  simple: 'Simple log message',
  withContext: 'Log message with context',
  withMetadata: 'Log message with metadata',
  error: 'This is an error message',
  warning: 'This is a warning message',
  multiline: 'This is a\nmultiline\nlog message',
  longMessage: 'A'.repeat(1000),
  empty: '',
  specialChars: 'Message with special characters: àáâäãåāæçéêëēíîïīñóôöõøōßúûüūÿž',
  unicode: '🚀 Rocket launch successful! 🎉',
  json: '{"key": "value", "number": 123, "nested": {"array": [1, 2, 3]}}'
};

// Sample contexts for testing
export const LOG_CONTEXTS = {
  service: 'TestService',
  method: 'testMethod',
  class: 'TestClass',
  module: 'TestModule',
  empty: '',
  long: 'VeryLongContextName'.repeat(10)
};

// Sample metadata for testing
export const LOG_METADATA = {
  simple: { key: 'value' },
  nested: {
    level1: {
      level2: {
        key: 'deep value'
      }
    }
  },
  array: { items: [1, 2, 3, 'string', { nested: true }] },
  performance: {
    duration: 150,
    operation: 'database-query',
    timestamp: '2023-01-01T12:00:00.000Z'
  },
  memory: {
    heapUsed: 45000000,
    heapTotal: 95000000,
    external: 5000000
  },
  error: {
    name: 'TestError',
    message: 'Test error message',
    stack: 'Error: Test error message\n    at test.js:1:1'
  },
  sensitive: {
    password: 'secret123',
    apiKey: 'sk-1234567890abcdef',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    creditCard: '4111-1111-1111-1111',
    ssn: '123-45-6789'
  },
  large: Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`key${i}`, `value${i}`])),
  circular: (() => {
    const obj: any = { name: 'circular' };
    obj.self = obj;
    return obj;
  })()
};

// Sample log levels
export const LOG_LEVELS = ['error', 'warn', 'info', 'debug', 'verbose'] as const;

// Sample service names for testing
export const SERVICE_NAMES = {
  valid: [
    'TestService',
    'UserService', 
    'DatabaseService',
    'AuthenticationService',
    'PaymentService'
  ],
  invalid: [
    '',
    '   ',
    null,
    undefined,
    123,
    {},
    []
  ]
};

// Sample environment configurations
export const ENV_CONFIGS = {
  development: {
    NODE_ENV: 'development',
    LOG_LEVEL: 'debug',
    ENABLE_FILE_LOGS: 'true'
  },
  production: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'info',
    ENABLE_FILE_LOGS: 'true'
  },
  test: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'error',
    ENABLE_FILE_LOGS: 'false'
  },
  minimal: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'error'
  },
  invalid: {
    LOG_LEVEL: 'invalid-level',
    ENABLE_FILE_LOGS: 'maybe',
    MEMORY_WARNING_THRESHOLD: 'not-a-number'
  }
};

// Sample performance data
export const PERFORMANCE_DATA = {
  fast: { duration: 10, operation: 'cache-hit' },
  normal: { duration: 150, operation: 'database-query' },
  slow: { duration: 1000, operation: 'file-upload' },
  verySlow: { duration: 5000, operation: 'backup-restore' }
};

// Sample memory usage data
export const MEMORY_DATA = {
  low: {
    used: 10 * 1024 * 1024, // 10MB
    total: 100 * 1024 * 1024, // 100MB
    percentage: 10
  },
  normal: {
    used: 50 * 1024 * 1024, // 50MB
    total: 100 * 1024 * 1024, // 100MB  
    percentage: 50
  },
  high: {
    used: 85 * 1024 * 1024, // 85MB
    total: 100 * 1024 * 1024, // 100MB
    percentage: 85
  },
  critical: {
    used: 95 * 1024 * 1024, // 95MB
    total: 100 * 1024 * 1024, // 100MB
    percentage: 95
  }
};

// Sample error objects for testing
export const ERROR_FIXTURES = {
  simple: new Error('Simple error'),
  withStack: (() => {
    const error = new Error('Error with stack');
    error.stack = 'Error: Error with stack\n    at test.js:1:1\n    at module.js:2:2';
    return error;
  })(),
  withCause: (() => {
    const cause = new Error('Root cause');
    const error = new Error('Main error');
    (error as any).cause = cause;
    return error;
  })(),
  custom: (() => {
    class CustomError extends Error {
      constructor(message: string, public code: string) {
        super(message);
        this.name = 'CustomError';
      }
    }
    return new CustomError('Custom error message', 'CUSTOM_001');
  })()
};

// Winston transport configurations for testing
export const TRANSPORT_CONFIGS = {
  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true
  },
  file: {
    level: 'info',
    filename: 'test.log',
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  },
  error: {
    level: 'error',
    filename: 'error.log',
    handleExceptions: true,
    json: true
  }
};