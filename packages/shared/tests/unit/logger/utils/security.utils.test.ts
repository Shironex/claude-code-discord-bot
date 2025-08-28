/**
 * Tests for security.utils.ts - Critical security features
 */

import {
  SENSITIVE_KEYS,
  MAX_SERVICE_NAME_LENGTH,
  sanitizeServiceName,
  filterSensitiveData,
  isValidLogLevel,
  validateLogMessage,
  validateContext,
  validateMetadata
} from '../../../../src/logger/utils/security.utils';
import { LOG_METADATA } from '../../../fixtures';

describe('SecurityUtils', () => {
  describe('SENSITIVE_KEYS constant', () => {
    it('should contain expected sensitive key patterns', () => {
      expect(SENSITIVE_KEYS).toContain('password');
      expect(SENSITIVE_KEYS).toContain('token');
      expect(SENSITIVE_KEYS).toContain('secret');
      expect(SENSITIVE_KEYS).toContain('apikey');
      expect(SENSITIVE_KEYS).toContain('api_key');
      expect(SENSITIVE_KEYS).toContain('authorization');
    });

    it('should be readonly array at compile time', () => {
      // TypeScript const assertion makes it readonly at compile time
      // but not at runtime - this is expected behavior
      expect(Array.isArray(SENSITIVE_KEYS)).toBe(true);
      expect(SENSITIVE_KEYS.length).toBeGreaterThan(0);
    });

    it('should have reasonable number of sensitive keys', () => {
      expect(SENSITIVE_KEYS.length).toBeGreaterThan(10);
      expect(SENSITIVE_KEYS.length).toBeLessThan(50);
    });
  });

  describe('MAX_SERVICE_NAME_LENGTH constant', () => {
    it('should be a reasonable length limit', () => {
      expect(MAX_SERVICE_NAME_LENGTH).toBe(50);
      expect(MAX_SERVICE_NAME_LENGTH).toBeGreaterThan(10);
      expect(MAX_SERVICE_NAME_LENGTH).toBeLessThan(100);
    });
  });

  describe('sanitizeServiceName()', () => {
    describe('valid inputs', () => {
      it('should sanitize simple service name', () => {
        expect(sanitizeServiceName('TestService')).toBe('testservice');
      });

      it('should handle spaces and special characters', () => {
        expect(sanitizeServiceName('Test Service 123')).toBe('test-service-123');
      });

      it('should handle underscores and hyphens', () => {
        expect(sanitizeServiceName('test_service-name')).toBe('test-service-name');
      });

      it('should remove leading/trailing spaces', () => {
        expect(sanitizeServiceName('  TestService  ')).toBe('testservice');
      });

      it('should handle mixed case', () => {
        expect(sanitizeServiceName('MyAPIService')).toBe('myapiservice');
      });

      it('should handle numbers', () => {
        expect(sanitizeServiceName('Service123')).toBe('service123');
      });

      it('should collapse multiple special characters', () => {
        expect(sanitizeServiceName('test___service---name')).toBe('test-service-name');
      });

      it('should handle dots and convert them', () => {
        expect(sanitizeServiceName('test.service.name')).toBe('test-service-name');
      });

      it('should truncate long service names', () => {
        const longName = 'a'.repeat(100);
        const result = sanitizeServiceName(longName);
        expect(result).toHaveLength(MAX_SERVICE_NAME_LENGTH);
        expect(result).toBe('a'.repeat(MAX_SERVICE_NAME_LENGTH));
      });

      it('should remove leading/trailing dots', () => {
        expect(sanitizeServiceName('..test.service..')).toBe('test-service');
      });

      it('should remove leading/trailing hyphens after processing', () => {
        expect(sanitizeServiceName('-test-service-')).toBe('test-service');
      });
    });

    describe('invalid inputs', () => {
      it('should throw for empty string', () => {
        expect(() => sanitizeServiceName('')).toThrow('Service name must be a non-empty string');
      });

      it('should throw for null', () => {
        expect(() => sanitizeServiceName(null as any)).toThrow('Service name must be a non-empty string');
      });

      it('should throw for undefined', () => {
        expect(() => sanitizeServiceName(undefined as any)).toThrow('Service name must be a non-empty string');
      });

      it('should throw for non-string', () => {
        expect(() => sanitizeServiceName(123 as any)).toThrow('Service name must be a non-empty string');
      });

      it('should throw for only special characters', () => {
        expect(() => sanitizeServiceName('!@#$%')).toThrow('must contain at least one alphanumeric character');
      });

      it('should throw for only whitespace', () => {
        expect(() => sanitizeServiceName('   ')).toThrow('must contain at least one alphanumeric character');
      });

      it('should throw for only hyphens after processing', () => {
        expect(() => sanitizeServiceName('---')).toThrow('must contain at least one alphanumeric character');
      });
    });

    describe('security checks', () => {
      it('should prevent path traversal attempts', () => {
        // These should not throw but should not contain dangerous patterns
        expect(sanitizeServiceName('test../service')).toBe('test-service');
        expect(sanitizeServiceName('test/service')).toBe('test-service');
        expect(sanitizeServiceName('test\\service')).toBe('test-service');
      });

      it('should handle complex path traversal attempts', () => {
        expect(sanitizeServiceName('../../etc/passwd')).toBe('etc-passwd');
        expect(sanitizeServiceName('../test/../service')).toBe('test-service');
      });

    });
  });

  describe('filterSensitiveData()', () => {
    it('should return input if not an object', () => {
      expect(filterSensitiveData(null as any)).toBeNull();
      expect(filterSensitiveData(undefined as any)).toBeUndefined();
      expect(filterSensitiveData('string' as any)).toBe('string');
      expect(filterSensitiveData(123 as any)).toBe(123);
    });

    it('should filter sensitive keys from flat object', () => {
      const input = {
        username: 'testuser',
        password: 'secret123',
        email: 'test@example.com',
        token: 'abc123'
      };

      const result = filterSensitiveData(input);

      expect(result).toEqual({
        username: 'testuser',
        password: '[REDACTED]',
        email: 'test@example.com',
        token: '[REDACTED]'
      });
    });

    it('should filter case-insensitive sensitive keys', () => {
      const input = {
        Password: 'secret',
        TOKEN: 'abc123',
        ApiKey: 'key123',
        CLIENT_SECRET: 'secret'
      };

      const result = filterSensitiveData(input);

      expect(result.Password).toBe('[REDACTED]');
      expect(result.TOKEN).toBe('[REDACTED]');
      expect(result.ApiKey).toBe('[REDACTED]');
      expect(result.CLIENT_SECRET).toBe('[REDACTED]');
    });

    it('should filter keys containing sensitive patterns', () => {
      const input = {
        userPassword: 'secret',
        accessToken: 'token123',
        apiKeyValue: 'key123',
        sessionCookie: 'cookie123'
      };

      const result = filterSensitiveData(input);

      expect(result.userPassword).toBe('[REDACTED]');
      expect(result.accessToken).toBe('[REDACTED]');
      expect(result.apiKeyValue).toBe('[REDACTED]');
      expect(result.sessionCookie).toBe('[REDACTED]');
    });

    it('should recursively filter nested objects', () => {
      const input = {
        user: {
          id: 123,
          password: 'secret',
          profile: {
            name: 'John',
            apiKey: 'key123'
          }
        },
        config: {
          token: 'abc123'
        }
      };

      const result = filterSensitiveData(input);

      expect(result.user.id).toBe(123);
      expect(result.user.password).toBe('[REDACTED]');
      expect(result.user.profile.name).toBe('John');
      expect(result.user.profile.apiKey).toBe('[REDACTED]');
      expect(result.config.token).toBe('[REDACTED]');
    });

    it('should preserve arrays without filtering them as objects', () => {
      const input = {
        items: [1, 2, 3],
        passwords: ['secret1', 'secret2'], // Array itself is not filtered, key is
        users: [{ name: 'John', password: 'secret' }]
      };

      const result = filterSensitiveData(input);

      expect(result.items).toEqual([1, 2, 3]);
      expect(result.passwords).toBe('[REDACTED]'); // Key contains 'password'
      expect(result.users).toEqual([{ name: 'John', password: 'secret' }]); // Array items not recursively filtered
    });

    it('should handle circular references (but will cause stack overflow)', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;

      // Known limitation: the function doesn't handle circular references
      // This test documents the current behavior
      expect(() => filterSensitiveData(obj)).toThrow('Maximum call stack size exceeded');
    });

    it('should filter sensitive keys from fixtures that match patterns', () => {
      const result = filterSensitiveData(LOG_METADATA.sensitive);

      // These should be filtered because they match SENSITIVE_KEYS patterns
      expect(result.password).toBe('[REDACTED]'); // contains 'password'
      expect(result.apiKey).toBe('[REDACTED]');   // contains 'key'
      expect(result.token).toBe('[REDACTED]');    // contains 'token'
      
      // These are not in SENSITIVE_KEYS so should not be filtered
      expect(result.creditCard).toBe('4111-1111-1111-1111'); // 'creditcard' is not a sensitive key
      expect(result.ssn).toBe('123-45-6789'); // 'ssn' is not a sensitive key
    });
  });

  describe('isValidLogLevel()', () => {
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
      expect(isValidLogLevel('warn ')).toBe(false); // Trailing space
    });

    it('should return false for non-strings', () => {
      expect(isValidLogLevel(null as any)).toBe(false);
      expect(isValidLogLevel(undefined as any)).toBe(false);
      expect(isValidLogLevel(123 as any)).toBe(false);
      expect(isValidLogLevel({} as any)).toBe(false);
    });

    it('should have proper type guard behavior', () => {
      const level = 'info';
      if (isValidLogLevel(level)) {
        // TypeScript should narrow the type here
        expect(level).toBeValidLogLevel();
      }
    });
  });

  describe('validateLogMessage()', () => {
    it('should handle null and undefined', () => {
      expect(validateLogMessage(null)).toBe('[null/undefined message]');
      expect(validateLogMessage(undefined)).toBe('[null/undefined message]');
    });

    it('should return string messages as-is if short', () => {
      expect(validateLogMessage('test message')).toBe('test message');
      expect(validateLogMessage('')).toBe('');
    });

    it('should truncate very long string messages', () => {
      const longMessage = 'a'.repeat(15000);
      const result = validateLogMessage(longMessage);
      
      expect(result).toHaveLength(10000 + '...[truncated]'.length);
      expect(result.endsWith('...[truncated]')).toBe(true);
      expect(result.startsWith('aaaa')).toBe(true);
    });

    it('should stringify object messages', () => {
      const obj = { key: 'value', number: 123 };
      const result = validateLogMessage(obj);
      
      expect(result).toBe(JSON.stringify(obj));
    });

    it('should truncate very long stringified objects', () => {
      const largeObj = { data: 'a'.repeat(15000) };
      const result = validateLogMessage(largeObj);
      
      expect(result.length).toBeLessThanOrEqual(10000 + '...[truncated]'.length);
      expect(result.endsWith('...[truncated]')).toBe(true);
    });

    it('should handle objects that cannot be stringified', () => {
      const circularObj: any = {};
      circularObj.self = circularObj;
      
      const result = validateLogMessage(circularObj);
      expect(result).toBe('[object - failed to stringify]');
    });

    it('should convert other types to string', () => {
      expect(validateLogMessage(123)).toBe('123');
      expect(validateLogMessage(true)).toBe('true');
      expect(validateLogMessage(false)).toBe('false');
      expect(validateLogMessage([1, 2, 3])).toBe('[1,2,3]'); // Array stringifies
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      const result = validateLogMessage(error);
      
      // Error objects stringify to empty JSON object {}
      expect(result).toBeString();
      expect(result).toBe('{}');
    });
  });

  describe('validateContext()', () => {
    it('should return undefined for null and undefined', () => {
      expect(validateContext(null)).toBeUndefined();
      expect(validateContext(undefined)).toBeUndefined();
    });

    it('should return string contexts as-is if short', () => {
      expect(validateContext('method')).toBe('method');
      expect(validateContext('ClassName.methodName')).toBe('ClassName.methodName');
    });

    it('should truncate long string contexts', () => {
      const longContext = 'a'.repeat(150);
      const result = validateContext(longContext);
      
      expect(result).toHaveLength(100 + '...[truncated]'.length);
      expect(result?.endsWith('...[truncated]')).toBe(true);
    });

    it('should convert non-strings to string', () => {
      expect(validateContext(123)).toBe('123');
      expect(validateContext(true)).toBe('true');
      expect(validateContext({ key: 'value' })).toBe('[object Object]');
    });

    it('should handle empty string', () => {
      expect(validateContext('')).toBe('');
    });
  });

  describe('validateMetadata()', () => {
    it('should return undefined for null and undefined', () => {
      expect(validateMetadata(null)).toBeUndefined();
      expect(validateMetadata(undefined)).toBeUndefined();
    });

    it('should filter sensitive data from object metadata', () => {
      const metadata = {
        userId: 123,
        password: 'secret',
        sessionToken: 'abc123'
      };

      const result = validateMetadata(metadata);
      
      expect(result?.userId).toBe(123);
      expect(result?.password).toBe('[REDACTED]');
      expect(result?.sessionToken).toBe('[REDACTED]');
    });

    it('should handle nested objects by filtering them', () => {
      const metadata = {
        user: {
          id: 123,
          profile: {
            password: 'secret',
            apiKey: 'key123'
          }
        }
      };

      const result = validateMetadata(metadata);
      
      expect(result?.user.id).toBe(123);
      expect(result?.user.profile.password).toBe('[REDACTED]');
      expect(result?.user.profile.apiKey).toBe('[REDACTED]');
    });

    it('should wrap non-objects in value property', () => {
      expect(validateMetadata(123)).toEqual({ value: 123 });
      expect(validateMetadata('string')).toEqual({ value: 'string' });
      expect(validateMetadata(true)).toEqual({ value: true });
    });

    it('should handle arrays as non-objects', () => {
      const arr = [1, 2, 3];
      expect(validateMetadata(arr)).toEqual({ value: arr });
    });

    it('should preserve empty objects', () => {
      expect(validateMetadata({})).toEqual({});
    });

    it('should handle complex metadata with mixed sensitive data', () => {
      const metadata = {
        requestId: 'req123',
        user: {
          id: 456,
          email: 'test@example.com'
        },
        authentication: {
          token: 'secret123',
          refreshToken: 'refresh456'
        },
        metrics: {
          duration: 150,
          memory: 1024
        }
      };

      const result = validateMetadata(metadata);
      
      expect(result?.requestId).toBe('req123');
      expect(result?.user.id).toBe(456);
      expect(result?.user.email).toBe('test@example.com');
      // 'authentication' contains 'auth' so whole object is redacted
      expect(result?.authentication).toBe('[REDACTED]');
      expect(result?.metrics.duration).toBe(150);
      expect(result?.metrics.memory).toBe(1024);
    });
  });

  describe('Integration tests', () => {
    it('should work together in realistic logging scenarios', () => {
      // Simulate real logging scenario with sensitive data
      const serviceName = 'User Authentication Service';
      const message = { action: 'login', result: 'success' };
      const context = 'UserController.authenticate';
      const metadata = {
        userId: 123,
        email: 'user@example.com',
        sessionToken: 'secret123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        loginAttempt: {
          password: 'userpassword123',
          remember: true
        }
      };

      // Process as logger would
      const sanitizedServiceName = sanitizeServiceName(serviceName);
      const validatedMessage = validateLogMessage(message);
      const validatedContext = validateContext(context);
      const validatedMetadata = validateMetadata(metadata);

      // Verify results
      expect(sanitizedServiceName).toBe('user-authentication-service');
      expect(validatedMessage).toBe(JSON.stringify(message));
      expect(validatedContext).toBe(context);
      expect(validatedMetadata?.userId).toBe(123);
      expect(validatedMetadata?.email).toBe('user@example.com');
      expect(validatedMetadata?.sessionToken).toBe('[REDACTED]');
      expect(validatedMetadata?.loginAttempt.password).toBe('[REDACTED]');
      expect(validatedMetadata?.loginAttempt.remember).toBe(true);
    });
  });
});