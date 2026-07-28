/**
 * GT-613 — the structural-reviewer seam now has an adapter.
 *
 * The regression these tests guard is the gap itself: `grep -rn "implements
 * IStructuralReviewer" src` returned ZERO, so the port, the provider and the
 * rubric formed a complete shape with nothing plugged into it. The first test
 * asserts the wiring exists; the rest assert the adapter does real work and is
 * honest about what it does NOT look at.
 */

import {
  HeuristicStructuralReviewer,
  HEURISTIC_COVERED_STANDARDS,
  HEURISTIC_UNCOVERED_STANDARDS,
} from './heuristic-structural-reviewer.adapter';
import type { IStructuralReviewer } from '../../domain/ports/structural-reviewer.port';
import {
  StructuralReviewProvider,
  STRUCTURAL_REVIEW_PROVIDER_ID,
} from '../../application/structural-review-provider';
import { TenantQualitySignalRegistry } from '../../application/quality-signal-registry';
import { evaluateStructuralGate } from '../../application/structural-quality-gate';
import { STRUCTURAL_STANDARDS } from '../../domain/rubrics/structural-review-rubric';

const FIXED_NOW = () => '2026-07-28T00:00:00.000Z';

const review = (files: { path: string; content: string }[]) =>
  new HeuristicStructuralReviewer().review({ files });

const lines = (n: number, text = 'const x = 1;') => Array.from({ length: n }, () => text).join('\n');

describe('HeuristicStructuralReviewer implements IStructuralReviewer (GT-613)', () => {
  it('is assignable to the port — the seam is no longer empty', () => {
    const reviewer: IStructuralReviewer = new HeuristicStructuralReviewer();
    expect(typeof reviewer.review).toBe('function');
    expect(reviewer.determinism).toBe('deterministic');
  });

  it('declares its coverage instead of pretending to cover the whole rubric', () => {
    const reviewer = new HeuristicStructuralReviewer();
    expect(reviewer.coveredStandards).toEqual(HEURISTIC_COVERED_STANDARDS);
    // Judgement standards are excluded, explicitly and by name.
    for (const uncovered of HEURISTIC_UNCOVERED_STANDARDS) {
      expect(reviewer.coveredStandards).not.toContain(uncovered);
    }
    // Every id it names is a real rubric standard.
    const rubricIds = STRUCTURAL_STANDARDS.map((s) => s.id);
    for (const id of [...HEURISTIC_COVERED_STANDARDS, ...HEURISTIC_UNCOVERED_STANDARDS]) {
      expect(rubricIds).toContain(id);
    }
  });

  it('opting into dead-code detection widens the declared coverage', () => {
    const reviewer = new HeuristicStructuralReviewer({ detectDeadCode: true });
    expect(reviewer.coveredStandards).toContain('dead-code-and-scope');
  });
});

describe('layering-and-boundaries (critical)', () => {
  it('flags a domain file importing an adapter', async () => {
    const findings = await review([
      {
        path: 'src/domain/ports/thing.port.ts',
        content: "import { X } from '../../adapters/http/x.adapter';\nexport type T = X;\n",
      },
    ]);
    const layering = findings.filter((f) => f.standardId === 'layering-and-boundaries');
    expect(layering).toHaveLength(1);
    expect(layering[0].severity).toBe('critical');
    expect(layering[0].location).toBe('src/domain/ports/thing.port.ts:1');
    expect(layering[0].message).toMatch(/outward into adapters/);
  });

  it('does NOT flag an outward layer importing inward, nor a package import', async () => {
    const findings = await review([
      {
        path: 'src/adapters/http/x.adapter.ts',
        content:
          "import type { T } from '../../domain/ports/thing.port';\n" +
          "import { readFileSync } from 'node:fs';\n" +
          'export const a: T = null as never;\n',
      },
    ]);
    expect(findings.filter((f) => f.standardId === 'layering-and-boundaries')).toEqual([]);
  });
});

describe('spaghetti-detection (high)', () => {
  it('flags nesting beyond the budget and reports the peak line', async () => {
    const reviewer = new HeuristicStructuralReviewer({ maxNestingDepth: 3 });
    const findings = await reviewer.review({
      files: [
        {
          path: 'src/application/tangle.ts',
          content:
            'function f() {\n  if (a) {\n    while (b) {\n      for (;;) {\n        g();\n      }\n    }\n  }\n}\n',
        },
      ],
    });
    const spaghetti = findings.filter((f) => f.standardId === 'spaghetti-detection');
    expect(spaghetti).toHaveLength(1);
    expect(spaghetti[0].severity).toBe('high');
    expect(spaghetti[0].message).toMatch(/nests 4 levels deep/);
  });

  it('does not count braces inside strings or comments', async () => {
    const reviewer = new HeuristicStructuralReviewer({ maxNestingDepth: 1 });
    const findings = await reviewer.review({
      files: [
        {
          path: 'src/application/quiet.ts',
          content: "const s = '{{{{{'; // }}}}}\nconst t = 2;\n",
        },
      ],
    });
    expect(findings.filter((f) => f.standardId === 'spaghetti-detection')).toEqual([]);
  });
});

describe('file-size-discipline (low)', () => {
  it('flags an oversized file', async () => {
    const reviewer = new HeuristicStructuralReviewer({ maxFileLines: 10 });
    const findings = await reviewer.review({
      files: [{ path: 'src/application/big.ts', content: lines(25) }],
    });
    const size = findings.filter((f) => f.standardId === 'file-size-discipline');
    expect(size.length).toBeGreaterThanOrEqual(1);
    expect(size[0].severity).toBe('low');
    expect(size[0].message).toMatch(/is 25 lines/);
  });

  it('flags an oversized standalone function AND an oversized class method', async () => {
    const body = Array.from({ length: 20 }, (_, i) => `  const v${i} = ${i};`).join('\n');
    const reviewer = new HeuristicStructuralReviewer({
      maxFileLines: 9999,
      maxFunctionLines: 5,
      duplicateBlockLines: 999,
    });
    const findings = await reviewer.review({
      files: [
        {
          path: 'src/application/f.ts',
          content: `export function huge() {\n${body}\n}\n\nclass C {\n  method() {\n${body}\n  }\n}\n`,
        },
      ],
    });
    const names = findings.map((f) => f.message);
    expect(names).toContain("'huge' spans 22 lines (budget 5).");
    expect(names).toContain("'method' spans 22 lines (budget 5).");
  });

  it('leaves a file inside the budget alone', async () => {
    const reviewer = new HeuristicStructuralReviewer({ maxFileLines: 100, maxFunctionLines: 100 });
    const findings = await reviewer.review({
      files: [{ path: 'src/application/small.ts', content: lines(5) }],
    });
    expect(findings.filter((f) => f.standardId === 'file-size-discipline')).toEqual([]);
  });
});

describe('duplication-and-dry (medium)', () => {
  it('flags an identical block repeated across files and cites the first occurrence', async () => {
    const block = ['const a = 1;', 'const b = 2;', 'const c = 3;'].join('\n');
    const reviewer = new HeuristicStructuralReviewer({ duplicateBlockLines: 3, maxFileLines: 999 });
    const findings = await reviewer.review({
      files: [
        { path: 'src/application/one.ts', content: block },
        { path: 'src/application/two.ts', content: block },
      ],
    });
    const dup = findings.filter((f) => f.standardId === 'duplication-and-dry');
    expect(dup).toHaveLength(1);
    expect(dup[0].severity).toBe('medium');
    expect(dup[0].message).toContain('src/application/one.ts:1');
    expect(dup[0].location).toBe('src/application/two.ts:1');
  });
});

describe('honesty guarantees', () => {
  it('never emits a judgement standard, even on code that would provoke one', async () => {
    const findings = await review([
      {
        path: 'src/application/over-engineered.ts',
        content:
          'export abstract class AbstractFactoryProviderStrategy {}\n' +
          'export class ConcreteFactoryProviderStrategyImpl extends AbstractFactoryProviderStrategy {}\n',
      },
    ]);
    for (const uncovered of HEURISTIC_UNCOVERED_STANDARDS) {
      expect(findings.some((f) => f.standardId === uncovered)).toBe(false);
    }
  });

  it('returns nothing when given no inline files — it does no I/O by design', async () => {
    const reviewer = new HeuristicStructuralReviewer();
    expect(await reviewer.review({ repositoryRef: 'repo@abc123' })).toEqual([]);
  });

  it('skips non-source files rather than measuring them with rules that do not apply', async () => {
    const reviewer = new HeuristicStructuralReviewer({ maxFileLines: 2 });
    expect(await reviewer.review({ files: [{ path: 'README.md', content: lines(50) }] })).toEqual([]);
  });

  it('is DETERMINISTIC: identical input yields byte-identical findings', async () => {
    const files = [
      {
        path: 'src/domain/leaky.ts',
        content: "import { X } from '../adapters/x';\n" + lines(30),
      },
      { path: 'src/application/dup.ts', content: lines(30) },
    ];
    const a = await new HeuristicStructuralReviewer({ maxFileLines: 10 }).review({ files });
    const b = await new HeuristicStructuralReviewer({ maxFileLines: 10 }).review({ files });
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });
});

describe('wired through StructuralReviewProvider (GT-613 × GT-535)', () => {
  const files = [
    {
      path: 'src/domain/ports/leaky.port.ts',
      content: "import { Http } from '../../adapters/http/client';\nexport type T = Http;\n",
    },
  ];

  it('emits DETERMINISTIC Evidence — the reviewer measures, it does not judge', async () => {
    const provider = new StructuralReviewProvider(new HeuristicStructuralReviewer(), { now: FIXED_NOW });
    const evidence = await provider.collect(
      { repositoryRef: 'repo@abc123', config: { files } },
      { tenantId: 't-1', dimension: 'code-quality' },
    );

    expect(evidence.determinism).toBe('deterministic');
    expect(evidence.findings[0].code).toBe('structural-review.layering-and-boundaries');
    expect(evidence.metrics['severity.critical']).toBe(1);
    expect(evidence.provenance.artifactHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('an UNLABELLED reviewer still reads as probabilistic (fail-safe default preserved)', async () => {
    const unlabelled: IStructuralReviewer = { review: async () => [] };
    const provider = new StructuralReviewProvider(unlabelled, { now: FIXED_NOW });
    const evidence = await provider.collect({}, { tenantId: 't-1' });
    expect(evidence.determinism).toBe('probabilistic');
  });

  it('the determinism CLAIM is inside the tamper-evidence hash', async () => {
    const deterministic = new StructuralReviewProvider(
      { review: async () => [], determinism: 'deterministic' },
      { now: FIXED_NOW },
    );
    const probabilistic = new StructuralReviewProvider({ review: async () => [] }, { now: FIXED_NOW });

    const a = await deterministic.collect({}, { tenantId: 't-1' });
    const b = await probabilistic.collect({}, { tenantId: 't-1' });
    expect(a.provenance.artifactHash).not.toBe(b.provenance.artifactHash);
  });

  it('registers in the tenant registry and collects through it (adapter → provider → registry)', async () => {
    const registry = new TenantQualitySignalRegistry().register(
      new StructuralReviewProvider(new HeuristicStructuralReviewer(), { now: FIXED_NOW }),
    );
    const { evidence, outcomes } = await registry.collect(
      {
        tenantId: 't-1',
        providers: [{ id: STRUCTURAL_REVIEW_PROVIDER_ID, enabled: true, config: { files } }],
      },
      { repositoryRef: 'repo@abc123' },
      { tenantId: 't-1', dimension: 'code-quality' },
    );

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].ok).toBe(true);
    expect(evidence).toHaveLength(1);
    expect(evidence[0].determinism).toBe('deterministic');
    expect(evidence[0].findings[0].code).toBe('structural-review.layering-and-boundaries');
  });

  it('a real layering break reaches the Quality Gate as BLOCKING', async () => {
    const provider = new StructuralReviewProvider(new HeuristicStructuralReviewer(), { now: FIXED_NOW });
    const evidence = await provider.collect(
      { repositoryRef: 'repo@abc123', config: { files } },
      { tenantId: 't-1', dimension: 'code-quality' },
    );
    const gate = evaluateStructuralGate([evidence]);
    expect(gate.decision).toBe('block');
    expect(gate.peakSeverity).toBe('critical');
  });
});
