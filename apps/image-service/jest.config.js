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
    '^nanoid$': '<rootDir>/tests/mocks/nanoid.mock.js'
  },

  roots: ['<rootDir>/src', '<rootDir>/tests'],

  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts'
  ],
  
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Handle ESM modules like nanoid
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid))'
  ],

  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  
  clearMocks: true,
  restoreMocks: true,
  
  verbose: true,
  testTimeout: 10000,

  collectCoverage: false,
  coverageDirectory: 'coverage'
};
