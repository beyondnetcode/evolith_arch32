import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const scriptPath = fileURLToPath(
  new URL('./20-validate-surface-compatibility.mjs', import.meta.url),
);

function runIn(cwd) {
  return spawnSync('node', [scriptPath], { cwd, encoding: 'utf8' });
}

function setup(matrix, sources) {
  const root = mkdtempSync(join(tmpdir(), 'surface-compat-'));
  mkdirSync(
    join(root, 'reference/core/sdlc/standards/vision'),
    { recursive: true },
  );
  writeFileSync(
    join(root, 'reference/core/control-center/surface-compatibility.json'),
    JSON.stringify(matrix, null, 2),
  );
  for (const [path, content] of Object.entries(sources)) {
    const full = join(root, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
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
