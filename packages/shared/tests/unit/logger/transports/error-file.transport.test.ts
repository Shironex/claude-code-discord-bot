/**
 * Tests for error-file.transport.ts - Error file transport configuration
 */

import { errorFileTransport } from '../../../../src/logger/transports/error-file.transport';
import { fileFormatter } from '../../../../src/logger/formatters/file.formatter';
import { transports } from 'winston';
// Using standard Jest mocks with proper typing

// Mock winston with format to avoid import issues
jest.mock('winston', () => ({
  transports: {
    File: jest.fn().mockImplementation(function(this: any, options: any) {
      this.filename = options.filename;
      this.level = options.level;
      this.format = options.format;
      this.handleExceptions = options.handleExceptions;
      this.handleRejections = options.handleRejections;
      this.maxsize = options.maxsize;
      this.maxFiles = options.maxFiles;
      this.tailable = options.tailable;
      return this;
    })
  },
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    printf: jest.fn()
  }
}));

// Mock file formatter
jest.mock('../../../../src/logger/formatters/file.formatter');

describe('Error File Transport', () => {
  let mockFileFormatter: jest.MockedFunction<typeof fileFormatter>;
  let MockFileTransport: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFileFormatter = jest.mocked(fileFormatter);
    MockFileTransport = jest.mocked(transports.File);
    
    // Mock formatter return value
    const mockFormatterReturn = { transform: jest.fn() };
    mockFileFormatter.mockReturnValue(mockFormatterReturn as any);
  });

  describe('Basic Functionality', () => {
    it('should create error file transport with default configuration', () => {
      const transport = errorFileTransport();
      
      expect(MockFileTransport).toHaveBeenCalledWith({
        filename: 'logs/error.log',
        level: 'error',
        format: expect.any(Object),
        handleExceptions: false,
        handleRejections: false,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
      });
      
      expect(mockFileFormatter).toHaveBeenCalledWith();
      expect(transport).toBeInstanceOf(MockFileTransport);
    });

    it('should create error file transport with exception handling enabled', () => {
      const transport = errorFileTransport(true);
      
      expect(MockFileTransport).toHaveBeenCalledWith({
        filename: 'logs/error.log',
        level: 'error',
        format: expect.any(Object),
        handleExceptions: true,
        handleRejections: true,
        maxsize: 5242880,
        maxFiles: 5,
        tailable: true
      });
    });

    it('should create error file transport with exception handling disabled explicitly', () => {
      const transport = errorFileTransport(false);
      
      expect(MockFileTransport).toHaveBeenCalledWith({
        filename: 'logs/error.log',
        level: 'error',
        format: expect.any(Object),
        handleExceptions: false,
        handleRejections: false,
        maxsize: 5242880,
        maxFiles: 5,
        tailable: true
      });
    });
  });

  describe('File Configuration', () => {
    it('should use correct error log filename', () => {
      errorFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0];
      expect(callArgs.filename).toBe('logs/error.log');
    });

    it('should set level to error only', () => {
      errorFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0];
      expect(callArgs.level).toBe('error');
    });

    it('should configure file rotation settings', () => {
      errorFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0];
      expect(callArgs.maxsize).toBe(5242880); // 5MB
      expect(callArgs.maxFiles).toBe(5);
      expect(callArgs.tailable).toBe(true);
    });

    it('should use file formatter', () => {
      errorFileTransport();
      
      expect(mockFileFormatter).toHaveBeenCalledWith();
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0];
      expect(callArgs.format).toBeDefined();
    });
  });

  describe('Exception Handling Configuration', () => {
    it('should handle exception configuration consistently', () => {
      // Test enabled
      errorFileTransport(true);
      let callArgs = MockFileTransport.mock.calls[0]?.[0];
      expect(callArgs.handleExceptions).toBe(true);
      expect(callArgs.handleRejections).toBe(true);
      
      jest.clearAllMocks();
      
      // Test disabled
      errorFileTransport(false);
      callArgs = MockFileTransport.mock.calls[0]?.[0];
      expect(callArgs.handleExceptions).toBe(false);
      expect(callArgs.handleRejections).toBe(false);
    });

    it('should use same value for both exceptions and rejections', () => {
      const transport = errorFileTransport(true);
      const callArgs = MockFileTransport.mock.calls[0]?.[0];
      
      expect(callArgs.handleExceptions).toBe(callArgs.handleRejections);
    });
  });

  describe('Error Handling', () => {
    it('should handle formatter creation failure', () => {
      mockFileFormatter.mockImplementation(() => {
        throw new Error('Formatter creation failed');
      });

      expect(() => errorFileTransport()).toThrow('Formatter creation failed');
    });

    it('should handle transport construction failure', () => {
      MockFileTransport.mockImplementation(() => {
        throw new Error('Transport creation failed');
      });

      expect(() => errorFileTransport()).toThrow('Transport creation failed');
    });
  });

  describe('Integration', () => {
    it('should pass formatter result to transport', () => {
      const mockFormatter = { transform: jest.fn() };
      mockFileFormatter.mockReturnValue(mockFormatter as any);
      
      errorFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0];
      expect(callArgs.format).toBe(mockFormatter);
    });

    it('should create multiple transports with different configurations', () => {
      const transport1 = errorFileTransport(true);
      const transport2 = errorFileTransport(false);
      
      expect(MockFileTransport).toHaveBeenCalledTimes(2);
      expect(mockFileFormatter).toHaveBeenCalledTimes(2);
      
      expect(transport1).toBeInstanceOf(MockFileTransport);
      expect(transport2).toBeInstanceOf(MockFileTransport);
    });
  });

  describe('Configuration Validation', () => {
    it('should ensure all required file options are set', () => {
      errorFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0];
      expect(callArgs).toHaveProperty('filename');
      expect(callArgs).toHaveProperty('level');
      expect(callArgs).toHaveProperty('format');
      expect(callArgs).toHaveProperty('maxsize');
      expect(callArgs).toHaveProperty('maxFiles');
      expect(callArgs).toHaveProperty('tailable');
    });

    it('should use consistent boolean values', () => {
      errorFileTransport(true);
      const callArgs = MockFileTransport.mock.calls[0]?.[0];
      
      expect(typeof callArgs.handleExceptions).toBe('boolean');
      expect(typeof callArgs.handleRejections).toBe('boolean');
      expect(typeof callArgs.tailable).toBe('boolean');
    });

    it('should use consistent numeric values for file rotation', () => {
      errorFileTransport();
      const callArgs = MockFileTransport.mock.calls[0]?.[0];
      
      expect(typeof callArgs.maxsize).toBe('number');
      expect(typeof callArgs.maxFiles).toBe('number');
      expect(callArgs.maxsize).toBeGreaterThan(0);
      expect(callArgs.maxFiles).toBeGreaterThan(0);
    });
  });

  describe('File Path Structure', () => {
    it('should use logs directory structure', () => {
      errorFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0];
      expect(callArgs.filename).toMatch(/^logs\//);
    });

    it('should use appropriate file extension', () => {
      errorFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0];
      expect(callArgs.filename).toMatch(/\.log$/);
    });

    it('should include error in filename for clarity', () => {
      errorFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0];
      expect(callArgs.filename).toContain('error');
    });
  });
});