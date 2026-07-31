import { copyFileSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const scriptPath = fileURLToPath(
  new URL('./20-validate-surface-compatibility.mjs', import.meta.url),
);

// The guard anchors on `process.cwd()`, so the fixture layout must mirror the two
// paths it actually reads — BOTH under `audits/`. They were written one directory
// too high here, into a `reference/core/control-center/` that `setup` never created,
// so every case in this file died in setup with ENOENT and none of them had ever run.
const MATRIX_REL = 'reference/core/control-center/audits/surface-compatibility.json';
const SCHEMA_REL = 'reference/core/control-center/audits/surface-compatibility.schema.json';

// The real schema, not a copy of it. The guard validates the fixture matrix against
// whatever it finds here, and a hand-written stand-in would let the matrix shape and
// the schema drift apart without a single case going red.
const realSchema = fileURLToPath(new URL(`../../../${SCHEMA_REL}`, import.meta.url));

function runIn(cwd) {
  return spawnSync('node', [scriptPath], { cwd, encoding: 'utf8' });
}

function write(root, rel, content) {
  const full = join(root, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

// `version` and `migrations` are required at the top level of the schema. Defaulting
// them here keeps each case's literal about the one thing that case is testing, and a
// case that cares about migrations still overrides the default by spreading over it.
const MATRIX_DEFAULTS = { version: '1.0.0', migrations: [] };

function setup(matrix, sources) {
  const root = mkdtempSync(join(tmpdir(), 'surface-compat-'));
  write(root, MATRIX_REL, JSON.stringify({ ...MATRIX_DEFAULTS, ...matrix }, null, 2));
  mkdirSync(dirname(join(root, SCHEMA_REL)), { recursive: true });
  copyFileSync(realSchema, join(root, SCHEMA_REL));
  for (const [path, content] of Object.entries(sources)) {
    write(root, path, content);
  }
  return root;
}

test('passes when matrix and source agree', () => {
  const root = setup(
    {
      surfaces: {
        rest: {
          module: 'src/envelope.ts',
          constant: 'ENVELOPE_SCHEMA_VERSION',
          produces: ['1.0.0'],
          consumes: ['1.x'],
        },
      },
    },
    {
      'src/envelope.ts': `export const ENVELOPE_SCHEMA_VERSION = '1.0.0';`,
    },
  );
  try {
    const out = runIn(root);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /consistent for 1 surfaces/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails when source constant does not match matrix produces[0]', () => {
  const root = setup(
    {
      surfaces: {
        rest: {
          module: 'src/envelope.ts',
          constant: 'ENVELOPE_SCHEMA_VERSION',
          produces: ['1.0.0'],
          consumes: ['1.x'],
        },
      },
    },
    {
      'src/envelope.ts': `export const ENVELOPE_SCHEMA_VERSION = '2.0.0';`,
    },
  );
  try {
    const out = runIn(root);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /does not match matrix produces\[0\]/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails when declared module is missing', () => {
  const root = setup(
    {
      surfaces: {
        rest: {
          module: 'src/missing.ts',
          constant: 'X',
          produces: ['1.0.0'],
          consumes: ['1.x'],
        },
      },
    },
    {},
  );
  try {
    const out = runIn(root);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /module not found/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails when multi-version produces lacks a migration entry', () => {
  const root = setup(
    {
      surfaces: {
        rest: {
          module: 'src/envelope.ts',
          constant: 'ENVELOPE_SCHEMA_VERSION',
          produces: ['2.0.0', '1.0.0'],
          consumes: ['1.x', '2.x'],
        },
      },
      migrations: [],
    },
    {
      'src/envelope.ts': `export const ENVELOPE_SCHEMA_VERSION = '2.0.0';`,
    },
  );
  try {
    const out = runIn(root);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /producer transition 1\.0\.0 → 2\.0\.0 is not documented/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('passes when each multi-version transition has a migration entry', () => {
  const root = setup(
    {
      surfaces: {
        rest: {
          module: 'src/envelope.ts',
          constant: 'ENVELOPE_SCHEMA_VERSION',
          produces: ['2.0.0', '1.0.0'],
          consumes: ['1.x', '2.x'],
        },
      },
      migrations: [
        {
          surface: 'rest',
          from: '1.0.0',
          to: '2.0.0',
          summary: 'Renamed meta.context.tenant to meta.context.organization.',
          compatibility: 'breaking',
        },
      ],
    },
    {
      'src/envelope.ts': `export const ENVELOPE_SCHEMA_VERSION = '2.0.0';`,
    },
  );
  try {
    const out = runIn(root);
    assert.equal(out.status, 0, out.stdout + out.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails when constant is missing in module', () => {
  const root = setup(
    {
      surfaces: {
        rest: {
          module: 'src/envelope.ts',
          constant: 'ABSENT',
          produces: ['1.0.0'],
          consumes: ['1.x'],
        },
      },
    },
    {
      'src/envelope.ts': `export const OTHER = '1.0.0';`,
    },
  );
  try {
    const out = runIn(root);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /constant ABSENT not found/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
