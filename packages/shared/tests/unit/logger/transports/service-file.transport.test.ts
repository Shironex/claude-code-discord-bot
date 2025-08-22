/**
 * Tests for service-file.transport.ts - Service-specific file transport configuration
 */

import { createServiceFileTransport } from '../../../../src/logger/transports/service-file.transport';
import { fileFormatter } from '../../../../src/logger/formatters/file.formatter';
import { sanitizeServiceName } from '../../../../src/logger/utils/security.utils';
import { transports } from 'winston';
// Using standard Jest mocks with proper typing

// Mock winston with format to avoid import issues
jest.mock('winston', () => ({
  transports: {
    File: jest.fn().mockImplementation(function(this: any, options: any) {
      this.filename = options.filename;
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

// Mock security utils
jest.mock('../../../../src/logger/utils/security.utils');

describe('Service File Transport', () => {
  let mockFileFormatter: jest.MockedFunction<typeof fileFormatter>;
  let mockSanitizeServiceName: jest.MockedFunction<typeof sanitizeServiceName>;
  let MockFileTransport: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFileFormatter = jest.mocked(fileFormatter);
    mockSanitizeServiceName = jest.mocked(sanitizeServiceName);
    MockFileTransport = jest.mocked(transports.File);
    
    // Mock formatter return value
    const mockFormatterReturn = { transform: jest.fn() };
    mockFileFormatter.mockReturnValue(mockFormatterReturn as any);
    
    // Mock sanitizer to return cleaned service name
    mockSanitizeServiceName.mockImplementation((name) => name.toLowerCase().replace(/[^a-z0-9]/g, '_'));
  });

  describe('Basic Functionality', () => {
    it('should create service file transport with sanitized filename', () => {
      const serviceName = 'TestService';
      const sanitizedName = 'testservice';
      mockSanitizeServiceName.mockReturnValue(sanitizedName);
      
      const transport = createServiceFileTransport(serviceName);
      
      expect(mockSanitizeServiceName).toHaveBeenCalledWith(serviceName);
      expect(MockFileTransport).toHaveBeenCalledWith({
        filename: `logs/services/${sanitizedName}.log`,
        format: expect.any(Object),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
      });
      
      expect(mockFileFormatter).toHaveBeenCalledWith();
      expect(transport).toBeInstanceOf(MockFileTransport);
    });

    it('should not set a specific log level (accepts all levels)', () => {
      const serviceName = 'TestService';
      mockSanitizeServiceName.mockReturnValue('testservice');
      
      createServiceFileTransport(serviceName);
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0]!;
      expect(callArgs).not.toHaveProperty('level');
    });

    it('should not handle exceptions by default', () => {
      const serviceName = 'TestService';
      mockSanitizeServiceName.mockReturnValue('testservice');
      
      createServiceFileTransport(serviceName);
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0]!;
      expect(callArgs).not.toHaveProperty('handleExceptions');
      expect(callArgs).not.toHaveProperty('handleRejections');
    });
  });

  describe('Service Name Sanitization', () => {
    it('should sanitize service name for filename', () => {
      const serviceName = 'Complex-Service_Name!@#';
      const sanitizedName = 'complex_service_name';
      mockSanitizeServiceName.mockReturnValue(sanitizedName);
      
      createServiceFileTransport(serviceName);
      
      expect(mockSanitizeServiceName).toHaveBeenCalledWith(serviceName);
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0];
      expect(callArgs?.filename).toBe(`logs/services/${sanitizedName}.log`);
    });

    it('should handle various service name formats', () => {
      const testCases = [
        { input: 'SimpleService', expected: 'simpleservice' },
        { input: 'Complex-Service_Name', expected: 'complex_service_name' },
        { input: 'SERVICE123', expected: 'service123' },
        { input: 'service.with.dots', expected: 'service_with_dots' },
        { input: 'Service With Spaces', expected: 'service_with_spaces' }
      ];

      testCases.forEach(({ input, expected }) => {
        jest.clearAllMocks();
        mockSanitizeServiceName.mockReturnValue(expected);
        
        createServiceFileTransport(input);
        
        expect(mockSanitizeServiceName).toHaveBeenCalledWith(input);
        
        const callArgs = MockFileTransport.mock.calls[0]?.[0];
        expect(callArgs?.filename).toBe(`logs/services/${expected}.log`);
      });
    });

    it('should handle edge cases in service names', () => {
      const edgeCases = [
        { input: '', expected: 'unknown' },
        { input: '   ', expected: 'unknown' },
        { input: '!@#$%^&*()', expected: 'special_chars' }
      ];

      edgeCases.forEach(({ input, expected }) => {
        jest.clearAllMocks();
        mockSanitizeServiceName.mockReturnValue(expected);
        
        createServiceFileTransport(input);
        
        expect(mockSanitizeServiceName).toHaveBeenCalledWith(input);
        
        const callArgs = MockFileTransport.mock.calls[0]?.[0];
        expect(callArgs?.filename).toBe(`logs/services/${expected}.log`);
      });
    });
  });

  describe('File Configuration', () => {
    it('should use service-specific directory structure', () => {
      const serviceName = 'TestService';
      const sanitizedName = 'testservice';
      mockSanitizeServiceName.mockReturnValue(sanitizedName);
      
      createServiceFileTransport(serviceName);
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0]!;
      expect(callArgs?.filename).toMatch(/^logs\/services\//);
      expect(callArgs?.filename).toBe(`logs/services/${sanitizedName}.log`);
    });

    it('should configure file rotation settings', () => {
      const serviceName = 'TestService';
      mockSanitizeServiceName.mockReturnValue('testservice');
      
      createServiceFileTransport(serviceName);
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0];
      expect(callArgs?.maxsize).toBe(5242880); // 5MB
      expect(callArgs?.maxFiles).toBe(5);
      expect(callArgs?.tailable).toBe(true);
    });

    it('should use file formatter', () => {
      const serviceName = 'TestService';
      mockSanitizeServiceName.mockReturnValue('testservice');
      
      createServiceFileTransport(serviceName);
      
      expect(mockFileFormatter).toHaveBeenCalledWith();
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0]!;
      expect(callArgs?.format).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle sanitizeServiceName throwing error', () => {
      const serviceName = 'TestService';
      mockSanitizeServiceName.mockImplementation(() => {
        throw new Error('Sanitization failed');
      });

      expect(() => createServiceFileTransport(serviceName)).toThrow('Sanitization failed');
    });

    it('should handle formatter creation failure', () => {
      const serviceName = 'TestService';
      mockSanitizeServiceName.mockReturnValue('testservice');
      mockFileFormatter.mockImplementation(() => {
        throw new Error('Formatter creation failed');
      });

      expect(() => createServiceFileTransport(serviceName)).toThrow('Formatter creation failed');
    });

    it('should handle transport construction failure', () => {
      const serviceName = 'TestService';
      mockSanitizeServiceName.mockReturnValue('testservice');
      MockFileTransport.mockImplementation(() => {
        throw new Error('Transport creation failed');
      });

      expect(() => createServiceFileTransport(serviceName)).toThrow('Transport creation failed');
    });
  });

  describe('Integration', () => {
    it('should pass formatter result to transport', () => {
      const serviceName = 'TestService';
      const sanitizedName = 'testservice';
      mockSanitizeServiceName.mockReturnValue(sanitizedName);
      
      const mockFormatter = { transform: jest.fn() };
      mockFileFormatter.mockReturnValue(mockFormatter as any);
      
      createServiceFileTransport(serviceName);
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0]!;
      expect(callArgs?.format).toBe(mockFormatter);
    });

    it('should create multiple transports for different services', () => {
      const services = ['Service1', 'Service2', 'Service3'];
      const sanitized = ['service1', 'service2', 'service3'];
      
      services.forEach((service, index) => {
        mockSanitizeServiceName.mockReturnValueOnce(sanitized[index]);
      });
      
      const transports = services.map(service => createServiceFileTransport(service));
      
      expect(MockFileTransport).toHaveBeenCalledTimes(3);
      expect(mockFileFormatter).toHaveBeenCalledTimes(3);
      expect(mockSanitizeServiceName).toHaveBeenCalledTimes(3);
      
      transports.forEach(transport => {
        expect(transport).toBeInstanceOf(MockFileTransport);
      });
      
      // Verify different filenames
      const callArgs = MockFileTransport.mock.calls;
      expect(callArgs[0][0].filename).toBe('logs/services/service1.log');
      expect(callArgs[1][0].filename).toBe('logs/services/service2.log');
      expect(callArgs[2][0].filename).toBe('logs/services/service3.log');
    });
  });

  describe('Configuration Validation', () => {
    it('should ensure all required file options are set', () => {
      const serviceName = 'TestService';
      mockSanitizeServiceName.mockReturnValue('testservice');
      
      createServiceFileTransport(serviceName);
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0]!;
      expect(callArgs).toHaveProperty('filename');
      expect(callArgs).toHaveProperty('format');
      expect(callArgs).toHaveProperty('maxsize');
      expect(callArgs).toHaveProperty('maxFiles');
      expect(callArgs).toHaveProperty('tailable');
    });

    it('should use consistent boolean and numeric values', () => {
      const serviceName = 'TestService';
      mockSanitizeServiceName.mockReturnValue('testservice');
      
      createServiceFileTransport(serviceName);
      const callArgs = MockFileTransport.mock.calls[0]?.[0]!;
      
      expect(typeof callArgs?.tailable).toBe('boolean');
      expect(typeof callArgs?.maxsize).toBe('number');
      expect(typeof callArgs?.maxFiles).toBe('number');
      expect(callArgs?.maxsize).toBeGreaterThan(0);
      expect(callArgs?.maxFiles).toBeGreaterThan(0);
    });

    it('should not include level restrictions', () => {
      const serviceName = 'TestService';
      mockSanitizeServiceName.mockReturnValue('testservice');
      
      createServiceFileTransport(serviceName);
      const callArgs = MockFileTransport.mock.calls[0]?.[0]!;
      
      // Service transport should accept all log levels
      expect(callArgs?.level).toBeUndefined();
    });
  });

  describe('File Path Structure', () => {
    it('should use proper directory structure for services', () => {
      const serviceName = 'TestService';
      const sanitizedName = 'testservice';
      mockSanitizeServiceName.mockReturnValue(sanitizedName);
      
      createServiceFileTransport(serviceName);
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0]!;
      expect(callArgs?.filename).toMatch(/^logs\/services\//);
    });

    it('should use appropriate file extension', () => {
      const serviceName = 'TestService';
      mockSanitizeServiceName.mockReturnValue('testservice');
      
      createServiceFileTransport(serviceName);
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0]!;
      expect(callArgs?.filename).toMatch(/\.log$/);
    });

    it('should include sanitized service name in filename', () => {
      const serviceName = 'TestService';
      const sanitizedName = 'testservice';
      mockSanitizeServiceName.mockReturnValue(sanitizedName);
      
      createServiceFileTransport(serviceName);
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0]!;
      expect(callArgs?.filename).toContain(sanitizedName);
    });
  });

  describe('Security Integration', () => {
    it('should always sanitize service name before using in filename', () => {
      const maliciousName = '../../../etc/passwd';
      const safeName = 'safe_name';
      mockSanitizeServiceName.mockReturnValue(safeName);
      
      createServiceFileTransport(maliciousName);
      
      expect(mockSanitizeServiceName).toHaveBeenCalledWith(maliciousName);
      
      const callArgs = MockFileTransport.mock.calls[0]?.[0]!;
      expect(callArgs?.filename).toBe(`logs/services/${safeName}.log`);
      expect(callArgs?.filename).not.toContain('../');
    });

    it('should handle potentially dangerous service names safely', () => {
      const dangerousNames = [
        '../../secret',
        'CON', // Windows reserved name
        'service\x00null',
        'service\nwith\nnewlines'
      ];
      
      dangerousNames.forEach((dangerousName, index) => {
        jest.clearAllMocks();
        const safeName = `safe_name_${index}`;
        mockSanitizeServiceName.mockReturnValue(safeName);
        
        createServiceFileTransport(dangerousName);
        
        expect(mockSanitizeServiceName).toHaveBeenCalledWith(dangerousName);
        
        const callArgs = MockFileTransport.mock.calls[0]?.[0]!;
        expect(callArgs?.filename).toBe(`logs/services/${safeName}.log`);
      });
    });
  });
});