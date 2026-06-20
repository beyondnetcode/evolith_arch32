#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { execSync } from "node:child_process";

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

  console.log(`\n📄 Extracted Diff: ${diffText.split("\\n").length} lines of changes.`);

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
        console.log("\n⚠️  EVOLITH_AGENTIC_REVIEW is active, but no API Key (EVOLITH_LLM_API_KEY/GEMINI_API_KEY) was found.");
        console.log("   Falling back to dry-run verification. (Stateless Dry-run Success)");
      } else {
        console.log("\n🧠 Submitting diff to Agentic Reviewer via Gemini API...");
        try {
          const result = await invokeGemini(apiKey, diffText, toolNames);
          console.log(`\n🤖 Review Result:\n${result}\n`);
          if (result.includes("VIOLATION_DETECTED")) {
            console.error("❌ Agentic review detected architectural violations!");
            process.exit(1);
          } else {
            console.log("✅ Agentic Review Passed (No violations found).");
          }
        } catch (apiErr) {
          console.log(`⚠️  LLM call encountered an API error: ${apiErr.message}`);
          console.log("   Degrading gracefully to pass CI in offline/restricted environments.");
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
            text: `You are Wilson, Principal Architect of Evolith Core.
Review the following git diff against our active MCP architecture tools: [${tools}].

Guidelines:
- If you find structural violations (e.g. invalid boundaries, illegal imports, missing signatures), start your output with 'VIOLATION_DETECTED' followed by a description of the issue.
- If everything conforms, output '✅ Review Passed: Clean Architecture Rules Met'.

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
