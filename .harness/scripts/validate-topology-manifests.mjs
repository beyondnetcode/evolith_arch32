#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = process.cwd();
const schemaPath = path.join(root, "rulesets", "schema", "topology-manifest.schema.json");
const manifestRoots = [
  path.join(root, "reference", "architecture", "topologies"),
  path.join(root, "rulesets", "topologies"),
];
const failures = [];
const manifests = [];
const checkedTsConfigs = new Set();

function toPascalCase(filename) {
  const base = path.basename(filename, path.extname(filename));
  return base
    .split(/[-.]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

function findTsConfig(filePath) {
  let dir = path.dirname(path.join(root, filePath));
  while (dir !== root && dir !== path.dirname(root)) {
    const tsconfig = path.join(dir, "tsconfig.json");
    if (fs.existsSync(tsconfig)) {
      return tsconfig;
    }
    dir = path.dirname(dir);
  }
  return null;
}

function checkTypeScriptCompilation(manifestPath, tsFile) {
  const tsconfig = findTsConfig(tsFile);
  if (!tsconfig) {
    failures.push(`${relative(manifestPath)}: no tsconfig.json found for TypeScript file ${tsFile}`);
    return;
  }

  const relTsConfig = path.relative(root, tsconfig);
  if (checkedTsConfigs.has(relTsConfig)) {
    return;
  }

  try {
    execSync(`npx tsc --project ${tsconfig} --noEmit`, { stdio: "ignore" });
    checkedTsConfigs.add(relTsConfig);
  } catch (error) {
    failures.push(`${relative(manifestPath)}: TypeScript compilation failed for project ${relTsConfig}`);
  }
}

function checkTypeScriptExports(manifestPath, tsFile, expectedSymbol) {
  try {
    const content = fs.readFileSync(path.join(root, tsFile), "utf8");
    const classRegex = new RegExp(`export\\s+class\\s+${expectedSymbol}\\b`);
    const constRegex = new RegExp(`export\\s+const\\s+${expectedSymbol}\\b`);
    const interfaceRegex = new RegExp(`export\\s+interface\\s+${expectedSymbol}\\b`);
    const functionRegex = new RegExp(`export\\s+function\\s+${expectedSymbol}\\b`);

    if (!classRegex.test(content) && !constRegex.test(content) && !interfaceRegex.test(content) && !functionRegex.test(content)) {
      failures.push(`${relative(manifestPath)} violates GT-163: TypeScript file ${tsFile} does not export symbol ${expectedSymbol}`);
    }
  } catch (error) {
    failures.push(`${relative(manifestPath)}: failed to read ${tsFile} for export checks: ${error.message}`);
  }
}

function validateJsonSchema(manifestPath, jsonFile, schemaFilePath) {
  try {
    const jsonContent = JSON.parse(fs.readFileSync(path.join(root, jsonFile), "utf8"));
    const schemaContent = JSON.parse(fs.readFileSync(path.join(root, schemaFilePath), "utf8"));

    const ajvInstance = new Ajv({ strict: false, allErrors: true });
    addFormats(ajvInstance);
    const validateFn = ajvInstance.compile(schemaContent);

    if (!validateFn(jsonContent)) {
      failures.push(`${relative(manifestPath)}: referenced JSON evidence ${jsonFile} violates schema ${relative(schemaFilePath)}: ${ajvInstance.errorsText(validateFn.errors, { separator: "; " })}`);
    }
  } catch (error) {
    failures.push(`${relative(manifestPath)}: failed to validate JSON evidence ${jsonFile} against schema: ${error.message}`);
  }
}

function walk(directory) {
  if (!fs.existsSync(directory)) {
    return;
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (entry.isFile() && entry.name === "topology.manifest.json") {
      manifests.push(fullPath);
    }
  }
}

function relative(file) {
  return path.relative(root, file);
}

function hasApprovedAdrStatus(adrPath) {
  const content = fs.readFileSync(path.join(root, adrPath), "utf8");
  return /(?:^## Status\s*\n+\s*|^\s*(?:[-*]\s+)?\*\*Status:\*\*\s*)(?:Accepted|Approved)\b/im.test(content);
}

function validateExistingFile(manifestPath, artifact, label) {
  if (!fs.existsSync(path.join(root, artifact))) {
    failures.push(`${relative(manifestPath)} violates R-27: missing ${label} ${artifact}`);
    return false;
  }
  return true;
}

function validateBilingualGuide(manifestPath, guide, label) {
  if (!validateExistingFile(manifestPath, guide, label)) return;
  if (!guide.endsWith(".md") || guide.endsWith(".es.md")) return;
  const spanishGuide = guide.replace(/\.md$/, ".es.md");
  validateExistingFile(manifestPath, spanishGuide, `Spanish counterpart for ${label}`);
}

function validateCorpusFixtures(manifestPath, corpus) {
  const schemaPath = corpus.configurationContract && path.join(root, corpus.configurationContract);
  const validPath = corpus.fixtures?.valid && path.join(root, corpus.fixtures.valid);
  const invalidPath = corpus.fixtures?.invalid && path.join(root, corpus.fixtures.invalid);
  if (!schemaPath || !validPath || !invalidPath || !fs.existsSync(schemaPath) || !fs.existsSync(validPath) || !fs.existsSync(invalidPath)) return;

  try {
    const configSchema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    const validateConfig = new Ajv({ strict: false, allErrors: true }).compile(configSchema);
    const validFixture = JSON.parse(fs.readFileSync(validPath, "utf8"));
    if (!validateConfig(validFixture)) {
      failures.push(`${relative(manifestPath)} violates R-27: valid fixture does not satisfy configuration contract: ${ajv.errorsText(validateConfig.errors, { separator: "; " })}`);
    }
    const invalidFixture = JSON.parse(fs.readFileSync(invalidPath, "utf8"));
    if (validateConfig(invalidFixture)) {
      failures.push(`${relative(manifestPath)} violates R-27: invalid fixture satisfies configuration contract`);
    }
  } catch (error) {
    failures.push(`${relative(manifestPath)} violates R-27: corpus configuration contract or fixture is invalid JSON/schema: ${error.message}`);
  }
}

if (!fs.existsSync(schemaPath)) {
  failures.push("src/rulesets/schema/topology-manifest.schema.json is missing");
} else {
  for (const manifestRoot of manifestRoots) {
    walk(manifestRoot);
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  for (const manifestPath of manifests) {
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch (error) {
      failures.push(`${relative(manifestPath)} is not valid JSON: ${error.message}`);
      continue;
    }

    if (!validate(manifest)) {
      failures.push(`${relative(manifestPath)} violates topology manifest schema: ${ajv.errorsText(validate.errors, { separator: "; " })}`);
    }

    // Governance metadata check (GT-213)
    const gov = manifest.metadata?.governance;
    if (!gov) {
      failures.push(`${relative(manifestPath)} violates GT-213: metadata.governance is required`);
    } else {
      if (!gov.owner || typeof gov.owner !== "string" || gov.owner.length < 3) {
        failures.push(`${relative(manifestPath)} violates GT-213: governance.owner must be a non-empty string`);
      }
      if (!["P0", "P1", "P2"].includes(gov.criticality)) {
        failures.push(`${relative(manifestPath)} violates GT-213: governance.criticality must be P0, P1, or P2`);
      }
      if (gov.supersedes && !Array.isArray(gov.supersedes)) {
        failures.push(`${relative(manifestPath)} violates GT-213: governance.supersedes must be an array of ADR IDs`);
      }
      if (gov.replaces && !Array.isArray(gov.replaces)) {
        failures.push(`${relative(manifestPath)} violates GT-213: governance.replaces must be an array of ADR IDs`);
      }
    }

    // Budget check (GT-165)
    if (manifest.spec?.topologyType === "serverless" || manifest.spec?.topologyType === "edge-computing") {
      const budgets = manifest.spec?.operationalBudgets;
      if (!budgets) {
        failures.push(`${relative(manifestPath)} violates GT-165: execution topology must declare operationalBudgets`);
      } else {
        const { latencyBudgetMs, coldStartCeilingMs, costCeilingPerExecutionCents } = budgets;
        if (latencyBudgetMs === undefined || latencyBudgetMs <= 0) {
          failures.push(`${relative(manifestPath)} violates GT-165: latencyBudgetMs must be a positive integer`);
        }
        if (coldStartCeilingMs === undefined || coldStartCeilingMs <= 0) {
          failures.push(`${relative(manifestPath)} violates GT-165: coldStartCeilingMs must be a positive integer`);
        }
        if (costCeilingPerExecutionCents === undefined || costCeilingPerExecutionCents <= 0) {
          failures.push(`${relative(manifestPath)} violates GT-165: costCeilingPerExecutionCents must be a positive integer`);
        }
      }
    }

    // AI budget check (GT-219)
    if (manifest.spec?.topologyType === "agentic-ai") {
      const budgets = manifest.spec?.operationalBudgets;
      if (!budgets) {
        failures.push(`${relative(manifestPath)} violates GT-219: agentic-ai topology must declare operationalBudgets`);
      } else {
        const { tokenBudgetPerExecution, credentialRotationIntervalHours, sandboxTimeoutMs } = budgets;
        if (tokenBudgetPerExecution === undefined || tokenBudgetPerExecution <= 0) {
          failures.push(`${relative(manifestPath)} violates GT-219: tokenBudgetPerExecution must be a positive integer`);
        }
        if (credentialRotationIntervalHours === undefined || credentialRotationIntervalHours <= 0) {
          failures.push(`${relative(manifestPath)} violates GT-219: credentialRotationIntervalHours must be a positive integer`);
        }
        if (sandboxTimeoutMs === undefined || sandboxTimeoutMs <= 0) {
          failures.push(`${relative(manifestPath)} violates GT-219: sandboxTimeoutMs must be a positive integer`);
        }
      }
    }

    if (manifest.metadata?.status === "accepted") {
      const artifacts = [
        ...(manifest.spec?.artifacts?.adrs ?? []),
        ...(manifest.spec?.artifacts?.rulesets ?? []),
        ...(manifest.spec?.artifacts?.opaPolicies ?? []),
        ...(manifest.spec?.artifacts?.aiRulesets ?? []),
      ];
      for (const artifact of artifacts) {
        validateExistingFile(manifestPath, artifact, "accepted topology artifact");
      }

      const corpus = manifest.spec?.corpus;
      if (!corpus) {
        failures.push(`${relative(manifestPath)} violates R-27: accepted topology must declare spec.corpus`);
        continue;
      }

      validateBilingualGuide(manifestPath, corpus.guidance?.profile, "topology profile");
      validateBilingualGuide(manifestPath, corpus.guidance?.maturityGuide, "maturity guide");

      for (const [label, artifact] of Object.entries({
        "configuration contract": corpus.configurationContract,
        "valid fixture": corpus.fixtures?.valid,
        "invalid fixture": corpus.fixtures?.invalid,
        "Native evaluator": corpus.nativeEvaluator,
        "positive test": corpus.tests?.positive,
        "negative test": corpus.tests?.negative,
        evidence: corpus.evidence,
      })) {
        if (typeof artifact === "string") {
          const exists = validateExistingFile(manifestPath, artifact, label);
          if (exists && artifact.endsWith(".ts")) {
            checkTypeScriptCompilation(manifestPath, artifact);
            if (label === "Native evaluator") {
              checkTypeScriptExports(manifestPath, artifact, toPascalCase(artifact));
            }
          }
        }
      }
      validateCorpusFixtures(manifestPath, corpus);

      if (corpus.evidence && typeof corpus.evidence === "string" && corpus.evidence.endsWith(".json")) {
        validateJsonSchema(manifestPath, corpus.evidence, "src/rulesets/schema/maturity-evidence.schema.json");
      }

      for (const adr of manifest.spec?.artifacts?.adrs ?? []) {
        if (fs.existsSync(path.join(root, adr)) && !hasApprovedAdrStatus(adr)) {
          failures.push(`${relative(manifestPath)} violates R-27: topology ADR is not Accepted or Approved: ${adr}`);
        }
      }

      const interfaces = manifest.spec?.operationalInterfaces;
      if (!interfaces?.cli?.validators?.length || !interfaces?.mcp?.resources?.length ||
          !interfaces?.mcp?.tools?.length || !interfaces?.mcp?.prompts?.length ||
          !interfaces?.coreApi?.endpoints?.length) {
        failures.push(`${relative(manifestPath)} violates R-27: accepted topology must expose non-empty CLI, MCP, and Core API control-plane interfaces`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Topology manifest validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Topology manifest validation passed for ${manifests.length} manifest files.`);
