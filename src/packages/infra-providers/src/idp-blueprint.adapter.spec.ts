import type {
  BlueprintOwnershipRecord,
  OwnershipEntry,
} from '@beyondnet/evolith-core-domain/domain/ownership';
import type { BlueprintHttpClient } from './idp-blueprint.adapter';
import { fetchBlueprintOwnership } from './idp-blueprint.adapter';

/** A stub client returning canned records — no network. */
function stubClient(records: BlueprintOwnershipRecord[]): BlueprintHttpClient {
  return { listEntities: async () => records };
}

describe('fetchBlueprintOwnership', () => {
  it('fetches via the injected client and maps to canonical OwnershipEntry[]', async () => {
    const client = stubClient([
      // component|identifier, owner|team, optional path
      { component: 'billing-service', owner: 'team-payments', path: './services/billing/' },
      { identifier: 'checkout-web', team: 'team-storefront', path: 'apps\\checkout' },
      { identifier: 'notify-worker', owner: 'team-comms' },
    ]);

    const entries = await fetchBlueprintOwnership(client, 'port');

    const expected: OwnershipEntry[] = [
      { component: 'billing-service', owner: 'team-payments', pathPrefix: 'services/billing', source: 'port' },
      { component: 'checkout-web', owner: 'team-storefront', pathPrefix: 'apps/checkout', source: 'port' },
      { component: 'notify-worker', owner: 'team-comms', pathPrefix: undefined, source: 'port' },
    ];
    expect(entries).toEqual(expected);
  });

  it('drops records with no owner (owner|team both absent)', async () => {
    const client = stubClient([
      { component: 'orphan-service', path: 'services/orphan' },
      { component: 'owned-service', owner: 'team-a' },
    ]);

    const entries = await fetchBlueprintOwnership(client, 'cortex');

    expect(entries).toEqual([
      { component: 'owned-service', owner: 'team-a', pathPrefix: undefined, source: 'cortex' },
    ]);
  });

  it('tags provenance from the source argument', async () => {
    const client = stubClient([{ identifier: 'svc', team: 'team-x' }]);
    const entries = await fetchBlueprintOwnership(client, 'opslevel');
    expect(entries[0].source).toBe('opslevel');
  });
});
