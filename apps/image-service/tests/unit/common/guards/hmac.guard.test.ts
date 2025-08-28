/**
 * HMAC Guard Unit Tests
 * Target Coverage: 95%
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { HmacGuard } from '../../../../src/common/guards/hmac.guard';
import {
  createMockConfigService,
  createMockExecutionContext
} from '../../../mocks';
import {
  HMAC_FIXTURES,
  AUTH_HEADER_FIXTURES
} from '../../../fixtures';

describe('HmacGuard', () => {
  let guard: HmacGuard;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockConfigService = createMockConfigService({
      'imageService.auth.hmacSecret': HMAC_FIXTURES.secret,
      'imageService.auth.requireHmac': false,
      'HMAC_SECRET': HMAC_FIXTURES.secret  // Fallback
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HmacGuard,
        {
          provide: ConfigService,
          useValue: mockConfigService
        }
      ]
    }).compile();

    guard = module.get<HmacGuard>(HmacGuard);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
    
    // Mock Date.now for consistent timestamp testing
    jest.spyOn(Date, 'now').mockReturnValue(1704067200000); // 2024-01-01 00:00:00
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access with valid HMAC signature', () => {
      // Arrange
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = 'test-payload';
      const signature = HMAC_FIXTURES.generateSignature(`${timestamp}.${payload}`);
      
      const context = createMockExecutionContext({
        headers: {
          'x-signature': signature,
          'x-timestamp': timestamp
        },
        body: payload
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).not.toThrow();
    });

    it('should deny access with invalid signature', () => {
      // Arrange
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const context = createMockExecutionContext({
        headers: {
          'x-signature': 'invalid-signature',
          'x-timestamp': timestamp
        },
        body: 'test-payload'
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should deny access with missing signature', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {
          'x-timestamp': Date.now().toString()
        },
        body: 'test-payload'
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(BadRequestException);
    });

    it('should deny access with missing timestamp', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {
          'x-signature': HMAC_FIXTURES.validSignature
        },
        body: 'test-payload'
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(BadRequestException);
    });

    it('should deny access with expired timestamp', () => {
      // Arrange
      const expiredTimestamp = Math.floor((Date.now() - 6 * 60 * 1000) / 1000).toString(); // 6 minutes ago
      const payload = 'test-payload';
      const signature = HMAC_FIXTURES.generateSignature(`${expiredTimestamp}.${payload}`);
      
      const context = createMockExecutionContext({
        headers: {
          'x-signature': signature,
          'x-timestamp': expiredTimestamp
        },
        body: payload
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should allow access with reasonable future timestamp', () => {
      // Arrange - The guard may allow small future timestamps (clock skew tolerance)
      const futureTimestamp = Math.floor((Date.now() + 30 * 1000) / 1000).toString(); // 30 seconds in future
      const payload = 'test-payload';
      const signature = HMAC_FIXTURES.generateSignature(`${futureTimestamp}.${payload}`);
      
      const context = createMockExecutionContext({
        headers: {
          'x-signature': signature,
          'x-timestamp': futureTimestamp
        },
        body: payload
      });

      // Act & Assert - Should not throw if within reasonable clock skew
      expect(() => guard.canActivate(context)).not.toThrow();
    });

    it('should reject malformed signature', () => {
      // Arrange
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const context = createMockExecutionContext({
        headers: {
          'x-signature': 'malformed-signature-without-proper-format',
          'x-timestamp': timestamp
        },
        body: 'test-payload'
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should reject non-numeric timestamp', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {
          'x-signature': HMAC_FIXTURES.validSignature,
          'x-timestamp': 'not-a-number'
        },
        body: 'test-payload'
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should handle empty request body', () => {
      // Arrange
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = '';
      const signature = HMAC_FIXTURES.generateSignature(`${timestamp}.${payload}`);
      
      const context = createMockExecutionContext({
        headers: {
          'x-signature': signature,
          'x-timestamp': timestamp
        },
        body: payload
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).not.toThrow();
    });

    it('should handle JSON request body', () => {
      // Arrange
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const bodyObj = { key: 'value', number: 123 };
      const payload = JSON.stringify(bodyObj);
      const signature = HMAC_FIXTURES.generateSignature(`${timestamp}.${payload}`);
      
      const context = createMockExecutionContext({
        headers: {
          'x-signature': signature,
          'x-timestamp': timestamp
        },
        body: bodyObj
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).not.toThrow();
    });

    it('should handle string request body', () => {
      // Arrange
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = 'string-body';
      const signature = HMAC_FIXTURES.generateSignature(`${timestamp}.${payload}`);
      
      const context = createMockExecutionContext({
        headers: {
          'x-signature': signature,
          'x-timestamp': timestamp
        },
        body: payload
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).not.toThrow();
    });
  });

  describe('Integration with HMAC secret configuration', () => {
    it('should work with configured HMAC secret', () => {
      // Arrange
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = 'test-payload';
      const signature = HMAC_FIXTURES.generateSignature(`${timestamp}.${payload}`);
      
      const context = createMockExecutionContext({
        headers: {
          'x-signature': signature,
          'x-timestamp': timestamp
        },
        body: payload
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).not.toThrow();
    });

    it('should fail when HMAC secret is not configured', async () => {
      // Arrange - Create new guard without HMAC secret
      const emptyConfigService = createMockConfigService({});
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          HmacGuard,
          {
            provide: ConfigService,
            useValue: emptyConfigService
          }
        ]
      }).compile();

      const guardWithoutSecret = module.get<HmacGuard>(HmacGuard);
      
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const context = createMockExecutionContext({
        headers: {
          'x-signature': 'any-signature',
          'x-timestamp': timestamp
        },
        body: 'test-payload'
      });

      // Act & Assert
      expect(() => guardWithoutSecret.canActivate(context)).toThrow(UnauthorizedException);
    });
  });
});