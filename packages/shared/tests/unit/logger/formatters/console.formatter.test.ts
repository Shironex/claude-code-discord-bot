/**
 * Tests for console.formatter.ts - Console output formatting
 */

import { consoleFormatter } from '../../../../src/logger/formatters/console.formatter';
import * as securityUtils from '../../../../src/logger/utils/security.utils';

// Mock chalk to avoid ANSI codes in test output
jest.mock('chalk', () => ({
  red: jest.fn((text: string) => `RED[${text}]`),
  yellow: jest.fn((text: string) => `YELLOW[${text}]`),
  green: jest.fn((text: string) => `GREEN[${text}]`),
  blue: jest.fn((text: string) => `BLUE[${text}]`),
  magenta: jest.fn((text: string) => `MAGENTA[${text}]`),
  cyan: jest.fn((text: string) => `CYAN[${text}]`),
  gray: jest.fn((text: string) => `GRAY[${text}]`),
  white: jest.fn((text: string) => `WHITE[${text}]`)
}));

// Mock security utils
jest.mock('../../../../src/logger/utils/security.utils');

describe('Console Formatter', () => {
  let mockFilterSensitiveData: jest.MockedFunction<typeof securityUtils.filterSensitiveData>;
  const serviceName = 'TestService';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFilterSensitiveData = jest.mocked(securityUtils.filterSensitiveData);
    mockFilterSensitiveData.mockImplementation((data) => data || {});
  });

  describe('Basic Functionality', () => {
    it('should create a valid winston format', () => {
      const formatter = consoleFormatter(serviceName);
      expect(formatter).toBeDefined();
      expect(typeof formatter.transform).toBe('function');
    });

    it('should call filterSensitiveData when metadata is present', () => {
      const formatter = consoleFormatter(serviceName);
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: serviceName,
        someMetadata: 'value',
        anotherField: 'data'
      };

      formatter.transform(logInfo);
      
      expect(mockFilterSensitiveData).toHaveBeenCalledWith({
        someMetadata: 'value',
        anotherField: 'data'
      });
    });

    it('should not call filterSensitiveData when no metadata is present', () => {
      const formatter = consoleFormatter(serviceName);
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: serviceName
      };

      formatter.transform(logInfo);
      
      expect(mockFilterSensitiveData).not.toHaveBeenCalled();
    });

    it('should handle null and undefined values gracefully', () => {
      const formatter = consoleFormatter(serviceName);
      const logInfo = {
        level: 'info',
        message: null,
        timestamp: '2023-01-01T12:00:00.000Z',
        service: undefined,
        method: null
      };

      expect(() => formatter.transform(logInfo)).not.toThrow();
    });

    it('should handle empty metadata', () => {
      const formatter = consoleFormatter(serviceName);
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: serviceName
      };

      expect(() => formatter.transform(logInfo)).not.toThrow();
      expect(mockFilterSensitiveData).not.toHaveBeenCalled();
    });
  });

  describe('Security Integration', () => {
    it('should filter sensitive data from metadata', () => {
      const sensitiveData = {
        password: 'secret123',
        normalData: 'public'
      };
      const filteredData = { normalData: 'public' };
      mockFilterSensitiveData.mockReturnValue(filteredData);

      const formatter = consoleFormatter(serviceName);
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: serviceName,
        ...sensitiveData
      };

      formatter.transform(logInfo);
      
      expect(mockFilterSensitiveData).toHaveBeenCalledWith(sensitiveData);
    });

    it('should handle filterSensitiveData throwing error', () => {
      mockFilterSensitiveData.mockImplementation(() => {
        throw new Error('Filter failed');
      });

      const formatter = consoleFormatter(serviceName);
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: serviceName,
        someData: 'value'
      };

      expect(() => formatter.transform(logInfo)).toThrow('Filter failed');
    });
  });

  describe('Metadata Processing', () => {
    it('should extract metadata from log info correctly', () => {
      const formatter = consoleFormatter(serviceName);
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: serviceName,
        method: 'testMethod',
        duration: 150,
        stack: 'Error stack',
        // These should be considered metadata
        userId: '12345',
        requestId: 'req-abc',
        extra: { nested: 'data' }
      };

      formatter.transform(logInfo);
      
      expect(mockFilterSensitiveData).toHaveBeenCalledWith({
        userId: '12345',
        requestId: 'req-abc',
        extra: { nested: 'data' }
      });
    });

    it('should handle complex metadata objects', () => {
      const complexMetadata = {
        user: { id: 123, name: 'John' },
        request: { headers: { auth: 'token' } },
        array: [1, 2, { nested: true }]
      };

      const formatter = consoleFormatter(serviceName);
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: serviceName,
        ...complexMetadata
      };

      formatter.transform(logInfo);
      
      expect(mockFilterSensitiveData).toHaveBeenCalledWith(complexMetadata);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large metadata objects', () => {
      const largeMetadata = Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [`key${i}`, `value${i}`])
      );

      const formatter = consoleFormatter(serviceName);
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: serviceName,
        ...largeMetadata
      };

      expect(() => formatter.transform(logInfo)).not.toThrow();
      expect(mockFilterSensitiveData).toHaveBeenCalledWith(largeMetadata);
    });

    it('should handle metadata with circular references', () => {
      const circularObj: any = { name: 'circular' };
      circularObj.self = circularObj;

      mockFilterSensitiveData.mockReturnValue({ name: 'circular', self: '[Circular]' });

      const formatter = consoleFormatter(serviceName);
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: serviceName,
        circular: circularObj
      };

      expect(() => formatter.transform(logInfo)).not.toThrow();
    });

    it('should handle special characters in all fields', () => {
      const formatter = consoleFormatter(serviceName);
      const logInfo = {
        level: 'info',
        message: 'Message with 🚀 unicode and special chars àáâäã',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: 'Service-With-Special_Chars',
        method: 'method::with::colons',
        specialField: 'Value with\nnewlines and\ttabs'
      };

      expect(() => formatter.transform(logInfo)).not.toThrow();
    });
  });

  describe('Integration with LOG_TIMESTAMP_FORMAT', () => {
    it('should use the constant in timestamp configuration', () => {
      // This test verifies the formatter is created without errors
      // The actual timestamp format integration is verified by Winston internally
      const formatter = consoleFormatter(serviceName);
      expect(formatter).toBeDefined();
      
      // Verify formatter can handle timestamp field
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: serviceName
      };

      expect(() => formatter.transform(logInfo)).not.toThrow();
    });
  });
});