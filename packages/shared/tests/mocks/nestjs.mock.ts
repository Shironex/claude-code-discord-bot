/**
 * NestJS mocks using jest-mock-extended
 */

import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { ConfigService } from '@nestjs/config';

// Mock ConfigService with common configuration values
export const createMockConfigService = (): DeepMockProxy<ConfigService> => {
  const mockConfig = mockDeep<ConfigService>();
  
  // Setup default environment variable mocks
  mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
    const mockValues: Record<string, any> = {
      'NODE_ENV': 'test',
      'LOG_LEVEL': 'debug',
      'ENABLE_FILE_LOGS': 'false',
      'MEMORY_WARNING_THRESHOLD': '90',
      'MEMORY_DEBUG_THRESHOLD': '75',
      'MEMORY_CHECK_INTERVAL': '30000'
    };
    
    return mockValues[key] ?? defaultValue;
  });
  
  (mockConfig.getOrThrow as any).mockImplementation((key: string) => {
    const value = mockConfig.get(key);
    if (value === undefined) {
      throw new Error(`Configuration key "${key}" not found`);
    }
    return value;
  });
  
  return mockConfig;
};

// Type definitions for better TypeScript support
export type MockConfigService = DeepMockProxy<ConfigService>;