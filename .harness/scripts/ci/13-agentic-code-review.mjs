#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { execSync } from "node:child_process";
import { prepareReviewInput } from "./review-input.mjs";
import { evaluateProviderResponse } from "./review-result.mjs";

// Hard fail-closed ceiling: never submit a payload larger than this (GT-146).
const MAX_REVIEW_TOKENS = Number(process.env.EVOLITH_REVIEW_MAX_TOKENS || 25000);
const MAX_REVIEW_BYTES = Number(process.env.EVOLITH_REVIEW_MAX_BYTES || 80000);

async function main() {
  console.log("🤖 Initializing Agentic Code Review CI Step (GT-132)...");

  // Determine if full agentic evaluation is enabled
  const isEnabled = process.env.EVOLITH_AGENTIC_REVIEW === "true";

  // Simulate extracting a git diff
  let diffText = "";
  try {
    diffText = execSync("git diff HEAD~1 HEAD", { encoding: "utf8" }).trim();
    if (!diffText) {
      diffText = execSync("git diff", { encoding: "utf8" }).trim(); // Fallback to unstaged changes for local testing
    }
  } catch (err) {
    diffText = "No diff available or git command failed.";
  }

  // Sanitize, scope and budget the diff BEFORE any provider sees it (GT-146).
  const prepared = prepareReviewInput(diffText, {
    maxBytes: MAX_REVIEW_BYTES,
    maxTokens: MAX_REVIEW_TOKENS,
  });
  console.log(
    `\n📄 Review input prepared: ${prepared.filesIncluded.length} relevant file(s), ` +
      `${prepared.filesExcluded.length} excluded, ${prepared.redactions} secret(s) redacted, ` +
      `~${prepared.estTokens} tokens (${prepared.bytes} bytes)${prepared.truncated ? ", truncated" : ""}.`,
  );
  // Aggregate, non-sensitive efficiency telemetry only.
  if (prepared.estTokens > MAX_REVIEW_TOKENS) {
    console.error(
      `❌ Prepared review input (~${prepared.estTokens} tokens) exceeds the ${MAX_REVIEW_TOKENS}-token budget. Failing closed.`,
    );
    process.exit(1);
  }
  const reviewPayload = prepared.chunks.join("\n\n");

  // Connect to the Governance MCP Server
  console.log("\n🔌 Connecting to Evolith Governance MCP Sandbox...");
  
  const transport = new StdioClientTransport({
    command: process.execPath, // Using the current node executable
    args: ["apps/agent-sandbox/index.js"]
  });

  const client = new Client(
    {
      name: "evolith-ci-agent",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  try {
    await client.connect(transport);
    console.log("✅ MCP Client successfully connected to Sandbox.");

    const toolsResponse = await client.listTools();
    const toolNames = toolsResponse.tools.map((t) => t.name).join(", ");
    console.log(`🛠️ Discovered Governance Tools: [${toolNames}]`);

    if (!isEnabled) {
      console.log("\n⚠️  EVOLITH_AGENTIC_REVIEW flag is not set to 'true'.");
      console.log("   Skipping actual LLM invocation. Architecture connection validated. (Dry-run Success)");
    } else {
      const apiKey = process.env.EVOLITH_LLM_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("EVOLITH_AGENTIC_REVIEW is active but EVOLITH_LLM_API_KEY/GEMINI_API_KEY is missing.");
      } else {
        if (prepared.filesIncluded.length === 0) {
          console.log("\n✅ No policy-relevant changed files to review. (Pass)");
          return;
        }
        console.log("\n🧠 Submitting sanitized, budgeted review input to Agentic Reviewer...");
        try {
          const result = await invokeGemini(apiKey, reviewPayload, toolNames);
          const evaluation = evaluateProviderResponse(result);
          if (!evaluation.ok) {
            console.error(`❌ Indeterminate/malformed review result — failing closed:\n   ${(evaluation.errors || []).join("\n   ")}`);
            process.exit(1);
          }
          if (evaluation.passesGate) {
            console.log("✅ Agentic Review Passed (no violations).");
          } else {
            console.error(`❌ Agentic review detected ${evaluation.findings.length} violation(s):`);
            for (const f of evaluation.findings) {
              console.error(`   [${f.severity}] ${f.file}${f.line ? ":" + f.line : ""} — ${f.title} (confidence ${f.confidence})`);
            }
            process.exit(1);
          }
        } catch (apiErr) {
          throw new Error(`LLM review failed: ${apiErr.message}`);
        }
      }
    }
  } catch (err) {
    console.error(`\n❌ Failed to connect to MCP or fetch tools: ${err.message}`);
    process.exit(1);
  } finally {
    // Graceful disconnect
    try {
      await client.close();
    } catch (e) {
      // Ignore close errors
    }
  }
}

function invokeGemini(apiKey, diff, tools) {
  return new Promise((resolve, reject) => {
    // Standard https request using native Node.js to avoid dependencies
    import("node:https").then((https) => {
      const payload = JSON.stringify({
        contents: [{
          parts: [{
            text: `You are the Evolith Core architecture reviewer.
Review the following sanitized, policy-relevant diff against our active MCP architecture tools: [${tools}].

Respond with ONLY a single JSON object conforming to this schema (no prose, no markdown fences):
{
  "schemaVersion": "1.0",
  "verdict": "pass" | "fail",                 // "fail" iff there is at least one error-severity violation
  "findings": [
    {
      "ruleId": "<optional rule id>",
      "severity": "error" | "warning" | "info",
      "title": "<short description>",
      "file": "<changed file path — evidence location>",
      "line": <integer, optional>,
      "confidence": <number 0..1>
    }
  ]
}
Detect structural violations (invalid boundaries, illegal imports, missing signatures). If none, return verdict "pass" with an empty findings array.

Diff to review:
\`\`\`diff
${diff}
\`\`\``
          }]
        }]
      });

      const options = {
        hostname: "generativelanguage.googleapis.com",
        path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        }
      };

      const req = https.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => body += chunk);
        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
            return;
          }
          try {
            const data = JSON.parse(body);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            resolve(text.trim());
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on("error", (err) => reject(err));
      req.write(payload);
      req.end();
    }).catch(reject);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
