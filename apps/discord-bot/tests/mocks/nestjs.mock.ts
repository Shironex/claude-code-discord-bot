// Jest globals are available in test environment
import { ConfigService } from '@nestjs/config';
import { LoggerFactory } from '@claude-code/shared';

export const createMockConfigService = () => ({
  get: jest.fn(),
  getOrThrow: jest.fn(),
  set: jest.fn(),
});

export const createMockLogger = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  setContext: jest.fn(),
  localInstance: jest.fn(),
});

export const createMockLoggerFactory = () => ({
  createLogger: jest.fn().mockReturnValue(createMockLogger()),
  getAllLoggers: jest.fn(),
  flushAll: jest.fn(),
  clear: jest.fn(),
});

// NestJS testing module builder helpers
export const createTestingModuleConfig = (providers: any[] = []) => ({
  providers: [
    {
      provide: ConfigService,
      useValue: createMockConfigService(),
    },
    {
      provide: LoggerFactory,
      useValue: createMockLoggerFactory(),
    },
    ...providers,
  ],
});

// Mock for process.env configurations commonly used in tests
export const mockProcessEnv = {
  NODE_ENV: 'test',
  DISCORD_TOKEN: 'test-discord-token',
  GITHUB_TOKEN: 'test-github-token',
  GITHUB_USERNAME: 'test-user',
  LOG_LEVEL: 'error',
};

// Helper to setup common environment variables for tests
export const setupTestEnvironment = () => {
  Object.entries(mockProcessEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });
};

// Helper to clean up environment variables after tests
export const cleanupTestEnvironment = () => {
  Object.keys(mockProcessEnv).forEach(key => {
    delete process.env[key];
  });
};