#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, copyFileSync, renameSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { platform, arch } from 'os';
import https from 'https';
// GT-591: the version is NOT spelled here. It used to be — a `v0.65.0` literal in the
// download URL below, a second owner of a pin whose first owner is `opa-runtime.mjs`.
// Two spellings of one pin is a drift generator, and `53-validate-opa-pin.mjs` now
// fails on any OPA version literal that is not this constant.
import { OPA_VERSION } from './opa-runtime.mjs';

const rootDir = process.cwd();
const harnessBinDir = join(rootDir, '.harness', 'bin');
const opaBinPath = join(harnessBinDir, platform() === 'win32' ? 'opa.exe' : 'opa');

function getOpaUrl() {
  const osPlatform = platform();
  const osArch = arch();
  let opaOs = '';
  let opaArch = '';

  if (osPlatform === 'darwin') {
    opaOs = 'darwin';
  } else if (osPlatform === 'linux') {
    opaOs = 'linux';
  } else if (osPlatform === 'win32') {
    opaOs = 'windows';
  } else {
    throw new Error(`Unsupported platform: ${osPlatform}`);
  }

  // Always the STATIC build. The service Dockerfiles are node:20-alpine (musl), and a
  // glibc-linked OPA there fails as `/bin/sh: .../opa: not found` — which is exactly why
  // every docker-services build broke once the tests stopped short-circuiting them.
  // arm64 already used _static; x64 was left dynamic. Static works on glibc AND musl.
  if (osArch === 'x64') {
    opaArch = 'amd64_static';
  } else if (osArch === 'arm64') {
    opaArch = 'arm64_static';
  } else {
    throw new Error(`Unsupported architecture: ${osArch}`);
  }

  return `https://openpolicyagent.org/downloads/v${OPA_VERSION}/opa_${opaOs}_${opaArch}${osPlatform === 'win32' ? '.exe' : ''}`;
}

/**
 * A cached binary is only reusable if it executes on THIS platform AND is the
 * pinned version.
 *
 * GT-591: the version half is new, and it is the half that matters after a bump.
 * `.harness/bin/opa` is gitignored and long-lived, so every machine that ran this
 * script before the pin moved still holds the OLD binary — which executes fine and
 * was therefore accepted. The bundle would then be compiled by an unpinned
 * compiler, on that machine only, forever, and nothing would say so. A pin that
 * only governs the download and not the cache is not a pin.
 */
function opaRunsHere() {
  if (!existsSync(opaBinPath)) return false;
  let reported;
  try {
    reported = execSync(`${opaBinPath} version`, { encoding: 'utf8' });
  } catch {
    // Wrong-arch (e.g. a committed macOS binary on a linux runner → "Exec format
    // error") or corrupt → drop it and re-download the correct one.
    return false;
  }
  if (!reported.includes(`Version: ${OPA_VERSION}`)) {
    const found = /Version:\s*(\S+)/.exec(reported)?.[1] ?? 'unknown';
    console.log(`Cached OPA at ${opaBinPath} is ${found}, pin is ${OPA_VERSION} — re-downloading.`);
    return false;
  }
  return true;
}

async function downloadOpa() {
  if (opaRunsHere()) {
    return;
  }
  if (existsSync(opaBinPath)) {
    unlinkSync(opaBinPath);
  }

  if (!existsSync(harnessBinDir)) {
    mkdirSync(harnessBinDir, { recursive: true });
  }

  const url = getOpaUrl();
  console.log(`Downloading OPA from ${url}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download OPA: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  writeFileSync(opaBinPath, Buffer.from(arrayBuffer));
  
  if (platform() !== 'win32') {
    execSync(`chmod +x ${opaBinPath}`);
  }
}

async function compileWasm() {
  // Using the rulesets folder at the root
  const entrypoints = [
    '-e', 'evolith/main/violations',
    '-e', 'evolith/abac/violations'
  ];
  
  const outputPath = join(rootDir, 'bundle.tar.gz');
  
  console.log(`Compiling OPA Wasm...`);
  
  try {
    execSync(`${opaBinPath} build -t wasm ${entrypoints.join(' ')} --ignore=schemas -o bundle.tar.gz src/rulesets/opa/`, { stdio: 'inherit', cwd: rootDir });
  } catch (err) {
    console.error('Failed to compile OPA Wasm policies.');
    process.exit(1);
  }

  console.log('Extracting policy.wasm from bundle...');
  const tmpDir = join(rootDir, '.tmp-wasm');
  if (existsSync(tmpDir)) {
    execSync(`rm -rf ${tmpDir}`, { cwd: rootDir });
  }
  mkdirSync(tmpDir);

  try {
    execSync(`tar -xzf bundle.tar.gz -C .tmp-wasm`, { cwd: rootDir });
  } catch(err) {
     console.error('Failed to extract bundle.');
     process.exit(1);
  }
  
  // GT-382 follow-up: install the compiled policy.wasm to EVERY location a runtime
  // consumer looks for it, so OPA enforcement actually executes (instead of
  // fail-closed on a missing wasm). Two lookup conventions exist:
  //   - core-domain OpaEvaluator reads `<corePath>/rulesets/opa/policy.wasm`, where
  //     corePath is resolved by findCoreFromSatellite (first ancestor with `rulesets/`
  //     — the repo root for an in-repo run); must co-locate with the .rego sources.
  //   - the MCP/SDK bundle reads `<corePath>/sdk/cli/rulesets/opa/policy.wasm`.
  // policy.wasm is a build artifact (gitignored) — wired here, never committed.
  const extracted = join(tmpDir, 'policy.wasm');
  // Post `src/` taxonomy refactor (98a20dca), the rego sources and the SDK live
  // under `src/`, and `.gitignore` tracks the artifacts at `src/rulesets/opa/...`
  // and `src/sdk/cli/rulesets/opa/...`. The runtime readers resolve relative to a
  // corePath that already includes the `src` segment (MCP ABAC: `<repo>/src`;
  // core-domain OpaEvaluator: `<corePath>/rulesets/opa/policy.wasm` co-located
  // with the .rego). Install to the `src/` locations so the wasm lands where both
  // the readers and the image COPYs (`COPY src/rulesets ...`) expect it.
  const destinations = [
    join(rootDir, 'src', 'rulesets', 'opa', 'policy.wasm'),
    join(rootDir, 'src', 'sdk', 'cli', 'rulesets', 'opa', 'policy.wasm'),
  ];
  // GT-602: install ATOMICALLY. `copyFileSync` truncates the destination and then
  // streams into it, so a reader that opens `policy.wasm` mid-copy gets a partial
  // wasm and `loadPolicy` throws — which the ABAC evaluator reports as OPA_ERROR,
  // i.e. a DENIAL. That window is now reachable on purpose: the GT-602 parity spec
  // compiles the bundle itself when it is missing or stale, while sibling jest
  // workers are reading the same path. Write beside the destination and rename;
  // rename(2) within a directory is atomic, so a concurrent reader sees either the
  // old bundle or the new one, never half of one.
  for (const dest of destinations) {
    mkdirSync(dirname(dest), { recursive: true });
    const staging = `${dest}.${process.pid}.tmp`;
    copyFileSync(extracted, staging);
    renameSync(staging, dest);
  }
  unlinkSync(outputPath);
  execSync(`rm -rf ${tmpDir}`, { cwd: rootDir });

  console.log(`Successfully compiled and installed policy.wasm to:\n  ${destinations.join('\n  ')}`);
}

async function main() {
  try {
    await downloadOpa();
    await compileWasm();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
