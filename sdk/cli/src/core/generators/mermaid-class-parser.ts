/**
 * Parses the subset of Mermaid classDiagram syntax used by Evolith's
 * DDD model files.
 *
 * Supported input:
 *   class Foo {
 *     <<Entity>>
 *     +String id
 *     -String secret
 *     +doThing(arg String) void
 *   }
 *   Foo --> Bar : label
 *   Foo "1" --> "n" Bar
 *
 * Stereotypes recognised: Entity, ValueObject, Aggregate, Repository, Service
 */

export type Stereotype =
  | 'Entity'
  | 'ValueObject'
  | 'Aggregate'
  | 'Repository'
  | 'Service'
  | 'unknown';

export type Visibility = 'public' | 'private' | 'protected' | 'package';

export interface PropertyDef {
  visibility: Visibility;
  type: string;
  name: string;
}

export interface MethodDef {
  visibility: Visibility;
  name: string;
  params: ParamDef[];
  returnType: string;
}

export interface ParamDef {
  name: string;
  type: string;
}

export interface ClassDef {
  name: string;
  stereotype: Stereotype;
  properties: PropertyDef[];
  methods: MethodDef[];
}

export interface RelationshipDef {
  from: string;
  to: string;
  /** --> | ..> | --|> | ..|> | o-- | *-- */
  arrow: string;
  label?: string;
  fromCard?: string;
  toCard?: string;
}

export interface ClassDiagram {
  classes: ClassDef[];
  relationships: RelationshipDef[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

const VISIBILITY_MAP: Record<string, Visibility> = {
  '+': 'public',
  '-': 'private',
  '#': 'protected',
  '~': 'package',
};

function parseVisibility(prefix: string): Visibility {
  return VISIBILITY_MAP[prefix] ?? 'public';
}

function normaliseStereotype(raw: string): Stereotype {
  const s = raw.replace(/\s+/g, '').toLowerCase();
  if (s === 'entity') return 'Entity';
  if (s === 'valueobject' || s === 'vo') return 'ValueObject';
  if (s === 'aggregate' || s === 'aggregateroot') return 'Aggregate';
  if (s === 'repository') return 'Repository';
  if (s === 'service' || s === 'domainservice') return 'Service';
  return 'unknown';
}

function toCamelCase(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function mapMermaidType(t: string): string {
  const map: Record<string, string> = {
    String: 'string',
    string: 'string',
    Int: 'number',
    int: 'number',
    Integer: 'number',
    Long: 'number',
    Float: 'number',
    Double: 'number',
    number: 'number',
    Boolean: 'boolean',
    boolean: 'boolean',
    Bool: 'boolean',
    bool: 'boolean',
    Void: 'void',
    void: 'void',
    Date: 'Date',
    List: 'Array<unknown>',
    Object: 'Record<string, unknown>',
  };
  return map[t] ?? t;
}

// ── member line parser ────────────────────────────────────────────────────────

// Method:   vis? name(params) returnType?   e.g. +validate() void
const METHOD_RE = /^([+\-#~]?)\s*(\w+)\s*\(([^)]*)\)\s*(\w+)?\s*$/;

// Property: vis? Type name   e.g. +String id  or  -Boolean active
// Type is any word (may start upper or lower); name follows after a space.
const PROP_RE = /^([+\-#~]?)\s*(\w+)\s+(\w+)\s*$/;

function parseMember(line: string): PropertyDef | MethodDef | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('<<')) return null;

  // Method first (contains parentheses)
  const mM = METHOD_RE.exec(trimmed);
  if (mM) {
    const [, visChar, name, rawParams, ret] = mM;
    return {
      visibility: parseVisibility(visChar),
      name,
      params: parseParams(rawParams),
      returnType: mapMermaidType(ret ?? 'void'),
    } as MethodDef;
  }

  // Property: vis? Type name
  const mP = PROP_RE.exec(trimmed);
  if (mP) {
    const [, visChar, typePart, namePart] = mP;
    return {
      visibility: parseVisibility(visChar),
      type: mapMermaidType(typePart),
      name: toCamelCase(namePart),
    } as PropertyDef;
  }

  return null;
}

// Mermaid param order: name Type  e.g. (id String, user User)
function parseParams(raw: string): ParamDef[] {
  if (!raw.trim()) return [];
  return raw.split(',').map(p => {
    const parts = p.trim().split(/\s+/);
    if (parts.length >= 2) {
      // parts[0] = paramName, parts[1] = paramType
      return { type: mapMermaidType(parts[1]), name: parts[0] };
    }
    return { type: mapMermaidType(parts[0]), name: toCamelCase(parts[0]) };
  });
}

function isMethod(m: PropertyDef | MethodDef): m is MethodDef {
  return 'params' in m;
}

// ── relationship line parser ──────────────────────────────────────────────────

// e.g.:  User --> Email
//        User "1" --> "n" Email : label
//        User --|> BaseClass
const REL_RE =
  /^(\w+)\s*(?:"([^"]*)")?\s*(-->|\.\.>|--\|>|\.\.\|>|o--|o\.\.|\*--|<-->|--)\s*(?:"([^"]*)")?\s*(\w+)(?:\s*:\s*(.+))?$/;

function parseRelationship(line: string): RelationshipDef | null {
  const m = REL_RE.exec(line.trim());
  if (!m) return null;
  const [, from, fromCard, arrow, toCard, to, label] = m;
  return {
    from, to, arrow,
    ...(fromCard ? { fromCard } : {}),
    ...(toCard ? { toCard } : {}),
    ...(label ? { label: label.trim() } : {}),
  };
}

// ── main parser ───────────────────────────────────────────────────────────────

/**
 * Extract all ```mermaid ... ``` blocks from a Markdown string.
 */
export function extractMermaidBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  const re = /```mermaid\s*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    blocks.push(m[1]);
  }
  return blocks;
}

/**
 * Parse a single Mermaid classDiagram block.
 * Returns null if the block doesn't contain a classDiagram directive.
 */
export function parseClassDiagram(block: string): ClassDiagram | null {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);

  if (!lines.some(l => l.toLowerCase().startsWith('classdiagram'))) {
    return null;
  }

  const classes: ClassDef[] = [];
  const relationships: RelationshipDef[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // class block: "class Name {" or "class Name{"
    const classOpen = /^class\s+(\w+)\s*\{/.exec(line);
    if (classOpen) {
      const cls: ClassDef = {
        name: classOpen[1],
        stereotype: 'unknown',
        properties: [],
        methods: [],
      };
      i++;
      while (i < lines.length && lines[i] !== '}') {
        const inner = lines[i].trim();
        const stereoMatch = /^<<([^>]+)>>$/.exec(inner);
        if (stereoMatch) {
          cls.stereotype = normaliseStereotype(stereoMatch[1]);
        } else {
          const member = parseMember(inner);
          if (member) {
            if (isMethod(member)) cls.methods.push(member);
            else cls.properties.push(member);
          }
        }
        i++;
      }
      classes.push(cls);
      i++; // skip closing }
      continue;
    }

    // single-line class with no body: "class Name"
    const classNoBody = /^class\s+(\w+)\s*$/.exec(line);
    if (classNoBody) {
      classes.push({ name: classNoBody[1], stereotype: 'unknown', properties: [], methods: [] });
      i++;
      continue;
    }

    // relationship
    const rel = parseRelationship(line);
    if (rel) {
      relationships.push(rel);
      i++;
      continue;
    }

    i++;
  }

  return { classes, relationships };
}

/**
 * Extract and parse all classDiagram blocks from a Markdown file.
 * Returns the first valid diagram found, or null.
 */
export function parseDddModel(markdown: string): ClassDiagram | null {
  const blocks = extractMermaidBlocks(markdown);
  for (const block of blocks) {
    const diagram = parseClassDiagram(block);
    if (diagram) return diagram;
  }
  return null;
}
