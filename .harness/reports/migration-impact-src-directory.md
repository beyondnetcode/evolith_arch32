# Migration Impact Report: Moving code dirs under src/

Generated: 2026-07-03
Scope: apps/, packages/, sdk/, rulesets/, tests/ -> src/

## Executive Summary

This migration touches **19 tsconfig files**, **4 Dockerfiles**, **2 package.json workspaces**, **11 GitHub Actions workflows**, **3 husky hooks**, **45+ CI/harness scripts**, **1,500+ markdown references**, and **hundreds of TypeScript source-level path references**. It is a high-risk change requiring coordination across build, CI, Docker, and documentation layers.

---

## 1. CRITICAL: package.json workspaces

File: /Users/beyondnet/Source/evolith/package.json

| Line | Current | Required |
|------|---------|----------|
| 15-18 | `"workspaces": ["sdk/*", "apps/*", "packages/*"]` | `["src/sdk/*", "src/apps/*", "src/packages/*"]` |
| 13 | `"test:contract": "...tests/contract/jest.config.js..."` | `"...src/tests/contract/jest.config.js..."` |

**Risk**: HIGH -- npm workspace resolution breaks entirely if this is wrong.

---

## 2. CRITICAL: Root tsconfig.json references

File: /Users/beyondnet/Source/evolith/tsconfig.json

All 9 workspace references must shift under src/:
- Line 5: `./packages/core-domain` -> `./src/packages/core-domain`
- Line 6: `./packages/infra-providers` -> `./src/packages/infra-providers`
- Line 7: `./packages/core` -> `./src/packages/core`
- Line 8: `./packages/agent-runtime` -> `./src/packages/agent-runtime`
- Line 9: `./packages/mcp-server` -> `./src/packages/mcp-server`
- Line 10: `./packages/sdk-client` -> `./src/packages/sdk-client`
- Line 11: `./apps/core-api` -> `./src/apps/core-api`
- Line 12: `./apps/agent-runtime-api` -> `./src/apps/agent-runtime-api`
- Line 13: `./sdk/cli` -> `./src/sdk/cli`

---

## 3. Child tsconfig extends paths (9 files)

Each uses `"extends": "../../tsconfig.base.json"` which becomes `"../../../tsconfig.base.json"`:

- packages/core-domain/tsconfig.json
- packages/agent-runtime/tsconfig.json
- packages/mcp-server/tsconfig.json
- packages/core/tsconfig.json
- packages/infra-providers/tsconfig.json
- packages/sdk-client/tsconfig.json
- sdk/cli/tsconfig.json
- apps/core-api/tsconfig.json
- apps/agent-runtime-api/tsconfig.json

---

## 4. Cross-package tsconfig references

- packages/agent-runtime/tsconfig.json line 13: `{ "path": "../core-domain" }` -- stays valid if siblings move together
- apps/agent-runtime-api/tsconfig.json line 15: `{ "path": "../../packages/agent-runtime" }` -- path depth changes to `"../../src/packages/agent-runtime"` or equivalently `"../packages/agent-runtime"` (sibling under same parent)

---

## 5. tests/contract/tsconfig.json

Line 16: `"baseUrl": "../.."` -- must become `"../../.."`
Line 18: `"paths": {"nest-commander-testing": ["sdk/cli/node_modules/nest-commander-testing"]}` -- must become `"src/sdk/cli/node_modules/nest-commander-testing"`

---

## 6. tests/contract/jest.config.js

Line 2: `rootDir: '../..'` -> `'../../..'`
Line 3: `'<rootDir>/tests/contract/**/*.spec.ts'` -> `'<rootDir>/src/tests/contract/**/*.spec.ts'`
Line 5: `'<rootDir>/tests/contract/tsconfig.json'` -> `'<rootDir>/src/tests/contract/tsconfig.json'`
Line 8: `'<rootDir>/sdk/cli/node_modules/nest-commander-testing'` -> `'<rootDir>/src/sdk/cli/node_modules/nest-commander-testing'`
Lines 13-15: moduleDirectories paths for sdk/cli, apps/core-api, packages/mcp-server all need src/ prefix

---

## 7. Dockerfiles (4 files)

### apps/core-api/Dockerfile
Builder stage COPY commands (lines 15-20):
- `COPY packages ./packages` -> `COPY src/packages ./src/packages`
- `COPY apps ./apps` -> `COPY src/apps ./src/apps`
- `COPY sdk ./sdk` -> `COPY src/sdk ./src/sdk`
- `COPY rulesets ./rulesets` -> `COPY src/rulesets ./src/rulesets`
- Line 28: `npx tsc -b packages/core-domain packages/infra-providers apps/core-api/tsconfig.json` -> all paths need src/ prefix
- Runner stage COPY commands (lines 42-49): all packages/apps paths need src/ prefix
- Line 54: `COPY --from=builder /repo/rulesets` -> `/repo/src/rulesets`
- Line 69: `WORKDIR /repo/apps/core-api` -> `/repo/src/apps/core-api`

### packages/mcp-server/Dockerfile
- Lines 14-17: COPY packages/apps/sdk all need src/ prefix
- Line 22: tsc -b command references packages/* paths -- all need src/
- Lines 36-49: Runner stage COPY commands for packages/* -- all need src/
- Line 51: `COPY rulesets /app/corpus/rulesets` -> `COPY src/rulesets /app/corpus/rulesets`
- Line 67: `WORKDIR /repo/packages/mcp-server` -> `/repo/src/packages/mcp-server`

### apps/agent-runtime-api/Dockerfile
- Lines 17-22: COPY commands for packages/apps/sdk/.harness/rulesets -- all need src/ except .harness
- Line 28: tsc -b command references apps/agent-runtime-api -- needs src/
- Lines 45-50: Runner COPY for packages and apps -- all need src/
- Line 57: `COPY --from=builder /repo/rulesets` -> `/repo/src/rulesets`
- Line 69: `WORKDIR /repo/apps/agent-runtime-api` -> `/repo/src/apps/agent-runtime-api`

### sdk/cli/Dockerfile
- This is a standalone build (context is sdk/cli itself, not repo root)
- Lines 10-11: `COPY package*.json ./` and `COPY tsconfig*.json ./` -- unaffected
- Line 17: `COPY src/ ./src/` -- unaffected (relative to context)
- **If context changes to repo root for monorepo build**: everything changes

---

## 8. .husky/pre-push

Line 34: `grep -qE '\.md$|reference/|rulesets/|CONTRIBUTING|AGENTS'` -- BROKEN
Changed files will now be at `src/rulesets/` not `rulesets/`. Must update to include `src/rulesets/`.

---

## 9. .harness/scripts/ci-runner.mjs

Line 83: `changed.some(f => f.includes("rulesets/") || ...)` -- BROKEN
Changed files under src/rulesets/ won't match bare `rulesets/`.

---

## 10. GitHub Actions Workflows

### sdk-cli-ci.yml (heaviest impact)
- Lines 11, 18: path triggers `'sdk/cli/**'` -> `'src/sdk/cli/**'`
- Line 26: `CLI_DIR: 'sdk/cli'` -> `'src/sdk/cli'`

### sdk-cli-release.yml
- Lines 12: path trigger `'sdk/cli/**'` -> `'src/sdk/cli/**'`
- Line 21: `CLI_DIR: 'sdk/cli'` -> `'src/sdk/cli'`

### ci-cd.yml
- Line 151: `npm run --workspace packages/mcp-server test:e2e` -- npm workspace name stays same, but working directory changes
- Lines 273-274: `context: ./sdk/cli` and `file: ./sdk/cli/Dockerfile` -> `./src/sdk/cli` and `./src/sdk/cli/Dockerfile`
- Line 297: `dockerfile: ./apps/core-api/Dockerfile` -> `./src/apps/core-api/Dockerfile`
- Line 301: `dockerfile: ./packages/mcp-server/Dockerfile` -> `./src/packages/mcp-server/Dockerfile`

### docker-images.yml
- Lines 33, 35, 37: dockerfile paths for apps/agent-runtime-api, apps/core-api, packages/mcp-server all need src/ prefix

### knowledge-intake.yml
- Line 114: inline script references `'rulesets/opa/knowledge-intake.rego'` and `'rulesets/opa/knowledge-intake.test.rego'` -- must become `'src/rulesets/opa/...'`

### enforce-root-cleanliness.yml, coverage-impact.yml, opa-parity.yml, docs.yml, docs-release.yml
- No direct references to the five moving directories (they invoke .harness scripts only)

---

## 11. CI Scripts (.harness/scripts/ci/)

Files with hardcoded path references:

### ci-runner.mjs (line 83)
`rulesets/` detection in changed files

### 35-validate-core-health.mjs
- Line 48: `path.join(root, "packages/core-domain/src")`
- Line 74: `path.join(root, "rulesets/opa")`
- Line 75: `path.join(root, "packages/core-domain/src/domain/rules")`
- Line 104-105: `path.join(root, "packages/agent-runtime/src/bootstrap.ts")` and `packages/agent-runtime/src`

### 34-boundary-guard-repository.mjs
- Line 17: `path.join(root, "packages/core-domain/src")`

### 33-check-adapter-freshness.mjs
- Line 22: `path.join(root, "packages/agent-runtime/src/adapters/interaction")`
- Line 61: `path.join(root, "packages/agent-runtime/src/adapters/index.ts")`

### 29-validate-opa-sidecar-bundles.mjs
- Lines 16-17: `rulesets/infrastructure/opa/opa-sidecar-bundle.rego` and `.test.rego`

### 31-detect-duplicate-rulesets.mjs
- Line 18: references `rulesets/` directory

### agentic/13-agentic-code-review.mjs
- Line 55: `args: ["packages/mcp-server/dist/main.js"]`

---

## 12. Harness Playbooks

### topology-compliance-audit.mjs
Lines 186-197: 12 hardcoded rulesets/ paths
Line 240: `sdk/cli/src/commands/architecture/scaffold.command.ts`

### sdlc-deep-audit.mjs
Lines 189-505: ~40+ hardcoded references across packages/, apps/, sdk/cli/, rulesets/

### run-evolith-intelligent-data-audit.mjs
Lines 31-115: ~30 hardcoded references to rulesets/, sdk/cli/, packages/, apps/

---

## 13. BMAD Workflows

### .bmad-core/workflows/qa-suite.yaml
Lines 37-72: ~18 references to packages/*, sdk/cli, apps/* via npm workspace commands

### .bmad-core/workflows/development.yaml
Line 32: `deliverable: "apps/api/src/ and apps/web/src/"`

---

## 14. Infrastructure Config

### product/infra/docker-compose.evolith.yml
- Line 39: `dockerfile: apps/core-api/Dockerfile` -> `src/apps/core-api/Dockerfile`
- Line 66: `dockerfile: packages/mcp-server/Dockerfile` -> `src/packages/mcp-server/Dockerfile`
- Line 91: `dockerfile: apps/agent-runtime-api/Dockerfile` -> `src/apps/agent-runtime-api/Dockerfile`

### Helm values.yaml files
- product/infra/helm/evolith-core-api/values.yaml lines 5-6: comment about `apps/core-api/Dockerfile`
- product/infra/helm/evolith-mcp/values.yaml line 11: comment about `packages/mcp-server/Dockerfile`

---

## 15. .gitignore

Line 149: `rulesets/opa/policy.wasm` -> `src/rulesets/opa/policy.wasm`
Line 150: `sdk/cli/rulesets/opa/policy.wasm` -> `src/sdk/cli/rulesets/opa/policy.wasm`

---

## 16. jest.config.js Files (root-level references)

### sdk/cli/jest.config.js
Line 42: `'<rootDir>/../../packages/core-domain/src/$1'` -> `'<rootDir>/../../../packages/core-domain/src/$1'`

### packages/core-domain/jest.config.js
Line 12: `'<rootDir>/../../sdk/cli/src/test/mocks/index.ts'` -> `'<rootDir>/../../sdk/cli/src/test/mocks/index.ts'` (stays same if sibling)

---

## 17. TypeScript Source References to rulesets/

### In apps/ (5 files):
- apps/core-api/src/presentation/controllers/evaluation.controller.spec.ts (line 17)
- apps/core-api/src/presentation/dtos/satellite-manifest.dto.ts (line 6)
- apps/core-api/src/infrastructure/guards/tenant-correlation-id.middleware.ts (line 8)
- apps/core-api/src/e2e.spec.ts (line 99)
- apps/core-api/src/presentation/controllers/reference.controller.ts (line 22)

### In sdk/cli/ (15+ files):
Key ones with hardcoded rulesets/ paths:
- sdk/cli/src/commands/agents/agents.command.ts (lines 230, 314)
- sdk/cli/src/infrastructure/adapters/agent-registry.service.ts (line 24)
- sdk/cli/src/infrastructure/adapters/agent-registry.service.spec.ts (lines 36, 57, 119)
- sdk/cli/test/gate.e2e-spec.ts (lines 90, 175)
- sdk/cli/src/contributions/contribution-validator.spec.ts (lines 11, 23, 35, 70-75)
- sdk/cli/src/infrastructure/architecture/topology-catalog.ts (line 6)
- sdk/cli/test/e2e/phase-gates-e2e.test.ts (lines 17, 380)
- sdk/cli/src/commands/fixtures/fixtures.command.ts (lines 218, 236)

### In packages/ (30+ files, 126 matches):
Most critical:
- packages/core-domain/src/application/validators/modes/ruleset-validation.mode.ts (lines 9-25): 17 hardcoded rulesets/ paths
- packages/core-domain/src/application/services/satellite-evaluation-pipeline.spec.ts: 10+ rulesets/ refs
- packages/core-domain/src/application/services/satellite-evaluation-pipeline.service.ts (line 288)
- packages/core-domain/src/application/use-cases/sync-satellite.use-case.ts (line 44)
- packages/core-domain/src/__e2e__/governance-flow.e2e.spec.ts (line 400)
- packages/agent-runtime/src/adapters/policy/opa-cli-policy-validation.adapter.ts (line 37)
- packages/infra-providers/src/disk-ruleset.repository.spec.ts (20+ refs)
- packages/mcp-server/src/tools/validate.tool.ts (line 156)

NOTE: Many of these are LOGICAL references (describing where rulesets live in a satellite repo) rather than filesystem paths. Distinguish carefully.

---

## 18. Documentation References (Markdown)

### gap-tracking.md / gap-tracking.es.md
Approximately 50+ inline references to apps/, packages/, sdk/cli, rulesets/ paths. These are historical evidence citations and likely should NOT be updated (they describe past state).

### gap-reference-catalog.md
Approximately 40+ references -- same historical consideration.

### gap-closure-evidence.json
Approximately 300+ references -- machine-generated evidence record, historical.

### product/infra/helm/README.md and README.es.md
Lines 16, 33, 161: references to apps/core-api, packages/mcp-server, rulesets/

### AGENTS.md (root)
No direct references to the five moving directories. References .harness/ paths only.

### MASTER_INDEX.md
Redirects to reference/navigation/ -- no direct path refs to moving dirs.

---

## 19. Obsidian workspace.json

Lines 182-215: Multiple references to apps/, packages/, sdk/ file paths. This file is gitignored but indicates editor state will break.

---

## MIGRATION SEQUENCE RECOMMENDATION

1. **Create src/ directory**
2. **Move directories** (one at a time or atomically via git mv)
3. **Update package.json workspaces** (highest priority -- npm resolution)
4. **Update root tsconfig.json references**
5. **Update all child tsconfig extends paths** (9 files)
6. **Update cross-package tsconfig references**
7. **Update Dockerfiles** (4 files)
8. **Update GitHub Actions workflows** (5 files with path refs)
9. **Update .husky/pre-push grep pattern**
10. **Update ci-runner.mjs changed-file detection**
11. **Update all CI scripts** (~10 files with hardcoded paths)
12. **Update harness playbooks** (~3 files)
13. **Update jest.config.js files** (2-3 files)
14. **Update .gitignore** (2 lines)
15. **Update BMAD workflows** (2 files)
16. **Update docker-compose.evolith.yml** (3 lines)
17. **Update Helm values.yaml comments** (2 files)
18. **Decide on TypeScript source rulesets/ references** (many are logical, not filesystem)
19. **Decide on documentation/historical references** (likely keep as-is)
20. **Run full CI validation suite** to catch anything missed

## RISK ASSESSMENT

- **Build breakage**: VERY LIKELY if any tsconfig path is wrong -- tsc -b will fail
- **npm workspace resolution**: WILL BREAK if package.json workspaces not updated first
- **Docker builds**: WILL BREAK if COPY paths wrong
- **CI pipelines**: WILL BREAK on path triggers and working-directory references
- **Test suites**: WILL BREAK if jest rootDir/moduleNameMapper paths wrong
- **OPA policy loading**: WILL BREAK if rulesets/ runtime path changes
- **npm run --workspace <name>**: SAFE -- uses package name not path (but working-directory: sdk/cli breaks)
