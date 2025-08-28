/**
 * Winston logger mocks using jest-mock-extended for type safety
 */

import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import * as winston from 'winston';

// Mock Winston logger with all methods
export const createMockWinstonLogger = (): DeepMockProxy<winston.Logger> => {
  const mockLogger = mockDeep<winston.Logger>();
  
  // Setup default implementations for common methods
  mockLogger.info.mockReturnValue(mockLogger);
  mockLogger.error.mockReturnValue(mockLogger);
  mockLogger.warn.mockReturnValue(mockLogger);
  mockLogger.debug.mockReturnValue(mockLogger);
  mockLogger.verbose.mockReturnValue(mockLogger);
  mockLogger.log.mockReturnValue(mockLogger);
  
  // Child logger returns another mock
  mockLogger.child.mockReturnValue(mockDeep<winston.Logger>());
  
  // Format methods
  (mockLogger as any).format = winston.format;
  
  // Transport methods
  mockLogger.add.mockReturnValue(mockLogger);
  mockLogger.remove.mockReturnValue(mockLogger);
  mockLogger.clear.mockReturnValue(mockLogger);
  
  // Stream methods
  mockLogger.stream.mockReturnValue({} as any);
  
  // Promise-based methods - ensure they resolve immediately
  (mockLogger.close as any).mockImplementation(() => Promise.resolve(undefined));
  (mockLogger.end as any).mockImplementation((callback?: () => void) => {
    if (callback) {
      // Call callback immediately to simulate successful end
      setTimeout(callback, 0);
    }
    return mockLogger;
  });
  
  return mockLogger;
};

// Mock Winston transport
export const createMockWinstonTransport = (): DeepMockProxy<winston.transport> => {
  const mockTransport = mockDeep<winston.transport>();
  
  (mockTransport.log as any).mockImplementation((info: any, callback?: any) => {
    if (callback) callback();
    return true;
  });
  
  (mockTransport.close as any)?.mockResolvedValue?.(undefined);
  
  return mockTransport;
};


// Type-safe mock for winston logger creation
export type MockWinstonLogger = DeepMockProxy<winston.Logger>;
export type MockWinstonTransport = DeepMockProxy<winston.transport>;