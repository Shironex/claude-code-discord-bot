/**
 * Combined Auth Guard Unit Tests
 * Target Coverage: 95%
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { CombinedAuthGuard } from '../../../../src/common/guards/combined-auth.guard';
import { ApiKeyGuard } from '../../../../src/common/guards/api-key.guard';
import { HmacGuard } from '../../../../src/common/guards/hmac.guard';
import {
  createMockConfigService,
  createMockExecutionContext
} from '../../../mocks';
import {
  API_KEY_FIXTURES,
  HMAC_FIXTURES
} from '../../../fixtures';

describe('CombinedAuthGuard', () => {
  let guard: CombinedAuthGuard;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockConfigService = createMockConfigService({
      'imageService.auth.discordBotApiKey': API_KEY_FIXTURES.discord,
      'imageService.auth.claudeCodeApiKey': API_KEY_FIXTURES.claude,
      'imageService.auth.hmacSecret': HMAC_FIXTURES.secret,
      'imageService.auth.requireHmac': false
    });

    const mockReflector = {
      get: jest.fn().mockReturnValue(undefined),
      getAll: jest.fn(),
      getAllAndOverride: jest.fn(),
      getAllAndMerge: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CombinedAuthGuard,
        ApiKeyGuard,
        HmacGuard,
        {
          provide: ConfigService,
          useValue: mockConfigService
        },
        {
          provide: Reflector,
          useValue: mockReflector
        }
      ]
    }).compile();

    guard = module.get<CombinedAuthGuard>(CombinedAuthGuard);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
    
    // Mock Date.now for HMAC tests
    jest.spyOn(Date, 'now').mockReturnValue(1704067200000); // 2024-01-01 00:00:00
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access with valid API key when HMAC not required', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {
          'x-api-key': API_KEY_FIXTURES.discord
        },
        query: {}
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).not.toThrow();
    });

    it('should allow access with both API key and HMAC when both are valid', () => {
      // Arrange
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = 'test-payload';
      const signature = HMAC_FIXTURES.generateSignature(`${timestamp}.${payload}`);
      
      const context = createMockExecutionContext({
        headers: {
          'x-api-key': API_KEY_FIXTURES.discord,
          'x-signature': signature,
          'x-timestamp': timestamp
        },
        body: payload,
        query: {}
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).not.toThrow();
    });

    it('should deny access when API key is invalid', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {
          'x-api-key': 'invalid-api-key'
        },
        query: {}
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should handle API key guard throwing exception', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {},
        query: {}
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should allow optional HMAC when requireHmac is false', () => {
      // Arrange - Only API key provided, no HMAC
      const context = createMockExecutionContext({
        headers: {
          'x-api-key': API_KEY_FIXTURES.discord
        },
        query: {}
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).not.toThrow();
    });

    it('should work when no specific auth is configured for endpoint', () => {
      // Arrange - The combined guard should use default validation
      const context = createMockExecutionContext({
        headers: {
          'x-api-key': API_KEY_FIXTURES.discord
        },
        query: {}
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).not.toThrow();
    });
  });

  describe('Integration with multiple auth methods', () => {
    it('should validate API key first', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {
          'x-api-key': API_KEY_FIXTURES.discord
        },
        query: {}
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).not.toThrow();
    });

    it('should fail when no authentication is provided', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {},
        query: {}
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('Configuration scenarios', () => {
    it('should work with configured authentication methods', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {
          'x-api-key': API_KEY_FIXTURES.discord
        },
        query: {}
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).not.toThrow();
    });

    it('should fail when no auth configuration is available', async () => {
      // Arrange - Create new guard without auth config
      const emptyConfigService = createMockConfigService({});
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CombinedAuthGuard,
          ApiKeyGuard,
          HmacGuard,
          {
            provide: ConfigService,
            useValue: emptyConfigService
          },
          {
            provide: Reflector,
            useValue: { get: jest.fn().mockReturnValue(undefined) }
          }
        ]
      }).compile();

      const guardWithoutConfig = module.get<CombinedAuthGuard>(CombinedAuthGuard);
      
      const context = createMockExecutionContext({
        headers: {
          'x-api-key': 'any-key'
        },
        query: {}
      });

      // Act & Assert
      expect(() => guardWithoutConfig.canActivate(context)).toThrow(UnauthorizedException);
    });
  });
});