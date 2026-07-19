#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);

const verbose = args.includes("--verbose") || args.includes("-v");
const fix = args.includes("--fix");

const terminology = [
  { en: "ADR", es: "ADR", context: "Architecture" },
  { en: "Bounded Context", es: "Bounded Context", context: "DDD" },
  { en: "Modular Monolith", es: "Monolito Modular", context: "Architecture" },
  { en: "Microservices", es: "Microservicios", context: "Architecture" },
  { en: "API Gateway", es: "API Gateway", context: "Infrastructure" },
  { en: "BFF", es: "BFF", context: "Architecture" },
  { en: "CQRS", es: "CQRS", context: "Pattern" },
  { en: "Event Bus", es: "Bus de Eventos", context: "Architecture" },
  { en: "Outbox", es: "Outbox", context: "Pattern" },
  { en: "Circuit Breaker", es: "Circuit Breaker", context: "Resilience" },
  { en: "Circuit breaker", es: "Circuit breaker", context: "Resilience" },
  { en: "Saga", es: "Saga", context: "Pattern" },
  { en: "Hexagonal Architecture", es: "Arquitectura Hexagonal", context: "Architecture" },
  { en: "Ports and Adapters", es: "Puertos y Adaptadores", context: "Architecture" },
  { en: "Ports & Adapters", es: "Puertos y Adaptadores", context: "Architecture" },
  { en: "RBAC", es: "RBAC", context: "Security" },
  { en: "ABAC", es: "ABAC", context: "Security" },
  { en: "MFA", es: "MFA", context: "Security" },
  { en: "PII", es: "PII", context: "Security" },
  { en: "Zero Trust", es: "Zero Trust", context: "Security" },
  { en: "RLS", es: "RLS", context: "Database" },
  { en: "Row-Level Security", es: "Row-Level Security", context: "Database" },
  { en: "OpenTelemetry", es: "OpenTelemetry", context: "Observability" },
  { en: "OTel", es: "OTel", context: "Observability" },
  { en: "Correlation ID", es: "Correlation ID", context: "Observability" },
  { en: "Session Tracking ID", es: "Session Tracking ID", context: "Observability" },
  { en: "CI/CD", es: "CI/CD", context: "DevOps" },
  { en: "Gitflow", es: "Gitflow", context: "Process" },
  { en: "Pull Request", es: "Pull Request", context: "Process" },
  { en: "Definition of Done", es: "Definition of Done", context: "Process" },
  { en: "Technical Debt", es: "Deuda Técnica", context: "Process" },
  { en: "MVP", es: "MVP", context: "Strategy" },
  { en: "Sprint", es: "Sprint", context: "Process" },
  { en: "Unit Testing", es: "Pruebas Unitarias", context: "Testing" },
  { en: "Integration Testing", es: "Pruebas de Integración", context: "Testing" },
  { en: "E2E Testing", es: "Pruebas E2E", context: "Testing" },
  { en: "Contract Testing", es: "Contract Testing", context: "Testing" },
  { en: "Testcontainers", es: "Testcontainers", context: "Testing" },
  { en: "Observability", es: "Observabilidad", context: "Quality" },
  { en: "Resiliency", es: "Resiliencia", context: "Quality" },
  { en: "Scalability", es: "Escalabilidad", context: "Quality" },
  { en: "Maintainability", es: "Mantenibilidad", context: "Quality" },
  { en: "Portability", es: "Portabilidad", context: "Quality" },
  { en: "Performance", es: "Rendimiento", context: "Quality" },
  { en: "Database", es: "Base de datos", context: "Infrastructure" },
  { en: "Entity Framework", es: "Entity Framework", context: "ORM" },
  { en: "EF Core", es: "EF Core", context: "ORM" },
  { en: "TypeORM", es: "TypeORM", context: "ORM" },
  { en: "Redis", es: "Redis", context: "Cache" },
  { en: "PostgreSQL", es: "PostgreSQL", context: "Database" },
  { en: "SQL Server", es: "SQL Server", context: "Database" },
  { en: "NestJS", es: "NestJS", context: "Framework" },
  { en: ".NET", es: ".NET", context: "Framework" },
  { en: "TypeScript", es: "TypeScript", context: "Language" },
  { en: "Kubernetes", es: "Kubernetes", context: "Infrastructure" },
  { en: "Docker Compose", es: "Docker Compose", context: "Infrastructure" },
  { en: "gRPC", es: "gRPC", context: "API" },
  { en: "GraphQL", es: "GraphQL", context: "API" },
  { en: "REST API", es: "API REST", context: "API" },
  { en: "WebSocket", es: "WebSocket", context: "API" },
  { en: "OAuth", es: "OAuth", context: "Auth" },
  { en: "OIDC", es: "OIDC", context: "Auth" },
  { en: "JWT", es: "JWT", context: "Auth" },
  { en: "Feature Flags", es: "Feature Flags", context: "Configuration" },
  { en: "Feature Flagging", es: "Feature Flagging", context: "Configuration" },
  { en: "Monorepo", es: "Monorepo", context: "Architecture" },
  { en: "Nx", es: "Nx", context: "Tooling" },
  { en: "Clean Code", es: "Código Limpio", context: "Quality" },
  { en: "SOLID", es: "SOLID", context: "Quality" },
  { en: "DDD", es: "DDD", context: "Architecture" },
  { en: "Domain Events", es: "Eventos de Dominio", context: "DDD" },
  { en: "Value Objects", es: "Objetos de Valor", context: "DDD" },
  { en: "Aggregates", es: "Agregados", context: "DDD" },
  { en: "Anti-Pattern", es: "Anti-Patrón", context: "Quality" },
  { en: "Anti-pattern", es: "Anti-patrón", context: "Quality" },
  { en: "Tactical DDD", es: "DDD Táctico", context: "DDD" },
  { en: "Service Mesh", es: "Service Mesh", context: "Infrastructure" },
  { en: "Dapr", es: "Dapr", context: "Runtime" },
  { en: "Pipeline", es: "Pipeline", context: "DevOps" },
];

const ignored = new Set([".git", "node_modules", "dist", "build", "coverage", ".nx"]);

const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".md")) files.push(full);
  }
}

walk(path.join(root, "reference"));

const issues = [];

for (const file of files) {
  if (!file.endsWith(".es.md")) continue;

  const enFile = file.replace(/\.es\.md$/, ".md");
  if (!fs.existsSync(enFile)) continue;

  const esRaw = fs.readFileSync(file, "utf8");
  const enRaw = fs.readFileSync(enFile, "utf8");

  // Terminology is a PROSE rule. Code identifiers (a `Database` type, a ```ts```
  // block) and link references (ADR filename slugs like
  // `[0006-microservices-...](./0006-microservices-...es.md)`) are not
  // translatable prose. Strip fenced + inline code AND markdown links before
  // matching, mirroring 01-validate-docs / 04-check-bilingual-parity.
  // GT-563: the fence pattern was unanchored, the same defect just fixed in
  // 01-validate-docs. A triple backtick written INLINE as prose counts as a real
  // delimiter, which shifts fence pairing by one for the rest of the file -- from
  // there the matcher blanks the PROSE BETWEEN blocks instead of the blocks. That
  // both hides real findings and manufactures false ones: it was reporting
  // `--topology microservices` and `` `modular-monolith` `` -- literal CLI flag
  // values -- as untranslated terminology. Auto-fixing those would have rewritten
  // documented commands into something that does not run.
  //
  // Fences are anchored to line starts, which is where Markdown requires them.
  const stripCode = (s) =>
    s
      .replace(/^ {0,3}```[^\n]*\n[\s\S]*?^ {0,3}```[^\n]*$/gm, " ")
      .replace(/`[^`\r\n]+`/g, " ")
      .replace(/\[[^\]]*\]\([^)]*\)/g, " ");
  const esContent = stripCode(esRaw);
  const enContent = stripCode(enRaw);

  // Skip auto-generated files (BILINGUAL_INDEX cross-references or GENERATED FILE marker)
  const relPath = path.relative(root, file);
  if (relPath.includes('BILINGUAL_INDEX') || esRaw.includes("<!-- GENERATED FILE -->") || enRaw.includes("<!-- GENERATED FILE -->")) {
    if (verbose) console.log(`  ℹ Skipping generated file: ${relPath}`);
    continue;
  }

  for (const term of terminology) {
    const enPattern = new RegExp(`\\b${term.en}\\b`, "gi");
    const esPattern = new RegExp(`\\b${term.es}\\b`, "gi");

    const enMatches = esContent.match(enPattern) || [];
    const esMatches = esContent.match(esPattern) || [];

    if (enMatches.length > 0 && esMatches.length === 0) {
      const enCount = (enContent.match(enPattern) || []).length;
      if (verbose || enCount > 0) {
        issues.push({
          file: path.relative(root, file),
          term: term.en,
          suggestion: term.es,
          context: term.context,
          issue: `uses "${term.en}" (${enMatches.length}x) but should use "${term.es}" for consistency`
        });
      }
    }
  }
}

if (issues.length > 0) {
  console.error("\n\x1b[33mBilingual Terminology Lint Issues\x1b[0m\n");
  console.error(`Found ${issues.length} terminology inconsistencies:\n`);

  for (const issue of issues) {
    console.error(`  \x1b[33m!\x1b[0m ${issue.file}`);
    console.error(`    ${issue.issue}`);
    console.error(`    Context: ${issue.context}`);
    if (verbose) {
      console.error(`    Suggestion: Replace "${issue.term}" → "${issue.suggestion}"`);
    }
    console.error();
  }

  console.error("\nRun with --verbose to see suggestions.");
  console.error("Run with --fix to auto-replace (backup recommended).");

  if (!fix) process.exit(1);
}

console.log("\x1b[32m✓\x1b[0m Bilingual terminology check passed");
process.exit(0);