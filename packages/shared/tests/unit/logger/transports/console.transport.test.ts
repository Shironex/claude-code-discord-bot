/**
 * Tests for console.transport.ts - Console transport configuration
 */

import { consoleTransport } from '../../../../src/logger/transports/console.transport';
import { consoleFormatter } from '../../../../src/logger/formatters/console.formatter';
import { transports } from 'winston';
// Using standard Jest mocks with proper typing

// Mock winston with format and chalk to avoid import issues
jest.mock('winston', () => ({
  transports: {
    Console: jest.fn().mockImplementation(function(this: any, options: any) {
      this.format = options.format;
      this.handleExceptions = options.handleExceptions;
      this.handleRejections = options.handleRejections;
      this.stderrLevels = options.stderrLevels;
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

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn(),
  yellow: jest.fn(),
  green: jest.fn(),
  blue: jest.fn(),
  magenta: jest.fn(),
  cyan: jest.fn(),
  gray: jest.fn(),
  white: jest.fn()
}));

// Mock console formatter
jest.mock('../../../../src/logger/formatters/console.formatter');

describe('Console Transport', () => {
  let mockConsoleFormatter: jest.MockedFunction<typeof consoleFormatter>;
  let MockConsoleTransport: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleFormatter = jest.mocked(consoleFormatter);
    MockConsoleTransport = jest.mocked(transports.Console);
    
    // Mock formatter return value
    const mockFormatterReturn = { transform: jest.fn() };
    mockConsoleFormatter.mockReturnValue(mockFormatterReturn as any);
  });

  describe('Basic Functionality', () => {
    it('should create console transport with service name', () => {
      const serviceName = 'TestService';
      
      const transport = consoleTransport(serviceName);
      
      expect(MockConsoleTransport).toHaveBeenCalledWith({
        format: expect.any(Object),
        handleExceptions: false,
        handleRejections: false,
        stderrLevels: ['error']
      });
      
      expect(mockConsoleFormatter).toHaveBeenCalledWith(serviceName);
      expect(transport).toBeInstanceOf(MockConsoleTransport);
    });

    it('should create console transport with exception handling enabled', () => {
      const serviceName = 'TestService';
      
      const transport = consoleTransport(serviceName, true);
      
      expect(MockConsoleTransport).toHaveBeenCalledWith({
        format: expect.any(Object),
        handleExceptions: true,
        handleRejections: true,
        stderrLevels: ['error']
      });
    });

    it('should create console transport with exception handling disabled by default', () => {
      const serviceName = 'TestService';
      
      const transport = consoleTransport(serviceName);
      
      expect(MockConsoleTransport).toHaveBeenCalledWith({
        format: expect.any(Object),
        handleExceptions: false,
        handleRejections: false,
        stderrLevels: ['error']
      });
    });
  });

  describe('Configuration Options', () => {
    it('should use correct stderr levels for error output', () => {
      const serviceName = 'TestService';
      
      consoleTransport(serviceName);
      
      const callArgs = MockConsoleTransport.mock.calls[0][0];
      expect(callArgs.stderrLevels).toEqual(['error']);
    });

    it('should configure formatter correctly', () => {
      const serviceName = 'CustomService';
      
      consoleTransport(serviceName);
      
      expect(mockConsoleFormatter).toHaveBeenCalledWith(serviceName);
      
      const callArgs = MockConsoleTransport.mock.calls[0][0];
      expect(callArgs.format).toBeDefined();
    });

    it('should handle exception configuration consistently', () => {
      const serviceName = 'TestService';
      
      // Test both enabled and disabled
      consoleTransport(serviceName, true);
      let callArgs = MockConsoleTransport.mock.calls[0][0];
      expect(callArgs.handleExceptions).toBe(true);
      expect(callArgs.handleRejections).toBe(true);
      
      jest.clearAllMocks();
      
      consoleTransport(serviceName, false);
      callArgs = MockConsoleTransport.mock.calls[0][0];
      expect(callArgs.handleExceptions).toBe(false);
      expect(callArgs.handleRejections).toBe(false);
    });
  });

  describe('Service Name Handling', () => {
    it('should handle various service name formats', () => {
      const serviceNames = [
        'SimpleService',
        'Complex-Service_Name',
        'SERVICE123',
        'service.with.dots',
        'Service With Spaces'
      ];

      serviceNames.forEach(serviceName => {
        jest.clearAllMocks();
        
        consoleTransport(serviceName);
        
        expect(mockConsoleFormatter).toHaveBeenCalledWith(serviceName);
        expect(MockConsoleTransport).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle empty service name', () => {
      const serviceName = '';
      
      expect(() => consoleTransport(serviceName)).not.toThrow();
      expect(mockConsoleFormatter).toHaveBeenCalledWith(serviceName);
    });

    it('should handle special characters in service name', () => {
      const serviceName = 'Service-With_Special.Characters@123';
      
      expect(() => consoleTransport(serviceName)).not.toThrow();
      expect(mockConsoleFormatter).toHaveBeenCalledWith(serviceName);
    });
  });

  describe('Error Handling', () => {
    it('should handle formatter creation failure', () => {
      const serviceName = 'TestService';
      mockConsoleFormatter.mockImplementation(() => {
        throw new Error('Formatter creation failed');
      });

      expect(() => consoleTransport(serviceName)).toThrow('Formatter creation failed');
    });

    it('should handle transport construction failure', () => {
      const serviceName = 'TestService';
      MockConsoleTransport.mockImplementation(() => {
        throw new Error('Transport creation failed');
      });

      expect(() => consoleTransport(serviceName)).toThrow('Transport creation failed');
    });
  });

  describe('Integration', () => {
    it('should pass formatter result to transport', () => {
      const serviceName = 'TestService';
      const mockFormatter = { transform: jest.fn() };
      mockConsoleFormatter.mockReturnValue(mockFormatter as any);
      
      consoleTransport(serviceName);
      
      const callArgs = MockConsoleTransport.mock.calls[0][0];
      expect(callArgs.format).toBe(mockFormatter);
    });

    it('should create multiple transports with different configurations', () => {
      const service1 = 'Service1';
      const service2 = 'Service2';
      
      const transport1 = consoleTransport(service1, true);
      const transport2 = consoleTransport(service2, false);
      
      expect(MockConsoleTransport).toHaveBeenCalledTimes(2);
      expect(mockConsoleFormatter).toHaveBeenCalledWith(service1);
      expect(mockConsoleFormatter).toHaveBeenCalledWith(service2);
      
      expect(transport1).toBeInstanceOf(MockConsoleTransport);
      expect(transport2).toBeInstanceOf(MockConsoleTransport);
    });
  });

  describe('Configuration Validation', () => {
    it('should ensure all required options are set', () => {
      const serviceName = 'TestService';
      
      consoleTransport(serviceName);
      
      const callArgs = MockConsoleTransport.mock.calls[0][0];
      expect(callArgs).toHaveProperty('format');
      expect(callArgs).toHaveProperty('handleExceptions');
      expect(callArgs).toHaveProperty('handleRejections');
      expect(callArgs).toHaveProperty('stderrLevels');
    });

    it('should use consistent boolean values for exception handling', () => {
      const serviceName = 'TestService';
      
      // Test with explicit true
      consoleTransport(serviceName, true);
      let callArgs = MockConsoleTransport.mock.calls[0][0];
      expect(typeof callArgs.handleExceptions).toBe('boolean');
      expect(typeof callArgs.handleRejections).toBe('boolean');
      expect(callArgs.handleExceptions).toBe(callArgs.handleRejections);
      
      jest.clearAllMocks();
      
      // Test with explicit false
      consoleTransport(serviceName, false);
      callArgs = MockConsoleTransport.mock.calls[0][0];
      expect(typeof callArgs.handleExceptions).toBe('boolean');
      expect(typeof callArgs.handleRejections).toBe('boolean');
      expect(callArgs.handleExceptions).toBe(callArgs.handleRejections);
    });
  });
});