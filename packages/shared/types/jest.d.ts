/// <reference types="jest" />
/// <reference types="jest-extended" />

// Ensure jest globals are available in all test files
declare global {
  // Jest globals are already declared in @types/jest, but this ensures they're available
  // This file helps IDEs understand that these globals are available in test files
}

export {};