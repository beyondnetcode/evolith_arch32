const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');

process.env.CORE_PATH = process.env.CORE_PATH || repoRoot;
// GAP API-WSROOT: core-domain resolves governance rulesets from WORKSPACE_ROOT;
// without it the SDLC ruleset load throws ENOENT and ~22 specs fail. Anchor it
// to the monorepo root so `npm test` is green without manual env wiring.
process.env.WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || repoRoot;
