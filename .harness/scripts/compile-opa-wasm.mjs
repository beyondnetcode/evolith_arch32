#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, renameSync, unlinkSync } from 'fs';
import { join } from 'path';
import { platform, arch } from 'os';
import https from 'https';

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

  if (osArch === 'x64') {
    opaArch = 'amd64';
  } else if (osArch === 'arm64') {
    opaArch = 'arm64_static';
  } else {
    throw new Error(`Unsupported architecture: ${osArch}`);
  }

  return `https://openpolicyagent.org/downloads/v0.65.0/opa_${opaOs}_${opaArch}${osPlatform === 'win32' ? '.exe' : ''}`;
}

async function downloadOpa() {
  if (existsSync(opaBinPath)) {
    return;
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
    '-e', 'evolith/main/violations'
  ];
  
  const outputPath = join(rootDir, 'bundle.tar.gz');
  
  console.log(`Compiling OPA Wasm...`);
  
  try {
    execSync(`${opaBinPath} build -t wasm ${entrypoints.join(' ')} -o bundle.tar.gz rulesets/opa/`, { stdio: 'inherit', cwd: rootDir });
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
  
  // Move policy.wasm to the SDK location
  const destDir = join(rootDir, 'sdk', 'cli', 'rulesets', 'opa');
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  
  renameSync(join(tmpDir, 'policy.wasm'), join(destDir, 'policy.wasm'));
  unlinkSync(outputPath);
  execSync(`rm -rf ${tmpDir}`, { cwd: rootDir });
  
  console.log('Successfully compiled and installed policy.wasm.');
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
