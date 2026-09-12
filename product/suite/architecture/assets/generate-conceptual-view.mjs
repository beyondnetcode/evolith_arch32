#!/usr/bin/env node
// Generates the bilingual Evolith conceptual-view SVG (EN + ES) from ONE data model, so the
// two language halves can never drift from each other. The SVG is standalone (explicit colors,
// system font stack, no external CSS) so it can be shared outside GitHub.
//
// Usage (from the repository root):
//   node product/suite/architecture/assets/generate-conceptual-view.mjs product/suite/architecture/assets
//
// Where the facts come from (update the LANES model when any of these change):
//   - workspaces and their runtime deps: src/apps/*/package.json, src/packages/*/package.json, src/sdk/cli/package.json
//   - deployable services and images:    product/infra/docker-compose.fullstack.yml, product/infra/deployment-topology.md
//   - surfaces, protocols and contracts: product/products/ecosystem-and-communication.md (ADR-0073, ADR-0074, ADR-0102)
//   - Tracker stack:                     evolith_tracker/src/apps/*/Dockerfile (.NET 10 API, NestJS gateway, React SPA)
// The narrative that explains the diagram lives in ../evolith-conceptual-view.md (EN) and
// ../evolith-conceptual-view.es.md (ES); keep DATE in sync with the "Fecha"/"Date" line there.
import fs from "node:fs";
import path from "node:path";

const outDir = process.argv[2] ?? ".";
const DATE = "2026-09-12";

const RAMPS = {
  gray:   { fill: "#F1EFE8", stroke: "#888780", title: "#2C2C2A", text: "#5F5E5A", chipStroke: "#B4B2A9", chipText: "#2C2C2A" },
  purple: { fill: "#EEEDFE", stroke: "#7F77DD", title: "#26215C", text: "#534AB7", chipStroke: "#AFA9EC", chipText: "#26215C" },
  teal:   { fill: "#E1F5EE", stroke: "#1D9E75", title: "#04342C", text: "#0F6E56", chipStroke: "#5DCAA5", chipText: "#04342C" },
  coral:  { fill: "#FAECE7", stroke: "#D85A30", title: "#4A1B0C", text: "#993C1D", chipStroke: "#F0997B", chipText: "#4A1B0C" },
  amber:  { fill: "#FAEEDA", stroke: "#EF9F27", title: "#412402", text: "#854F0B", chipStroke: "#FAC775", chipText: "#412402" },
};

const T = (en, es) => ({ en, es });

const LANES = [
  {
    ramp: "gray",
    title: T("Actors and entry points", "Actores y entradas"),
    note: T("who asks for an evaluation and through which door", "quién pide una evaluación y por dónde"),
    arrowAfter: "down",
    cards: [
      { title: T("Team and CI", "Equipo y CI"), desc: T("develops and validates in the pipeline", "desarrolla y valida en el pipeline"),
        chips: ["GitHub Actions", "action.yml (Marketplace)", "git", "npm"], proto: T("terminal · HTTPS", "terminal · HTTPS") },
      { title: T("AI agent", "Agente IA"), desc: T("proposes changes and queries the rules", "propone cambios y consulta reglas"),
        chips: ["Cursor", "Claude Desktop", "Claude Code"], proto: T("MCP JSON-RPC 2.0 over stdio · Streamable HTTP", "MCP JSON-RPC 2.0 sobre stdio · Streamable HTTP") },
      { title: T("Tracker", "Tracker"), desc: T("governs initiatives and evidence; external client of the Core", "gobierna iniciativas y evidencia; cliente externo del Core"),
        chips: [".NET 10 + EF Core", "NestJS gateway (BFF)", "React + Vite", "nginx", "PostgreSQL 16"], proto: T("REST /api/v1 · MCP HTTP (as a client)", "REST /api/v1 · MCP HTTP (como cliente)") },
    ],
  },
  {
    ramp: "purple",
    title: T("Access surfaces", "Superficies de acceso"),
    note: T("same ADR-0073 envelope · RFC 9457 errors · exit codes per verdict", "mismo envelope ADR-0073 · errores RFC 9457 · exit codes por veredicto"),
    arrowAfter: "down",
    cards: [
      { title: T("Evolith CLI", "Evolith CLI"), desc: T("governance commands against a satellite repository", "comandos de gobernanza contra un repo satélite"),
        chips: ["Node 20", "TypeScript", "nest-commander", "@clack/prompts", "ajv", "yaml", "opa-wasm"], proto: T("stdin/stdout · --format json", "stdin/stdout · --format json") },
      { title: T("Core API", "Core API"), desc: T("REST exposure of the domain", "exposición REST del dominio"),
        chips: ["NestJS + Express", "OpenAPI/Swagger", "class-validator · zod", "Helmet · Throttler", "Terminus", "Keyv + Redis"], proto: T("REST /api/v1 · API-key guard · /health /metrics", "REST /api/v1 · API-key guard · /health /metrics") },
      { title: T("MCP Services", "MCP Services"), desc: T("governed tools for AI agents", "herramientas gobernadas para agentes"),
        chips: ["NestJS", "@modelcontextprotocol/sdk", "opa-wasm", "ABAC"], proto: T("JSON-RPC 2.0 stdio · Streamable HTTP · API-key fail-closed", "JSON-RPC 2.0 stdio · Streamable HTTP · API-key fail-closed") },
      { title: T("Agent Runtime API", "Agent Runtime API"), desc: T("governed agent orchestration", "orquestación gobernada de agentes"),
        chips: ["NestJS", "@Sse", "OTLP exporter"], proto: T("POST /v1/agent handle · converse · stream (SSE) · API-key/JWT", "POST /v1/agent handle · converse · stream (SSE) · API-key/JWT") },
    ],
  },
  {
    ramp: "teal",
    title: T("Evolith Core", "Evolith Core"),
    note: T("stateless engine: EvaluationContext → EvaluationResult · seals without opinion · the tenant configures · AI proposes, OPA decides",
            "motor stateless: EvaluationContext → EvaluationResult · sella sin opinión · el tenant configura · IA propone, OPA decide"),
    arrowAfter: "up",
    cards: [
      { title: T("Domain and application", "Dominio y aplicación"), desc: T("core-domain · core", "core-domain · core"),
        chips: ["TypeScript", "hexagonal + DDD", "OverlayFileSystem", T("use cases", "casos de uso")] },
      { title: T("Contracts and SDK", "Contratos y SDK"), desc: T("contracts · sdk-client", "contracts · sdk-client"),
        chips: ["JSON Schema (sha256)", "SemVer", "capabilities manifest", T("typed client", "cliente tipado")], proto: T("GET /api/v1/capabilities", "GET /api/v1/capabilities") },
      { title: T("Adapters", "Adaptadores"), desc: T("infra-providers · repo-facts", "infra-providers · repo-facts"),
        chips: ["ajv + ajv-formats", "yaml", "fs-extra", T("module + symbol graph", "grafo de módulos y símbolos"), "content-hashed"] },
      { title: T("Agent runtime", "Agent runtime"), desc: T("agentic layer, ports and adapters (ADR-0102)", "capa agéntica, puertos y adaptadores (ADR-0102)"),
        chips: ["OPA", "HITL", T("memory", "memoria"), "skills", T("swappable engine", "motor intercambiable"), "Hermes · Swarms · stub", T("LLM egress per tenant", "LLM egress por tenant"), "Claude · Gemini"] },
      { title: T("Deterministic verification", "Verificación determinista"), desc: T("same rule in two engines, R-25 parity", "misma regla en dos motores, paridad R-25"),
        chips: [T("native TS rulesets", "rulesets nativos TS"), "Rego → policy.wasm", "@open-policy-agent/opa-wasm", "opa build"] },
    ],
  },
  {
    ramp: "coral",
    title: T("Governed knowledge and SDLC", "Conocimiento gobernado y SDLC"),
    note: T("what the Core evaluates; prose describes, it never relaxes a gate", "lo que el Core evalúa; la prosa describe, nunca relaja un gate"),
    arrowAfter: "gap",
    cards: [
      { title: T("Manifests and schemas", "Manifiestos y schemas"), desc: T("technical contract of the satellite", "contrato técnico del satélite"),
        chips: ["evolith.yaml", "topology.manifest.json", "*.schema.json"] },
      { title: T("Decisions and standards", "Decisiones y estándares"), desc: T("authoritative source", "fuente autoritativa"),
        chips: [T("ADRs (Markdown, EN/ES)", "ADRs (Markdown, EN/ES)"), T("8 topologies", "8 topologías"), T("CI guards .harness/*.mjs", "guards CI .harness/*.mjs")] },
      { title: T("SDLC cycle", "Ciclo SDLC"), desc: T("f1 discovery → f5 delivery", "f1 discovery → f5 delivery"),
        chips: ["gate-f1 … gate-f5", T("explicit waivers", "waivers explícitos"), T("evidence per phase", "evidencia por fase")] },
    ],
  },
  {
    ramp: "amber",
    title: T("Platform and operations", "Plataforma y operación"),
    note: T("builds, deploys and observes everything above", "construye, despliega y observa todo lo anterior"),
    arrowAfter: null,
    cards: [
      { title: T("Build and CI", "Build y CI"), chips: ["npm workspaces", "tsc -b", "Jest 30", "ESLint boundaries", "husky + commitlint", "Dependabot"] },
      { title: T("Containers and deployment", "Contenedores y despliegue"), chips: ["Docker multi-stage", "docker-compose", "Helm", "Kubernetes · kind", "Coolify + Traefik (TLS)", "GHCR"] },
      { title: T("Data and cache", "Datos y caché"), chips: ["PostgreSQL 16", "Redis 7"] },
      { title: T("Observability", "Observabilidad"), chips: ["OpenTelemetry", "OTLP/HTTP", "Prometheus", "Grafana", "pino"] },
      { title: T("Distribution", "Distribución"), chips: ["npm @beyondnet/evolith-*", "provenance (OIDC)", "GitHub Marketplace"] },
    ],
  },
];

const HEADER = {
  title: T("Evolith — conceptual view with technologies, frameworks and protocols per process",
           "Evolith — vista conceptual con tecnologías, frameworks y protocolos por proceso"),
  sub: T(`Chips = technologies and frameworks · monospace line = protocols and contracts · arrows = direction of consumption · source: product/suite/architecture/evolith-conceptual-view.md · ${DATE}`,
         `Chips = tecnologías y frameworks · línea monoespaciada = protocolos y contratos · flechas = dirección de consumo · fuente: product/suite/architecture/evolith-conceptual-view.es.md · ${DATE}`),
};

// ---- layout ---------------------------------------------------------------
const W = 1600, MARGIN = 40, LANE_PAD = 20, CARD_GAP = 16, CARD_PAD = 12;
const SANS = "Inter, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const MONO = "'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
const F = { title: 16, desc: 13, chip: 12, proto: 12, laneTitle: 18, laneNote: 13, h1: 26, h2: 13 };
const CHIP_H = 22, CHIP_GAP = 6, CHIP_PADX = 9;

const pick = (v, lang) => (typeof v === "string" ? v : v[lang]);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Conservative width estimate (px) so nothing overflows in real fonts.
const width = (s, size, { weight = 400, mono = false } = {}) => {
  const k = mono ? 0.62 : weight >= 600 ? 0.60 : 0.56;
  return s.length * size * k;
};
function wrap(text, size, maxW, opts) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (width(cand, size, opts) <= maxW || !cur) cur = cand;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function layoutChips(chips, maxW, lang) {
  const rows = [[]];
  let x = 0;
  for (const c of chips) {
    const label = pick(c, lang);
    const w = Math.ceil(width(label, F.chip) + CHIP_PADX * 2);
    if (w > maxW) throw new Error(`chip "${label}" (${w}px) is wider than its card (${maxW}px): shorten it or split it`);
    if (x + w > maxW && rows[rows.length - 1].length) { rows.push([]); x = 0; }
    rows[rows.length - 1].push({ label, w, x });
    x += w + CHIP_GAP;
  }
  return rows;
}

function build(lang) {
  const parts = [];
  const laneW = W - MARGIN * 2;
  let y = MARGIN;

  parts.push(`<text x="${MARGIN}" y="${y + 24}" font-size="${F.h1}" font-weight="600" fill="#2C2C2A">${esc(pick(HEADER.title, lang))}</text>`);
  y += 40;
  parts.push(`<text x="${MARGIN}" y="${y + 12}" font-size="${F.h2}" fill="#5F5E5A">${esc(pick(HEADER.sub, lang))}</text>`);
  y += 40;

  for (const lane of LANES) {
    const r = RAMPS[lane.ramp];
    const n = lane.cards.length;
    const cardW = Math.floor((laneW - LANE_PAD * 2 - CARD_GAP * (n - 1)) / n);
    const innerW = cardW - CARD_PAD * 2;

    // measure cards
    const measured = lane.cards.map((c) => {
      const descLines = c.desc ? wrap(pick(c.desc, lang), F.desc, innerW) : [];
      const chipRows = layoutChips(c.chips, innerW, lang);
      const protoLines = c.proto ? wrap(pick(c.proto, lang), F.proto, innerW, { mono: true }) : [];
      let h = CARD_PAD + F.title + 6;
      h += descLines.length * (F.desc + 5);
      h += 6 + chipRows.length * (CHIP_H + CHIP_GAP) - CHIP_GAP;
      if (protoLines.length) h += 10 + protoLines.length * (F.proto + 4);
      h += CARD_PAD;
      return { descLines, chipRows, protoLines, h };
    });
    const cardH = Math.max(...measured.map((m) => m.h));
    const headerH = 34;
    const laneH = LANE_PAD + headerH + cardH + LANE_PAD;

    parts.push(`<rect x="${MARGIN}" y="${y}" width="${laneW}" height="${laneH}" rx="14" fill="#FFFFFF" stroke="${r.stroke}" stroke-width="1" stroke-dasharray="6 4"/>`);
    parts.push(`<text x="${MARGIN + LANE_PAD}" y="${y + LANE_PAD + 16}" font-size="${F.laneTitle}" font-weight="600" fill="${r.title}">${esc(pick(lane.title, lang))}</text>`);
    const titleW = width(pick(lane.title, lang), F.laneTitle, { weight: 600 });
    parts.push(`<text x="${MARGIN + LANE_PAD + titleW + 14}" y="${y + LANE_PAD + 16}" font-size="${F.laneNote}" fill="${r.text}">${esc(pick(lane.note, lang))}</text>`);

    let cx = MARGIN + LANE_PAD;
    const cy = y + LANE_PAD + headerH;
    lane.cards.forEach((c, i) => {
      const m = measured[i];
      parts.push(`<rect x="${cx}" y="${cy}" width="${cardW}" height="${cardH}" rx="10" fill="${r.fill}" stroke="${r.stroke}" stroke-width="1"/>`);
      let ty = cy + CARD_PAD + F.title;
      parts.push(`<text x="${cx + CARD_PAD}" y="${ty}" font-size="${F.title}" font-weight="600" fill="${r.title}">${esc(pick(c.title, lang))}</text>`);
      ty += 6;
      for (const line of m.descLines) {
        ty += F.desc + 5;
        parts.push(`<text x="${cx + CARD_PAD}" y="${ty}" font-size="${F.desc}" fill="${r.text}">${esc(line)}</text>`);
      }
      ty += 6;
      for (const row of m.chipRows) {
        for (const chip of row) {
          const chipX = cx + CARD_PAD + chip.x;
          parts.push(`<rect x="${chipX}" y="${ty}" width="${chip.w}" height="${CHIP_H}" rx="11" fill="#FFFFFF" stroke="${r.chipStroke}" stroke-width="1"/>`);
          parts.push(`<text x="${chipX + chip.w / 2}" y="${ty + 15}" font-size="${F.chip}" text-anchor="middle" fill="${r.chipText}">${esc(chip.label)}</text>`);
        }
        ty += CHIP_H + CHIP_GAP;
      }
      ty -= CHIP_GAP;
      if (m.protoLines.length) {
        ty += 10;
        for (const line of m.protoLines) {
          ty += F.proto + 4;
          parts.push(`<text x="${cx + CARD_PAD}" y="${ty - 4}" font-size="${F.proto}" font-family="${MONO}" fill="${r.stroke}">${esc(line)}</text>`);
        }
      }
      cx += cardW + CARD_GAP;
    });

    y += laneH;

    if (lane.arrowAfter === "down" || lane.arrowAfter === "up") {
      const gap = 36;
      const x = W / 2;
      const y1 = lane.arrowAfter === "down" ? y + 6 : y + gap - 6;
      const y2 = lane.arrowAfter === "down" ? y + gap - 6 : y + 6;
      parts.push(`<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#5F5E5A" stroke-width="1.5" marker-end="url(#arr)"/>`);
      y += gap;
    } else if (lane.arrowAfter === "gap") {
      y += 24;
    }
  }

  const H = y + MARGIN;
  const head = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Evolith conceptual view (${lang.toUpperCase()}). Generated ${DATE} from product/suite/architecture/evolith-conceptual-view${lang === "es" ? ".es" : ""}.md.
     Technologies, frameworks and protocols were read from the workspace package.json files,
     product/infra/docker-compose.fullstack.yml and product/products/ecosystem-and-communication.md. -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${SANS}" role="img" aria-labelledby="t d">
<title id="t">${esc(pick(HEADER.title, lang))}</title>
<desc id="d">${esc(pick(HEADER.sub, lang))}</desc>
<defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#5F5E5A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
<rect x="0" y="0" width="${W}" height="${H}" fill="#FCFCFA"/>
`;
  return head + parts.join("\n") + "\n</svg>\n";
}

fs.mkdirSync(outDir, { recursive: true });
for (const lang of ["en", "es"]) {
  const file = path.join(outDir, `evolith-conceptual-view${lang === "es" ? ".es" : ""}.svg`);
  fs.writeFileSync(file, build(lang), "utf8");
  console.log("wrote", file);
}
