#!/usr/bin/env node
// Rebuilds native modules (currently only better-sqlite3) for a target runtime.
//
// Electron and Node can use different Node.js ABI versions. electron-builder's
// `install-app-deps` rebuilds for Electron; Vitest needs the Node build. This
// script swaps between the two on demand.
//
// Usage:
//   node scripts/rebuild-native.mjs node        # rebuild for system Node
//   node scripts/rebuild-native.mjs electron    # rebuild for Electron
//
// The 'electron' path defers to electron-builder.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const target = process.argv[2];

if (!target || (target !== 'node' && target !== 'electron')) {
  console.error('usage: rebuild-native.mjs <node|electron>');
  process.exit(1);
}

if (target === 'electron') {
  // Use @electron/rebuild directly with --force. `electron-builder
  // install-app-deps` caches its state file and becomes a silent no-op
  // when the tests have swapped the binary to a Node ABI — which is
  // exactly the situation we're trying to recover from.
  const bin = join(root, 'node_modules', '.bin', 'electron-rebuild');
  const r = spawnSync(bin, ['-f', '-w', 'better-sqlite3'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  process.exit(r.status ?? 1);
}

// target === 'node': use each native module's own prebuild-install.
const modules = ['better-sqlite3'];
for (const name of modules) {
  const modDir = join(root, 'node_modules', name);
  if (!existsSync(modDir)) {
    console.error(`skipping ${name}: not installed`);
    continue;
  }
  const bin = join(root, 'node_modules', '.bin', 'prebuild-install');
  const r = spawnSync(bin, ['-r', 'node'], {
    cwd: modDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    console.error(`prebuild-install failed for ${name}`);
    process.exit(r.status ?? 1);
  }
}
