/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        diagnostics: false, // transpile only, no type checking (avoid import resolution issues)
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          target: "ES2021",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: false,
          skipLibCheck: true,
          types: ["node", "jest"],
        },
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    // @beyondnet/evolith-core-domain subpaths resolve via the node_modules
    // workspace symlink + the package "exports" field (dist). No explicit
    // mapper: a hard dist/$1 rewrite bypasses "exports" and breaks subpath loads.
    "^@modelcontextprotocol/sdk/types\\.js$":
      "<rootDir>/../../../../node_modules/@modelcontextprotocol/sdk/dist/cjs/types.js",
    "^@modelcontextprotocol/sdk/server/index\\.js$":
      "<rootDir>/../../../../node_modules/@modelcontextprotocol/sdk/dist/cjs/server/index.js",
    "^@modelcontextprotocol/sdk/server/stdio\\.js$":
      "<rootDir>/../../../../node_modules/@modelcontextprotocol/sdk/dist/cjs/server/stdio.js",
    "^@modelcontextprotocol/sdk/server/streamableHttp\\.js$":
      "<rootDir>/../../../../node_modules/@modelcontextprotocol/sdk/dist/cjs/server/streamableHttp.js",
    "^@nestjs/cache-manager$":
      "<rootDir>/__mocks__/@nestjs/cache-manager.ts",
    "^cache-manager$":
      "<rootDir>/__mocks__/cache-manager.ts",
  },
  collectCoverageFrom: [
    "**/*.ts",
    "!**/index.ts",
    "!**/index.spec.ts",
    "!**/*.spec.ts",
    "!**/*.test.ts",
    "!main.ts",
    "!**/*.module.ts",
  ],
  coverageDirectory: "../coverage",
  coverageReporters: ["text", "lcov", "json-summary"],
  coverageThreshold: {
    global: { branches: 60, functions: 80, lines: 80, statements: 80 },
  },
  testEnvironment: "node",
};
