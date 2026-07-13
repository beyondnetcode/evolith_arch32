import {
  enrichViolationsWithOwner,
  parseBackstageCatalog,
  parseBlueprintOwnership,
  resolveOwner,
  type BackstageEntity,
  type OwnershipEntry,
} from './ownership';
import { enrichViolationsWithCompliance } from './compliance';
import { makeViolation } from './violation';

const base = { tool: 'NetArchTest', line: undefined, column: undefined, severity: 'error' as const, message: 'x' };

describe('parseBackstageCatalog (GT-527 — catalog-info → canonical ownership)', () => {
  const component = (name: string, owner: string, annotations?: Record<string, string>): BackstageEntity => ({
    kind: 'Component',
    metadata: { name, annotations },
    spec: { owner },
  });

  it('maps Component entities to {component, owner, source:backstage}', () => {
    const out = parseBackstageCatalog([component('orders', 'team-orders')]);
    expect(out).toEqual([{ component: 'orders', owner: 'team-orders', pathPrefix: undefined, source: 'backstage' }]);
  });

  it('reads the pathPrefix from evolith.io/path, else a relative source-location', () => {
    const explicit = parseBackstageCatalog([component('a', 'ta', { 'evolith.io/path': 'services/a/' })]);
    expect(explicit[0].pathPrefix).toBe('services/a');
    const fromSource = parseBackstageCatalog([component('b', 'tb', { 'backstage.io/source-location': 'file:services/b' })]);
    expect(fromSource[0].pathPrefix).toBe('services/b');
    const urlSource = parseBackstageCatalog([component('c', 'tc', { 'backstage.io/source-location': 'url:https://github.com/o/r' })]);
    expect(urlSource[0].pathPrefix).toBeUndefined(); // a url is not a path
  });

  it('drops non-Components and entities missing name or owner (read-only, no lock-in)', () => {
    const out = parseBackstageCatalog([
      { kind: 'API', metadata: { name: 'x' }, spec: { owner: 't' } },
      { kind: 'Component', metadata: { name: 'y' } }, // no owner
      { kind: 'Component', spec: { owner: 't' } }, // no name
    ]);
    expect(out).toEqual([]);
  });
});

describe('parseBlueprintOwnership (Port/Cortex/OpsLevel generic records)', () => {
  it('accepts component|identifier and owner|team', () => {
    const out = parseBlueprintOwnership([
      { identifier: 'svc-a', team: 'team-a', path: './apps/a' },
      { component: 'svc-b', owner: 'team-b' },
      { identifier: 'svc-c' }, // no owner → dropped
    ], 'port');
    expect(out).toEqual([
      { component: 'svc-a', owner: 'team-a', pathPrefix: 'apps/a', source: 'port' },
      { component: 'svc-b', owner: 'team-b', pathPrefix: undefined, source: 'port' },
    ]);
  });
});

describe('resolveOwner (longest-prefix file → owner)', () => {
  const entries: OwnershipEntry[] = [
    { component: 'root', owner: 'team-platform', pathPrefix: 'src', source: 'backstage' },
    { component: 'orders', owner: 'team-orders', pathPrefix: 'src/domain/orders', source: 'backstage' },
    { component: 'noPath', owner: 'team-x', source: 'backstage' },
  ];

  it('picks the most specific owning path', () => {
    expect(resolveOwner('src/domain/orders/order.ts', entries)).toBe('team-orders');
    expect(resolveOwner('src/api/x.ts', entries)).toBe('team-platform');
  });

  it('returns undefined when no owned path contains the file', () => {
    expect(resolveOwner('other/y.ts', entries)).toBeUndefined();
  });
});

describe('enrichViolationsWithOwner + the owner→compliance chain (GT-527 × GT-525)', () => {
  const entries: OwnershipEntry[] = [{ component: 'orders', owner: 'team-orders', pathPrefix: 'src/domain', source: 'backstage' }];

  it('sets a resolved owner without overwriting an existing one, and never on a locationless finding', () => {
    const [resolved] = enrichViolationsWithOwner([makeViolation({ ...base, ruleId: 'r', file: 'src/domain/order.ts' })], entries);
    expect(resolved.owner).toBe('team-orders');
    const [kept] = enrichViolationsWithOwner([makeViolation({ ...base, ruleId: 'r', file: 'src/domain/order.ts', owner: '@already' })], entries);
    expect(kept.owner).toBe('@already');
    const [none] = enrichViolationsWithOwner([makeViolation({ ...base, ruleId: 'r', file: '' })], entries);
    expect(none.owner).toBeUndefined();
  });

  it('composes: a violation can carry both owner (GT-527) and complianceControls (GT-525)', () => {
    const raw = makeViolation({ ...base, ruleId: 'HXA-01', adrRef: 'ADR-0002', file: 'src/domain/order.ts' });
    const [enriched] = enrichViolationsWithCompliance(enrichViolationsWithOwner([raw], entries));
    expect(enriched.owner).toBe('team-orders');
    expect(enriched.complianceControls).toEqual(['ISO27001-A.14.2.5', 'SOC2-CC8.1']);
    expect(enriched.fingerprint).toBe(raw.fingerprint); // both are non-identity metadata
  });
});
