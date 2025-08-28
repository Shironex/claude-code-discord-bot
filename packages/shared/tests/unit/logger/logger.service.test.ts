/**
 * Tests for LoggerService - Core functionality
 */

import { LoggerService } from '../../../src/logger/logger.service';
import { 
  createMockConfigService, 
  createMockWinstonLogger
} from '../../mocks';
import { 
  LOG_MESSAGES, 
  LOG_CONTEXTS, 
  LOG_METADATA,
  SERVICE_NAMES,
  PERFORMANCE_DATA,
  ERROR_FIXTURES
} from '../../fixtures';
import * as winston from 'winston';
import * as securityUtils from '../../../src/logger/utils/security.utils';

// Mock winston module
jest.mock('winston', () => ({
  ...jest.requireActual('winston'),
  createLogger: jest.fn(),
  addColors: jest.fn(),
  transports: {
    Console: jest.fn().mockImplementation(() => ({
      log: jest.fn()
    })),
    File: jest.fn().mockImplementation(() => ({
      log: jest.fn()
    }))
  }
}));

// Mock the logger config
jest.mock('../../../src/logger/logger.config', () => ({
  createLoggerConfig: jest.fn().mockReturnValue({
    level: 'debug',
    transports: []
  })
}));

// Mock service file transport
jest.mock('../../../src/logger/transports/service-file.transport', () => ({
  createServiceFileTransport: jest.fn().mockReturnValue({
    log: jest.fn()
  })
}));

// Mock security validation functions at module level
jest.mock('../../../src/logger/utils/security.utils');

describe('LoggerService', () => {
  let loggerService: LoggerService;
  let mockConfigService: ReturnType<typeof createMockConfigService>;
  let mockWinstonLogger: ReturnType<typeof createMockWinstonLogger>;
  let createdLoggerInstances: LoggerService[] = [];
  let activeIntervals: NodeJS.Timeout[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Clear tracking arrays
    createdLoggerInstances = [];
    activeIntervals = [];
    
    mockConfigService = createMockConfigService();
    mockWinstonLogger = createMockWinstonLogger();
    
    // Setup security utils mocks
    jest.spyOn(securityUtils, 'validateLogMessage').mockImplementation((message) => {
      return message === undefined ? '' : String(message);
    });
    jest.spyOn(securityUtils, 'validateContext').mockImplementation((context) => {
      return context;
    });
    jest.spyOn(securityUtils, 'validateMetadata').mockImplementation((metadata) => {
      return metadata || {};
    });
    jest.spyOn(securityUtils, 'isValidLogLevel').mockReturnValue(true);
    
    // Ensure async methods resolve immediately
    (mockWinstonLogger.close as any).mockImplementation(() => Promise.resolve(mockWinstonLogger));
    mockWinstonLogger.end.mockImplementation((callback?: () => void) => {
      if (callback) {
        // Call callback immediately to simulate successful end
        setImmediate(callback);
      }
      return mockWinstonLogger;
    });
    
    // Mock winston.createLogger to return our mock
    (winston.createLogger as jest.Mock).mockReturnValue(mockWinstonLogger);
  });

  afterEach(() => {
    // Clear all active intervals
    activeIntervals.forEach(interval => clearInterval(interval));
    activeIntervals = [];
    
    // Clean up logger instances
    createdLoggerInstances.forEach(logger => {
      try {
        // Try to flush safely if possible
        logger.safeFlush().catch(() => {});
      } catch (error) {
        // Ignore cleanup errors
      }
    });
    createdLoggerInstances = [];
    
    // Clean up any running timers/intervals from memory monitoring
    jest.clearAllTimers();
    jest.useRealTimers();
    
    // Restore all mocks
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create logger with valid service name', () => {
      loggerService = new LoggerService('TestService');
      
      expect(winston.createLogger).toHaveBeenCalledTimes(1);
      expect(loggerService).toBeInstanceOf(LoggerService);
    });

    it('should create logger with config service', () => {
      loggerService = new LoggerService('TestService', {}, mockConfigService);
      
      expect(winston.createLogger).toHaveBeenCalledTimes(1);
      expect(loggerService).toBeInstanceOf(LoggerService);
    });

    it('should create logger with custom options', () => {
      const options = {
        enableFileLogging: true,
        logLevel: 'info' as const
      };
      
      loggerService = new LoggerService('TestService', options);
      
      expect(winston.createLogger).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid service names by creating fallback logger', () => {
      // LoggerService doesn't throw but creates fallback loggers
      SERVICE_NAMES.invalid.forEach(invalidName => {
        expect(() => {
          new LoggerService(invalidName as string);
        }).not.toThrow();
      });
    });

    it('should handle empty service name by creating fallback logger', () => {
      expect(() => {
        loggerService = new LoggerService('');
      }).not.toThrow();
      
      expect(loggerService).toBeInstanceOf(LoggerService);
    });

    it('should handle whitespace-only service name by creating fallback logger', () => {
      expect(() => {
        loggerService = new LoggerService('   ');
      }).not.toThrow();
      
      expect(loggerService).toBeInstanceOf(LoggerService);
    });

    it('should handle winston createLogger failure gracefully', () => {
      const originalCreateLogger = winston.createLogger as jest.Mock;
      let callCount = 0;
      
      originalCreateLogger.mockImplementation((options) => {
        callCount++;
        if (callCount === 1) {
          // First call (main logger) fails
          throw new Error('Winston creation failed');
        } else {
          // Second call (fallback logger) succeeds
          return mockWinstonLogger;
        }
      });

      // Should not throw, should create fallback logger
      expect(() => {
        loggerService = new LoggerService('TestService');
      }).not.toThrow();

      expect(loggerService).toBeInstanceOf(LoggerService);
      expect(originalCreateLogger).toHaveBeenCalledTimes(2); // Main + fallback

      // Restore original mock
      originalCreateLogger.mockReturnValue(mockWinstonLogger);
    });
  });

  describe('Basic Logging Methods', () => {
    beforeEach(() => {
      loggerService = new LoggerService('TestService');
    });

    describe('log() - alias for info()', () => {
      it('should call info method', () => {
        const message = LOG_MESSAGES.simple;
        const context = LOG_CONTEXTS.service;
        
        const infoSpy = jest.spyOn(loggerService, 'info');
        loggerService.log(message, context);
        
        expect(infoSpy).toHaveBeenCalledWith(message, context, undefined);
      });
    });

    describe('info()', () => {
      it('should log info message with message only', () => {
        const message = LOG_MESSAGES.simple;
        
        loggerService.info(message);
        
        expect(mockWinstonLogger.info).toHaveBeenCalledWith(
          message,
          expect.objectContaining({
            service: 'TestService',
            method: undefined
          })
        );
      });

      it('should log info message with context', () => {
        const message = LOG_MESSAGES.withContext;
        const context = LOG_CONTEXTS.method;
        
        loggerService.info(message, context);
        
        expect(mockWinstonLogger.info).toHaveBeenCalledWith(
          message,
          expect.objectContaining({
            service: 'TestService',
            method: context
          })
        );
      });

      it('should log info message with metadata', () => {
        const message = LOG_MESSAGES.withMetadata;
        const metadata = LOG_METADATA.simple;
        
        loggerService.info(message, undefined, metadata);
        
        expect(mockWinstonLogger.info).toHaveBeenCalledWith(
          message,
          expect.objectContaining({
            service: 'TestService',
            method: undefined,
            ...metadata
          })
        );
      });

      it('should handle special characters in message', () => {
        const message = LOG_MESSAGES.specialChars;
        
        loggerService.info(message);
        
        expect(mockWinstonLogger.info).toHaveBeenCalledWith(
          message,
          expect.objectContaining({
            service: 'TestService'
          })
        );
      });

      it('should handle empty message', () => {
        loggerService.info(LOG_MESSAGES.empty);
        
        expect(mockWinstonLogger.info).toHaveBeenCalledWith(
          '',
          expect.objectContaining({
            service: 'TestService'
          })
        );
      });

      it('should handle multiline message', () => {
        const message = LOG_MESSAGES.multiline;
        
        loggerService.info(message);
        
        expect(mockWinstonLogger.info).toHaveBeenCalledWith(
          message,
          expect.objectContaining({
            service: 'TestService'
          })
        );
      });
    });

    describe('error()', () => {
      it('should log error with message only', () => {
        const message = LOG_MESSAGES.error;
        
        loggerService.error(message);
        
        expect(mockWinstonLogger.error).toHaveBeenCalledWith(
          message,
          expect.objectContaining({
            service: 'TestService',
            method: undefined
          })
        );
      });

      it('should log error with trace', () => {
        const message = LOG_MESSAGES.error;
        const trace = ERROR_FIXTURES.withStack.stack;
        
        loggerService.error(message, trace);
        
        expect(mockWinstonLogger.error).toHaveBeenCalledWith(
          message,
          expect.objectContaining({
            service: 'TestService',
            method: undefined,
            stack: trace
          })
        );
      });

      it('should log error with Error object', () => {
        const error = ERROR_FIXTURES.simple;
        
        loggerService.error(error);
        
        expect(mockWinstonLogger.error).toHaveBeenCalledWith(
          `Error: ${error.message}`,
          expect.objectContaining({
            service: 'TestService',
            method: undefined
          })
        );
      });

      it('should handle error with custom properties', () => {
        const error = ERROR_FIXTURES.custom;
        
        loggerService.error(error);
        
        expect(mockWinstonLogger.error).toHaveBeenCalledWith(
          `CustomError: ${error.message}`,
          expect.objectContaining({
            service: 'TestService',
            method: undefined
          })
        );
      });
    });

    describe('warn()', () => {
      it('should log warning message', () => {
        const message = LOG_MESSAGES.warning;
        
        loggerService.warn(message);
        
        expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
          message,
          expect.objectContaining({
            service: 'TestService',
            method: undefined
          })
        );
      });

      it('should log warning with context and metadata', () => {
        const message = LOG_MESSAGES.warning;
        const context = LOG_CONTEXTS.class;
        const metadata = LOG_METADATA.performance;
        
        loggerService.warn(message, context, metadata);
        
        expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
          message,
          expect.objectContaining({
            service: 'TestService',
            method: context,
            ...metadata
          })
        );
      });
    });

    describe('debug()', () => {
      it('should log debug message', () => {
        const message = LOG_MESSAGES.simple;
        
        loggerService.debug(message);
        
        expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
          message,
          expect.objectContaining({
            service: 'TestService',
            method: undefined
          })
        );
      });
    });

    describe('verbose()', () => {
      it('should log verbose message', () => {
        const message = LOG_MESSAGES.simple;
        
        loggerService.verbose(message);
        
        expect(mockWinstonLogger.verbose).toHaveBeenCalledWith(
          message,
          expect.objectContaining({
            service: 'TestService',
            method: undefined
          })
        );
      });
    });
  });

  describe('Performance Timing', () => {
    beforeEach(() => {
      loggerService = new LoggerService('TestService');
    });

    it('should start timer', () => {
      const label = 'test-timer';
      
      loggerService.time(label);
      
      // Timer should be started (internal state - can't directly test)
      expect(() => loggerService.time(label)).not.toThrow();
    });

    it('should end timer and return duration', () => {
      const label = 'test-timer';
      
      loggerService.time(label);
      const duration = loggerService.timeEnd(label);
      
      expect(duration).toBeNumber();
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle timeEnd without corresponding time', () => {
      const label = 'non-existent-timer';
      
      const duration = loggerService.timeEnd(label);
      
      expect(duration).toBeNumber();
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should log performance metrics', () => {
      const operation = PERFORMANCE_DATA.normal.operation;
      const duration = PERFORMANCE_DATA.normal.duration;
      const context = LOG_CONTEXTS.method;
      
      loggerService.performance(operation, duration, context);
      
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(operation),
        expect.objectContaining({
          service: 'TestService',
          method: context,
          duration
        })
      );
    });

    it('should use warn level for slow operations', () => {
      const operation = PERFORMANCE_DATA.slow.operation;
      const duration = PERFORMANCE_DATA.slow.duration; // 1000ms
      
      loggerService.performance(operation, duration);
      
      // 1000ms should trigger warn level (> 1000 is false, but the threshold is 1000, so we need > 1000)
      // Let's use 1001ms to be sure it's greater than the threshold
      loggerService.performance(operation, 1001);
      
      expect(mockWinstonLogger.warn).toHaveBeenCalled();
    });

    it('should use error level for very slow operations', () => {
      const operation = PERFORMANCE_DATA.verySlow.operation;
      const duration = PERFORMANCE_DATA.verySlow.duration; // 5000ms
      
      loggerService.performance(operation, duration);
      
      // 5000ms should trigger error level (> 5000 is false, so let's use 5001ms)
      loggerService.performance(operation, 5001);
      
      expect(mockWinstonLogger.error).toHaveBeenCalled();
    });

    it('should use info level in timeEnd when specified', () => {
      const label = 'info-timer';
      const message = 'Custom completion message';
      
      loggerService.time(label);
      const duration = loggerService.timeEnd(label, message, 'info');
      
      expect(duration).toBeNumber();
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          service: 'TestService',
          method: label,
          duration: expect.any(Number)
        })
      );
    });
  });

  describe('Method Lifecycle Logging', () => {
    beforeEach(() => {
      loggerService = new LoggerService('TestService');
    });

    it('should log method entry', () => {
      const methodName = 'testMethod';
      const params = { id: 123, name: 'test' };
      
      loggerService.methodEntry(methodName, params);
      
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
        `Entering ${methodName}`,
        expect.objectContaining({
          service: 'TestService',
          method: methodName,
          parameters: params
        })
      );
    });

    it('should log method entry without params', () => {
      const methodName = 'simpleMethod';
      
      loggerService.methodEntry(methodName);
      
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
        `Entering ${methodName}`,
        expect.objectContaining({
          service: 'TestService',
          method: methodName
        })
      );
    });

    it('should log method exit', () => {
      const methodName = 'testMethod';
      const result = { success: true, data: [] };
      
      loggerService.methodExit(methodName, result);
      
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
        `Exiting ${methodName}`,
        expect.objectContaining({
          service: 'TestService',
          method: methodName,
          result
        })
      );
    });

    it('should log method exit without result', () => {
      const methodName = 'voidMethod';
      
      loggerService.methodExit(methodName);
      
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
        `Exiting ${methodName}`,
        expect.objectContaining({
          service: 'TestService',
          method: methodName
        })
      );
    });
  });

  describe('Child Logger', () => {
    beforeEach(() => {
      loggerService = new LoggerService('TestService');
    });

    it('should create child logger with metadata', () => {
      const metadata = { requestId: '123', userId: '456' };
      
      const childLogger = loggerService.child(metadata);
      
      expect(childLogger).toBeInstanceOf(LoggerService);
      expect(mockWinstonLogger.child).toHaveBeenCalledWith(metadata);
    });

    it('should create child logger with empty metadata', () => {
      const metadata = {};
      
      const childLogger = loggerService.child(metadata);
      
      expect(childLogger).toBeInstanceOf(LoggerService);
      expect(mockWinstonLogger.child).toHaveBeenCalledWith(metadata);
    });
  });

  describe('Lifecycle Methods', () => {
    beforeEach(() => {
      loggerService = new LoggerService('TestService');
    });

    it('should flush logger', async () => {
      // Use real timers for flush operations
      jest.useRealTimers();
      
      const testLogger = new LoggerService('TestService');
      await expect(testLogger.flush()).resolves.toBeUndefined();
      expect(mockWinstonLogger.end).toHaveBeenCalled();
      
      // Restore fake timers
      jest.useFakeTimers();
    });

    it('should safe flush logger', async () => {
      // Use real timers for flush operations
      jest.useRealTimers();
      
      const testLogger = new LoggerService('TestService');
      await expect(testLogger.safeFlush()).resolves.toBeUndefined();
      expect(mockWinstonLogger.end).toHaveBeenCalled();
      
      // Restore fake timers
      jest.useFakeTimers();
    });

    it('should handle flush failure gracefully in safeFlush', async () => {
      const error = new Error('Flush failed');
      mockWinstonLogger.end.mockImplementation(() => {
        throw error;
      });
      
      await expect(loggerService.safeFlush()).resolves.toBeUndefined();
      expect(mockWinstonLogger.end).toHaveBeenCalled();
    });

    it('should handle flush failure in flush method', async () => {
      const error = new Error('Flush failed');
      mockWinstonLogger.end.mockImplementation(() => {
        throw error;
      });
      
      await expect(loggerService.flush()).rejects.toThrow('Failed to flush logger: Flush failed');
    });

    it('should handle flush timeout after 5 seconds', async () => {
      jest.useRealTimers();
      
      // Mock logger.end to never call the callback, simulating a hang
      mockWinstonLogger.end.mockImplementation((callback?: () => void) => {
        // Don't call the callback to simulate hanging
        return mockWinstonLogger;
      });
      
      const testLogger = new LoggerService('TestService');
      
      await expect(testLogger.flush()).rejects.toThrow('Logger flush timeout after 5 seconds');
      
      jest.useFakeTimers();
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      loggerService = new LoggerService('TestService');
    });

    describe('checkSlowOperation', () => {
      it('should log warning for slow operations', () => {
        const operation = 'database-query';
        const duration = 2000; // 2 seconds (slow but not very slow)
        const context = 'TestContext';

        loggerService.checkSlowOperation(operation, duration, context);

        expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Slow operation detected'),
          expect.objectContaining({
            service: 'TestService',
            method: context,
            operation,
            duration,
            threshold: expect.any(Number)
          })
        );
      });

      it('should log error for very slow operations', () => {
        const operation = 'heavy-computation';
        const duration = 6000; // 6 seconds (very slow)
        
        // Spy on the error method directly
        const errorSpy = jest.spyOn(loggerService, 'error');

        loggerService.checkSlowOperation(operation, duration);

        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Very slow operation detected'),
          undefined,
          'SlowOperationDetector',
          expect.objectContaining({
            operation,
            duration,
            threshold: expect.any(Number)
          })
        );
        
        errorSpy.mockRestore();
      });

      it('should not log anything for fast operations', () => {
        const operation = 'quick-task';
        const duration = 500; // 0.5 seconds (fast)
        
        loggerService.checkSlowOperation(operation, duration);

        expect(mockWinstonLogger.warn).not.toHaveBeenCalled();
        expect(mockWinstonLogger.error).not.toHaveBeenCalled();
      });

      it('should use default context when not provided', () => {
        const operation = 'test-operation';
        const duration = 6000;
        
        loggerService.checkSlowOperation(operation, duration);

        expect(mockWinstonLogger.error).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            service: 'TestService',
            method: 'SlowOperationDetector'
          })
        );
      });

      it('should handle boundary conditions correctly', () => {
        // Test exactly at slow threshold
        loggerService.checkSlowOperation('boundary-slow', 1001);
        expect(mockWinstonLogger.warn).toHaveBeenCalled();
        
        jest.clearAllMocks();
        
        // Test exactly at very slow threshold  
        loggerService.checkSlowOperation('boundary-very-slow', 5001);
        expect(mockWinstonLogger.error).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle validation errors in info method', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Create a fresh logger instance for this test
      const testLogger = new LoggerService('TestService');
      
      // Mock validateLogMessage to throw error from security utils
      const validateLogMessageSpy = jest.spyOn(securityUtils, 'validateLogMessage');
      validateLogMessageSpy.mockImplementationOnce(() => {
        throw new Error('Validation failed');
      });

      testLogger.info('test message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Logger validation error:', expect.any(Error));
      expect(mockWinstonLogger.info).toHaveBeenCalledWith('[Invalid log parameters]', { service: 'TestService' });

      // Restore
      consoleErrorSpy.mockRestore();
      validateLogMessageSpy.mockRestore();
    });

    it('should handle validation errors in warn method', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Create a fresh logger instance for this test
      const testLogger = new LoggerService('TestService');
      
      // Mock validateLogMessage to throw error from security utils
      const validateLogMessageSpy = jest.spyOn(securityUtils, 'validateLogMessage');
      validateLogMessageSpy.mockImplementationOnce(() => {
        throw new Error('Validation failed');
      });

      testLogger.warn('test message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Logger validation error:', expect.any(Error));
      expect(mockWinstonLogger.warn).toHaveBeenCalledWith('[Invalid log parameters]', { service: 'TestService' });

      // Restore
      consoleErrorSpy.mockRestore();
      validateLogMessageSpy.mockRestore();
    });

    it('should handle service file transport creation errors', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock createServiceFileTransport to throw error
      const mockCreateTransport = require('../../../src/logger/transports/service-file.transport');
      const originalCreate = mockCreateTransport.createServiceFileTransport;
      mockCreateTransport.createServiceFileTransport = jest.fn(() => {
        throw new Error('Transport creation failed');
      });

      // Create new logger instance to trigger constructor code
      const newLogger = new LoggerService('ErrorTestService');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create service file transport for "ErrorTestService": Transport creation failed')
      );

      // Restore
      consoleWarnSpy.mockRestore();
      mockCreateTransport.createServiceFileTransport = originalCreate;
    });

    it('should handle winston.addColors failure', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock winston.addColors at the mock level to throw error
      const mockAddColors = winston.addColors as jest.Mock;
      const originalImplementation = mockAddColors.getMockImplementation();
      mockAddColors.mockImplementationOnce(() => {
        throw new Error('Color setting failed');
      });

      // Create new logger instance to trigger constructor code  
      const newLogger = new LoggerService('ColorTestService');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to set Winston colors:',
        'Color setting failed'
      );

      // Restore
      consoleWarnSpy.mockRestore();
      if (originalImplementation) {
        mockAddColors.mockImplementation(originalImplementation);
      }
    });

    it('should setup memory monitoring for Application service name', () => {
      // Mock setupMemoryMonitoring method
      const setupSpy = jest.spyOn(LoggerService.prototype as any, 'setupMemoryMonitoring')
        .mockImplementation(() => {});

      const appLogger = new LoggerService('Application');

      expect(setupSpy).toHaveBeenCalled();
      
      setupSpy.mockRestore();
    });

    it('should not setup memory monitoring for non-Application services', () => {
      const setupSpy = jest.spyOn(LoggerService.prototype as any, 'setupMemoryMonitoring')
        .mockImplementation(() => {});

      const testLogger = new LoggerService('TestService');

      expect(setupSpy).not.toHaveBeenCalled();
      
      setupSpy.mockRestore();
    });

    it('should handle validation errors in error method', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Create a fresh logger instance for this test
      const testLogger = new LoggerService('TestService');
      
      // Mock validateLogMessage to throw error from security utils
      const validateLogMessageSpy = jest.spyOn(securityUtils, 'validateLogMessage');
      validateLogMessageSpy.mockImplementationOnce(() => {
        throw new Error('Validation failed');
      });

      testLogger.error('test message', 'stack trace');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Logger validation error:', expect.any(Error));
      expect(mockWinstonLogger.error).toHaveBeenCalledWith('[Invalid log parameters]', { service: 'TestService' });

      // Restore
      consoleErrorSpy.mockRestore();
      validateLogMessageSpy.mockRestore();
    });

    it('should handle validation errors in debug method', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Create a fresh logger instance for this test
      const testLogger = new LoggerService('TestService');
      
      // Mock validateLogMessage to throw error from security utils
      const validateLogMessageSpy = jest.spyOn(securityUtils, 'validateLogMessage');
      validateLogMessageSpy.mockImplementationOnce(() => {
        throw new Error('Validation failed');
      });

      testLogger.debug('test message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Logger validation error:', expect.any(Error));
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith('[Invalid log parameters]', { service: 'TestService' });

      // Restore
      consoleErrorSpy.mockRestore();
      validateLogMessageSpy.mockRestore();
    });

    it('should handle validation errors in verbose method', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Create a fresh logger instance for this test
      const testLogger = new LoggerService('TestService');
      
      // Mock validateLogMessage to throw error from security utils
      const validateLogMessageSpy = jest.spyOn(securityUtils, 'validateLogMessage');
      validateLogMessageSpy.mockImplementationOnce(() => {
        throw new Error('Validation failed');
      });

      testLogger.verbose('test message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Logger validation error:', expect.any(Error));
      expect(mockWinstonLogger.verbose).toHaveBeenCalledWith('[Invalid log parameters]', { service: 'TestService' });

      // Restore
      consoleErrorSpy.mockRestore();
      validateLogMessageSpy.mockRestore();
    });

    it('should handle timer validation errors in time method', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock validateLogMessage to throw error for timer label
      const validateLogMessageSpy = jest.spyOn(securityUtils, 'validateLogMessage');
      validateLogMessageSpy.mockImplementation(() => {
        throw new Error('Timer validation failed');
      });

      loggerService.time('test-timer');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Timer label validation error:', expect.any(Error));

      // Restore
      consoleErrorSpy.mockRestore();
      validateLogMessageSpy.mockRestore();
    });

    it('should handle timer validation errors in timeEnd method', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock validateLogMessage to throw error for timer label
      const validateLogMessageSpy = jest.spyOn(securityUtils, 'validateLogMessage');
      validateLogMessageSpy.mockImplementation(() => {
        throw new Error('Timer validation failed');
      });

      const result = loggerService.timeEnd('test-timer');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Timer validation error:', expect.any(Error));
      expect(result).toBe(0);

      // Restore
      consoleErrorSpy.mockRestore();
      validateLogMessageSpy.mockRestore();
    });

    it('should handle logger.end failure in flush method', async () => {
      const testLogger = new LoggerService('TestService');
      const error = new Error('End failed');
      
      // Mock the end method to throw synchronously
      mockWinstonLogger.end.mockImplementation(() => {
        throw error;
      });
      
      await expect(testLogger.flush()).rejects.toThrow('Failed to flush logger: End failed');
    });

    it('should handle non-Error objects in service file transport creation', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock createServiceFileTransport to throw non-Error object
      const mockTransport = require('../../../src/logger/transports/service-file.transport');
      const originalCreate = mockTransport.createServiceFileTransport;
      mockTransport.createServiceFileTransport = jest.fn(() => {
        throw 'String error';
      });

      // Create new logger instance to trigger constructor code
      const newLogger = new LoggerService('StringErrorTestService');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to create service file transport for "StringErrorTestService": String error'
      );

      // Restore
      consoleWarnSpy.mockRestore();
      mockTransport.createServiceFileTransport = originalCreate;
    });

    it('should handle non-Error objects in winston.addColors failure', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock winston.addColors at the mock level to throw non-Error object
      const mockAddColors = winston.addColors as jest.Mock;
      const originalImplementation = mockAddColors.getMockImplementation();
      mockAddColors.mockImplementationOnce(() => {
        throw 'Non-error object';
      });

      // Create new logger instance to trigger constructor code  
      const newLogger = new LoggerService('NonErrorTestService');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to set Winston colors:',
        'Non-error object'
      );

      // Restore
      consoleWarnSpy.mockRestore();
      if (originalImplementation) {
        mockAddColors.mockImplementation(originalImplementation);
      }
    });

    it('should handle methods with metadata object passed to methodExit', () => {
      const methodName = 'testMethod';
      const result = { success: true };
      const duration = 150;

      const debugSpy = jest.spyOn(loggerService, 'debug');

      loggerService.methodExit(methodName, result, duration);

      expect(debugSpy).toHaveBeenCalledWith(
        `Exiting ${methodName}`, 
        methodName, 
        { result, duration }
      );

      debugSpy.mockRestore();
    });

    it('should handle setupMemoryMonitoring being called for Application service', () => {
      // Mock private method to verify it's actually called
      const mockSetupMemoryMonitoring = jest.fn();
      
      // Replace the prototype method temporarily
      const originalSetupMemoryMonitoring = (LoggerService.prototype as any).setupMemoryMonitoring;
      (LoggerService.prototype as any).setupMemoryMonitoring = mockSetupMemoryMonitoring;

      const appLogger = new LoggerService('Application');

      expect(mockSetupMemoryMonitoring).toHaveBeenCalled();

      // Restore
      (LoggerService.prototype as any).setupMemoryMonitoring = originalSetupMemoryMonitoring;
    });
  });

  describe('Memory Monitoring (setupMemoryMonitoring)', () => {
    let originalSetInterval: typeof setInterval;
    let intervalCallback: () => void;
    let mockConfigService: any;
    let originalEnv: NodeJS.ProcessEnv;
    let mockIntervals: NodeJS.Timeout[] = [];

    beforeEach(() => {
      // Save original environment
      originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env.MEMORY_WARNING_THRESHOLD;
      delete process.env.MEMORY_DEBUG_THRESHOLD;
      delete process.env.MEMORY_CHECK_INTERVAL;
      
      // Clear intervals array
      mockIntervals = [];
      
      // Mock setInterval to capture the callback and track intervals
      originalSetInterval = global.setInterval;
      global.setInterval = jest.fn((callback, interval) => {
        intervalCallback = callback as () => void;
        const mockTimerId = 123 + mockIntervals.length;
        mockIntervals.push(mockTimerId as any);
        return mockTimerId as any; // Mock timer ID
      });

      mockConfigService = createMockConfigService();
    });

    afterEach(() => {
      // Clear all mock intervals
      mockIntervals.forEach(intervalId => {
        try {
          clearInterval(intervalId);
        } catch (e) {
          // Ignore errors in cleanup
        }
      });
      mockIntervals = [];
      
      global.setInterval = originalSetInterval;
      process.env = originalEnv;
    });

    it('should use ConfigService thresholds when available', () => {
      mockConfigService.get
        .mockReturnValueOnce('85') // MEMORY_WARNING_THRESHOLD
        .mockReturnValueOnce('70') // MEMORY_DEBUG_THRESHOLD
        .mockReturnValueOnce('25000'); // MEMORY_CHECK_INTERVAL

      const appLogger = new LoggerService('Application', {}, mockConfigService);
      
      expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 25000);
    });

    it('should use environment variables when ConfigService returns null', () => {
      mockConfigService.get.mockReturnValue(null);
      
      process.env.MEMORY_WARNING_THRESHOLD = '95';
      process.env.MEMORY_DEBUG_THRESHOLD = '80';
      process.env.MEMORY_CHECK_INTERVAL = '20000';

      const appLogger = new LoggerService('Application', {}, mockConfigService);
      
      expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 20000);
    });

    it('should fallback to default thresholds when values are invalid', () => {
      mockConfigService.get
        .mockReturnValueOnce('invalid') // Invalid warning threshold
        .mockReturnValueOnce('-10') // Invalid debug threshold  
        .mockReturnValueOnce('1000'); // Invalid check interval (too small)

      const debugSpy = jest.spyOn(LoggerService.prototype, 'debug').mockImplementation();

      const appLogger = new LoggerService('Application', {}, mockConfigService);
      
      // Should use default interval (30000) because 1000 is too small
      expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 30000);

      debugSpy.mockRestore();
    });

    it('should log high memory warning when usage exceeds warning threshold', () => {
      // Mock process.memoryUsage to return high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        heapUsed: 95 * 1024 * 1024, // 95MB used
        heapTotal: 100 * 1024 * 1024, // 100MB total = 95% usage
        external: 10 * 1024 * 1024,
        rss: 120 * 1024 * 1024,
        arrayBuffers: 0
      })) as any;

      const warnSpy = jest.spyOn(LoggerService.prototype, 'warn').mockImplementation();
      const debugSpy = jest.spyOn(LoggerService.prototype, 'debug').mockImplementation();

      const appLogger = new LoggerService('Application');
      
      // Execute the interval callback
      intervalCallback();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('High memory usage: 95%'),
        'MemoryMonitor',
        expect.objectContaining({
          heapUsagePercent: 95,
          heapUsed: 95,
          heapTotal: 100,
          warningThreshold: 90,
          external: 10,
          rss: 120
        })
      );

      process.memoryUsage = originalMemoryUsage;
      warnSpy.mockRestore();
      debugSpy.mockRestore();
    });

    it('should log debug memory info when usage exceeds debug threshold but below warning', () => {
      // Mock process.memoryUsage to return moderate memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        heapUsed: 80 * 1024 * 1024, // 80MB used  
        heapTotal: 100 * 1024 * 1024, // 100MB total = 80% usage
        external: 5 * 1024 * 1024,
        rss: 100 * 1024 * 1024,
        arrayBuffers: 0
      })) as any;

      const warnSpy = jest.spyOn(LoggerService.prototype, 'warn').mockImplementation();
      const debugSpy = jest.spyOn(LoggerService.prototype, 'debug').mockImplementation();

      const appLogger = new LoggerService('Application');
      
      // Execute the interval callback
      intervalCallback();

      expect(warnSpy).not.toHaveBeenCalled(); // Should not warn at 80%
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Memory usage: 80%'),
        'MemoryMonitor',
        expect.objectContaining({
          heapUsagePercent: 80,
          debugThreshold: 75
        })
      );

      process.memoryUsage = originalMemoryUsage;
      warnSpy.mockRestore();
      debugSpy.mockRestore();
    });

    it('should not log anything when memory usage is below debug threshold', () => {
      // Mock process.memoryUsage to return low memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        heapUsed: 50 * 1024 * 1024, // 50MB used
        heapTotal: 100 * 1024 * 1024, // 100MB total = 50% usage
        external: 5 * 1024 * 1024,
        rss: 70 * 1024 * 1024,
        arrayBuffers: 0
      })) as any;

      const warnSpy = jest.spyOn(LoggerService.prototype, 'warn').mockImplementation();
      const debugSpy = jest.spyOn(LoggerService.prototype, 'debug').mockImplementation();

      const appLogger = new LoggerService('Application');
      
      // Execute the interval callback - skip the initialization debug call
      debugSpy.mockClear();
      intervalCallback();

      expect(warnSpy).not.toHaveBeenCalled();
      expect(debugSpy).not.toHaveBeenCalled(); // No memory logging for 50% usage

      process.memoryUsage = originalMemoryUsage;
      warnSpy.mockRestore();
      debugSpy.mockRestore();
    });

    it('should handle process.memoryUsage errors gracefully', () => {
      // Mock process.memoryUsage to throw error
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockImplementation(() => {
        throw new Error('Memory usage failed');
      }) as any;

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const debugSpy = jest.spyOn(LoggerService.prototype, 'debug').mockImplementation();

      const appLogger = new LoggerService('Application');
      
      // Execute the interval callback
      intervalCallback();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Memory monitoring error:', expect.any(Error));

      process.memoryUsage = originalMemoryUsage;
      consoleErrorSpy.mockRestore(); 
      debugSpy.mockRestore();
    });

    it('should initialize memory monitoring with debug message', () => {
      const debugSpy = jest.spyOn(LoggerService.prototype, 'debug').mockImplementation();
      
      // Clear any environment variables that might affect the test
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env.MEMORY_WARNING_THRESHOLD;
      delete process.env.MEMORY_DEBUG_THRESHOLD;
      delete process.env.MEMORY_CHECK_INTERVAL;

      const appLogger = new LoggerService('Application');

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Memory monitoring initialized - Warning: 90%, Debug: 75%, Interval: 30000ms'),
        'MemoryMonitor'
      );

      debugSpy.mockRestore();
      process.env = originalEnv;
    });

    it('should validate check interval bounds (min 5s, max 5min)', () => {
      const debugSpy = jest.spyOn(LoggerService.prototype, 'debug').mockImplementation();
      
      // Reset setInterval mock call count
      (global.setInterval as jest.Mock).mockClear();
      
      // Test minimum bound
      const mockConfigService1 = createMockConfigService();
      mockConfigService1.get
        .mockReturnValueOnce('90')
        .mockReturnValueOnce('75')  
        .mockReturnValueOnce('1000'); // Below minimum

      const appLogger1 = new LoggerService('Application', {}, mockConfigService1);
      expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 30000); // Default

      // Test maximum bound  
      (global.setInterval as jest.Mock).mockClear();
      const mockConfigService2 = createMockConfigService();
      mockConfigService2.get
        .mockReturnValueOnce('90')
        .mockReturnValueOnce('75')
        .mockReturnValueOnce('400000'); // Above maximum

      const appLogger2 = new LoggerService('Application', {}, mockConfigService2);
      expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 30000); // Default

      debugSpy.mockRestore();
    });
  });
});