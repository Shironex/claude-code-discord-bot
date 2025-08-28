import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService } from '@/modules/auth/auth.service';
import { ApiKeyGuard } from '@/common/guards';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    mockAuthService = {
      getAuthConfig: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAuthConfig', () => {
    it('should return auth configuration from service', () => {
      const mockConfig = {
        hasDiscordBotKey: true,
        hasClaudeCodeKey: true,
        hasHmacSecret: true,
        requireHmac: false,
      };

      mockAuthService.getAuthConfig.mockReturnValue(mockConfig);

      const result = controller.getAuthConfig();

      expect(result).toEqual(mockConfig);
      expect(authService.getAuthConfig).toHaveBeenCalledTimes(1);
    });

    it('should handle partial configuration', () => {
      const mockConfig = {
        hasDiscordBotKey: true,
        hasClaudeCodeKey: false,
        hasHmacSecret: false,
        requireHmac: true,
      };

      mockAuthService.getAuthConfig.mockReturnValue(mockConfig);

      const result = controller.getAuthConfig();

      expect(result).toEqual(mockConfig);
      expect(result.hasDiscordBotKey).toBe(true);
      expect(result.hasClaudeCodeKey).toBe(false);
      expect(result.hasHmacSecret).toBe(false);
      expect(result.requireHmac).toBe(true);
    });

    it('should handle configuration with no keys', () => {
      const mockConfig = {
        hasDiscordBotKey: false,
        hasClaudeCodeKey: false,
        hasHmacSecret: false,
        requireHmac: false,
      };

      mockAuthService.getAuthConfig.mockReturnValue(mockConfig);

      const result = controller.getAuthConfig();

      expect(result).toEqual(mockConfig);
      expect(Object.values(result).every(value => value === false)).toBe(true);
    });
  });

  describe('testAuth', () => {
    beforeEach(() => {
      // Mock Date to get consistent timestamps in tests
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return authentication test response', () => {
      const result = controller.testAuth();

      expect(result).toEqual({
        authenticated: true,
        source: 'discord-bot',
        timestamp: '2024-01-01T10:00:00.000Z',
      });
    });

    it('should return consistent response structure', () => {
      const result = controller.testAuth();

      expect(result).toHaveProperty('authenticated');
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.authenticated).toBe('boolean');
      expect(typeof result.source).toBe('string');
      expect(typeof result.timestamp).toBe('string');
    });

    it('should return valid ISO timestamp', () => {
      const result = controller.testAuth();
      const timestamp = new Date(result.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(result.timestamp);
    });

    it('should always return authenticated as true', () => {
      // Test multiple calls to ensure consistency
      for (let i = 0; i < 5; i++) {
        const result = controller.testAuth();
        expect(result.authenticated).toBe(true);
      }
    });

    it('should return expected source value', () => {
      const result = controller.testAuth();
      expect(result.source).toBe('discord-bot');
    });

    it('should not include userId by default', () => {
      const result = controller.testAuth();
      expect(result.userId).toBeUndefined();
    });
  });

  describe('Guards Integration', () => {
    let mockGuard: jest.Mock;
    let testModule: TestingModule;

    beforeEach(async () => {
      mockGuard = jest.fn().mockReturnValue(true);
      
      testModule = await Test.createTestingModule({
        controllers: [AuthController],
        providers: [
          {
            provide: AuthService,
            useValue: mockAuthService,
          },
        ],
      })
        .overrideGuard(ApiKeyGuard)
        .useValue({
          canActivate: mockGuard,
        })
        .compile();

      controller = testModule.get<AuthController>(AuthController);
    });

    it('should use ApiKeyGuard for getAuthConfig endpoint', () => {
      const guards = Reflect.getMetadata('__guards__', controller.getAuthConfig);
      expect(guards).toContain(ApiKeyGuard);
    });

    it('should use ApiKeyGuard for testAuth endpoint', () => {
      const guards = Reflect.getMetadata('__guards__', controller.testAuth);
      expect(guards).toContain(ApiKeyGuard);
    });
  });

  describe('API Tags and Swagger Integration', () => {
    it('should have correct controller path', () => {
      const path = Reflect.getMetadata('path', AuthController);
      expect(path).toBe('auth');
    });

    it('should have API tags metadata', () => {
      const tags = Reflect.getMetadata('swagger/apiUseTags', AuthController);
      expect(tags).toEqual(['auth']);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors in getAuthConfig', () => {
      mockAuthService.getAuthConfig.mockImplementation(() => {
        throw new Error('Configuration error');
      });

      expect(() => controller.getAuthConfig()).toThrow('Configuration error');
    });

    it('should propagate service errors', () => {
      const errorMessage = 'Service unavailable';
      mockAuthService.getAuthConfig.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      expect(() => controller.getAuthConfig()).toThrow(errorMessage);
    });
  });
});