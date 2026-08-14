# Quickstart Guide: Evolith (Step by Step)

This guide will help you install and run Evolith in **less than 5 minutes**, so you can start validating your code's architecture right away.

---

## Step 1: Boot the Brain (Evolith Core API)

The Core API is the central server containing your enterprise architecture rules. You must boot it up first so that clients can query it.

You have two options to start it on your local machine:

### Option A: Via Docker Compose (Fastest)
Ideal for developers. This boots up the API and the minimum required PostgreSQL database.
```bash
docker-compose -f product/infra/docker-compose.yml up -d postgres
```

### Option B: Via Kubernetes / Helm (Full Environment)
Ideal for production simulations or architects. This spins up the local cluster, the database, the API Gateway, and the Core API.
```bash
./.harness/scripts/run-core-local.sh
```

Once finished, the server will be listening on `http://localhost:30080`. You can view the generated API documentation at `http://localhost:30080/api/docs`.

---

## Step 2: Install the Client (Evolith CLI)

The CLI is the tool developers will use in their day-to-day workflow.

1. Install the package globally using npm:
```bash
npm install -g @beyondnet/evolith-cli
```

2. Configure the server URL the CLI should point to (the one we booted in Step 1). You can do this by exporting an environment variable:
```bash
export EVOLITH_CORE_URL="http://localhost:30080/api/v1"
```

---

## Step 3: Your First Validation

Navigate to the root folder of any software project (satellite) you want to validate and run the validation command.

```bash
cd my-backend-project
evolith validate
```

**What happens behind the scenes?**
The CLI will take the current state of your code, connect to the central Core API, and evaluate your project against the official OPA rules and ADRs of the company. In seconds, it will return a report indicating whether you comply with the standard or if there are any architecture violations.

---

## Step 4: (Optional) Connect your AI Agent

Evolith isn't just for humans. You can connect your AI-powered code editor (Cursor, Claude Desktop, etc.) so it "understands" your architecture.

To start the MCP server, simply run:
```bash
evolith mcp start
```

Then, in your Cursor or Claude Desktop settings, add this local MCP server. From that moment on, your AI Agent will know which patterns to use, which libraries are forbidden, and how it should structure the code before writing a single line.
