import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createReviewProvider,
  registerAdapter,
  availableProviders,
  ReviewProviderError,
} from './review-provider.mjs';

test('gemini is available by default', () => {
  assert.ok(availableProviders().includes('gemini'));
});

test('unknown provider fails closed', () => {
  assert.throws(() => createReviewProvider({ provider: 'nope' }), ReviewProviderError);
});

test('gemini without an API key fails closed', () => {
  assert.throws(() => createReviewProvider({ provider: 'gemini' }), /requires an API key/);
});

test('gemini adapter builds with a key and exposes a review() contract', () => {
  const p = createReviewProvider({ provider: 'gemini', apiKey: 'k', model: 'gemini-x' });
  assert.equal(p.name, 'gemini:gemini-x');
  assert.equal(typeof p.review, 'function');
});

test('a registered mock adapter satisfies the port and returns its response', async () => {
  registerAdapter('mock', (cfg) => ({
    name: 'mock',
    async review(prompt) {
      return `echo:${prompt}:${cfg.model || 'default'}`;
    },
  }));
  const p = createReviewProvider({ provider: 'mock', model: 'm1' });
  assert.equal(await p.review('hello'), 'echo:hello:m1');
});

test('adapter failures propagate (caller fails closed)', async () => {
  registerAdapter('boom', () => ({
    name: 'boom',
    async review() {
      throw new ReviewProviderError('upstream exploded');
    },
  }));
  const p = createReviewProvider({ provider: 'boom' });
  await assert.rejects(() => p.review('x'), /upstream exploded/);
});

test('a factory returning no review() is rejected', () => {
  registerAdapter('bad', () => ({ name: 'bad' }));
  assert.throws(() => createReviewProvider({ provider: 'bad' }), /did not produce a valid adapter/);
});
