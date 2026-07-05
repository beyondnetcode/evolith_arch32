import { BadRequestException } from '@nestjs/common';
import type { AgentRuntimeBundle } from '@beyondnet/evolith-agent-runtime';
import { AgentRuntimeController } from './agent-runtime.controller';

/**
 * The conversational surface is adapter-neutral: `/converse` is the canonical
 * public entry point and `/hermes` is a deprecated back-compat alias. Both must
 * route identically through the same interaction adapter and the same
 * `runtime.handle` call. These specs assert that equivalence without renaming
 * the underlying HermesChatBoxInteractionAdapter.
 */
describe('AgentRuntimeController conversational surface', () => {
  const conversationalBody = {
    message: 'hello assistant',
    conversationId: 'conv-1',
    actor: { id: 'user-1', roles: ['tracker:user'] },
    context: {
      tenantId: 'tenant-1',
      productId: 'product-1',
      initiativeId: 'initiative-1',
      phase: 'design',
      gate: 'design-gate',
      correlationId: 'corr-1',
    },
    parameters: { foo: 'bar' },
    dryRun: false,
  };

  function createController() {
    const handle = jest.fn(async (request: unknown) => ({ ok: true, request }));
    const bundle = {
      runtime: { handle },
    } as unknown as AgentRuntimeBundle;
    return { controller: new AgentRuntimeController(bundle), handle };
  }

  it('routes /converse through the runtime pipeline', async () => {
    const { controller, handle } = createController();

    await controller.converse(conversationalBody);

    expect(handle).toHaveBeenCalledTimes(1);
  });

  it('routes /hermes identically to /converse (same mapped runtime request)', async () => {
    const converse = createController();
    const hermes = createController();

    await converse.controller.converse(conversationalBody);
    await hermes.controller.hermes(conversationalBody);

    expect(converse.handle).toHaveBeenCalledTimes(1);
    expect(hermes.handle).toHaveBeenCalledTimes(1);

    // The alias must produce the exact same runtime request as the canonical
    // surface — same interaction adapter, same mapping.
    const converseRequest = converse.handle.mock.calls[0][0];
    const hermesRequest = hermes.handle.mock.calls[0][0];
    expect(hermesRequest).toEqual(converseRequest);
  });

  it('rejects an invalid conversational payload with BadRequest on /converse', async () => {
    const { controller } = createController();

    await expect(
      controller.converse({ message: '' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
