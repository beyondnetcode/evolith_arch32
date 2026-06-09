import {
  extractMermaidBlocks,
  parseClassDiagram,
  parseDddModel,
} from './mermaid-class-parser';

const SAMPLE_DIAGRAM = `
classDiagram
  class User {
    <<Entity>>
    +String id
    +String name
    -String email
    +validate() void
    +fullName() String
  }

  class Email {
    <<Value Object>>
    +String value
    +isValid() bool
  }

  class UserRepository {
    <<Repository>>
    +findById(id String) User
    +save(user User) void
  }

  class UserService {
    <<Service>>
    +createUser(name String) User
  }

  User --> Email : has
  UserRepository --> User
`;

const SAMPLE_MARKDOWN = `
# DDD Model

Some text.

\`\`\`mermaid
${SAMPLE_DIAGRAM}
\`\`\`

More text.
`;

describe('extractMermaidBlocks', () => {
  it('extracts blocks from markdown', () => {
    const blocks = extractMermaidBlocks(SAMPLE_MARKDOWN);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('classDiagram');
  });

  it('returns empty array when no mermaid blocks', () => {
    expect(extractMermaidBlocks('# No code\nJust text.')).toHaveLength(0);
  });

  it('extracts multiple blocks', () => {
    const md = '```mermaid\nclassDiagram\n  class A\n```\n\n```mermaid\nclassDiagram\n  class B\n```';
    expect(extractMermaidBlocks(md)).toHaveLength(2);
  });
});

describe('parseClassDiagram', () => {
  let diagram: ReturnType<typeof parseClassDiagram>;

  beforeEach(() => {
    diagram = parseClassDiagram(SAMPLE_DIAGRAM);
  });

  it('returns non-null for valid classDiagram', () => {
    expect(diagram).not.toBeNull();
  });

  it('returns null for non-classDiagram mermaid block', () => {
    expect(parseClassDiagram('flowchart LR\n  A --> B')).toBeNull();
  });

  it('parses 4 classes', () => {
    expect(diagram!.classes).toHaveLength(4);
  });

  it('parses User as Entity with correct properties', () => {
    const user = diagram!.classes.find(c => c.name === 'User')!;
    expect(user.stereotype).toBe('Entity');
    expect(user.properties).toHaveLength(3); // id, name, email
    expect(user.properties[0]).toMatchObject({ name: 'id', type: 'string', visibility: 'public' });
    expect(user.properties[1]).toMatchObject({ name: 'name', type: 'string', visibility: 'public' });
    expect(user.properties[2]).toMatchObject({ name: 'email', type: 'string', visibility: 'private' });
  });

  it('parses User methods', () => {
    const user = diagram!.classes.find(c => c.name === 'User')!;
    expect(user.methods).toHaveLength(2);
    expect(user.methods[0]).toMatchObject({ name: 'validate', returnType: 'void' });
    expect(user.methods[1]).toMatchObject({ name: 'fullName', returnType: 'string' });
  });

  it('parses Email as ValueObject', () => {
    const email = diagram!.classes.find(c => c.name === 'Email')!;
    expect(email.stereotype).toBe('ValueObject');
    expect(email.properties).toHaveLength(1);
    expect(email.methods).toHaveLength(1);
    expect(email.methods[0]).toMatchObject({ name: 'isValid', returnType: 'boolean' });
  });

  it('parses UserRepository as Repository with methods', () => {
    const repo = diagram!.classes.find(c => c.name === 'UserRepository')!;
    expect(repo.stereotype).toBe('Repository');
    expect(repo.methods).toHaveLength(2);
    expect(repo.methods[0]).toMatchObject({ name: 'findById' });
    expect(repo.methods[0].params).toHaveLength(1);
    expect(repo.methods[0].params[0]).toMatchObject({ name: 'id', type: 'string' });
  });

  it('parses UserService as Service', () => {
    const svc = diagram!.classes.find(c => c.name === 'UserService')!;
    expect(svc.stereotype).toBe('Service');
  });

  it('parses 2 relationships', () => {
    expect(diagram!.relationships).toHaveLength(2);
    expect(diagram!.relationships[0]).toMatchObject({ from: 'User', to: 'Email', arrow: '-->' });
    expect(diagram!.relationships[0].label).toBe('has');
    expect(diagram!.relationships[1]).toMatchObject({ from: 'UserRepository', to: 'User' });
  });
});

describe('parseDddModel', () => {
  it('extracts diagram from markdown', () => {
    const result = parseDddModel(SAMPLE_MARKDOWN);
    expect(result).not.toBeNull();
    expect(result!.classes).toHaveLength(4);
  });

  it('returns null when no valid classDiagram found', () => {
    expect(parseDddModel('# Nothing here')).toBeNull();
  });
});

describe('Aggregate stereotype', () => {
  it('parses <<Aggregate Root>> as Aggregate', () => {
    const d = parseClassDiagram(`
classDiagram
  class Order {
    <<Aggregate Root>>
    +String orderId
  }
`);
    expect(d!.classes[0].stereotype).toBe('Aggregate');
  });
});

describe('type mapping', () => {
  it('maps Int → number', () => {
    const d = parseClassDiagram(`
classDiagram
  class Counter {
    <<Entity>>
    +Int value
  }
`);
    expect(d!.classes[0].properties[0].type).toBe('number');
  });
});
