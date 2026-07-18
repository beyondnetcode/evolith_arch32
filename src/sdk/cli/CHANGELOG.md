# Changelog

## [1.0.2]

### Bug Fixes

* **deps:** declare `@beyondnet/evolith-infra-providers` as a runtime dependency. It is imported by the shipped `dist` (`app.module.js`, `scaffold`, `waiver`, `topology recommend`, `satellite create/adopt`) but was missing from `dependencies`, so a clean install (`npx`/`npm i -g`) crashed at boot with `Cannot find module '@beyondnet/evolith-infra-providers'` — the 1.0.1 artifact did not run at all (GT-451).

### Build

* **release:** harden the release-drift guard (`check:release-drift`) to also assert every `@beyondnet/*` package imported by the shipped `dist` is declared in `dependencies`, so a missing runtime dependency can never be published again (GT-451).

## [Unreleased]

### Features

* **cli:** enforce hexagonal architecture layer boundaries with eslint-plugin-boundaries; adds `npm run lint` script and CI lint gate

### Bug Fixes

* **validate:** never report a green pass with 0 rules resolved — degrade to a warning with `GOV-CORE-UNRESOLVED` (GT-452)
* **validate:** resolve Core rulesets from any satellite (`--core` → `EVOLITH_CORE_PATH` → profile → bundled); `-r <id>` resolves against bundled and `<core>/src/rulesets`; populate `coreRef.path`; fail actionably on an invalid `--core` (GT-456)
* **validate:** show per-issue detail (ruleId/title/severity) in `-f table` output (GT-457)
* **docs:** scaffold `evolith.yaml` at the repo root in the `evolith.dev/v1` schema instead of a legacy `.evolith/evolith.yaml` (GT-454)
* **templates:** regenerate `evolith.yaml.example` to the `evolith.dev/v1` schema so it validates against `evolith-yaml.schema.json` (GT-453)

### Build

* **release:** add a release-drift guard (`check:release-drift`) to `prepublishOnly` so a stale `dist/` (missing merged fixes) can never be published under an unchanged version (GT-451)

## [1.1.0](https://github.com/beyondnetcode/evolith_arch32/compare/cli-v1.0.3...cli-v1.1.0) (2026-06-04)


### Features

* **cli:** add sdlc ddd and handoff command mocks ([e40260f](https://github.com/beyondnetcode/evolith_arch32/commit/e40260f46c040df7cb034b29860fc498debd2698))

## [1.0.3](https://github.com/beyondnetcode/evolith_arch32/compare/cli-v1.0.2...cli-v1.0.3) (2026-06-03)


### Bug Fixes

* resolve npm metadata and link resolution ([2d51119](https://github.com/beyondnetcode/evolith_arch32/commit/2d51119f6e8d145a23f14ddce590db995cac5846))

## [1.0.2](https://github.com/beyondnetcode/evolith_arch32/compare/cli-v1.0.1...cli-v1.0.2) (2026-06-03)


### Bug Fixes

* resolve typescript compilation errors in cli build for release ([c147aa4](https://github.com/beyondnetcode/evolith_arch32/commit/c147aa41d1b936ae15ea7617ece608e85b35a9ba))

## [1.0.1](https://github.com/beyondnetcode/evolith_arch32/compare/cli-v1.0.0...cli-v1.0.1) (2026-06-03)


### Bug Fixes

* remove emojis, fix mojibake and resolve structural mismatch ([ce2b2fa](https://github.com/beyondnetcode/evolith_arch32/commit/ce2b2fa828024bd7789cc8cb6ebc67e1bd31b5b5))

## 1.0.0 (2026-06-03)


### Features

* **cli:** add boilerplate commands (agents, validate, docs, upgrade) ([3a787e7](https://github.com/beyondnetcode/evolith_arch32/commit/3a787e764f7320b9989a4ff07209807533adfd72))
* **cli:** add daemon, watcher, and mcp server for IDE integration ([ef5e228](https://github.com/beyondnetcode/evolith_arch32/commit/ef5e228c5ebeeb3eafe5304b9df9c3d10aefddac))
* **cli:** add yaml configuration management and update app module ([bbb4390](https://github.com/beyondnetcode/evolith_arch32/commit/bbb4390701f68cefe4164ffe41fefcab4be97a5f))
* **cli:** implement file manager and template sync services ([1292be3](https://github.com/beyondnetcode/evolith_arch32/commit/1292be3f3daa82c5402c273b7bae5bf80645a8af))


### Bug Fixes

* initialize cli documentation and settings for release ([6c9635d](https://github.com/beyondnetcode/evolith_arch32/commit/6c9635df7b54e8e13475543808f7a3993d2b027a))
* trigger github action release for sdk cli ([88c197a](https://github.com/beyondnetcode/evolith_arch32/commit/88c197a2514d5b991f3ff6686cbc9b77386b4aaf))
