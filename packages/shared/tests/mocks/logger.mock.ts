/**
 * Logger-specific mocks and utilities
 */

import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { 
  ILoggerService, 
  ILoggerFactory,
  type CustomLoggerOptions,
  PerformanceMetadata,
  MemoryUsage
} from '../../src/logger/interfaces/logger.interface';

// Mock LoggerService implementation
export const createMockLoggerService = (): DeepMockProxy<ILoggerService> => {
  const mockLogger = mockDeep<ILoggerService>();
  
  // Setup timing methods with realistic behavior
  const timers = new Map<string, number>();
  
  mockLogger.time.mockImplementation((label: string) => {
    timers.set(label, Date.now());
  });
  
  mockLogger.timeEnd.mockImplementation((label: string) => {
    const startTime = timers.get(label) || Date.now();
    const duration = Date.now() - startTime;
    timers.delete(label);
    return duration;
  });
  
  // Mock child logger creation
  mockLogger.child.mockImplementation(() => createMockLoggerService());
  
  // Mock async methods
  mockLogger.flush.mockResolvedValue(undefined);
  mockLogger.safeFlush.mockResolvedValue(undefined);
  
  return mockLogger;
};

// Mock LoggerFactory implementation
export const createMockLoggerFactory = (): DeepMockProxy<ILoggerFactory> => {
  const mockFactory = mockDeep<ILoggerFactory>();
  
  const loggers = new Map<string, ILoggerService>();
  
  mockFactory.createLogger.mockImplementation((serviceName: string) => {
    const existingLogger = loggers.get(serviceName);
    if (existingLogger) {
      return existingLogger as DeepMockProxy<ILoggerService>;
    }
    
    const newLogger = createMockLoggerService();
    loggers.set(serviceName, newLogger);
    return newLogger;
  });
  
  mockFactory.getAllLoggers.mockImplementation(() => {
    return Array.from(loggers.values()) as DeepMockProxy<ILoggerService>[];
  });
  
  mockFactory.flushAll.mockResolvedValue(undefined);
  
  mockFactory.clear.mockImplementation(() => {
    loggers.clear();
  });
  
  return mockFactory;
};

// Mock performance metadata
export const createMockPerformanceMetadata = (overrides: Partial<PerformanceMetadata> = {}): PerformanceMetadata => {
  return {
    operation: 'test-operation',
    duration: 100,
    context: 'test-context',
    timestamp: new Date().toISOString(),
    ...overrides
  };
};

// Mock memory usage
export const createMockMemoryUsage = (overrides: Partial<MemoryUsage> = {}): MemoryUsage => {
  return {
    used: 50 * 1024 * 1024, // 50MB
    total: 100 * 1024 * 1024, // 100MB
    percentage: 50,
    external: 5 * 1024 * 1024, // 5MB
    heapUsed: 45 * 1024 * 1024, // 45MB
    heapTotal: 95 * 1024 * 1024, // 95MB
    ...overrides
  };
};

// Mock CustomLoggerOptions
export const createMockLoggerOptions = (overrides: Partial<CustomLoggerOptions> = {}): CustomLoggerOptions => {
  return {
    serviceName: 'TestService',
    enableFileLogging: false,
    logLevel: 'debug',
    level: 'debug',
    silent: false,
    ...overrides
  };
};

// Helper to create logger with specific service name
export const createNamedMockLogger = (serviceName: string): DeepMockProxy<ILoggerService> => {
  const logger = createMockLoggerService();
  
  // Add service name context to all log calls
  const addServiceContext = (originalMethod: any) => {
    return (...args: any[]) => {
      const [message, context, metadata] = args;
      return originalMethod(message, context || serviceName, metadata);
    };
  };
  
  logger.info.mockImplementation(addServiceContext(logger.info));
  logger.error.mockImplementation(addServiceContext(logger.error));
  logger.warn.mockImplementation(addServiceContext(logger.warn));
  logger.debug.mockImplementation(addServiceContext(logger.debug));
  logger.verbose.mockImplementation(addServiceContext(logger.verbose));
  
  return logger;
};

// Type exports for better TypeScript support
export type MockLoggerService = DeepMockProxy<ILoggerService>;
export type MockLoggerFactory = DeepMockProxy<ILoggerFactory>;