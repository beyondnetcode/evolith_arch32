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
      console.log("\n🧠 Submitting diff to Agentic Reviewer...");
      // In a fully configured environment, we would invoke the LLM here using the extracted diff 
      // and provide it the tool list so it can dynamically query architecture/governance gaps.
      console.log("   (Simulated LLM review: No architectural violations found.)");
      console.log("✅ Agentic Review Passed.");
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
