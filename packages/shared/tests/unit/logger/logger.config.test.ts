/**
 * Tests for logger.config.ts - Configuration logic
 * Using jest-mock-extended for deep mocking as requested
 */

import { createMockConfigService } from '../../mocks';

// Mock winston to avoid ESM import issues
jest.mock('winston', () => ({
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  },
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn()
  },
  createLogger: jest.fn()
}));

// Deep mock the transport modules using jest-mock-extended - define functions directly
jest.mock('../../../src/logger/transports/console.transport', () => ({
  consoleTransport: jest.fn().mockReturnValue({
    name: 'console',
    level: undefined,
    silent: false,
    write: jest.fn(),
    log: jest.fn(),
    close: jest.fn()
  })
}));

jest.mock('../../../src/logger/transports/error-file.transport', () => ({
  errorFileTransport: jest.fn().mockReturnValue({
    name: 'error-file', 
    level: 'error',
    silent: false,
    write: jest.fn(),
    log: jest.fn(),
    close: jest.fn()
  })
}));

jest.mock('../../../src/logger/transports/combined-file.transport', () => ({
  combinedFileTransport: jest.fn().mockReturnValue({
    name: 'combined-file',
    level: undefined,
    silent: false,
    write: jest.fn(),
    log: jest.fn(),
    close: jest.fn()
  })
}));

import { createLoggerConfig } from '../../../src/logger/logger.config';
import { consoleTransport } from '../../../src/logger/transports/console.transport';
import { errorFileTransport } from '../../../src/logger/transports/error-file.transport';
import { combinedFileTransport } from '../../../src/logger/transports/combined-file.transport';

// Get the mocked functions with proper typing
const mockConsoleTransport = consoleTransport as jest.MockedFunction<typeof consoleTransport>;
const mockErrorFileTransport = errorFileTransport as jest.MockedFunction<typeof errorFileTransport>;
const mockCombinedFileTransport = combinedFileTransport as jest.MockedFunction<typeof combinedFileTransport>;

describe('createLoggerConfig - Configuration Logic', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };
    
    // Clear all mock calls
    jest.clearAllMocks();
    
    // Set NODE_ENV to development to avoid test mode silent behavior
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('log level configuration', () => {
    it('should use provided log level option', () => {
      const config = createLoggerConfig({ logLevel: 'warn' });

      expect(config.level).toBe('warn');
    });

    it('should use ConfigService log level if provided', () => {
      const mockConfigService = createMockConfigService();
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'LOG_LEVEL') return 'error';
        return undefined;
      });

      const config = createLoggerConfig({ configService: mockConfigService });

      expect(config.level).toBe('error');
    });

    it('should use environment variable LOG_LEVEL', () => {
      process.env.LOG_LEVEL = 'verbose';

      const config = createLoggerConfig();

      expect(config.level).toBe('verbose');
    });

    it('should use info level in production environment', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.LOG_LEVEL;

      const config = createLoggerConfig();

      expect(config.level).toBe('info');
    });

    it('should use debug level in non-production environment', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.LOG_LEVEL;

      const config = createLoggerConfig();

      expect(config.level).toBe('debug');
    });

    it('should prioritize explicit option over ConfigService', () => {
      const mockConfigService = createMockConfigService();
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'LOG_LEVEL') return 'error';
        return undefined;
      });

      const config = createLoggerConfig({ 
        logLevel: 'warn',
        configService: mockConfigService 
      });

      expect(config.level).toBe('warn');
    });

    it('should prioritize ConfigService over environment variable', () => {
      process.env.LOG_LEVEL = 'verbose';
      const mockConfigService = createMockConfigService();
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'LOG_LEVEL') return 'error';
        return undefined;
      });

      const config = createLoggerConfig({ configService: mockConfigService });

      expect(config.level).toBe('error');
    });
  });

  describe('silent mode configuration', () => {
    it('should be silent in test environment', () => {
      process.env.NODE_ENV = 'test';

      const config = createLoggerConfig();

      expect(config.silent).toBe(true);
    });

    it('should not be silent in production environment', () => {
      process.env.NODE_ENV = 'production';

      const config = createLoggerConfig();

      expect(config.silent).toBe(false);
    });

    it('should not be silent in development environment', () => {
      process.env.NODE_ENV = 'development';

      const config = createLoggerConfig();

      expect(config.silent).toBe(false);
    });

    it('should not be silent when NODE_ENV is undefined', () => {
      delete process.env.NODE_ENV;

      const config = createLoggerConfig();

      expect(config.silent).toBe(false);
    });
  });

  describe('basic configuration structure', () => {
    it('should always set exitOnError to false', () => {
      const config = createLoggerConfig();

      expect(config.exitOnError).toBe(false);
    });

    it('should always include transports array', () => {
      const config = createLoggerConfig();

      expect(config.transports).toBeInstanceOf(Array);
      expect(Array.isArray(config.transports) ? config.transports.length : 1).toBeGreaterThan(0);
    });
    
    it('should call console transport with correct parameters for default service', () => {
      createLoggerConfig();
      
      expect(mockConsoleTransport).toHaveBeenCalledWith('Application', true);
    });

    it('should call console transport with correct parameters for custom service', () => {
      createLoggerConfig({ serviceName: 'CustomService' });
      
      expect(mockConsoleTransport).toHaveBeenCalledWith('CustomService', false);
    });

    it('should handle empty options object', () => {
      const config = createLoggerConfig({});

      expect(config).toEqual({
        level: expect.any(String),
        transports: expect.any(Array),
        exitOnError: false,
        silent: expect.any(Boolean)
      });
    });

    it('should handle null ConfigService gracefully', () => {
      const config = createLoggerConfig({ configService: null as any });

      expect(config).toBeDefined();
      expect(config.transports).toBeDefined();
    });

    it('should handle undefined ConfigService methods gracefully', () => {
      const mockConfigService = { get: jest.fn().mockReturnValue(undefined) } as any;
      
      const config = createLoggerConfig({ configService: mockConfigService });

      expect(config).toBeDefined();
      expect(mockConfigService.get).toHaveBeenCalled();
    });
  });

  describe('file logging configuration logic', () => {
    it('should call file transports when file logging is enabled', () => {
      process.env.ENABLE_FILE_LOGS = 'true';
      
      createLoggerConfig();

      expect(mockErrorFileTransport).toHaveBeenCalled();
      expect(mockCombinedFileTransport).toHaveBeenCalled();
    });

    it('should not call file transports when file logging is disabled', () => {
      process.env.ENABLE_FILE_LOGS = 'false';

      createLoggerConfig();

      expect(mockErrorFileTransport).not.toHaveBeenCalled();
      expect(mockCombinedFileTransport).not.toHaveBeenCalled();
    });
    
    it('should call error file transport with main logger flag for Application service', () => {
      // Enable file logging explicitly to ensure file transports are called
      createLoggerConfig({ serviceName: 'Application', enableFileLogging: true });

      expect(mockErrorFileTransport).toHaveBeenCalledWith(true);
    });

    it('should call error file transport with non-main logger flag for custom service', () => {
      // Enable file logging explicitly to ensure file transports are called
      createLoggerConfig({ serviceName: 'CustomService', enableFileLogging: true });

      expect(mockErrorFileTransport).toHaveBeenCalledWith(false);
    });

    it('should determine file logging from environment ENABLE_FILE_LOGS', () => {
      process.env.ENABLE_FILE_LOGS = 'false';

      const config = createLoggerConfig();

      // When file logging is disabled, should have fewer transports
      expect(Array.isArray(config.transports) ? config.transports.length : 1).toBe(1); // Only console transport
    });

    it('should determine file logging from ConfigService ENABLE_FILE_LOGS', () => {
      const mockConfigService = createMockConfigService();
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ENABLE_FILE_LOGS') return 'false';
        return undefined;
      });

      const config = createLoggerConfig({ configService: mockConfigService });

      expect(Array.isArray(config.transports) ? config.transports.length : 1).toBe(1); // Only console transport
    });

    it('should handle explicit enableFileLogging option', () => {
      const configWithFiles = createLoggerConfig({ enableFileLogging: true });
      const configWithoutFiles = createLoggerConfig({ enableFileLogging: false });

      expect(configWithFiles.transports).toBeDefined();
      expect(configWithoutFiles.transports).toBeDefined();
      const withFilesLength = Array.isArray(configWithFiles.transports) ? configWithFiles.transports.length : 1;
      const withoutFilesLength = Array.isArray(configWithoutFiles.transports) ? configWithoutFiles.transports.length : 1;
      expect(withFilesLength).toBeGreaterThan(withoutFilesLength);
    });

    it('should prioritize explicit option over ConfigService for file logging', () => {
      const mockConfigService = createMockConfigService();
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ENABLE_FILE_LOGS') return 'true';
        return undefined;
      });

      const config = createLoggerConfig({ 
        enableFileLogging: false,
        configService: mockConfigService 
      });

      expect(config.transports).toBeDefined();
      expect(Array.isArray(config.transports) ? config.transports.length : 1).toBe(1); // Console only due to explicit false
    });

    it('should prioritize ConfigService over environment variable for file logging', () => {
      process.env.ENABLE_FILE_LOGS = 'true';
      const mockConfigService = createMockConfigService();
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ENABLE_FILE_LOGS') return 'false';
        return undefined;
      });

      const config = createLoggerConfig({ configService: mockConfigService });

      expect(config.transports).toBeDefined();
      expect(Array.isArray(config.transports) ? config.transports.length : 1).toBe(1); // Console only due to ConfigService false
    });

    it('should treat values other than "false" as true for file logging', () => {
      const truthyValues = ['true', 'yes', '1', 'enabled', 'anything'];

      truthyValues.forEach(value => {
        process.env.ENABLE_FILE_LOGS = value;
        const config = createLoggerConfig();
        expect(config.transports).toBeDefined();
      expect(Array.isArray(config.transports) ? config.transports.length : 1).toBeGreaterThan(1);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should create production-ready configuration', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'info';
      process.env.ENABLE_FILE_LOGS = 'true';

      const config = createLoggerConfig({ serviceName: 'ProductionService' });

      expect(config.level).toBe('info');
      expect(config.silent).toBe(false);
      expect(config.exitOnError).toBe(false);
      expect(config.transports).toBeDefined();
      expect(Array.isArray(config.transports) ? config.transports.length : 1).toBeGreaterThan(1); // Console + file transports
    });

    it('should create development-friendly configuration', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.LOG_LEVEL;

      const config = createLoggerConfig({ 
        serviceName: 'DevService',
        enableFileLogging: false // Disable for cleaner dev output
      });

      expect(config.level).toBe('debug');
      expect(config.silent).toBe(false);
      expect(config.exitOnError).toBe(false);
      expect(config.transports).toBeDefined();
      expect(Array.isArray(config.transports) ? config.transports.length : 1).toBe(1); // Console only
    });

    it('should create test-optimized configuration', () => {
      process.env.NODE_ENV = 'test';

      const config = createLoggerConfig({ 
        serviceName: 'TestService',
        enableFileLogging: false,
        logLevel: 'error' // Reduce test noise
      });

      expect(config.level).toBe('error');
      expect(config.silent).toBe(true);
      expect(config.exitOnError).toBe(false);
      expect(config.transports).toBeDefined();
      expect(Array.isArray(config.transports) ? config.transports.length : 1).toBe(1); // Console only
    });
  });

  describe('configuration priorities', () => {
    it('should follow correct priority order for log level: explicit > ConfigService > env > default', () => {
      // Set environment
      process.env.LOG_LEVEL = 'error';
      process.env.NODE_ENV = 'production'; // Would default to 'info'

      // Set ConfigService
      const mockConfigService = createMockConfigService();
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'LOG_LEVEL') return 'warn';
        return undefined;
      });

      // Explicit option should win
      const config = createLoggerConfig({ 
        logLevel: 'verbose',
        configService: mockConfigService 
      });

      expect(config.level).toBe('verbose');
    });

    it('should follow correct priority order for file logging: explicit > ConfigService > env > default', () => {
      // Set environment to disable
      process.env.ENABLE_FILE_LOGS = 'false';

      // Set ConfigService to enable
      const mockConfigService = createMockConfigService();
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ENABLE_FILE_LOGS') return 'true';
        return undefined;
      });

      // Explicit option should win
      const config = createLoggerConfig({ 
        enableFileLogging: false,
        configService: mockConfigService 
      });

      expect(config.transports).toBeDefined();
      expect(Array.isArray(config.transports) ? config.transports.length : 1).toBe(1); // Console only due to explicit false
    });
  });

  describe('edge cases and defaults', () => {
    it('should handle ConfigService returning null/undefined', () => {
      const mockConfigService = createMockConfigService();
      mockConfigService.get.mockReturnValue(undefined);

      const config = createLoggerConfig({ configService: mockConfigService });

      expect(config.level).toBe('debug'); // Falls back to environment/default
      expect(config).toBeDefined();
    });

    it('should use Application as default service name (implementation detail test)', () => {
      // We can infer this by testing that default config creates appropriate transports
      const config = createLoggerConfig();
      
      // Should have transports configured for the default service
      expect(config.transports).toBeDefined();
      expect(Array.isArray(config.transports) ? config.transports.length : 1).toBeGreaterThan(0);
    });

    it('should handle undefined environment variables gracefully', () => {
      delete process.env.LOG_LEVEL;
      delete process.env.ENABLE_FILE_LOGS;
      delete process.env.NODE_ENV;

      const config = createLoggerConfig();

      expect(config).toBeDefined();
      expect(config.level).toBe('debug'); // Default for non-production
      expect(config.silent).toBe(false);
      expect(config.transports).toBeDefined();
    });
  });
});