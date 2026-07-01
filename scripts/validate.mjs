// Sanity-checks manifest.json before packaging: required MV3 fields, no keys
// that block a Web Store upload, and that every referenced file actually exists.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));

const errors = [];
for (const k of ['manifest_version', 'name', 'version', 'description', 'icons']) {
    if (!(k in manifest)) errors.push(`missing "${k}"`);
}
if (manifest.manifest_version !== 3) errors.push(`manifest_version must be 3 (got ${manifest.manifest_version})`);
if ('key' in manifest) errors.push('"key" must not be committed in the published package');
if ('update_url' in manifest) errors.push('"update_url" blocks Web Store upload — remove it');
if (!/^\d+(\.\d+){0,3}$/.test(String(manifest.version ?? ''))) errors.push(`invalid version "${manifest.version}"`);

// Every path the manifest points at must exist.
const refs = [
    manifest.action?.default_popup,
    manifest.options_ui?.page,
    manifest.background?.service_worker,
    ...(manifest.content_scripts ?? []).flatMap(cs => cs.js ?? []),
    ...Object.values(manifest.icons ?? {}),
    ...(manifest.web_accessible_resources ?? []).flatMap(w => w.resources ?? []),
].filter(Boolean);
for (const ref of refs) {
    if (!existsSync(join(root, ref))) errors.push(`referenced file missing: ${ref}`);
}

if (errors.length) {
    console.error('✗ manifest validation failed:');
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
}
console.log(`✓ manifest valid — ${manifest.name} v${manifest.version}, MV${manifest.manifest_version}, ${refs.length} refs OK`);
