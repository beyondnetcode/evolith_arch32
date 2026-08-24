import {
  deriveArtifactFields,
  schemaFileNameFromId,
} from './artifact-field-derivation';

/**
 * The half of the contract a satellite could not use.
 *
 * Publishing a schema `$id` told a consumer that a PRD has a canonical shape somewhere; it never
 * told it what a PRD contains, and an `$id` is an identity that nothing dereferences. These pin
 * the derivation that closes it — and, just as importantly, what it refuses to publish, because a
 * field no criterion can evaluate is worse than a missing one: it can be selected and never
 * satisfied.
 */
describe('artifact field derivation', () => {
  it('flattens nested objects into the dotted paths a criterion addresses', () => {
    const { fields } = deriveArtifactFields({
      type: 'object',
      required: ['metadata'],
      properties: {
        metadata: {
          type: 'object',
          required: ['identifier'],
          properties: {
            identifier: { type: 'string', description: 'PRD identifier' },
            product: { type: 'string' },
          },
        },
      },
    });

    expect(fields.map((f) => f.fieldPath)).toEqual(['metadata.identifier', 'metadata.product']);
    expect(fields.find((f) => f.fieldPath === 'metadata.identifier')?.required).toBe(true);
    expect(fields.find((f) => f.fieldPath === 'metadata.product')?.required).toBe(false);
  });

  it('does not publish the container itself, only its leaves', () => {
    const { fields } = deriveArtifactFields({
      type: 'object',
      properties: { metadata: { type: 'object', properties: { a: { type: 'string' } } } },
    });

    expect(fields.map((f) => f.fieldPath)).toEqual(['metadata.a']);
    expect(fields.some((f) => f.fieldPath === 'metadata')).toBe(false);
  });

  it('maps each schema type onto something an operator can judge', () => {
    const { fields } = deriveArtifactFields({
      type: 'object',
      properties: {
        name: { type: 'string' },
        count: { type: 'integer' },
        ready: { type: 'boolean' },
        due: { type: 'string', format: 'date' },
        link: { type: 'string', format: 'uri' },
        status: { type: 'string', enum: ['Draft', 'Approved'] },
        body: { type: 'string', maxLength: 4000 },
      },
    });

    const byPath = Object.fromEntries(fields.map((f) => [f.fieldPath, f.type]));
    expect(byPath).toEqual({
      name: 'text',
      count: 'number',
      ready: 'boolean',
      due: 'date',
      link: 'url',
      status: 'enum',
      body: 'rich-text',
    });
    expect(fields.find((f) => f.fieldPath === 'status')?.enumValues).toEqual(['Draft', 'Approved']);
  });

  /**
   * A list cannot be compared by `gte`, `in-set` or `regex` — every operator assumes one value —
   * so publishing it would hand a consumer a field it can select and never satisfy. It is
   * REPORTED rather than dropped quietly, so someone counting 13 sections against 9 fields can
   * see the difference is collections and not a truncated schema.
   */
  it('omits collections, and says so', () => {
    const { fields, omitted } = deriveArtifactFields({
      type: 'object',
      properties: {
        title: { type: 'string' },
        risks: { type: 'array', items: { type: 'string' } },
      },
    });

    expect(fields.map((f) => f.fieldPath)).toEqual(['title']);
    expect(omitted).toEqual([
      { fieldPath: 'risks', reason: 'collection — no criterion operator can evaluate a list' },
    ]);
  });

  it('gives a readable label when the schema offers none', () => {
    const { fields } = deriveArtifactFields({
      type: 'object',
      properties: {
        executiveSummary: { type: 'string' },
        titled: { type: 'string', title: 'A proper title' },
      },
    });

    // Sentence case: these become the labels of a FORM, and Title Case makes a form read like a
    // menu of commands rather than a set of questions.
    expect(fields.find((f) => f.fieldPath === 'executiveSummary')?.label).toBe('Executive summary');
    expect(fields.find((f) => f.fieldPath === 'titled')?.label).toBe('A proper title');
  });

  /**
   * `technicalFeasibilityId` ending in «Id» looks like a typo, and «id» like a mistake. There is
   * no rule that separates an acronym from a short word — `id` is one and `is` is not — so the
   * list is explicit and short.
   */
  it('shouts an acronym instead of lowercasing it into a typo', () => {
    const { fields } = deriveArtifactFields({
      type: 'object',
      properties: {
        technicalFeasibilityId: { type: 'string' },
        cpuCoreLimit: { type: 'integer' },
        apiBaseUrl: { type: 'string', format: 'uri' },
        'is-approved': { type: 'boolean' },
      },
    });

    const label = (path: string) => fields.find((f) => f.fieldPath === path)?.label;

    expect(label('technicalFeasibilityId')).toBe('Technical feasibility ID');
    expect(label('cpuCoreLimit')).toBe('CPU core limit');
    expect(label('apiBaseUrl')).toBe('API base URL');
    // A word that merely looks like one is left alone.
    expect(label('is-approved')).toBe('Is approved');
  });

  describe('Spanish labels', () => {
    const schema = {
      type: 'object',
      properties: {
        status: { type: 'string' },
        cpuCoreLimit: { type: 'integer' },
        untranslated: { type: 'string' },
        overridden: { type: 'string', 'x-title-es': 'En este contexto significa otra cosa' },
      },
    };

    const glossary = { status: 'Estado', cpuCoreLimit: 'Límite de núcleos de CPU', overridden: 'Genérico' };
    const labelEs = (path: string) =>
      deriveArtifactFields(schema, { labelsEs: glossary }).fields.find((f) => f.fieldPath === path)
        ?.labelEs;

    /**
     * Both languages travel together because ONE sync serves MANY readers: the consumer fetches
     * this catalogue on a timer, tenant-agnostic and cached, then renders it for whoever is
     * looking. One language per request would mean a fetch per reader, or documents in the wrong
     * language.
     */
    it('carries the Spanish alongside the English, not instead of it', () => {
      const field = deriveArtifactFields(schema, { labelsEs: glossary }).fields.find(
        (f) => f.fieldPath === 'cpuCoreLimit',
      );

      expect(field?.label).toBe('CPU core limit');
      expect(field?.labelEs).toBe('Límite de núcleos de CPU');
    });

    it('lets a schema override a glossary word that is wrong in its context', () => {
      expect(labelEs('overridden')).toBe('En este contexto significa otra cosa');
    });

    /** Plain, not broken: the reader gets the English name rather than an empty label. */
    it('leaves an untranslated field without a Spanish label', () => {
      expect(labelEs('untranslated')).toBeUndefined();
      expect(
        deriveArtifactFields(schema, { labelsEs: glossary }).fields.find(
          (f) => f.fieldPath === 'untranslated',
        )?.label,
      ).toBe('Untranslated');
    });

    /**
     * Without a glossary the corpus still speaks for itself: a schema that wrote its own Spanish
     * keeps it. Only the shared words go away, which is what makes the glossary an addition to the
     * schemas rather than a replacement for what they say.
     */
    it('keeps what a schema wrote itself when no glossary is given', () => {
      const fields = deriveArtifactFields(schema).fields;

      expect(fields.find((f) => f.fieldPath === 'overridden')?.labelEs).toBe(
        'En este contexto significa otra cosa',
      );
      expect(fields.find((f) => f.fieldPath === 'status')?.labelEs).toBeUndefined();
    });
  });

  it('survives a schema with nothing in it', () => {
    expect(deriveArtifactFields({}).fields).toEqual([]);
    expect(deriveArtifactFields(null).fields).toEqual([]);
  });

  /**
   * The one place that knows both the identity and where it lives today. Matching on the last
   * segment is what lets the host change without breaking resolution — which is the churn `$id`
   * exists to absorb in the first place.
   */
  it('resolves a schema id to its file without depending on the host', () => {
    expect(schemaFileNameFromId('https://evolith.dev/schema/prd.schema.json')).toBe(
      'prd.schema.json',
    );
    expect(schemaFileNameFromId('https://example.test/elsewhere/prd.schema.json')).toBe(
      'prd.schema.json',
    );
    expect(schemaFileNameFromId('not-a-schema')).toBeUndefined();
    expect(schemaFileNameFromId('')).toBeUndefined();
  });
});
