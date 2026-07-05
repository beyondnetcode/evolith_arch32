module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    [String.raw`^.+\.ts$`]: ['ts-jest', {
      // Transpile-only: workspace subpath imports (@beyondnet/evolith-*) are
      // resolved at runtime via the package "exports" map, which classic TS
      // "node" moduleResolution does not understand at type-check time.
      diagnostics: false,
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
