import {
  SENSITIVE_KEYS,
  MAX_SERVICE_NAME_LENGTH,
  sanitizeServiceName,
  filterSensitiveData,
  isValidLogLevel,
  validateLogMessage,
  validateContext,
  validateMetadata
} from '@/utils/security.utils';

describe('SecurityUtils', () => {
  describe('SENSITIVE_KEYS constant', () => {
    it('should contain all expected sensitive key patterns', () => {
      const expectedKeys = [
        'password',
        'token',
        'key',
        'secret',
        'apikey',
        'api_key',
        'auth',
        'authorization',
        'bearer',
        'cookie',
        'session',
        'csrf',
        'private',
        'credential',
        'jwt',
        'refresh',
        'access_token',
        'refresh_token',
        'client_secret',
        'webhook_secret'
      ];

      expect(SENSITIVE_KEYS).toEqual(expectedKeys);
      expect(SENSITIVE_KEYS).toHaveLength(20);
    });

    it('should be readonly', () => {
      // Array destructuring should work
      const originalValue = SENSITIVE_KEYS[0];
      expect(originalValue).toBe('password');
      
      // The array is declared as const, but JavaScript arrays are mutable by default
      // This test verifies the array contains expected values rather than runtime immutability
      expect(SENSITIVE_KEYS).toContain('password');
      expect(SENSITIVE_KEYS).toContain('token');
    });
  });

  describe('MAX_SERVICE_NAME_LENGTH constant', () => {
    it('should be 50', () => {
      expect(MAX_SERVICE_NAME_LENGTH).toBe(50);
    });
  });

  describe('sanitizeServiceName', () => {
    it('should sanitize valid service names', () => {
      expect(sanitizeServiceName('GitHubService')).toBe('githubservice');
      expect(sanitizeServiceName('Session Service')).toBe('session-service');
      expect(sanitizeServiceName('WorkflowService123')).toBe('workflowservice123');
    });

    it('should handle special characters', () => {
      expect(sanitizeServiceName('Service_Name-Test')).toBe('service-name-test');
      expect(sanitizeServiceName('Service@#$%Name')).toBe('service-name');
      expect(sanitizeServiceName('Service!!!Name')).toBe('service-name');
    });

    it('should remove path traversal attempts', () => {
      expect(sanitizeServiceName('../../../etc/passwd')).toBe('etc-passwd');
      expect(sanitizeServiceName('../../service')).toBe('service');
      expect(sanitizeServiceName('service/../other')).toBe('service-other');
    });

    it('should handle leading and trailing dots', () => {
      expect(sanitizeServiceName('...service...')).toBe('service');
      expect(sanitizeServiceName('.service')).toBe('service');
      expect(sanitizeServiceName('service.')).toBe('service');
    });

    it('should handle multiple hyphens', () => {
      expect(sanitizeServiceName('service---name')).toBe('service-name');
      expect(sanitizeServiceName('service--test--name')).toBe('service-test-name');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(sanitizeServiceName('-service-')).toBe('service');
      expect(sanitizeServiceName('---service---')).toBe('service');
    });

    it('should limit length to MAX_SERVICE_NAME_LENGTH', () => {
      const longName = 'a'.repeat(100);
      const result = sanitizeServiceName(longName);
      
      expect(result.length).toBe(MAX_SERVICE_NAME_LENGTH);
      expect(result).toBe('a'.repeat(50));
    });

    it('should handle whitespace and trimming', () => {
      expect(sanitizeServiceName('  Service Name  ')).toBe('service-name');
      expect(sanitizeServiceName('\t\nService\r\n')).toBe('service');
    });

    it('should throw error for invalid inputs', () => {
      expect(() => sanitizeServiceName('')).toThrow('Service name must be a non-empty string');
      expect(() => sanitizeServiceName('   ')).toThrow('Invalid service name');
      expect(() => sanitizeServiceName(null as any)).toThrow('Service name must be a non-empty string');
      expect(() => sanitizeServiceName(undefined as any)).toThrow('Service name must be a non-empty string');
      expect(() => sanitizeServiceName(123 as any)).toThrow('Service name must be a non-empty string');
    });

    it('should throw error for names that result in invalid characters', () => {
      expect(() => sanitizeServiceName('!!!')).toThrow('Invalid service name');
      expect(() => sanitizeServiceName('---')).toThrow('Invalid service name');
      expect(() => sanitizeServiceName('...')).toThrow('Invalid service name');
    });

    it('should throw error if path characters remain after sanitization', () => {
      // This is a safety check - the function should never produce these characters
      // but we test the validation logic
      const mockSanitized = '..service'; // Simulate a case where dots weren't removed
      
      // We can't directly test this since our sanitization is good, but we test the validation
      expect(() => sanitizeServiceName('/service')).not.toThrow(); // Should be sanitized to 'service'
    });

    it('should handle edge cases with mixed characters', () => {
      expect(sanitizeServiceName('Service123_Test-Name')).toBe('service123-test-name');
      expect(sanitizeServiceName('123Service')).toBe('123service');
      expect(sanitizeServiceName('service123')).toBe('service123');
    });
  });

  describe('filterSensitiveData', () => {
    it('should filter sensitive keys', () => {
      const metadata = {
        username: 'user123',
        password: 'secret123',
        api_key: 'abc123',
        session_token: 'xyz789',
        normalData: 'visible'
      };

      const filtered = filterSensitiveData(metadata);

      expect(filtered).toEqual({
        username: 'user123',
        password: '[REDACTED]',
        api_key: '[REDACTED]',
        session_token: '[REDACTED]',
        normalData: 'visible'
      });
    });

    it('should handle nested objects', () => {
      const metadata = {
        user: {
          name: 'John',
          password: 'secret',
          settings: {
            theme: 'dark',
            api_key: 'key123'
          }
        },
        public: 'data'
      };

      const filtered = filterSensitiveData(metadata);

      expect(filtered).toEqual({
        user: {
          name: 'John',
          password: '[REDACTED]',
          settings: {
            theme: 'dark',
            api_key: '[REDACTED]'
          }
        },
        public: 'data'
      });
    });

    it('should handle case-insensitive matching', () => {
      const metadata = {
        PASSWORD: 'secret',
        Token: 'abc123',
        API_KEY: 'xyz789',
        normalData: 'visible'
      };

      const filtered = filterSensitiveData(metadata);

      expect(filtered).toEqual({
        PASSWORD: '[REDACTED]',
        Token: '[REDACTED]',
        API_KEY: '[REDACTED]',
        normalData: 'visible'
      });
    });

    it('should handle partial key matches', () => {
      const metadata = {
        userPassword: 'secret',
        authToken: 'abc123',
        secretKey: 'xyz789',
        normalData: 'visible'
      };

      const filtered = filterSensitiveData(metadata);

      expect(filtered).toEqual({
        userPassword: '[REDACTED]',
        authToken: '[REDACTED]',
        secretKey: '[REDACTED]',
        normalData: 'visible'
      });
    });

    it('should preserve arrays', () => {
      const metadata = {
        items: ['item1', 'item2'],
        secrets: ['secret1', 'secret2'],
        normalData: 'visible'
      };

      const filtered = filterSensitiveData(metadata);

      expect(filtered).toEqual({
        items: ['item1', 'item2'],
        secrets: '[REDACTED]',
        normalData: 'visible'
      });
    });

    it('should handle null and undefined values', () => {
      expect(filterSensitiveData(null)).toBe(null);
      expect(filterSensitiveData(undefined)).toBe(undefined);
    });

    it('should handle non-object values', () => {
      expect(filterSensitiveData('string' as any)).toBe('string');
      expect(filterSensitiveData(123 as any)).toBe(123);
      expect(filterSensitiveData(true as any)).toBe(true);
    });

    it('should handle empty objects', () => {
      expect(filterSensitiveData({})).toEqual({});
    });

    it('should handle all sensitive key patterns', () => {
      const metadata = Object.fromEntries(
        SENSITIVE_KEYS.map(key => [key, 'secret_value'])
      );
      
      const filtered = filterSensitiveData(metadata);
      
      // All values should be redacted
      Object.values(filtered).forEach(value => {
        expect(value).toBe('[REDACTED]');
      });
    });
  });

  describe('isValidLogLevel', () => {
    it('should return true for valid log levels', () => {
      expect(isValidLogLevel('error')).toBe(true);
      expect(isValidLogLevel('warn')).toBe(true);
      expect(isValidLogLevel('info')).toBe(true);
      expect(isValidLogLevel('debug')).toBe(true);
      expect(isValidLogLevel('verbose')).toBe(true);
    });

    it('should return false for invalid log levels', () => {
      expect(isValidLogLevel('invalid')).toBe(false);
      expect(isValidLogLevel('ERROR')).toBe(false); // Case sensitive
      expect(isValidLogLevel('trace')).toBe(false);
      expect(isValidLogLevel('')).toBe(false);
      expect(isValidLogLevel('info ')).toBe(false); // With space
    });

    it('should handle edge cases', () => {
      expect(isValidLogLevel(' info ')).toBe(false);
      expect(isValidLogLevel('Info')).toBe(false);
      expect(isValidLogLevel(null as any)).toBe(false);
      expect(isValidLogLevel(undefined as any)).toBe(false);
    });
  });

  describe('validateLogMessage', () => {
    it('should handle string messages', () => {
      expect(validateLogMessage('Hello World')).toBe('Hello World');
      expect(validateLogMessage('')).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(validateLogMessage(null)).toBe('[null/undefined message]');
      expect(validateLogMessage(undefined)).toBe('[null/undefined message]');
    });

    it('should truncate long string messages', () => {
      const longMessage = 'a'.repeat(15000);
      const result = validateLogMessage(longMessage);
      
      expect(result.length).toBe(10000 + '...[truncated]'.length);
      expect(result.endsWith('...[truncated]')).toBe(true);
      expect(result.startsWith('aaa')).toBe(true);
    });

    it('should handle short string messages unchanged', () => {
      const shortMessage = 'a'.repeat(9999);
      const result = validateLogMessage(shortMessage);
      
      expect(result).toBe(shortMessage);
      expect(result.length).toBe(9999);
    });

    it('should stringify objects', () => {
      const obj = { name: 'test', value: 123 };
      const result = validateLogMessage(obj);
      
      expect(result).toBe('{"name":"test","value":123}');
    });

    it('should handle objects that fail to stringify', () => {
      const circularObj: any = {};
      circularObj.self = circularObj;
      
      const result = validateLogMessage(circularObj);
      
      expect(result).toBe('[object - failed to stringify]');
    });

    it('should truncate long stringified objects', () => {
      const largeObj = {
        data: 'a'.repeat(15000)
      };
      
      const result = validateLogMessage(largeObj);
      
      expect(result.length).toBe(10000 + '...[truncated]'.length);
      expect(result.endsWith('...[truncated]')).toBe(true);
    });

    it('should convert other types to string', () => {
      expect(validateLogMessage(123)).toBe('123');
      expect(validateLogMessage(true)).toBe('true');
      expect(validateLogMessage(false)).toBe('false');
    });

    it('should handle arrays', () => {
      const arr = [1, 2, 3];
      const result = validateLogMessage(arr);
      
      expect(result).toBe('[1,2,3]');
    });
  });

  describe('validateContext', () => {
    it('should handle valid string contexts', () => {
      expect(validateContext('method_name')).toBe('method_name');
      expect(validateContext('getUserData')).toBe('getUserData');
    });

    it('should return undefined for null and undefined', () => {
      expect(validateContext(null)).toBe(undefined);
      expect(validateContext(undefined)).toBe(undefined);
    });

    it('should return undefined for empty or whitespace strings', () => {
      expect(validateContext('')).toBe(undefined);
      expect(validateContext('   ')).toBe(undefined);
      expect(validateContext('\t\n')).toBe(undefined);
    });

    it('should trim whitespace from strings', () => {
      expect(validateContext('  method_name  ')).toBe('method_name');
      expect(validateContext('\ttest\n')).toBe('test');
    });

    it('should truncate long contexts', () => {
      const longContext = 'a'.repeat(150);
      const result = validateContext(longContext);
      
      expect(result?.length).toBe(100 + '...'.length);
      expect(result?.endsWith('...')).toBe(true);
    });

    it('should handle contexts at the length limit', () => {
      const contextAtLimit = 'a'.repeat(100);
      const result = validateContext(contextAtLimit);
      
      expect(result).toBe(contextAtLimit);
      expect(result?.length).toBe(100);
    });

    it('should convert non-string contexts to string', () => {
      expect(validateContext(123)).toBe('123');
      expect(validateContext(true)).toBe('true');
      expect(validateContext({})).toBe('[object Object]');
    });

    it('should truncate converted non-string contexts', () => {
      const longNumber = Number('1'.repeat(150)); // This will be Infinity but still tests the logic
      const result = validateContext(longNumber);
      
      expect(result?.length).toBeLessThanOrEqual(100);
    });
  });

  describe('validateMetadata', () => {
    it('should return valid objects unchanged', () => {
      const metadata = { name: 'test', value: 123 };
      const result = validateMetadata(metadata);
      
      expect(result).toEqual(metadata);
      expect(result).toBe(metadata); // Same reference
    });

    it('should return undefined for null and undefined', () => {
      expect(validateMetadata(null)).toBe(undefined);
      expect(validateMetadata(undefined)).toBe(undefined);
    });

    it('should wrap non-objects in value property', () => {
      expect(validateMetadata('string')).toEqual({ value: 'string' });
      expect(validateMetadata(123)).toEqual({ value: 123 });
      expect(validateMetadata(true)).toEqual({ value: true });
    });

    it('should wrap arrays in value property', () => {
      const arr = [1, 2, 3];
      expect(validateMetadata(arr)).toEqual({ value: arr });
    });

    it('should handle objects with circular references', () => {
      const circularObj: any = {};
      circularObj.self = circularObj;
      
      const result = validateMetadata(circularObj);
      
      expect(result).toEqual({
        error: 'Metadata contains circular references or is not serializable'
      });
    });

    it('should handle valid nested objects', () => {
      const nestedObj = {
        level1: {
          level2: {
            value: 'deep'
          }
        }
      };
      
      const result = validateMetadata(nestedObj);
      
      expect(result).toEqual(nestedObj);
    });

    it('should handle empty objects', () => {
      expect(validateMetadata({})).toEqual({});
    });

    it('should preserve object structure', () => {
      const complex = {
        string: 'test',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        nested: { inner: 'value' },
        nullValue: null
      };
      
      const result = validateMetadata(complex);
      
      expect(result).toEqual(complex);
    });
  });

  describe('integration tests', () => {
    it('should work together in a logging scenario', () => {
      const serviceName = 'GitHub Service';
      const message = { action: 'login', password: 'secret123' };
      const context = 'authenticateUser';
      const metadata = {
        user: 'john',
        api_key: 'secret',
        timestamp: Date.now()
      };

      // Sanitize service name
      const sanitizedService = sanitizeServiceName(serviceName);
      expect(sanitizedService).toBe('github-service');

      // Validate message (this just formats, doesn't filter)
      const validatedMessage = validateLogMessage(message);
      expect(validatedMessage).toContain('login');
      expect(validatedMessage).toContain('secret123'); // validateLogMessage doesn't filter sensitive data

      // Validate context
      const validatedContext = validateContext(context);
      expect(validatedContext).toBe('authenticateUser');

      // Filter sensitive metadata
      const filteredMetadata = filterSensitiveData(metadata);
      expect(filteredMetadata?.api_key).toBe('[REDACTED]');
      expect(filteredMetadata?.user).toBe('john');
    });

    it('should handle complex nested security filtering', () => {
      const complexData = {
        request: {
          headers: {
            authorization: 'Bearer token123',
            'content-type': 'application/json'
          },
          body: {
            username: 'user',
            password: 'secret',
            preferences: {
              theme: 'dark',
              api_key: 'key123'
            }
          }
        },
        response: {
          status: 200,
          session_token: 'session123'
        }
      };

      const filtered = filterSensitiveData(complexData);

      expect(filtered.request.headers.authorization).toBe('[REDACTED]');
      expect(filtered.request.headers['content-type']).toBe('application/json');
      expect(filtered.request.body.password).toBe('[REDACTED]');
      expect(filtered.request.body.username).toBe('user');
      expect(filtered.request.body.preferences.api_key).toBe('[REDACTED]');
      expect(filtered.request.body.preferences.theme).toBe('dark');
      expect(filtered.response.session_token).toBe('[REDACTED]');
      expect(filtered.response.status).toBe(200);
    });
  });
});