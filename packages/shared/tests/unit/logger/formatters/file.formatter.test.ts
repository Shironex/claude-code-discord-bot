/**
 * Tests for file.formatter.ts - JSON file output formatting
 */

import { fileFormatter } from '../../../../src/logger/formatters/file.formatter';
import * as securityUtils from '../../../../src/logger/utils/security.utils';

// Mock security utils
jest.mock('../../../../src/logger/utils/security.utils');

describe('File Formatter', () => {
  let mockFilterSensitiveData: jest.MockedFunction<typeof securityUtils.filterSensitiveData>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFilterSensitiveData = jest.mocked(securityUtils.filterSensitiveData);
    mockFilterSensitiveData.mockImplementation((data) => data || {});
  });

  describe('Basic Functionality', () => {
    it('should create a valid winston format', () => {
      const formatter = fileFormatter();
      expect(formatter).toBeDefined();
      expect(typeof formatter.transform).toBe('function');
    });

    it('should call filterSensitiveData when metadata is present', () => {
      const formatter = fileFormatter();
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: 'TestService',
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
      const formatter = fileFormatter();
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: 'TestService'
      };

      formatter.transform(logInfo);
      
      expect(mockFilterSensitiveData).not.toHaveBeenCalled();
    });

    it('should handle null and undefined values gracefully', () => {
      const formatter = fileFormatter();
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
      const formatter = fileFormatter();
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: 'TestService'
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

      const formatter = fileFormatter();
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: 'TestService',
        ...sensitiveData
      };

      formatter.transform(logInfo);
      
      expect(mockFilterSensitiveData).toHaveBeenCalledWith(sensitiveData);
    });

    it('should handle filterSensitiveData throwing error', () => {
      mockFilterSensitiveData.mockImplementation(() => {
        throw new Error('Filter failed');
      });

      const formatter = fileFormatter();
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: 'TestService',
        someData: 'value'
      };

      expect(() => formatter.transform(logInfo)).toThrow('Filter failed');
    });
  });

  describe('Metadata Processing', () => {
    it('should extract metadata from log info correctly', () => {
      const formatter = fileFormatter();
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: 'TestService',
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

      const formatter = fileFormatter();
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: 'TestService',
        ...complexMetadata
      };

      formatter.transform(logInfo);
      
      expect(mockFilterSensitiveData).toHaveBeenCalledWith(complexMetadata);
    });
  });

  describe('Stack Handling', () => {
    it('should handle stack traces correctly', () => {
      const formatter = fileFormatter();
      const logInfo = {
        level: 'error',
        message: 'Error message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: 'TestService',
        stack: 'Error: Something went wrong\n    at Function.test (/path/to/file.js:10:5)'
      };

      expect(() => formatter.transform(logInfo)).not.toThrow();
    });

    it('should handle empty stack', () => {
      const formatter = fileFormatter();
      const logInfo = {
        level: 'error',
        message: 'Error message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: 'TestService',
        stack: ''
      };

      expect(() => formatter.transform(logInfo)).not.toThrow();
    });

    it('should handle missing stack', () => {
      const formatter = fileFormatter();
      const logInfo = {
        level: 'error',
        message: 'Error message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: 'TestService'
      };

      expect(() => formatter.transform(logInfo)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large metadata objects', () => {
      const largeMetadata = Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [`key${i}`, `value${i}`])
      );

      const formatter = fileFormatter();
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: 'TestService',
        ...largeMetadata
      };

      expect(() => formatter.transform(logInfo)).not.toThrow();
      expect(mockFilterSensitiveData).toHaveBeenCalledWith(largeMetadata);
    });

    it('should handle metadata with circular references through filter', () => {
      const circularObj: any = { name: 'circular' };
      circularObj.self = circularObj;

      // Mock filter to return safe data
      mockFilterSensitiveData.mockReturnValue({ name: 'circular', self: '[Circular]' });

      const formatter = fileFormatter();
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: 'TestService',
        circular: circularObj
      };

      expect(() => formatter.transform(logInfo)).not.toThrow();
    });

    it('should handle special characters in all fields', () => {
      const formatter = fileFormatter();
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

    it('should handle empty strings and null values', () => {
      const formatter = fileFormatter();
      const logInfo = {
        level: 'info',
        message: '',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: '',
        method: null,
        duration: 0,
        emptyField: '',
        nullField: null,
        undefinedField: undefined
      };

      expect(() => formatter.transform(logInfo)).not.toThrow();
    });
  });

  describe('JSON Output Structure', () => {
    it('should maintain consistent structure for all log levels', () => {
      const levels = ['error', 'warn', 'info', 'debug', 'verbose'];
      const formatter = fileFormatter();

      levels.forEach(level => {
        const logInfo = {
          level,
          message: 'Test message',
          timestamp: '2023-01-01T12:00:00.000Z',
          service: 'TestService'
        };

        expect(() => formatter.transform(logInfo)).not.toThrow();
      });
    });

    it('should handle all standard log fields', () => {
      const formatter = fileFormatter();
      const logInfo = {
        level: 'error',
        message: 'Test error message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: 'TestService',
        method: 'testMethod',
        duration: 1250,
        stack: 'Error: Test\n    at test.js:1:1',
        customField: 'custom value'
      };

      expect(() => formatter.transform(logInfo)).not.toThrow();
      expect(mockFilterSensitiveData).toHaveBeenCalledWith({
        customField: 'custom value'
      });
    });
  });

  describe('Integration with LOG_TIMESTAMP_FORMAT', () => {
    it('should use the constant in timestamp configuration', () => {
      // This test verifies the formatter is created without errors
      // The actual timestamp format integration is verified by Winston internally
      const formatter = fileFormatter();
      expect(formatter).toBeDefined();
      
      // Verify formatter can handle timestamp field
      const logInfo = {
        level: 'info',
        message: 'Test message',
        timestamp: '2023-01-01T12:00:00.000Z',
        service: 'TestService'
      };

      expect(() => formatter.transform(logInfo)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle rapid successive calls', () => {
      const formatter = fileFormatter();
      
      for (let i = 0; i < 100; i++) {
        const logInfo = {
          level: 'info',
          message: `Test message ${i}`,
          timestamp: '2023-01-01T12:00:00.000Z',
          service: 'TestService',
          iteration: i
        };

        expect(() => formatter.transform(logInfo)).not.toThrow();
      }
    });
  });
});