module.exports = {
  setupFiles: [require('node:path').join(__dirname, 'test-setup.js')],
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    [String.raw`^.+\.ts$`]: ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        isolatedModules: false,
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        target: 'ES2023',
        skipLibCheck: true,
        strict: true,
        types: ['jest', 'node'],
      },
    }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
