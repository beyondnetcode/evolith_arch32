import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const OPA_VERSION = '1.10.0';

function platformAsset() {
  const platform = os.platform();
  const arch = os.arch();
  const osName = platform === 'darwin' ? 'darwin' : platform === 'linux' ? 'linux' : platform === 'win32' ? 'windows' : undefined;
  const archName = arch === 'x64' ? 'amd64' : arch === 'arm64' ? 'arm64_static' : undefined;
  if (!osName || !archName) throw new Error(`Unsupported OPA platform: ${platform}/${arch}`);
  return `opa_${osName}_${archName}${platform === 'win32' ? '.exe' : ''}`;
}

export async function ensureOpa(root = process.cwd()) {
  const asset = platformAsset();
  const binDir = path.join(root, '.harness', 'bin');
  const binary = path.join(binDir, `opa-${OPA_VERSION}-${asset}`);
  if (!fs.existsSync(binary)) {
    fs.mkdirSync(binDir, { recursive: true });
    const response = await fetch(`https://openpolicyagent.org/downloads/v${OPA_VERSION}/${asset}`);
    if (!response.ok) throw new Error(`OPA ${OPA_VERSION} download failed: ${response.status} ${response.statusText}`);
    fs.writeFileSync(binary, Buffer.from(await response.arrayBuffer()), { mode: 0o755 });
    if (process.platform !== 'win32') fs.chmodSync(binary, 0o755);
  }
  const version = execFileSync(binary, ['version'], { encoding: 'utf8' });
  if (!version.includes(`Version: ${OPA_VERSION}`)) throw new Error(`Pinned OPA version mismatch at ${binary}`);
  return { binary, version: OPA_VERSION };
}
