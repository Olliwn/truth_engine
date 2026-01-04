/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        skipLibCheck: true,
      }
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/lib/simulation/**/*.ts',
    '!src/lib/simulation/__tests__/**',
  ],
};

