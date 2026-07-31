import { HttpEmbeddingAdapter, DEFAULT_EMBED_DIM } from './http-embedding.adapter';

/**
 * GT-592 / GT-539 — the read-side embedding seam.
 *
 * Every assertion here is about FAILING CLOSED. A dense retriever that ranks on
 * a wrong-dimension or partially-returned vector does not fail visibly: it
 * returns a confidently-ordered list of the wrong chunks, and an agent grounds a
 * recommendation in them. So the adapter must refuse rather than degrade.
 */

const dim = DEFAULT_EMBED_DIM;
const vec = (fill: number) => new Array(dim).fill(fill);

function fetchReturning(body: unknown, ok = true, status = 200) {
  return async () => ({ ok, status, text: async () => JSON.stringify(body) });
}

describe('HttpEmbeddingAdapter (GT-592)', () => {
  it('requires a sidecar endpoint rather than defaulting to one', () => {
    expect(() => new HttpEmbeddingAdapter({ fetch: fetchReturning({}) } as never)).toThrow(
      /sidecar URL is required|EVOLITH_RAG_EMBED_URL/,
    );
  });

  it('accepts the OpenAI response shape', async () => {
    const adapter = new HttpEmbeddingAdapter({
      url: 'http://sidecar/v1/embeddings',
      fetch: fetchReturning({ data: [{ embedding: vec(0.1) }] }),
    });
    expect(await adapter.embed(['x'])).toEqual([vec(0.1)]);
  });

  it('accepts the TEI bare-array shape', async () => {
    const adapter = new HttpEmbeddingAdapter({
      url: 'http://sidecar',
      fetch: fetchReturning([vec(0.2)]),
    });
    expect(await adapter.embed(['x'])).toEqual([vec(0.2)]);
  });

  it('accepts the {embeddings} shape', async () => {
    const adapter = new HttpEmbeddingAdapter({
      url: 'http://sidecar',
      fetch: fetchReturning({ embeddings: [vec(0.3)] }),
    });
    expect(await adapter.embed(['x'])).toEqual([vec(0.3)]);
  });

  it('short-circuits an empty batch without calling the sidecar', async () => {
    let called = false;
    const adapter = new HttpEmbeddingAdapter({
      url: 'http://sidecar',
      fetch: (async () => {
        called = true;
        return { ok: true, status: 200, text: async () => '[]' };
      }) as never,
    });
    expect(await adapter.embed([])).toEqual([]);
    expect(called).toBe(false);
  });

  it('fails closed on a wrong-dimension vector', async () => {
    const adapter = new HttpEmbeddingAdapter({
      url: 'http://sidecar',
      fetch: fetchReturning({ data: [{ embedding: [1, 2, 3] }] }),
    });
    await expect(adapter.embed(['x'])).rejects.toThrow(/not cosine-comparable/);
  });

  it('fails closed when fewer vectors come back than were asked for', async () => {
    const adapter = new HttpEmbeddingAdapter({
      url: 'http://sidecar',
      fetch: fetchReturning({ data: [{ embedding: vec(0.1) }] }),
    });
    await expect(adapter.embed(['a', 'b'])).rejects.toThrow(/asked for 2 embeddings, received 1/);
  });

  it('fails closed on a non-OK response', async () => {
    const adapter = new HttpEmbeddingAdapter({
      url: 'http://sidecar',
      fetch: fetchReturning({}, false, 503),
    });
    await expect(adapter.embed(['x'])).rejects.toThrow(/responded 503/);
  });

  it('fails closed on a non-JSON body', async () => {
    const adapter = new HttpEmbeddingAdapter({
      url: 'http://sidecar',
      fetch: (async () => ({ ok: true, status: 200, text: async () => '<html>gateway</html>' })) as never,
    });
    await expect(adapter.embed(['x'])).rejects.toThrow(/non-JSON body/);
  });

  it('fails closed on a transport error, naming the endpoint', async () => {
    const adapter = new HttpEmbeddingAdapter({
      url: 'http://sidecar',
      fetch: (async () => {
        throw new Error('ECONNREFUSED');
      }) as never,
    });
    await expect(adapter.embed(['x'])).rejects.toThrow(/transport error calling http:\/\/sidecar/);
  });

  it('fails closed when the body has no embeddings at all', async () => {
    const adapter = new HttpEmbeddingAdapter({
      url: 'http://sidecar',
      fetch: fetchReturning({ error: 'model loading' }),
    });
    await expect(adapter.embed(['x'])).rejects.toThrow(/could not find embeddings/);
  });

  it('posts the configured model id, so the model is configuration and not code', async () => {
    let sentBody = '';
    const adapter = new HttpEmbeddingAdapter({
      url: 'http://sidecar',
      model: 'some-other-embedder',
      fetch: (async (_url: string, init: { body: string }) => {
        sentBody = init.body;
        return { ok: true, status: 200, text: async () => JSON.stringify({ data: [{ embedding: vec(0) }] }) };
      }) as never,
    });
    await adapter.embed(['x']);
    expect(JSON.parse(sentBody)).toEqual({ model: 'some-other-embedder', input: ['x'] });
  });

  it('exposes a single-text EmbedQuery seam for the knowledge adapters', async () => {
    const adapter = new HttpEmbeddingAdapter({
      url: 'http://sidecar',
      fetch: fetchReturning({ data: [{ embedding: vec(0.5) }] }),
    });
    expect(await adapter.asEmbedQuery()('ADR-0111')).toEqual(vec(0.5));
  });
});
