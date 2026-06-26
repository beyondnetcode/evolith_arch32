/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '<rootDir>/packages/',
    '<rootDir>/sdk/',
    '<rootDir>/apps/',
    '<rootDir>/tests/',
  ],
};
