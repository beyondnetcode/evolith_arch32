module.exports = {
  setupFiles: [require('node:path').join(__dirname, 'test-setup.js')],
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  moduleNameMapper: {
    // GT-573: the consumer-driven contract test binds the SOURCE of
    // @beyondnet/evolith-contracts, not its build output, so a drift is caught
    // by `jest` alone — before (and independently of) any `dist/` being emitted.
    '^@beyondnet/evolith-contracts$': require('node:path').join(
      __dirname,
      '../../packages/contracts/src/index.ts',
    ),
  },
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    [String.raw`^.+\.ts$`]: ['ts-jest', {
      // Transpile-only: workspace subpath imports (@beyondnet/evolith-core-domain/*) are
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
