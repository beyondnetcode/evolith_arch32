const loadPolicyMock = jest.fn();
const readFileMock = jest.fn();
const statMock = jest.fn();

jest.mock('@open-policy-agent/opa-wasm', () => ({
  loadPolicy: (...args: unknown[]) => loadPolicyMock(...args),
}));
// AbacEvaluator.evaluateOpa reads the compiled policy via node:fs/promises
// (fs-extra's members are undefined under the runtime's ESM dynamic import).
jest.mock('node:fs/promises', () => ({
  readFile: (...args: unknown[]) => readFileMock(...args),
  stat: (...args: unknown[]) => statMock(...args),
}));

import { AbacEvaluator, AbacInput } from './abac-evaluator';

const input: AbacInput = {
  user: { id: 'u', roles: ['developer'], tenant: 't' },
  tool_name: 'evolith-read-file',
  resource_domain: 'mcp-server',
  environment: 'staging',
};

describe('AbacEvaluator OPA policy cache (GT-348)', () => {
  beforeEach(() => {
    loadPolicyMock.mockReset();
    readFileMock.mockReset();
    statMock.mockReset();
    readFileMock.mockResolvedValue(Buffer.from('wasm-bytes'));
    statMock.mockResolvedValue({ mtimeMs: 100 });
    loadPolicyMock.mockResolvedValue({ evaluate: () => [{ result: [] }] });
  });

  it('reads + compiles the policy once and reuses it across dispatches', async () => {
    const abac = new AbacEvaluator();

    const decisions = [
      await abac.evaluateOpa(input, '/core'),
      await abac.evaluateOpa(input, '/core'),
      await abac.evaluateOpa(input, '/core'),
    ];

    expect(decisions.every((d) => d.allowed)).toBe(true);
    expect(loadPolicyMock).toHaveBeenCalledTimes(1); // not recompiled per call
    expect(readFileMock).toHaveBeenCalledTimes(1);
  });

  it('recompiles when the policy file changes (mtime invalidation)', async () => {
    const abac = new AbacEvaluator();

    await abac.evaluateOpa(input, '/core');
    statMock.mockResolvedValue({ mtimeMs: 200 }); // wasm rebuilt
    await abac.evaluateOpa(input, '/core');

    expect(loadPolicyMock).toHaveBeenCalledTimes(2);
  });
});
