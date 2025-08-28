/**
 * API Key Guard Unit Tests
 * Target Coverage: 95%
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from '../../../../src/common/guards/api-key.guard';
import {
  createMockConfigService,
  createMockExecutionContext
} from '../../../mocks';
import {
  API_KEY_FIXTURES
} from '../../../fixtures';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let configService: ConfigService;
  let reflector: Reflector;

  beforeEach(async () => {
    const mockConfigService = createMockConfigService({
      'imageService.auth.discordBotApiKey': API_KEY_FIXTURES.discord,
      'imageService.auth.claudeCodeApiKey': API_KEY_FIXTURES.claude,
      'DISCORD_BOT_API_KEY': API_KEY_FIXTURES.discord,
      'CLAUDE_CODE_API_KEY': API_KEY_FIXTURES.claude
    });

    const mockReflector = {
      get: jest.fn().mockReturnValue(undefined),
      getAll: jest.fn(),
      getAllAndOverride: jest.fn(),
      getAllAndMerge: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
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

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    configService = module.get<ConfigService>(ConfigService);
    reflector = module.get<Reflector>(Reflector);

    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access with valid Discord API key', () => {
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

    it('should allow access with valid Claude Code API key', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {
          'x-api-key': API_KEY_FIXTURES.claude
        },
        query: {}
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).not.toThrow();
    });

    it('should deny access with invalid API key', () => {
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

    it('should deny access with missing API key', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {},
        query: {}
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should deny access with empty API key', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {
          'x-api-key': ''
        },
        query: {}
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should handle null API key', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {
          'x-api-key': null
        },
        query: {}
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should handle undefined API key', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {
          'x-api-key': undefined
        },
        query: {}
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should handle malformed API keys', () => {
      // Arrange
      const malformedKeys = [
        'short',
        '123',
        'special-chars-!@#$%^&*()',
        'very-long-key-' + 'a'.repeat(500)
      ];

      malformedKeys.forEach(key => {
        const context = createMockExecutionContext({
          headers: {
            'x-api-key': key
          },
          query: {}
        });

        // Act & Assert
        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      });
    });

    it('should handle very long API keys', () => {
      // Arrange
      const longKey = 'valid-prefix-' + 'x'.repeat(1000);
      const context = createMockExecutionContext({
        headers: {
          'x-api-key': longKey
        },
        query: {}
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should validate against multiple configured keys', () => {
      // Test both Discord and Claude keys work
      const discordContext = createMockExecutionContext({
        headers: { 'x-api-key': API_KEY_FIXTURES.discord },
        query: {}
      });
      
      const claudeContext = createMockExecutionContext({
        headers: { 'x-api-key': API_KEY_FIXTURES.claude },
        query: {}
      });

      // Act & Assert
      expect(() => guard.canActivate(discordContext)).not.toThrow();
      expect(() => guard.canActivate(claudeContext)).not.toThrow();
    });

    it('should support Bearer token format', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {
          'authorization': `Bearer ${API_KEY_FIXTURES.discord}`
        },
        query: {}
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).not.toThrow();
    });

    it('should reject invalid Bearer token', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {
          'authorization': 'Bearer invalid-token'
        },
        query: {}
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should handle malformed Authorization header', () => {
      // Arrange
      const malformedHeaders = [
        'Basic token',
        'Bearer',
        'Bearer ',
        'NotBearer token',
        'Bearer token with spaces'
      ];

      malformedHeaders.forEach(header => {
        const context = createMockExecutionContext({
          headers: {
            'authorization': header
          },
          query: {}
        });

        // Act & Assert
        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      });
    });

    it('should prioritize x-api-key over authorization header', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {
          'x-api-key': API_KEY_FIXTURES.discord,
          'authorization': 'Bearer invalid-token'
        },
        query: {}
      });

      // Act & Assert - Should use x-api-key and succeed
      expect(() => guard.canActivate(context)).not.toThrow();
    });
  });

  describe('Integration with API key configuration', () => {
    it('should work with configured API keys', () => {
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

    it('should fail when no API keys are configured', async () => {
      // Arrange - Create new guard without API keys
      const emptyConfigService = createMockConfigService({});
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ApiKeyGuard,
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

      const guardWithoutKeys = module.get<ApiKeyGuard>(ApiKeyGuard);
      
      const context = createMockExecutionContext({
        headers: {
          'x-api-key': 'any-key'
        },
        query: {}
      });

      // Act & Assert
      expect(() => guardWithoutKeys.canActivate(context)).toThrow(UnauthorizedException);
    });
  });
});