/**
 * GT-146 — Provider-neutral review port.
 *
 * The CI gate depends on this port, not on any specific vendor. An adapter
 * implements `review(promptText) -> Promise<string>` and is selected by config
 * (`EVOLITH_REVIEW_PROVIDER` / `EVOLITH_REVIEW_MODEL`). Unknown providers and
 * missing credentials throw (fail-closed) so the gate can never pass blind.
 */

export class ReviewProviderError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReviewProviderError';
  }
}

/** Gemini adapter — isolates the only vendor-specific networking. */
function geminiAdapter(config) {
  const apiKey = config.apiKey;
  if (!apiKey) throw new ReviewProviderError('gemini provider requires an API key (EVOLITH_LLM_API_KEY/GEMINI_API_KEY)');
  const model = config.model || 'gemini-2.5-flash';
  const hostname = config.endpoint || 'generativelanguage.googleapis.com';

  return {
    name: `gemini:${model}`,
    async review(promptText) {
      const https = await import('node:https');
      const payload = JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] });
      return new Promise((resolve, reject) => {
        const req = https.request(
          {
            hostname,
            path: `/v1beta/models/${model}:generateContent`,
            method: 'POST',
            // API key in a header, not the URL query string.
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
              'Content-Length': Buffer.byteLength(payload),
            },
          },
          (res) => {
            let body = '';
            res.on('data', (c) => (body += c));
            res.on('end', () => {
              if (res.statusCode >= 400) {
                reject(new ReviewProviderError(`gemini HTTP ${res.statusCode}`));
                return;
              }
              try {
                const data = JSON.parse(body);
                resolve((data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim());
              } catch (e) {
                reject(new ReviewProviderError(`gemini response parse error: ${e.message}`));
              }
            });
          },
        );
        req.on('error', (err) => reject(new ReviewProviderError(`gemini request failed: ${err.message}`)));
        req.write(payload);
        req.end();
      });
    },
  };
}

const ADAPTERS = new Map([['gemini', geminiAdapter]]);

/** Register an adapter factory (`config -> { name, review }`). Used for extension/tests. */
export function registerAdapter(name, factory) {
  if (typeof factory !== 'function') throw new ReviewProviderError(`adapter factory for "${name}" must be a function`);
  ADAPTERS.set(name, factory);
}

export function availableProviders() {
  return [...ADAPTERS.keys()];
}

/** Build the configured review provider. Fail-closed on unknown provider. */
export function createReviewProvider(config = {}) {
  const name = config.provider || 'gemini';
  const factory = ADAPTERS.get(name);
  if (!factory) {
    throw new ReviewProviderError(`unknown review provider: "${name}" (available: ${availableProviders().join(', ')})`);
  }
  const adapter = factory(config);
  if (!adapter || typeof adapter.review !== 'function') {
    throw new ReviewProviderError(`provider "${name}" did not produce a valid adapter`);
  }
  return adapter;
}
