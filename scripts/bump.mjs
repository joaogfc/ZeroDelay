// Bumps the extension version atomically in manifest.json (source of truth),
// manifest.firefox.json, package.json AND package-lock.json, so none of them
// ever drift. Usage: node scripts/bump.mjs [patch|minor|major]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const kind = process.argv[2] ?? 'patch';

const manifestPath = join(root, 'manifest.json');
const cur = JSON.parse(readFileSync(manifestPath, 'utf8')).version;
const parts = String(cur).split('.').map(n => parseInt(n, 10) || 0);
while (parts.length < 3) parts.push(0);
if (kind === 'major') { parts[0]++; parts[1] = 0; parts[2] = 0; }
else if (kind === 'minor') { parts[1]++; parts[2] = 0; }
else if (kind === 'patch') { parts[2]++; }
else { console.error(`unknown bump kind "${kind}" (use patch|minor|major)`); process.exit(1); }
const next = parts.join('.');

// String-replace to preserve each file's existing formatting.
const replaceVersion = (path, from, to) => {
    const src = readFileSync(path, 'utf8');
    writeFileSync(path, src.replace(`"version": "${from}"`, `"version": "${to}"`));
};
replaceVersion(manifestPath, cur, next);

const fxPath = join(root, 'manifest.firefox.json');
const fxCur = JSON.parse(readFileSync(fxPath, 'utf8')).version;
replaceVersion(fxPath, fxCur, next);

const pkgPath = join(root, 'package.json');
const pkgCur = JSON.parse(readFileSync(pkgPath, 'utf8')).version;
replaceVersion(pkgPath, pkgCur, next);

// The lockfile mentions the version twice (root + packages[""]) and other
// packages may share the same version string, so a blind string replace is
// unsafe here — update the two fields structurally instead.
const lockPath = join(root, 'package-lock.json');
const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
lock.version = next;
if (lock.packages?.['']) lock.packages[''].version = next;
writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');

console.log(`✓ version ${cur} → ${next} (manifest.json + manifest.firefox.json + package.json + package-lock.json)`);
