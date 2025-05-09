/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/js/$1',
    '^@core/(.*)$': '<rootDir>/js/modules/core/$1',
    '^@timer/(.*)$': '<rootDir>/js/modules/timer/$1',
    '^@utils/(.*)$': '<rootDir>/js/utils/$1',
    '^uuid$': 'uuid'
  },
  moduleDirectories: ['node_modules', 'js'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['ts-jest', {
      useESM: true,
    }]
  },
  globals: {
    'ts-jest': {
      useESM: true,
    }
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  testTimeout: 60000
}; 