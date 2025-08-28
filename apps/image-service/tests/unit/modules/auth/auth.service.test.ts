import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '@/modules/auth/auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAuthConfig', () => {
    it('should return config with all keys configured via nested config', () => {
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'imageService.auth.discordBotApiKey':
            return 'discord-key';
          case 'imageService.auth.claudeCodeApiKey':
            return 'claude-key';
          case 'imageService.auth.hmacSecret':
            return 'hmac-secret';
          case 'imageService.auth.requireHmac':
            return true;
          default:
            return undefined;
        }
      });

      const result = service.getAuthConfig();

      expect(result).toEqual({
        hasDiscordBotKey: true,
        hasClaudeCodeKey: true,
        hasHmacSecret: true,
        requireHmac: true,
      });
    });

    it('should return config with all keys configured via environment fallbacks', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'DISCORD_BOT_API_KEY':
            return 'discord-env-key';
          case 'CLAUDE_CODE_API_KEY':
            return 'claude-env-key';
          case 'HMAC_SECRET':
            return 'hmac-env-secret';
          case 'imageService.auth.requireHmac':
            return defaultValue;
          default:
            return undefined;
        }
      });

      const result = service.getAuthConfig();

      expect(result).toEqual({
        hasDiscordBotKey: true,
        hasClaudeCodeKey: true,
        hasHmacSecret: true,
        requireHmac: false,
      });
    });

    it('should return config with no keys configured', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'imageService.auth.requireHmac') {
          return defaultValue;
        }
        return undefined;
      });

      const result = service.getAuthConfig();

      expect(result).toEqual({
        hasDiscordBotKey: false,
        hasClaudeCodeKey: false,
        hasHmacSecret: false,
        requireHmac: false,
      });
    });

    it('should prefer nested config over environment variables', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'imageService.auth.discordBotApiKey':
            return 'nested-discord-key';
          case 'imageService.auth.claudeCodeApiKey':
            return 'nested-claude-key';
          case 'imageService.auth.hmacSecret':
            return 'nested-hmac-secret';
          case 'imageService.auth.requireHmac':
            return true;
          case 'DISCORD_BOT_API_KEY':
            return 'env-discord-key'; // Should be ignored
          case 'CLAUDE_CODE_API_KEY':
            return 'env-claude-key'; // Should be ignored
          case 'HMAC_SECRET':
            return 'env-hmac-secret'; // Should be ignored
          default:
            return defaultValue;
        }
      });

      const result = service.getAuthConfig();

      expect(result).toEqual({
        hasDiscordBotKey: true,
        hasClaudeCodeKey: true,
        hasHmacSecret: true,
        requireHmac: true,
      });
    });

    it('should handle empty strings as falsy values', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'imageService.auth.discordBotApiKey':
            return '';
          case 'imageService.auth.claudeCodeApiKey':
            return '';
          case 'imageService.auth.hmacSecret':
            return '';
          case 'imageService.auth.requireHmac':
            return false;
          default:
            return undefined;
        }
      });

      const result = service.getAuthConfig();

      expect(result).toEqual({
        hasDiscordBotKey: false,
        hasClaudeCodeKey: false,
        hasHmacSecret: false,
        requireHmac: false,
      });
    });

    it('should use default value for requireHmac when not configured', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'imageService.auth.requireHmac') {
          return defaultValue; // Will return the default value (false)
        }
        return undefined;
      });

      const result = service.getAuthConfig();

      expect(result.requireHmac).toBe(false);
      expect(configService.get).toHaveBeenCalledWith('imageService.auth.requireHmac', false);
    });

    it('should handle partial configuration scenarios', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'imageService.auth.discordBotApiKey':
            return 'discord-key-only';
          case 'imageService.auth.requireHmac':
            return defaultValue;
          default:
            return undefined;
        }
      });

      const result = service.getAuthConfig();

      expect(result).toEqual({
        hasDiscordBotKey: true,
        hasClaudeCodeKey: false,
        hasHmacSecret: false,
        requireHmac: false,
      });
    });

    it('should handle mixed configuration sources', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'imageService.auth.discordBotApiKey':
            return 'nested-discord-key';
          case 'CLAUDE_CODE_API_KEY':
            return 'env-claude-key';
          case 'imageService.auth.requireHmac':
            return true;
          default:
            return undefined;
        }
      });

      const result = service.getAuthConfig();

      expect(result).toEqual({
        hasDiscordBotKey: true,
        hasClaudeCodeKey: true,
        hasHmacSecret: false,
        requireHmac: true,
      });
    });

    it('should return consistent structure regardless of input', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'imageService.auth.requireHmac') {
          return defaultValue; // Return false as default
        }
        return undefined;
      });

      const result = service.getAuthConfig();

      expect(Object.keys(result)).toEqual(['hasDiscordBotKey', 'hasClaudeCodeKey', 'hasHmacSecret', 'requireHmac']);
      expect(typeof result.hasDiscordBotKey).toBe('boolean');
      expect(typeof result.hasClaudeCodeKey).toBe('boolean');
      expect(typeof result.hasHmacSecret).toBe('boolean');
      expect(typeof result.requireHmac).toBe('boolean');
    });

    it('should call ConfigService with correct parameters', () => {
      configService.get.mockReturnValue(undefined);

      service.getAuthConfig();

      expect(configService.get).toHaveBeenCalledWith('imageService.auth.discordBotApiKey');
      expect(configService.get).toHaveBeenCalledWith('DISCORD_BOT_API_KEY');
      expect(configService.get).toHaveBeenCalledWith('imageService.auth.claudeCodeApiKey');
      expect(configService.get).toHaveBeenCalledWith('CLAUDE_CODE_API_KEY');
      expect(configService.get).toHaveBeenCalledWith('imageService.auth.hmacSecret');
      expect(configService.get).toHaveBeenCalledWith('HMAC_SECRET');
      expect(configService.get).toHaveBeenCalledWith('imageService.auth.requireHmac', false);
    });
  });

  describe('Logger Integration', () => {
    it('should have a logger instance', () => {
      expect(service['logger']).toBeDefined();
      expect(service['logger'].constructor.name).toBe('Logger');
    });
  });
});