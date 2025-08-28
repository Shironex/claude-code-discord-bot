/**
 * Tests for combined-file.transport.ts - Combined file transport configuration
 */

import { combinedFileTransport } from '../../../../src/logger/transports/combined-file.transport';
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

describe('Combined File Transport', () => {
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
    it('should create combined file transport with correct configuration', () => {
      const transport = combinedFileTransport();
      
      expect(MockFileTransport).toHaveBeenCalledWith({
        filename: 'logs/combined.log',
        format: expect.any(Object),
        maxsize: 5242880, // 5MB
        maxFiles: 10,
        tailable: true
      });
      
      expect(mockFileFormatter).toHaveBeenCalledWith();
      expect(transport).toBeInstanceOf(MockFileTransport);
    });

    it('should not set a specific log level (accepts all levels)', () => {
      combinedFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('level');
    });

    it('should not handle exceptions by default', () => {
      combinedFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('handleExceptions');
      expect(callArgs).not.toHaveProperty('handleRejections');
    });
  });

  describe('File Configuration', () => {
    it('should use correct combined log filename', () => {
      combinedFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0][0];
      expect(callArgs.filename).toBe('logs/combined.log');
    });

    it('should configure file rotation settings with larger capacity', () => {
      combinedFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0][0];
      expect(callArgs.maxsize).toBe(5242880); // 5MB - same as error log
      expect(callArgs.maxFiles).toBe(10); // More files than error log (10 vs 5)
      expect(callArgs.tailable).toBe(true);
    });

    it('should use file formatter', () => {
      combinedFileTransport();
      
      expect(mockFileFormatter).toHaveBeenCalledWith();
      
      const callArgs = MockFileTransport.mock.calls[0][0];
      expect(callArgs.format).toBeDefined();
    });

    it('should have higher max files than error transport for capacity', () => {
      combinedFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0][0];
      expect(callArgs.maxFiles).toBe(10);
      // Combined logs get more volume, so need more files
      expect(callArgs.maxFiles).toBeGreaterThan(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle formatter creation failure', () => {
      mockFileFormatter.mockImplementation(() => {
        throw new Error('Formatter creation failed');
      });

      expect(() => combinedFileTransport()).toThrow('Formatter creation failed');
    });

    it('should handle transport construction failure', () => {
      MockFileTransport.mockImplementation(() => {
        throw new Error('Transport creation failed');
      });

      expect(() => combinedFileTransport()).toThrow('Transport creation failed');
    });
  });

  describe('Integration', () => {
    it('should pass formatter result to transport', () => {
      const mockFormatter = { transform: jest.fn() };
      mockFileFormatter.mockReturnValue(mockFormatter as any);
      
      combinedFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0][0];
      expect(callArgs.format).toBe(mockFormatter);
    });

    it('should create multiple transports independently', () => {
      const transport1 = combinedFileTransport();
      const transport2 = combinedFileTransport();
      
      expect(MockFileTransport).toHaveBeenCalledTimes(2);
      expect(mockFileFormatter).toHaveBeenCalledTimes(2);
      
      expect(transport1).toBeInstanceOf(MockFileTransport);
      expect(transport2).toBeInstanceOf(MockFileTransport);
    });
  });

  describe('Configuration Validation', () => {
    it('should ensure all required file options are set', () => {
      combinedFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0][0];
      expect(callArgs).toHaveProperty('filename');
      expect(callArgs).toHaveProperty('format');
      expect(callArgs).toHaveProperty('maxsize');
      expect(callArgs).toHaveProperty('maxFiles');
      expect(callArgs).toHaveProperty('tailable');
    });

    it('should use consistent boolean and numeric values', () => {
      combinedFileTransport();
      const callArgs = MockFileTransport.mock.calls[0][0];
      
      expect(typeof callArgs.tailable).toBe('boolean');
      expect(typeof callArgs.maxsize).toBe('number');
      expect(typeof callArgs.maxFiles).toBe('number');
      expect(callArgs.maxsize).toBeGreaterThan(0);
      expect(callArgs.maxFiles).toBeGreaterThan(0);
    });

    it('should not include level restrictions', () => {
      combinedFileTransport();
      const callArgs = MockFileTransport.mock.calls[0][0];
      
      // Combined transport should accept all log levels
      expect(callArgs.level).toBeUndefined();
    });
  });

  describe('File Path Structure', () => {
    it('should use logs directory structure', () => {
      combinedFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0][0];
      expect(callArgs.filename).toMatch(/^logs\//);
    });

    it('should use appropriate file extension', () => {
      combinedFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0][0];
      expect(callArgs.filename).toMatch(/\.log$/);
    });

    it('should include combined in filename for clarity', () => {
      combinedFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0][0];
      expect(callArgs.filename).toContain('combined');
    });
  });

  describe('No Parameters Function', () => {
    it('should be callable without any parameters', () => {
      expect(() => combinedFileTransport()).not.toThrow();
    });

    it('should work with function call syntax variations', () => {
      // Direct call
      const transport1 = combinedFileTransport();
      expect(transport1).toBeInstanceOf(MockFileTransport);
      
      jest.clearAllMocks();
      
      // Variable assignment then call
      const createTransport = combinedFileTransport;
      const transport2 = createTransport();
      expect(transport2).toBeInstanceOf(MockFileTransport);
    });
  });

  describe('Comparison with Error Transport', () => {
    it('should have different filename than error transport', () => {
      combinedFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0][0];
      expect(callArgs.filename).not.toContain('error');
      expect(callArgs.filename).toContain('combined');
    });

    it('should not set error-only level like error transport', () => {
      combinedFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0][0];
      expect(callArgs.level).toBeUndefined();
    });

    it('should have more max files than error transport for higher volume', () => {
      combinedFileTransport();
      
      const callArgs = MockFileTransport.mock.calls[0][0];
      expect(callArgs.maxFiles).toBe(10);
      // Error transport typically uses 5, combined uses 10
    });
  });
});