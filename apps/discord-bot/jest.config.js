/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }]
  },

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/tests/$1',
    '^@fixtures/(.*)$': '<rootDir>/tests/fixtures/$1',
    '^@mocks/(.*)$': '<rootDir>/tests/mocks/$1',
    '^chalk$': '<rootDir>/tests/mocks/chalk.mock.js',
  },

  roots: ['<rootDir>/src', '<rootDir>/tests'],

  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts'
  ],
  
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/logs/'
  ],
  

  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  
  clearMocks: true,
  restoreMocks: true,
  
  verbose: true,
  testTimeout: 30000, // 30s for Discord API calls

  collectCoverage: false,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/main.ts',
    '!src/app.module.ts',
    '!src/**/*.module.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.constants.ts',
    '!src/templates/**',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/logs/**'
  ],
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 85,
      functions: 85,
      lines: 85
    },
    // Higher thresholds for critical files
    'src/services/base/base.service.ts': {
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95
    },
    'src/services/session.service.ts': {
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95
    },
    'src/services/workflow.service.ts': {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90
    }
  },
  
  // JUnit reporting for CI
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml',
      uniqueOutputName: false,
      ancestorSeparator: ' › ',
      testCaseClassnameTemplate: '{classname}',
      titleTemplate: '{title}'
    }]
  ]
};