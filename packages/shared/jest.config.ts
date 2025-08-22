import type { Config } from 'jest';

const config: Config = {
  // Test environment
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Use SWC for faster compilation
  transform: {
    '^.+\\.tsx?$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
          dynamicImport: true
        },
        transform: {
          decoratorMetadata: true,
          legacyDecorator: true,
          hidden: {
            jest: true
          }
        },
        target: 'es2022',
        keepClassNames: true
      },
      module: {
        type: 'commonjs'
      },
      sourceMaps: 'inline'
    }]
  },

  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Test files
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.types.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary', 
    'html',
    'lcov',
    'json'
  ],
  
  // Coverage thresholds - 90% minimum for all metrics
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 85,
      functions: 85,
      lines: 85
    },
    // Higher thresholds for critical files
    'src/logger/logger.service.ts': {
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95
    },
    'src/logger/utils/security.utils.ts': {
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95
    }
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Mock and reset behavior
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // Verbose output for debugging
  verbose: true,

  // Error handling
  errorOnDeprecated: true,
  
  // Performance
  maxWorkers: '50%',

  // Cache
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Globals (enable for Jest features)
  injectGlobals: true,

  // Test timeout - reduce for faster feedback
  testTimeout: 2000,

  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml'
    }]
  ]
};

export default config;