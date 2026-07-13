import type { OwnershipEntry } from '@beyondnet/evolith-core-domain/domain/ownership';
import { loadBackstageOwnership } from './backstage-catalog.loader';

describe('loadBackstageOwnership', () => {
  it('parses a multi-document catalog-info.yaml into OwnershipEntry[]', () => {
    const yamlText = `apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: billing-service
  annotations:
    evolith.io/path: services/billing
spec:
  type: service
  owner: team-payments
---
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: checkout-web
  annotations:
    backstage.io/source-location: file:apps/checkout
spec:
  type: website
  owner: team-storefront
---
# a non-component entity that must be dropped
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: commerce
spec:
  owner: team-platform
`;

    const expected: OwnershipEntry[] = [
      { component: 'billing-service', owner: 'team-payments', pathPrefix: 'services/billing', source: 'backstage' },
      { component: 'checkout-web', owner: 'team-storefront', pathPrefix: 'apps/checkout', source: 'backstage' },
    ];

    expect(loadBackstageOwnership(yamlText)).toEqual(expected);
  });

  it('parses a single-document catalog-info.yaml', () => {
    const yamlText = `apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: notifier
spec:
  owner: team-comms
`;

    expect(loadBackstageOwnership(yamlText)).toEqual([
      { component: 'notifier', owner: 'team-comms', pathPrefix: undefined, source: 'backstage' },
    ]);
  });

  it('drops components missing a name or owner and ignores empty documents', () => {
    const yamlText = `kind: Component
metadata:
  name: no-owner
spec:
  type: service
---
---
kind: Component
spec:
  owner: team-orphan
`;

    expect(loadBackstageOwnership(yamlText)).toEqual([]);
  });

  it('returns an empty array for blank input', () => {
    expect(loadBackstageOwnership('')).toEqual([]);
    expect(loadBackstageOwnership('# only a comment\n')).toEqual([]);
  });
});
