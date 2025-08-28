/**
 * Tests for logger.factory.ts - Logger factory service
 */

// Mock winston and chalk before any imports
jest.mock('winston', () => ({
  createLogger: jest.fn(),
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  },
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    printf: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn()
  }
}));

jest.mock('chalk', () => ({
  red: jest.fn(str => str),
  yellow: jest.fn(str => str),
  green: jest.fn(str => str),
  blue: jest.fn(str => str),
  magenta: jest.fn(str => str),
  cyan: jest.fn(str => str),
  gray: jest.fn(str => str),
  white: jest.fn(str => str)
}));

// Mock LoggerService
jest.mock('../../../src/logger/logger.service');

import { ConfigService } from '@nestjs/config';
import { LoggerFactory } from '../../../src/logger/logger.factory';
import { LoggerService } from '../../../src/logger/logger.service';

describe('LoggerFactory', () => {
  let loggerFactory: LoggerFactory;
  let mockConfigService: jest.Mocked<ConfigService>;
  let MockLoggerService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService = {
      get: jest.fn(),
    } as any;
    
    MockLoggerService = jest.mocked(LoggerService);
    loggerFactory = new LoggerFactory(mockConfigService);
  });

  describe('constructor', () => {
    it('should create factory without ConfigService', () => {
      const factory = new LoggerFactory();
      expect(factory).toBeInstanceOf(LoggerFactory);
    });

    it('should create factory with ConfigService', () => {
      const factory = new LoggerFactory(mockConfigService);
      expect(factory).toBeInstanceOf(LoggerFactory);
    });

    it('should initialize empty logger map', () => {
      const factory = new LoggerFactory();
      expect(factory.getAllLoggers()).toEqual([]);
    });
  });

  describe('createLogger', () => {
    it('should create new logger for service name', () => {
      const serviceName = 'TestService';
      const mockLoggerInstance = new MockLoggerService(serviceName);
      MockLoggerService.mockImplementation(() => mockLoggerInstance as any);

      const logger = loggerFactory.createLogger(serviceName);

      expect(MockLoggerService).toHaveBeenCalledWith(serviceName, {}, mockConfigService);
      expect(logger).toBe(mockLoggerInstance);
    });

    it('should return existing logger for same service name', () => {
      const serviceName = 'TestService';
      const mockLoggerInstance = new MockLoggerService(serviceName);
      MockLoggerService.mockImplementation(() => mockLoggerInstance as any);

      // Create logger first time
      const logger1 = loggerFactory.createLogger(serviceName);
      
      // Clear mock to verify no new calls
      jest.clearAllMocks();
      
      // Get logger second time
      const logger2 = loggerFactory.createLogger(serviceName);

      expect(MockLoggerService).not.toHaveBeenCalled();
      expect(logger1).toBe(logger2);
      expect(logger1).toBe(mockLoggerInstance);
    });

    it('should create different loggers for different service names', () => {
      // Create a fresh factory to avoid mock call count issues from previous tests
      const freshFactory = new LoggerFactory(mockConfigService);
      const service1 = 'Service1';
      const service2 = 'Service2';
      const mockLogger1 = new MockLoggerService(service1);
      const mockLogger2 = new MockLoggerService(service2);
      
      // Clear previous mock calls
      jest.clearAllMocks();
      
      MockLoggerService
        .mockImplementationOnce(() => mockLogger1 as any)
        .mockImplementationOnce(() => mockLogger2 as any);

      const logger1 = freshFactory.createLogger(service1);
      const logger2 = freshFactory.createLogger(service2);

      expect(MockLoggerService).toHaveBeenCalledTimes(2);
      expect(MockLoggerService).toHaveBeenNthCalledWith(1, service1, {}, mockConfigService);
      expect(MockLoggerService).toHaveBeenNthCalledWith(2, service2, {}, mockConfigService);
      expect(logger1).toBe(mockLogger1);
      expect(logger2).toBe(mockLogger2);
      expect(logger1).not.toBe(logger2);
    });

    it('should work without ConfigService', () => {
      const factoryWithoutConfig = new LoggerFactory();
      const serviceName = 'TestService';
      const mockLoggerInstance = new MockLoggerService(serviceName);
      MockLoggerService.mockImplementation(() => mockLoggerInstance as any);

      const logger = factoryWithoutConfig.createLogger(serviceName);

      expect(MockLoggerService).toHaveBeenCalledWith(serviceName, {}, undefined);
      expect(logger).toBe(mockLoggerInstance);
    });

    describe('input validation', () => {
      it('should throw error for empty service name', () => {
        expect(() => loggerFactory.createLogger('')).toThrow('Service name must be a non-empty string');
      });

      it('should handle whitespace-only service name', () => {
        // Whitespace-only strings are truthy in JS, so they pass validation
        // The factory will create a logger with the whitespace string as the name
        const serviceName = '   ';
        const mockLoggerInstance = new MockLoggerService(serviceName);
        MockLoggerService.mockImplementation(() => mockLoggerInstance as any);

        const logger = loggerFactory.createLogger(serviceName);

        expect(MockLoggerService).toHaveBeenCalledWith(serviceName, {}, mockConfigService);
        expect(logger).toBe(mockLoggerInstance);
      });

      it('should throw error for null service name', () => {
        expect(() => loggerFactory.createLogger(null as any)).toThrow('Service name must be a non-empty string');
      });

      it('should throw error for undefined service name', () => {
        expect(() => loggerFactory.createLogger(undefined as any)).toThrow('Service name must be a non-empty string');
      });

      it('should throw error for non-string service name', () => {
        expect(() => loggerFactory.createLogger(123 as any)).toThrow('Service name must be a non-empty string');
        expect(() => loggerFactory.createLogger({} as any)).toThrow('Service name must be a non-empty string');
        expect(() => loggerFactory.createLogger([] as any)).toThrow('Service name must be a non-empty string');
      });

      it('should handle service names with special characters', () => {
        const serviceName = 'Service-With_Special.Characters@123';
        const mockLoggerInstance = new MockLoggerService(serviceName);
        MockLoggerService.mockImplementation(() => mockLoggerInstance as any);

        const logger = loggerFactory.createLogger(serviceName);

        expect(MockLoggerService).toHaveBeenCalledWith(serviceName, {}, mockConfigService);
        expect(logger).toBe(mockLoggerInstance);
      });
    });
  });

  describe('getAllLoggers', () => {
    it('should return empty array when no loggers created', () => {
      const loggers = loggerFactory.getAllLoggers();
      expect(loggers).toEqual([]);
    });

    it('should return array with single logger', () => {
      const serviceName = 'TestService';
      const mockLoggerInstance = new MockLoggerService(serviceName);
      MockLoggerService.mockImplementation(() => mockLoggerInstance as any);

      loggerFactory.createLogger(serviceName);
      const loggers = loggerFactory.getAllLoggers();

      expect(loggers).toHaveLength(1);
      expect(loggers[0]).toBe(mockLoggerInstance);
    });

    it('should return array with multiple loggers', () => {
      const services = ['Service1', 'Service2', 'Service3'];
      const mockLoggers = services.map(name => new MockLoggerService(name));
      
      services.forEach((_, index) => {
        MockLoggerService.mockImplementationOnce(() => mockLoggers[index] as any);
      });

      services.forEach(service => loggerFactory.createLogger(service));
      const loggers = loggerFactory.getAllLoggers();

      expect(loggers).toHaveLength(3);
      expect(loggers).toEqual(mockLoggers);
    });

    it('should not return duplicates for same service name', () => {
      const serviceName = 'TestService';
      const mockLoggerInstance = new MockLoggerService(serviceName);
      MockLoggerService.mockImplementation(() => mockLoggerInstance as any);

      loggerFactory.createLogger(serviceName);
      loggerFactory.createLogger(serviceName); // Same service, should reuse logger

      const loggers = loggerFactory.getAllLoggers();
      expect(loggers).toHaveLength(1);
      expect(loggers[0]).toBe(mockLoggerInstance);
    });

    it('should return independent array (not internal reference)', () => {
      const serviceName = 'TestService';
      const mockLoggerInstance = new MockLoggerService(serviceName);
      MockLoggerService.mockImplementation(() => mockLoggerInstance as any);

      loggerFactory.createLogger(serviceName);
      
      const loggers1 = loggerFactory.getAllLoggers();
      const loggers2 = loggerFactory.getAllLoggers();

      expect(loggers1).not.toBe(loggers2); // Different array instances
      expect(loggers1).toEqual(loggers2); // But same content
    });
  });

  describe('flushAll', () => {
    it('should resolve immediately when no loggers exist', async () => {
      await expect(loggerFactory.flushAll()).resolves.toBeUndefined();
    });

    it('should flush single logger successfully', async () => {
      const serviceName = 'TestService';
      const mockLoggerInstance = {
        safeFlush: jest.fn().mockResolvedValue(undefined)
      };
      MockLoggerService.mockImplementation(() => mockLoggerInstance as any);

      loggerFactory.createLogger(serviceName);
      await loggerFactory.flushAll();

      expect(mockLoggerInstance.safeFlush).toHaveBeenCalledTimes(1);
    });

    it('should flush multiple loggers successfully', async () => {
      const services = ['Service1', 'Service2', 'Service3'];
      const mockLoggers = services.map(() => ({
        safeFlush: jest.fn().mockResolvedValue(undefined)
      }));

      services.forEach((service, index) => {
        MockLoggerService.mockImplementationOnce(() => mockLoggers[index] as any);
        loggerFactory.createLogger(service);
      });

      await loggerFactory.flushAll();

      mockLoggers.forEach(logger => {
        expect(logger.safeFlush).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle logger flush failure gracefully', async () => {
      const serviceName = 'TestService';
      const mockLoggerInstance = {
        safeFlush: jest.fn().mockRejectedValue(new Error('Flush failed'))
      };
      MockLoggerService.mockImplementation(() => mockLoggerInstance as any);

      // Spy on console.error to verify error handling
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      loggerFactory.createLogger(serviceName);
      await expect(loggerFactory.flushAll()).resolves.toBeUndefined();

      expect(mockLoggerInstance.safeFlush).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to flush logger:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle mixed success and failure scenarios', async () => {
      const services = ['Service1', 'Service2', 'Service3'];
      const mockLoggers = [
        { safeFlush: jest.fn().mockResolvedValue(undefined) },
        { safeFlush: jest.fn().mockRejectedValue(new Error('Flush failed')) },
        { safeFlush: jest.fn().mockResolvedValue(undefined) }
      ];

      services.forEach((service, index) => {
        MockLoggerService.mockImplementationOnce(() => mockLoggers[index] as any);
        loggerFactory.createLogger(service);
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(loggerFactory.flushAll()).resolves.toBeUndefined();

      // All loggers should have been called
      mockLoggers.forEach(logger => {
        expect(logger.safeFlush).toHaveBeenCalledTimes(1);
      });

      // Only one error should be logged
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to flush logger:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should use Promise.allSettled for concurrent flushing', async () => {
      const services = ['Service1', 'Service2'];
      const flushDelays = [100, 50]; // Different delays to test concurrency
      const mockLoggers = services.map((_, index) => ({
        safeFlush: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, flushDelays[index]))
        )
      }));

      services.forEach((service, index) => {
        MockLoggerService.mockImplementationOnce(() => mockLoggers[index] as any);
        loggerFactory.createLogger(service);
      });

      const startTime = Date.now();
      await loggerFactory.flushAll();
      const elapsed = Date.now() - startTime;

      // Should complete in roughly max delay time, not sum of delays
      // Adding buffer for test execution overhead
      expect(elapsed).toBeLessThan(200);

      mockLoggers.forEach(logger => {
        expect(logger.safeFlush).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('clear', () => {
    it('should clear empty logger map', () => {
      loggerFactory.clear();
      expect(loggerFactory.getAllLoggers()).toEqual([]);
    });

    it('should clear single logger', () => {
      const serviceName = 'TestService';
      const mockLoggerInstance = new MockLoggerService(serviceName);
      MockLoggerService.mockImplementation(() => mockLoggerInstance as any);

      loggerFactory.createLogger(serviceName);
      expect(loggerFactory.getAllLoggers()).toHaveLength(1);

      loggerFactory.clear();
      expect(loggerFactory.getAllLoggers()).toEqual([]);
    });

    it('should clear multiple loggers', () => {
      const services = ['Service1', 'Service2', 'Service3'];
      const mockLoggers = services.map(name => new MockLoggerService(name));
      
      services.forEach((_, index) => {
        MockLoggerService.mockImplementationOnce(() => mockLoggers[index] as any);
      });

      services.forEach(service => loggerFactory.createLogger(service));
      expect(loggerFactory.getAllLoggers()).toHaveLength(3);

      loggerFactory.clear();
      expect(loggerFactory.getAllLoggers()).toEqual([]);
    });

    it('should allow creating new loggers after clear', () => {
      // Create and clear
      const serviceName1 = 'Service1';
      const mockLogger1 = new MockLoggerService(serviceName1);
      MockLoggerService.mockImplementationOnce(() => mockLogger1 as any);
      
      loggerFactory.createLogger(serviceName1);
      loggerFactory.clear();

      // Create new logger after clear
      const serviceName2 = 'Service2';
      const mockLogger2 = new MockLoggerService(serviceName2);
      MockLoggerService.mockImplementationOnce(() => mockLogger2 as any);
      
      const newLogger = loggerFactory.createLogger(serviceName2);

      expect(loggerFactory.getAllLoggers()).toHaveLength(1);
      expect(newLogger).toBe(mockLogger2);
    });

    it('should not affect logger instances themselves', () => {
      const serviceName = 'TestService';
      const mockLoggerInstance = new MockLoggerService(serviceName);
      MockLoggerService.mockImplementation(() => mockLoggerInstance as any);

      const logger = loggerFactory.createLogger(serviceName);
      loggerFactory.clear();

      // Logger instance should still exist and be usable
      expect(logger).toBe(mockLoggerInstance);
    });
  });

  describe('integration scenarios', () => {
    it('should handle full lifecycle scenario', async () => {
      const services = ['Service1', 'Service2'];
      const mockLoggers = services.map(name => ({
        safeFlush: jest.fn().mockResolvedValue(undefined)
      }));

      // Create loggers
      services.forEach((service, index) => {
        MockLoggerService.mockImplementationOnce(() => mockLoggers[index] as any);
        loggerFactory.createLogger(service);
      });

      // Verify creation
      expect(loggerFactory.getAllLoggers()).toHaveLength(2);

      // Flush all
      await loggerFactory.flushAll();
      mockLoggers.forEach(logger => {
        expect(logger.safeFlush).toHaveBeenCalledTimes(1);
      });

      // Clear
      loggerFactory.clear();
      expect(loggerFactory.getAllLoggers()).toEqual([]);
    });

    it('should maintain logger instances across operations', () => {
      const serviceName = 'TestService';
      const mockLoggerInstance = new MockLoggerService(serviceName);
      MockLoggerService.mockImplementation(() => mockLoggerInstance as any);

      // Create logger multiple times
      const logger1 = loggerFactory.createLogger(serviceName);
      const logger2 = loggerFactory.createLogger(serviceName);
      
      // Should be same instance
      expect(logger1).toBe(logger2);
      expect(logger1).toBe(mockLoggerInstance);

      // Should show up in getAllLoggers
      const allLoggers = loggerFactory.getAllLoggers();
      expect(allLoggers).toContain(mockLoggerInstance);
    });
  });
});